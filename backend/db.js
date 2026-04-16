import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("backend", "data");
const dbPath = path.join(dataDir, "complychain.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size TEXT NOT NULL,
      hash TEXT NOT NULL,
      status TEXT NOT NULL,
      risk_score REAL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL UNIQUE,
      overall_risk_score REAL,
      compliance_status TEXT,
      issues_json TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blockchain_records (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      tx_id TEXT NOT NULL,
      block_number INTEGER,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL,
      contract_address TEXT,
      explorer_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contract_activity (
      id TEXT PRIMARY KEY,
      contract_id TEXT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
    CREATE INDEX IF NOT EXISTS idx_blockchain_contract_id ON blockchain_records(contract_id);
    CREATE INDEX IF NOT EXISTS idx_contract_activity_contract_id ON contract_activity(contract_id);
    CREATE INDEX IF NOT EXISTS idx_contract_activity_created_at ON contract_activity(created_at);
  `);
};
