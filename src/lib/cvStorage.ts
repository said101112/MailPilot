import { supabase } from "@/lib/supabase";

export interface CvProfile {
  id: string;
  label: string;
  fileName: string;
  base64: string;
  updatedAt?: string;
  isDefault?: boolean;
}

const DB_NAME = "TruckAppCVStore";
const DB_VERSION = 1;
const STORE_NAME = "cv_profiles";

// In-memory cache for synchronous access throughout the application
let memoryCache: CvProfile[] = [];
let isInitialized = false;
let initPromise: Promise<CvProfile[]> | null = null;
let isCloudSyncAvailable = false;
let isCloudSyncing = false;

export function getCloudSyncStatus(): { available: boolean; syncing: boolean } {
  return { available: isCloudSyncAvailable, syncing: isCloudSyncing };
}

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
      // 1. Load instantly from local IndexedDB (zero latency, offline ready)
      const db = await openDB();
      const localItems = await new Promise<CvProfile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as CvProfile[]) || []);
        req.onerror = () => reject(req.error);
      });

      if (localItems.length > 0) {
        memoryCache = localItems;
      } else {
        // Migration from localStorage if IndexedDB is empty
        try {
          const raw = localStorage.getItem("truck-app-cv-library");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              memoryCache = parsed;
              await syncAllToIndexedDB(parsed);
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

      // 2. Background Cloud Sync with Supabase
      void syncWithSupabase(onUpdate);

      return memoryCache;
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      void syncWithSupabase(onUpdate);
      return memoryCache;
    }
  })();

  return initPromise;
}

export async function syncWithSupabase(onUpdate?: () => void): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    isCloudSyncing = true;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      isCloudSyncing = false;
      return false;
    }

    // Try fetching from public.user_cvs
    const { data: remoteRows, error } = await supabase
      .from("user_cvs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      // Table doesn't exist yet in Supabase
      isCloudSyncAvailable = false;
      isCloudSyncing = false;
      return false;
    }

    isCloudSyncAvailable = true;

    const remoteProfiles: CvProfile[] = (remoteRows || []).map((row) => ({
      id: row.id,
      label: row.label,
      fileName: row.file_name,
      base64: row.base64,
      updatedAt: row.updated_at,
      isDefault: Boolean(row.is_default),
    }));

    // Bidirectional sync:
    // A. If Supabase has profiles that local is missing -> merge into local
    const remoteMap = new Map(remoteProfiles.map((p) => [p.id, p]));
    const localMap = new Map(memoryCache.map((p) => [p.id, p]));

    let hasChanges = false;
    const merged: CvProfile[] = [...remoteProfiles];

    // B. If local has profiles that are missing in Supabase -> upload them to Supabase!
    for (const localItem of memoryCache) {
      if (!remoteMap.has(localItem.id)) {
        merged.push(localItem);
        hasChanges = true;
        // Upload to Supabase so phone sees them
        await supabase.from("user_cvs").insert({
          id: localItem.id,
          user_id: user.id,
          label: localItem.label,
          file_name: localItem.fileName,
          base64: localItem.base64,
          is_default: Boolean(localItem.isDefault),
          updated_at: localItem.updatedAt || new Date().toISOString(),
        });
      }
    }

    if (remoteProfiles.length > 0 || hasChanges) {
      memoryCache = merged;
      await syncAllToIndexedDB(merged);
      if (onUpdate) onUpdate();
    }

    isCloudSyncing = false;
    return true;
  } catch (err) {
    console.warn("Supabase cloud sync error:", err);
    isCloudSyncing = false;
    return false;
  }
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

    // Cloud sync to Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_cvs").upsert({
        id: profile.id,
        user_id: user.id,
        label: profile.label,
        file_name: profile.fileName,
        base64: profile.base64,
        is_default: Boolean(profile.isDefault),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn("IndexedDB or Supabase put error:", err);
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

    // Cloud delete from Supabase
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from("user_cvs").delete().eq("id", id).eq("user_id", user.id);
    }
  } catch (err) {
    console.warn("IndexedDB or Supabase delete error:", err);
  }
}

export function getCachedCvLibrary(): CvProfile[] {
  return memoryCache;
}

export function setCachedCvLibrary(items: CvProfile[]) {
  memoryCache = items;
}
