import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import { IStorageAdapter, MemoryStorageAdapter } from "./src/db/storageAdapter";

// Establish stable database path in user home directory
const getDbPath = () => {
  const homeDir = os.homedir();
  const dir = path.join(homeDir, ".omnisync-suite");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "omnisync.db");
};

export class SQLiteStorageAdapter implements IStorageAdapter {
  private db: any = null;

  init(): void {
    if (this.db) return;
    const dbPath = getDbPath();
    console.log(`[OmniSync DB] Initialising SQLite database at: ${dbPath}`);
    
    this.db = new Database(dbPath);
    try {
      this.db.pragma("journal_mode = WAL");
    } catch (e) {
      console.warn("[OmniSync DB] WAL mode pragma warning:", e);
    }

    this.db.exec(`
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
  }

  getSetting(key: string): any {
    if (!this.db) this.init();
    const statement = this.db.prepare("SELECT value FROM settings WHERE key = ?");
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

  setSetting(key: string, value: any): void {
    if (!this.db) this.init();
    const stringifiedValue = typeof value === "object" ? JSON.stringify(value) : String(value);
    const statement = this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    statement.run(key, stringifiedValue);
  }

  getAllSettings(): Record<string, any> {
    if (!this.db) this.init();
    const statement = this.db.prepare("SELECT key, value FROM settings");
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

  deleteSetting(key: string): void {
    if (!this.db) this.init();
    const statement = this.db.prepare("DELETE FROM settings WHERE key = ?");
    statement.run(key);
  }

  saveReport(id: string, timestamp: string, config: any, summary: any, issues: any): void {
    if (!this.db) this.init();
    const statement = this.db.prepare(`
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

  getAllReports(): any[] {
    if (!this.db) this.init();
    const statement = this.db.prepare("SELECT * FROM reports ORDER BY timestamp DESC");
    const rows = statement.all();
    return rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      config: JSON.parse(row.config),
      summary: JSON.parse(row.summary),
      issues: JSON.parse(row.issues),
    }));
  }

  deleteReport(id: string): void {
    if (!this.db) this.init();
    const statement = this.db.prepare("DELETE FROM reports WHERE id = ?");
    statement.run(id);
  }

  getStorageType(): "sqlite" {
    return "sqlite";
  }
}

// Active storage adapter singleton with resilience fallback
let activeAdapter: IStorageAdapter;

export function initDatabase(): IStorageAdapter {
  if (activeAdapter) return activeAdapter;

  try {
    const sqliteAdapter = new SQLiteStorageAdapter();
    sqliteAdapter.init();
    activeAdapter = sqliteAdapter;
  } catch (err) {
    console.warn("[OmniSync DB] SQLite initialization failed, engaging in-memory adapter fallback:", err);
    activeAdapter = new MemoryStorageAdapter();
    activeAdapter.init();
  }

  return activeAdapter;
}

export function getActiveStorageAdapter(): IStorageAdapter {
  if (!activeAdapter) {
    return initDatabase();
  }
  return activeAdapter;
}

// Global exported handlers matching the existing API contract
export function getSetting(key: string): any {
  return getActiveStorageAdapter().getSetting(key);
}

export function setSetting(key: string, value: any): void {
  getActiveStorageAdapter().setSetting(key, value);
}

export function getAllSettings(): Record<string, any> {
  return getActiveStorageAdapter().getAllSettings();
}

export function deleteSetting(key: string): void {
  getActiveStorageAdapter().deleteSetting(key);
}

export function saveReport(id: string, timestamp: string, config: any, summary: any, issues: any): void {
  getActiveStorageAdapter().saveReport(id, timestamp, config, summary, issues);
}

export function getAllReports(): any[] {
  return getActiveStorageAdapter().getAllReports();
}

export function deleteReport(id: string): void {
  getActiveStorageAdapter().deleteReport(id);
}
