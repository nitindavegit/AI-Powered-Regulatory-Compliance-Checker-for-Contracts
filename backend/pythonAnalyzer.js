import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const appVenvPython = path.join(appRoot, ".venv", "Scripts", "python.exe");
const pythonExecutable = process.env.PYTHON_EXECUTABLE || (fs.existsSync(appVenvPython) ? appVenvPython : "python");
const bridgeScript = path.join(__dirname, "model_bridge.py");

const RISK_SCORES = {
  "LOW RISK": 20,
  "MEDIUM RISK": 55,
  "HIGH RISK": 80,
  "CRITICAL RISK": 95,
};

const STATUS_PRIORITY = {
  COMPLIANT: 0,
  RISKY: 1,
  AMBIGUOUS: 2,
  "NON-COMPLIANT": 3,
};

export const analyzeWithLocalModel = async ({ text, fileName, fileContentBase64 }) => {
  const raw = await runBridge({ text, fileName, fileContentBase64 });
  return normalizeAnalysis(raw);
};

function runBridge(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, [bridgeScript], {
      cwd: appRoot,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start Python analyzer: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python analyzer exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(extractJson(stdout)));
      } catch (error) {
        reject(new Error(`Invalid JSON from Python analyzer: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function extractJson(output) {
  const trimmed = String(output || "").trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object found in Python analyzer output.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function normalizeAnalysis(raw) {
  const clauses = Array.isArray(raw?.clauses) ? raw.clauses : [];
  const missingClauses = Array.isArray(raw?.missing_clauses) ? raw.missing_clauses : [];
  const overallRisk = String(raw?.overall_contract_risk || "MEDIUM RISK").toUpperCase();

  const issues = clauses.map((clause) => ({
    clause: clause.category || "Clause Review",
    status: mapIssueStatus(clause.compliance_status),
    description: clause.issue || buildClauseDescription(clause),
    recommendation: clause.recommended_clause || "",
    clauseText: clause.clause_text || "",
    regulation: Array.isArray(clause.regulation) ? clause.regulation : [],
    complianceStatus: clause.compliance_status || "UNKNOWN",
    riskLevel: clause.risk_level || "MEDIUM RISK",
  }));

  for (const missingClause of missingClauses) {
    issues.push({
      clause: missingClause,
      status: "Missing",
      description: `${missingClause} is missing or insufficiently addressed in the uploaded contract.`,
      recommendation: `Add a dedicated ${missingClause.toLowerCase()} clause with explicit obligations, scope, and timing requirements.`,
      clauseText: "",
      regulation: [],
      complianceStatus: "MISSING",
      riskLevel: "HIGH RISK",
    });
  }

  return {
    overallRiskScore: RISK_SCORES[overallRisk] ?? deriveRiskScore(clauses, missingClauses.length),
    complianceStatus: deriveComplianceStatus(clauses, missingClauses.length, overallRisk),
    issues,
    summary: raw?.summary || "",
    missingClauses,
    meta: {
      source: "local-model",
      overallContractRisk: raw?.overall_contract_risk || overallRisk,
      analyzedClauseCount: clauses.length,
    },
    raw,
  };
}

function mapIssueStatus(complianceStatus) {
  const status = String(complianceStatus || "").toUpperCase();
  if (status === "COMPLIANT") return "Compliant";
  if (status === "NON-COMPLIANT") return "Missing";
  return "Risk";
}

function deriveRiskScore(clauses, missingCount) {
  let score = 20 + missingCount * 8;

  for (const clause of clauses) {
    const status = String(clause?.compliance_status || "").toUpperCase();
    if (status === "COMPLIANT") score += 0;
    else if (status === "RISKY") score += 10;
    else if (status === "AMBIGUOUS") score += 14;
    else if (status === "NON-COMPLIANT") score += 20;
  }

  return Math.max(0, Math.min(100, score));
}

function deriveComplianceStatus(clauses, missingCount, overallRisk) {
  if (overallRisk === "CRITICAL RISK") return "Non-Compliant";

  let worstStatus = "COMPLIANT";
  for (const clause of clauses) {
    const current = String(clause?.compliance_status || "COMPLIANT").toUpperCase();
    if ((STATUS_PRIORITY[current] ?? -1) > STATUS_PRIORITY[worstStatus]) {
      worstStatus = current;
    }
  }

  if (missingCount > 0 || worstStatus === "NON-COMPLIANT") return "Non-Compliant";
  if (worstStatus === "AMBIGUOUS" || worstStatus === "RISKY" || overallRisk === "MEDIUM RISK") {
    return "Review Needed";
  }
  return "Compliant";
}

function buildClauseDescription(clause) {
  const category = clause?.category || "Clause";
  const riskLevel = clause?.risk_level || "MEDIUM RISK";
  const regulations = Array.isArray(clause?.regulation) && clause.regulation.length > 0
    ? clause.regulation.join(", ")
    : "GENERAL";
  return `${category} was classified as ${riskLevel} against ${regulations} requirements.`;
}
