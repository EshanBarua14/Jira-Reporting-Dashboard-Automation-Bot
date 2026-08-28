/**
 * OmniSync Suite - Universal Storage Adapter Layer
 * 
 * Provides a unified, polymorphic interface for persistence:
 * - SQLiteStorageAdapter: Embedded SQLite for Desktop/Electron & Local Node.js instances
 * - MemoryStorageAdapter: High-speed, lock-free in-memory fallback for container testing & ephemerality
 * - CloudSqlStorageAdapter (Interface): Stub & hooks for Cloud SQL (PostgreSQL) / Firestore SaaS extensions
 */

export interface IStorageAdapter {
  init(): Promise<void> | void;
  getSetting(key: string): any;
  setSetting(key: string, value: any): void;
  getAllSettings(): Record<string, any>;
  deleteSetting(key: string): void;
  saveReport(id: string, timestamp: string, config: any, summary: any, issues: any): void;
  getAllReports(): any[];
  deleteReport(id: string): void;
  getStorageType(): "sqlite" | "memory" | "cloudsql" | "firestore";
}

/**
 * In-Memory Fallback Adapter (Zero native dependencies, guaranteed uptime)
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private settings = new Map<string, any>();
  private reports = new Map<string, any>();

  init(): void {
    // Ready immediately
  }

  getSetting(key: string): any {
    return this.settings.get(key) ?? null;
  }

  setSetting(key: string, value: any): void {
    this.settings.set(key, value);
  }

  getAllSettings(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const [k, v] of this.settings.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  deleteSetting(key: string): void {
    this.settings.delete(key);
  }

  saveReport(id: string, timestamp: string, config: any, summary: any, issues: any): void {
    this.reports.set(id, { id, timestamp, config, summary, issues });
  }

  getAllReports(): any[] {
    return Array.from(this.reports.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  deleteReport(id: string): void {
    this.reports.delete(id);
  }

  getStorageType(): "memory" {
    return "memory";
  }
}
