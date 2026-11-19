import type { DraftStorePort, StoredDraftBundle } from "../../application/ports/DraftStorePort";

const DB_NAME = "pdfcraft_studio_db";
const STORE_NAME = "drafts";
const LATEST_KEY = "latest";
const DB_VERSION = 1;

/** IndexedDB private draft storage with transparent in-memory fallback when restricted. */
export class IndexedDbDraftAdapter implements DraftStorePort {
  private memoryFallback: StoredDraftBundle | null = null;

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async saveDraft(bundle: StoredDraftBundle): Promise<void> {
    this.memoryFallback = bundle;
    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(bundle, LATEST_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  public async loadLatestDraft(): Promise<StoredDraftBundle | null> {
    const db = await this.openDb();
    if (!db) return this.memoryFallback;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(LATEST_KEY);
        req.onsuccess = () => {
          const res = req.result as StoredDraftBundle | undefined;
          db.close();
          resolve(res ?? this.memoryFallback);
        };
        req.onerror = () => {
          db.close();
          resolve(this.memoryFallback);
        };
      } catch {
        db.close();
        resolve(this.memoryFallback);
      }
    });
  }

  public async clearDraft(): Promise<void> {
    this.memoryFallback = null;
    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(LATEST_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }
}
