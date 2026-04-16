import "dotenv/config";
import crypto from "node:crypto";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, db } from "./db.js";
import {
  authMiddleware,
  createSessionForUser,
  createUser,
  deleteSession,
  signInUser,
} from "./auth.js";
import { analyzeWithLocalModel } from "./pythonAnalyzer.js";

const app = express();
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);
const configuredOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.FRONTEND_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim())
  .filter(Boolean);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");
const hasBuiltFrontend = fs.existsSync(path.join(distDir, "index.html"));
console.log("Backend starting with allowed frontend origins =", configuredOrigins);

initDb();

const isUniqueConstraintError = (error) =>
  error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
  String(error?.message || "").toUpperCase().includes("UNIQUE CONSTRAINT FAILED");

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return true;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.auth?.user || !roles.includes(req.auth.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

const recordActivity = ({ contractId = null, userId, action, details = {} }) => {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO contract_activity (id, contract_id, user_id, action, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(crypto.randomUUID(), contractId, userId, action, JSON.stringify(details), now);
};

const canAccessContract = (actor, ownerId) =>
  actor.role === "Admin" || actor.role === "Legal Reviewer" || actor.id === ownerId;

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "35mb" }));

app.head("/api/uptime", (_req,res) => {
  res.sendStatus(200);
});


app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ComplyChain Backend",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/auth/signup", (req, res) => {
  const { name, email, password, role = "Client" } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  try {
    const user = createUser({ name, email, password, role });
    const session = createSessionForUser(user.id);
    recordActivity({
      userId: user.id,
      action: "user.signup",
      details: { email: user.email, role: user.role },
    });
    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/auth/signin", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const session = signInUser({ email, password });
  if (!session) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  return res.json(session);
});

app.post("/api/auth/signout", authMiddleware, (req, res) => {
  deleteSession(req.auth.token);
  res.status(204).send();
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    user: req.auth.user,
    expiresAt: req.auth.expiresAt,
  });
});

app.post("/api/contracts", authMiddleware, (req, res) => {
  const { fileName, fileSize, hash, status = "Pending", riskScore = null } = req.body || {};
  if (!fileName || !fileSize || !hash) {
    return res.status(400).json({ error: "fileName, fileSize, and hash are required" });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO contracts (id, user_id, file_name, file_size, hash, status, risk_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(id, req.auth.user.id, fileName, fileSize, hash, status, riskScore, now);

  recordActivity({
    contractId: id,
    userId: req.auth.user.id,
    action: "contract.created",
    details: { fileName, status },
  });

  res.status(201).json({
    id,
    fileName,
    fileSize,
    hash,
    status,
    riskScore,
    createdAt: now,
  });
});

app.get("/api/contracts", authMiddleware, (req, res) => {
  const actor = req.auth.user;
  const isClient = actor.role === "Client";
  const rows = db
    .prepare(
      `
      SELECT
        c.id,
        c.file_name AS fileName,
        c.file_size AS fileSize,
        c.hash,
        c.status,
        c.risk_score AS riskScore,
        c.created_at AS createdAt,
        c.user_id AS userId,
        u.name AS ownerName,
        u.email AS ownerEmail,
        a.compliance_status AS complianceStatus,
        a.overall_risk_score AS overallRiskScore
      FROM contracts c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN analyses a ON a.contract_id = c.id
      ${isClient ? "WHERE c.user_id = ?" : ""}
      ORDER BY datetime(c.created_at) DESC
      `
    )
    .all(...(isClient ? [actor.id] : []));
  res.json({ items: rows });
});

app.get("/api/contracts/:id", authMiddleware, (req, res) => {
  const contract = db
    .prepare(
      `
      SELECT
        c.id,
        c.file_name AS fileName,
        c.file_size AS fileSize,
        c.hash,
        c.status,
        c.risk_score AS riskScore,
        c.created_at AS createdAt,
        c.user_id AS userId,
        u.name AS ownerName,
        u.email AS ownerEmail
      FROM contracts c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
      `
    )
    .get(req.params.id);

  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (!canAccessContract(req.auth.user, contract.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const analysis = db
    .prepare(
      `
      SELECT id, overall_risk_score AS overallRiskScore, compliance_status AS complianceStatus, issues_json AS issuesJson, raw_json AS rawJson, created_at AS createdAt
      FROM analyses WHERE contract_id = ?
      `
    )
    .get(contract.id);

  const blockchain = db
    .prepare(
      `
      SELECT id, tx_id AS txId, block_number AS blockNumber, timestamp, status, contract_address AS contractAddress, explorer_url AS explorerUrl, created_at AS createdAt
      FROM blockchain_records
      WHERE contract_id = ?
      ORDER BY datetime(created_at) DESC
      `
    )
    .all(contract.id);

  res.json({
    ...contract,
    analysis: analysis
      ? {
          ...analysis,
          issues: JSON.parse(analysis.issuesJson || "[]"),
          raw: JSON.parse(analysis.rawJson || "{}"),
        }
      : null,
    blockchain,
  });
});

app.post("/api/contracts/:id/analysis", authMiddleware, async (req, res) => {
  const contract = db
    .prepare("SELECT id FROM contracts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.auth.user.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const { text, fileName, fileContentBase64 } = req.body || {};
  const hasMeaningfulText = Boolean(text && String(text).trim().length >= 10);
  const hasFilePayload = Boolean(fileContentBase64 && fileName);

  if (!hasMeaningfulText && !hasFilePayload) {
    return res.status(400).json({ error: "Provide contract text or an uploaded file payload." });
  }

  try {
    const analysis = await analyzeWithLocalModel({
      text,
      fileName,
      fileContentBase64,
    });

    const analysisId = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO analyses (id, contract_id, overall_risk_score, compliance_status, issues_json, raw_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(contract_id) DO UPDATE SET
        overall_risk_score = excluded.overall_risk_score,
        compliance_status = excluded.compliance_status,
        issues_json = excluded.issues_json,
        raw_json = excluded.raw_json,
        created_at = excluded.created_at
      `
    ).run(
      analysisId,
      contract.id,
      analysis.overallRiskScore,
      analysis.complianceStatus,
      JSON.stringify(analysis.issues || []),
      JSON.stringify(analysis),
      now
    );

    db.prepare("UPDATE contracts SET risk_score = ?, status = ? WHERE id = ?").run(
      analysis.overallRiskScore,
      mapComplianceStatus(analysis.complianceStatus, analysis.overallRiskScore),
      contract.id
    );

    recordActivity({
      contractId: contract.id,
      userId: req.auth.user.id,
      action: "contract.analyzed",
      details: {
        complianceStatus: analysis.complianceStatus,
        riskScore: analysis.overallRiskScore,
      },
    });

    res.status(201).json({
      contractId: contract.id,
      analysis,
      analyzedAt: now,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze contract" });
  }
});

app.post("/api/contracts/:id/blockchain", authMiddleware, (req, res) => {
  const contract = db
    .prepare("SELECT id FROM contracts WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.auth.user.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const {
    txId,
    blockNumber = null,
    timestamp = new Date().toISOString(),
    status = "Confirmed",
    contractAddress = null,
    explorerUrl = null,
  } = req.body || {};

  if (!txId) return res.status(400).json({ error: "txId is required" });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO blockchain_records (id, contract_id, tx_id, block_number, timestamp, status, contract_address, explorer_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(id, contract.id, txId, blockNumber, timestamp, status, contractAddress, explorerUrl, now);

  recordActivity({
    contractId: contract.id,
    userId: req.auth.user.id,
    action: "contract.blockchain_registered",
    details: { txId, blockNumber, status },
  });

  res.status(201).json({
    id,
    contractId: contract.id,
    txId,
    blockNumber,
    timestamp,
    status,
    contractAddress,
    explorerUrl,
    createdAt: now,
  });
});

app.get("/api/contracts/:id/blockchain", authMiddleware, (req, res) => {
  const contract = db
    .prepare("SELECT id, user_id AS userId FROM contracts WHERE id = ?")
    .get(req.params.id);
  if (!contract) return res.status(404).json({ error: "Contract not found" });
  if (!canAccessContract(req.auth.user, contract.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const records = db
    .prepare(
      `
      SELECT id, tx_id AS txId, block_number AS blockNumber, timestamp, status, contract_address AS contractAddress, explorer_url AS explorerUrl, created_at AS createdAt
      FROM blockchain_records
      WHERE contract_id = ?
      ORDER BY datetime(created_at) DESC
      `
    )
    .all(contract.id);

  res.json({ items: records });
});

app.patch("/api/contracts/:id/status", authMiddleware, (req, res) => {
  const { status } = req.body || {};
  const allowed = new Set([
    "Pending",
    "Analyzing",
    "Compliant",
    "Non-Compliant",
    "Warning",
    "Review requested",
    "Review finalized",
    "Approved",
  ]);

  if (!allowed.has(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const contract = db
    .prepare("SELECT id, file_name AS fileName, user_id AS userId FROM contracts WHERE id = ?")
    .get(req.params.id);

  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const actor = req.auth.user;
  const canEdit = actor.role === "Admin" || actor.role === "Legal Reviewer" || contract.userId === actor.id;
  if (!canEdit) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (actor.role === "Client" && status !== "Review requested") {
    return res.status(403).json({ error: "Clients can only request review" });
  }
  if (actor.role === "Legal Reviewer" && status !== "Review finalized") {
    return res.status(403).json({ error: "Legal reviewers can only finalize review" });
  }
  if (actor.role === "Admin" && status !== "Approved") {
    return res.status(403).json({ error: "Admins can only approve contracts" });
  }

  db.prepare("UPDATE contracts SET status = ? WHERE id = ?").run(status, req.params.id);
  recordActivity({
    contractId: req.params.id,
    userId: actor.id,
    action: "contract.status_updated",
    details: { status },
  });

  return res.json({ id: req.params.id, status, fileName: contract.fileName });
});

app.post("/api/contracts/:id/share", authMiddleware, (req, res) => {
  const contract = db
    .prepare(
      `
      SELECT c.id, c.file_name AS fileName, c.status, c.risk_score AS riskScore, a.compliance_status AS complianceStatus
      FROM contracts c
      LEFT JOIN analyses a ON a.contract_id = c.id
      WHERE c.id = ?
      `
    )
    .get(req.params.id);

  if (!contract) return res.status(404).json({ error: "Contract not found" });

  const owner = db.prepare("SELECT user_id AS userId FROM contracts WHERE id = ?").get(req.params.id);
  if (!owner || !canAccessContract(req.auth.user, owner.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const shareText = [
    `ComplyChain analysis for ${contract.fileName}`,
    `Status: ${contract.status}`,
    `Compliance: ${contract.complianceStatus || "Pending"}`,
    `Risk Score: ${typeof contract.riskScore === "number" ? contract.riskScore : "N/A"}`,
    `Reviewed on: ${new Date().toLocaleString()}`,
  ].join("\n");

  recordActivity({
    contractId: req.params.id,
    userId: req.auth.user.id,
    action: "contract.shared",
    details: { status: contract.status },
  });

  res.json({ shareText });
});

app.get("/api/admin/users", authMiddleware, requireRole("Admin"), (_req, res) => {
  const users = db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at AS createdAt,
        COUNT(DISTINCT c.id) AS contractCount
      FROM users u
      LEFT JOIN contracts c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY datetime(u.created_at) DESC
      `
    )
    .all();

  res.json({ items: users });
});

app.post("/api/admin/users", authMiddleware, requireRole("Admin"), (req, res) => {
  const { name, email, password, role = "Client" } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters" });
  }

  try {
    const created = createUser({ name, email, password, role });
    recordActivity({
      userId: req.auth.user.id,
      action: "admin.user_created",
      details: { createdUserId: created.id, email: created.email, role: created.role },
    });
    res.status(201).json({ user: created });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    console.error("Admin user creation error:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/api/dashboard", authMiddleware, (req, res) => {
  const user = req.auth.user;
  const userFilterSql = user.role === "Client" ? "WHERE c.user_id = ?" : "";
  const userFilterParams = user.role === "Client" ? [user.id] : [];

  const totals = db
    .prepare(
      `
      SELECT
        COUNT(*) AS contractCount,
        SUM(CASE WHEN status = 'Compliant' THEN 1 ELSE 0 END) AS compliantCount,
        SUM(CASE WHEN status IN ('Warning', 'Non-Compliant') THEN 1 ELSE 0 END) AS flaggedCount,
        AVG(COALESCE(risk_score, 0)) AS averageRisk
      FROM contracts c
      ${userFilterSql}
      `
    )
    .get(...userFilterParams);

  const blockchainTotals = db
    .prepare(
      `
      SELECT COUNT(DISTINCT br.contract_id) AS verifiedCount
      FROM blockchain_records br
      JOIN contracts c ON c.id = br.contract_id
      ${userFilterSql}
      `
    )
    .get(...userFilterParams);

  const monthly = db
    .prepare(
      `
      SELECT
        strftime('%Y-%m', c.created_at) AS monthKey,
        SUM(CASE WHEN c.status = 'Compliant' THEN 1 ELSE 0 END) AS compliant,
        SUM(CASE WHEN c.status IN ('Warning', 'Non-Compliant') THEN 1 ELSE 0 END) AS nonCompliant
      FROM contracts c
      ${userFilterSql}
      GROUP BY monthKey
      ORDER BY monthKey DESC
      LIMIT 6
      `
    )
    .all(...userFilterParams)
    .reverse()
    .map((row) => ({
      name: formatMonth(row.monthKey),
      compliant: row.compliant || 0,
      nonCompliant: row.nonCompliant || 0,
    }));

  const frameworkDistribution = buildFrameworkDistribution(user.role === "Admin" ? null : user.id);

  const logs = db
    .prepare(
      `
      SELECT ca.action, ca.created_at AS createdAt, ca.details_json AS detailsJson, u.name AS actorName
      FROM contract_activity ca
      JOIN users u ON u.id = ca.user_id
      ORDER BY datetime(ca.created_at) DESC
      LIMIT 8
      `
    )
    .all()
    .map((row) => ({
      title: mapActivityTitle(row.action, row.actorName, row.detailsJson),
      date: row.createdAt,
      impact: mapActivityImpact(row.action),
    }));

  const reviewQueue = db
    .prepare(
      `
      SELECT file_name AS name, COALESCE(risk_score, 0) AS score, created_at AS createdAt, status
      FROM contracts
      WHERE status IN ('Warning', 'Non-Compliant', 'Review requested')
      ORDER BY COALESCE(risk_score, 0) DESC, datetime(created_at) DESC
      LIMIT 5
      `
    )
    .all()
    .map((row) => ({
      ...row,
      priority: row.score >= 70 ? "High" : row.score >= 40 ? "Medium" : "Low",
    }));

  const contracts = db
    .prepare(
      `
      SELECT
        c.id,
        c.file_name AS fileName,
        c.status,
        c.hash,
        c.created_at AS createdAt,
        COALESCE(c.risk_score, 0) AS riskScore,
        a.compliance_status AS complianceStatus,
        u.name AS ownerName
      FROM contracts c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN analyses a ON a.contract_id = c.id
      ${userFilterSql}
      ORDER BY datetime(c.created_at) DESC
      LIMIT 8
      `
    )
    .all(...userFilterParams);

  const totalUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const totalContracts = totals.contractCount || 0;
  const verifiedCount = blockchainTotals.verifiedCount || 0;
  const compliantCount = totals.compliantCount || 0;
  const flaggedCount = totals.flaggedCount || 0;
  const averageRisk = totals.averageRisk ? Number(totals.averageRisk) : 0;
  const complianceRate = totalContracts ? Math.round((compliantCount / totalContracts) * 100) : 0;

  const stats = user.role === "Admin"
    ? [
        { label: "System Health", value: `${totalContracts ? 100 : 100}%`, trend: "Live", tone: "positive" },
        { label: "Total Users", value: String(totalUsers), trend: `${totalUsers} active`, tone: "positive" },
        { label: "Contracts Stored", value: String(totalContracts), trend: `${verifiedCount} verified`, tone: "neutral" },
        { label: "Global Compliance", value: `${complianceRate}%`, trend: `${flaggedCount} flagged`, tone: flaggedCount ? "warning" : "positive" },
      ]
    : user.role === "Legal Reviewer"
      ? [
          { label: "Pending Review", value: String(reviewQueue.length), trend: `${flaggedCount} flagged`, tone: "warning" },
          { label: "Average Risk", value: `${Math.round(averageRisk)}/100`, trend: `${compliantCount} compliant`, tone: averageRisk >= 60 ? "warning" : "positive" },
          { label: "Risk Alerts", value: String(flaggedCount), trend: `${verifiedCount} verified`, tone: flaggedCount ? "warning" : "positive" },
          { label: "Completed Today", value: String(countTodayContracts(user.id)), trend: "Today", tone: "positive" },
        ]
      : [
          { label: "My Contracts", value: String(totalContracts), trend: `${verifiedCount} verified`, tone: "neutral" },
          { label: "Compliance Score", value: `${Math.max(0, 100 - Math.round(averageRisk))}%`, trend: `${compliantCount} compliant`, tone: "positive" },
          { label: "Active Risks", value: String(flaggedCount), trend: flaggedCount ? "Needs review" : "Clear", tone: flaggedCount ? "warning" : "positive" },
          { label: "Blockchain Verified", value: `${totalContracts ? Math.round((verifiedCount / totalContracts) * 100) : 0}%`, trend: `${verifiedCount}/${totalContracts}`, tone: "positive" },
        ];

  res.json({
    stats,
    monthly,
    frameworkDistribution,
    logs,
    reviewQueue,
    contracts,
  });
});

if (hasBuiltFrontend) {
  app.use(express.static(distDir));

  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(port, () => {
  console.log(`ComplyChain backend running on port ${port}`);
});

function mapComplianceStatus(complianceStatus, riskScore) {
  const status = String(complianceStatus || "").toLowerCase();
  const score = typeof riskScore === "number" ? riskScore : null;

  if (status.includes("non") || status.includes("fail")) return "Non-Compliant";
  if (status.includes("warning") || status.includes("review")) return "Warning";

  if (score !== null) {
    if (score >= 70) return "Non-Compliant";
    if (score >= 40) return "Warning";
    return "Compliant";
  }
  return "Pending";
}

function formatMonth(value) {
  if (!value) return "N/A";
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-US", { month: "short" });
}

function buildFrameworkDistribution(userId) {
  const rows = db
    .prepare(
      `
      SELECT a.issues_json AS issuesJson
      FROM analyses a
      JOIN contracts c ON c.id = a.contract_id
      ${userId ? "WHERE c.user_id = ?" : ""}
      `
    )
    .all(...(userId ? [userId] : []));

  const counts = { GDPR: 0, HIPAA: 0, CCPA: 0, SOC2: 0 };
  for (const row of rows) {
    const issues = JSON.parse(row.issuesJson || "[]");
    for (const issue of issues) {
      const text = `${issue.clause || ""} ${issue.description || ""} ${issue.recommendation || ""}`.toUpperCase();
      if (text.includes("GDPR")) counts.GDPR += 1;
      if (text.includes("HIPAA")) counts.HIPAA += 1;
      if (text.includes("CCPA")) counts.CCPA += 1;
      if (text.includes("SOC2") || text.includes("SOC 2")) counts.SOC2 += 1;
    }
  }

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function mapActivityTitle(action, actorName, detailsJson) {
  const details = JSON.parse(detailsJson || "{}");
  switch (action) {
    case "contract.created":
      return `${actorName} uploaded ${details.fileName || "a contract"}`;
    case "contract.analyzed":
      return `${actorName} completed an AI analysis`;
    case "contract.blockchain_registered":
      return `${actorName} registered a contract on blockchain`;
    case "contract.shared":
      return `${actorName} shared an analysis`;
    case "contract.status_updated":
      return `${actorName} changed contract status to ${details.status || "updated"}`;
    case "admin.user_created":
      return `${actorName} added a new ${details.role || "user"} account`;
    case "user.signup":
      return `${actorName} created an account`;
    default:
      return `${actorName} performed ${action}`;
  }
}

function mapActivityImpact(action) {
  if (action.includes("user_created") || action.includes("shared")) return "Medium";
  if (action.includes("status_updated") || action.includes("blockchain")) return "High";
  return "Low";
}

function countTodayContracts(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM contracts
      WHERE user_id = ? AND datetime(created_at) >= datetime(?)
      `
    )
    .get(userId, start.toISOString()).count;
}
