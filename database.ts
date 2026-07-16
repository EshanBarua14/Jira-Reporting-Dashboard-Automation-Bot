import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

// Establish stable database path in user home directory
const getDbPath = () => {
  const homeDir = os.homedir();
  const dir = path.join(homeDir, ".omnisync-suite");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "omnisync.db");
};

let db: any = null;

export function initDatabase() {
  if (db) return db;

  const dbPath = getDbPath();
  console.log(`[OmniSync DB] Initialising SQLite database at: ${dbPath}`);
  
  db = new Database(dbPath, { verbose: console.log });

  // Create robust schema for key-value settings and detailed report history
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      config TEXT,
      summary TEXT,
      issues TEXT
    );
  `);

  console.log("[OmniSync DB] SQLite tables verified and ready.");
  return db;
}

// Settings handlers
export function getSetting(key: string): any {
  const statement = db.prepare("SELECT value FROM settings WHERE key = ?");
  const row = statement.get(key);
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return null;
}

export function setSetting(key: string, value: any): void {
  const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
  const statement = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  statement.run(key, stringifiedValue);
}

export function getAllSettings(): Record<string, any> {
  const statement = db.prepare("SELECT key, value FROM settings");
  const rows = statement.all();
  const settings: Record<string, any> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

export function deleteSetting(key: string): void {
  const statement = db.prepare("DELETE FROM settings WHERE key = ?");
  statement.run(key);
}

// Report history handlers
export function saveReport(id: string, timestamp: string, config: any, summary: any, issues: any): void {
  const statement = db.prepare(`
    INSERT OR REPLACE INTO reports (id, timestamp, config, summary, issues)
    VALUES (?, ?, ?, ?, ?)
  `);
  statement.run(
    id,
    timestamp,
    JSON.stringify(config),
    JSON.stringify(summary),
    JSON.stringify(issues)
  );
}

export function getAllReports(): any[] {
  const statement = db.prepare("SELECT * FROM reports ORDER BY timestamp DESC");
  const rows = statement.all();
  return rows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp,
    config: JSON.parse(row.config),
    summary: JSON.parse(row.summary),
    issues: JSON.parse(row.issues),
  }));
}

export function deleteReport(id: string): void {
  const statement = db.prepare("DELETE FROM reports WHERE id = ?");
  statement.run(id);
}
