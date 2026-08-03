// IndexedDB Offline Cache Engine for Enterprise Metrics & Jira Issues

const DB_NAME = "omnisync_offline_db";
const DB_VERSION = 1;
const STORE_REPORTS = "reports";
const STORE_METRICS = "metrics";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject("IndexedDB not supported");
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_METRICS)) {
        db.createObjectStore(STORE_METRICS, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheReportInIndexedDB(reportId: string, reportData: any): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_REPORTS, "readwrite");
    const store = tx.objectStore(STORE_REPORTS);
    store.put({
      id: reportId,
      timestamp: new Date().toISOString(),
      data: reportData,
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("IndexedDB caching error:", err);
    return false;
  }
}

export async function getReportFromIndexedDB(reportId: string): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_REPORTS, "readonly");
    const store = tx.objectStore(STORE_REPORTS);
    const request = store.get(reportId);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("IndexedDB read error:", err);
    return null;
  }
}

export async function cacheMetricsInIndexedDB(key: string, metrics: any): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METRICS, "readwrite");
    const store = tx.objectStore(STORE_METRICS);
    store.put({
      key,
      timestamp: new Date().toISOString(),
      data: metrics,
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("IndexedDB metrics cache error:", err);
    return false;
  }
}

export async function getMetricsFromIndexedDB(key: string): Promise<any | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METRICS, "readonly");
    const store = tx.objectStore(STORE_METRICS);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Service Worker Registration Helper
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("OmniSync ServiceWorker registered:", reg.scope))
        .catch((err) => console.log("ServiceWorker registration failed:", err));
    });
  }
}
