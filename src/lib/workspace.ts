import { PROFILE_DEFAULT_NAME } from "@/lib/brand";

const PROFILE_NAME_KEY = "truck-app-candidate-name";
const SIDEBAR_COLLAPSED_KEY = "truck-app-sidebar-collapsed";

export const WORKSPACE_PROFILE_EVENT = "truckapply-profile-updated";
export const WORKSPACE_SIDEBAR_EVENT = "truckapply-sidebar-updated";

export function readCandidateName() {
  if (typeof window === "undefined") {
    return PROFILE_DEFAULT_NAME;
  }

  return localStorage.getItem(PROFILE_NAME_KEY) || PROFILE_DEFAULT_NAME;
}

export function writeCandidateName(nextName: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PROFILE_NAME_KEY, nextName);
  window.dispatchEvent(new Event(WORKSPACE_PROFILE_EVENT));
}

export function readSidebarCollapsed() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function writeSidebarCollapsed(nextValue: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextValue));
  window.dispatchEvent(new Event(WORKSPACE_SIDEBAR_EVENT));
}

export function toggleSidebarCollapsed() {
  const nextValue = !readSidebarCollapsed();
  writeSidebarCollapsed(nextValue);
  return nextValue;
}

import {
  initCvStore,
  syncAllToIndexedDB,
  putCvProfileIndexedDB,
  deleteCvProfileIndexedDB,
  getCachedCvLibrary,
  setCachedCvLibrary,
  syncWithSupabase,
  getCloudSyncStatus,
  type CvProfile,
} from "./cvStorage";

export type { CvProfile };
export { syncWithSupabase, getCloudSyncStatus };

export const CV_STORAGE_KEY = "truck-app-cv-base64";
export const CV_FILENAME_KEY = "truck-app-cv-filename";
export const CV_LIBRARY_STORAGE_KEY = "truck-app-cv-library";
export const ACTIVE_CV_ID_KEY = "truck-app-active-cv-id";
export const WORKSPACE_CV_EVENT = "truckapply-cv-updated";

// Auto-initialize IndexedDB on browser load and notify listeners when ready
if (typeof window !== "undefined") {
  void initCvStore(() => {
    window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
  });
}

export function readStoredCvLibrary(): CvProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  const cached = getCachedCvLibrary();
  if (cached && cached.length > 0) {
    return cached;
  }

  // Fallback: check if localStorage still has un-migrated items
  try {
    const raw = localStorage.getItem(CV_LIBRARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCachedCvLibrary(parsed);
        void syncAllToIndexedDB(parsed);
        try {
          localStorage.removeItem(CV_LIBRARY_STORAGE_KEY);
        } catch {}
        return parsed;
      }
    }
  } catch {}

  // Auto-migration from legacy single CV if library is empty
  try {
    const legacyBase64 = localStorage.getItem(CV_STORAGE_KEY);
    const legacyFileName = localStorage.getItem(CV_FILENAME_KEY);
    if (legacyBase64 && legacyFileName) {
      const migrated: CvProfile = {
        id: "cv_default",
        label: "CV Principal",
        fileName: legacyFileName,
        base64: legacyBase64,
        updatedAt: new Date().toISOString(),
      };
      setCachedCvLibrary([migrated]);
      void syncAllToIndexedDB([migrated]);
      return [migrated];
    }
  } catch {}

  return [];
}

export function writeStoredCvLibrary(library: CvProfile[]) {
  if (typeof window === "undefined") return;

  // 1. Update in-memory cache instantly
  setCachedCvLibrary(library);

  // 2. Persist to IndexedDB (virtually unlimited quota for PDF files)
  void syncAllToIndexedDB(library);

  // 3. Remove large JSON from localStorage to permanently avoid QuotaExceededError
  try {
    localStorage.removeItem(CV_LIBRARY_STORAGE_KEY);
  } catch {}

  // 4. Save lightweight metadata only (no heavy base64 strings)
  try {
    const metadata = library.map(({ id, label, fileName, updatedAt }) => ({
      id,
      label,
      fileName,
      updatedAt,
    }));
    localStorage.setItem("truck-app-cv-library-meta", JSON.stringify(metadata));
  } catch {}

  window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
}

export function readActiveCvId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(ACTIVE_CV_ID_KEY);
  if (id) return id;
  const library = readStoredCvLibrary();
  return library.length > 0 ? library[0].id : null;
}

export function writeActiveCvId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_CV_ID_KEY, id);
  } catch {}

  // Sync legacy keys safely without failing if base64 is large
  const library = readStoredCvLibrary();
  const active = library.find((c) => c.id === id);
  if (active) {
    try {
      localStorage.setItem(CV_STORAGE_KEY, active.base64);
      localStorage.setItem(CV_FILENAME_KEY, active.fileName);
    } catch {
      // Ignored: base64 is already safe in IndexedDB
    }
  }
  window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
}

export function getActiveCv(): CvProfile | null {
  const library = readStoredCvLibrary();
  if (library.length === 0) return null;
  const activeId = readActiveCvId();
  return library.find((c) => c.id === activeId) || library[0] || null;
}

export function upsertCvProfile(profile: CvProfile, setActive = true) {
  if (typeof window === "undefined") return;
  const library = readStoredCvLibrary();
  const existingIndex = library.findIndex((c) => c.id === profile.id);
  let updated: CvProfile[];
  if (existingIndex >= 0) {
    updated = [...library];
    updated[existingIndex] = { ...profile, updatedAt: new Date().toISOString() };
  } else {
    updated = [...library, { ...profile, updatedAt: new Date().toISOString() }];
  }

  setCachedCvLibrary(updated);
  void putCvProfileIndexedDB(profile);

  // Clean heavy base64 from localStorage
  try {
    localStorage.removeItem(CV_LIBRARY_STORAGE_KEY);
  } catch {}

  if (setActive) {
    writeActiveCvId(profile.id);
  } else {
    window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
  }
}

export function removeCvProfile(id: string) {
  if (typeof window === "undefined") return;
  const library = readStoredCvLibrary();
  const remaining = library.filter((c) => c.id !== id);
  setCachedCvLibrary(remaining);
  void deleteCvProfileIndexedDB(id);

  if (readActiveCvId() === id) {
    if (remaining.length > 0) {
      writeActiveCvId(remaining[0].id);
    } else {
      try {
        localStorage.removeItem(ACTIVE_CV_ID_KEY);
        localStorage.removeItem(CV_STORAGE_KEY);
        localStorage.removeItem(CV_FILENAME_KEY);
      } catch {}
      window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
    }
  } else {
    window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
  }
}

export function readStoredCv(): { base64: string; fileName: string } {
  if (typeof window === "undefined") {
    return { base64: "", fileName: "" };
  }

  const active = getActiveCv();
  if (active) {
    return { base64: active.base64, fileName: active.fileName };
  }

  try {
    return {
      base64: localStorage.getItem(CV_STORAGE_KEY) || "",
      fileName: localStorage.getItem(CV_FILENAME_KEY) || "",
    };
  } catch {
    return { base64: "", fileName: "" };
  }
}

export function writeStoredCv(base64: string, fileName: string, label?: string) {
  if (typeof window === "undefined") {
    return;
  }

  const activeId = readActiveCvId() || `cv_${Date.now()}`;
  const library = readStoredCvLibrary();
  const existing = library.find((c) => c.id === activeId);

  const profile: CvProfile = {
    id: activeId,
    label: label || existing?.label || (fileName.replace(/\.pdf$/i, "") || "CV Principal"),
    fileName,
    base64,
    updatedAt: new Date().toISOString(),
  };

  upsertCvProfile(profile, true);

  try {
    localStorage.setItem(CV_STORAGE_KEY, base64);
    localStorage.setItem(CV_FILENAME_KEY, fileName);
  } catch {
    // Quota safe - IndexedDB already holds the data
  }
}

export function removeStoredCv(id?: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (id) {
    removeCvProfile(id);
    return;
  }

  const activeId = readActiveCvId();
  if (activeId) {
    removeCvProfile(activeId);
  } else {
    try {
      localStorage.removeItem(CV_STORAGE_KEY);
      localStorage.removeItem(CV_FILENAME_KEY);
      localStorage.removeItem(ACTIVE_CV_ID_KEY);
    } catch {}
    window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
  }
}

