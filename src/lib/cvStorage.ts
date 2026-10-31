export interface CvProfile {
  id: string;
  label: string;
  fileName: string;
  base64: string;
  updatedAt?: string;
}

const DB_NAME = "TruckAppCVStore";
const DB_VERSION = 1;
const STORE_NAME = "cv_profiles";

// In-memory cache for synchronous access throughout the application
let memoryCache: CvProfile[] = [];
let isInitialized = false;
let initPromise: Promise<CvProfile[]> | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function initCvStore(onUpdate?: () => void): Promise<CvProfile[]> {
  if (typeof window === "undefined") return [];
  if (isInitialized) return memoryCache;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await openDB();
      const items = await new Promise<CvProfile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as CvProfile[]) || []);
        req.onerror = () => reject(req.error);
      });

      if (items.length > 0) {
        memoryCache = items;
      } else {
        // Migration from localStorage if IndexedDB is empty
        try {
          const raw = localStorage.getItem("truck-app-cv-library");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memoryCache = parsed;
              await syncAllToIndexedDB(parsed);
              // Clean up localStorage to free quota immediately
              try {
                localStorage.removeItem("truck-app-cv-library");
              } catch {}
            }
          } else {
            const legacyBase64 = localStorage.getItem("truck-app-cv-base64");
            const legacyFileName = localStorage.getItem("truck-app-cv-filename");
            if (legacyBase64 && legacyFileName) {
              const single: CvProfile = {
                id: "cv_default",
                label: "CV Principal",
                fileName: legacyFileName,
                base64: legacyBase64,
                updatedAt: new Date().toISOString(),
              };
              memoryCache = [single];
              await syncAllToIndexedDB([single]);
            }
          }
        } catch (e) {
          console.warn("Migration to IndexedDB warning:", e);
        }
      }

      isInitialized = true;
      if (onUpdate) onUpdate();
      return memoryCache;
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      return memoryCache;
    }
  })();

  return initPromise;
}

export async function syncAllToIndexedDB(items: CvProfile[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        let pending = items.length;
        if (pending === 0) {
          resolve();
          return;
        }
        for (const item of items) {
          const putReq = store.put(item);
          putReq.onsuccess = () => {
            pending -= 1;
            if (pending === 0) resolve();
          };
          putReq.onerror = () => reject(putReq.error);
        }
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (err) {
    console.error("Failed to sync items to IndexedDB:", err);
  }
}

export async function putCvProfileIndexedDB(profile: CvProfile): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(profile);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to put item in IndexedDB:", err);
  }
}

export async function deleteCvProfileIndexedDB(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to delete item from IndexedDB:", err);
  }
}

export function getCachedCvLibrary(): CvProfile[] {
  return memoryCache;
}

export function setCachedCvLibrary(items: CvProfile[]) {
  memoryCache = items;
}
