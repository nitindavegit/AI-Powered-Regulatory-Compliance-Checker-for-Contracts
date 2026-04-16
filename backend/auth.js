import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_TTL_DAYS = 7;

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, key] = storedHash.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(key, "hex");
  const right = Buffer.from(derived, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const createToken = () => crypto.randomBytes(32).toString("hex");

export const createUser = ({ name, email, password, role }) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (@id, @name, @email, @passwordHash, @role, @createdAt)
  `);

  stmt.run({
    id,
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdAt: now,
  });

  return { id, name, email: email.toLowerCase().trim(), role, createdAt: now };
};

export const signInUser = ({ email, password }) => {
  const user = db
    .prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const token = createToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, user.id, now.toISOString(), expires.toISOString());

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    expiresAt: expires.toISOString(),
  };
};

export const createSessionForUser = (userId) => {
  const token = createToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, now.toISOString(), expires.toISOString());

  return { token, expiresAt: expires.toISOString() };
};

export const getSessionUser = (token) => {
  if (!token) return null;

  const row = db
    .prepare(
      `
      SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      `
    )
    .get(token);

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    token: row.token,
    expiresAt: row.expires_at,
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
  };
};

export const deleteSession = (token) => {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
};

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const session = getSessionUser(token);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.auth = session;
  next();
};
