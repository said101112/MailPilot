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

export const CV_STORAGE_KEY = "truck-app-cv-base64";
export const CV_FILENAME_KEY = "truck-app-cv-filename";
export const WORKSPACE_CV_EVENT = "truckapply-cv-updated";

export function readStoredCv(): { base64: string; fileName: string } {
  if (typeof window === "undefined") {
    return { base64: "", fileName: "" };
  }

  return {
    base64: localStorage.getItem(CV_STORAGE_KEY) || "",
    fileName: localStorage.getItem(CV_FILENAME_KEY) || "",
  };
}

export function writeStoredCv(base64: string, fileName: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CV_STORAGE_KEY, base64);
  localStorage.setItem(CV_FILENAME_KEY, fileName);
  window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
}

export function removeStoredCv() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CV_STORAGE_KEY);
  localStorage.removeItem(CV_FILENAME_KEY);
  window.dispatchEvent(new Event(WORKSPACE_CV_EVENT));
}

