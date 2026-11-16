"use client";

import { sendDirectApplication, sendApplication, createDirectDraftApplication } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { syncEmailDispatchToTracker } from "@/lib/tracker/syncService";
import { formatEmailToHtml, stripEmailFormatting } from "@/lib/emailPersonalizer";
import { readStoredCv, readStoredCvLibrary, getActiveCv } from "@/lib/workspace";
import { generateCoverLetterPdf } from "@/lib/coverLetterPdf";

export interface ScheduledEmail {
  id: string;
  created_at: string;
  scheduled_at: string; // ISO date-time
  status: "pending" | "sent" | "failed" | "cancelled";
  recipient_email: string;
  company_name: string;
  position: string;
  candidate_name: string;
  subject: string;
  message: string;
  cv_id?: string;
  cv_filename?: string;
  cv_base64?: string;
  has_cover_letter?: boolean;
  cover_letter_filename?: string;
  cover_letter_base64?: string;
  extra_attachment_filename?: string;
  extra_attachment_base64?: string;
  channel: "direct" | "draft_smtp" | "draft_n8n" | "draft";
  batch_id?: string;
  batch_name?: string;
  error_message?: string;
  sent_at?: string;
}

const STORAGE_KEY = "mailpilot_scheduled_emails";
export const SCHEDULED_UPDATED_EVENT = "mailpilot_scheduled_updated";

// In-memory cache to ensure items are never lost during the session even if localStorage is full
let memoryScheduledCache: ScheduledEmail[] = [];

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SCHEDULED_UPDATED_EVENT));
  }
}

/**
 * Strips heavy PDF/file base64 from items before saving to localStorage.
 * Keeps payload ~300 bytes per email instead of 2 MB, preventing QuotaExceededError.
 * CVs and cover letters are resolved dynamically at dispatch time from IndexedDB.
 */
function sanitizeForStorage(item: ScheduledEmail): ScheduledEmail {
  const copy: ScheduledEmail = { ...item };
  if (copy.cover_letter_base64) {
    copy.has_cover_letter = true;
    delete copy.cover_letter_base64;
  }
  // NEVER keep heavy cv_base64 in localStorage - CV is resolved at runtime from IndexedDB
  delete copy.cv_base64;

  // If extra attachment base64 is larger than 25KB, keep it in memory cache only to protect quota
  if (copy.extra_attachment_base64 && copy.extra_attachment_base64.length > 25000) {
    delete copy.extra_attachment_base64;
  }
  return copy;
}

export function getScheduledEmails(): ScheduledEmail[] {
  let fromStorage: ScheduledEmail[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) fromStorage = parsed;
      }
    } catch {}
  }

  // Merge localStorage items with memory cache so no scheduled item is ever lost
  const map = new Map<string, ScheduledEmail>();
  for (const item of fromStorage) {
    map.set(item.id, item);
  }
  for (const item of memoryScheduledCache) {
    const existing = map.get(item.id);
    map.set(item.id, { ...existing, ...item });
  }

  const merged = Array.from(map.values());
  return merged.sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );
}

function saveScheduledEmails(list: ScheduledEmail[]) {
  // Update memory cache immediately
  memoryScheduledCache = [...list];

  if (typeof window === "undefined") return;

  try {
    const lightweight = list.map(sanitizeForStorage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
    notifyChange();
  } catch (err) {
    console.warn("Storage warning in saveScheduledEmails, recovering quota:", err);
    try {
      // Reclaim space by removing legacy 2-5 MB key if present (CV is stored in IndexedDB)
      try {
        localStorage.removeItem("mailpilot_cv_data");
      } catch {}

      const fullyStripped = list.map((item) => {
        const c = { ...item };
        if (c.cover_letter_base64) c.has_cover_letter = true;
        delete c.cv_base64;
        delete c.cover_letter_base64;
        delete c.extra_attachment_base64;
        return c;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullyStripped));
      notifyChange();
    } catch (quotaErr) {
      console.error("Critical: localStorage quota fully exceeded, preserved in memory cache:", quotaErr);
      notifyChange();
    }
  }
}

export function scheduleEmail(
  item: Omit<ScheduledEmail, "id" | "created_at" | "status">
): ScheduledEmail {
  const list = getScheduledEmails();
  const newEmail: ScheduledEmail = {
    ...item,
    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    status: "pending",
  };
  list.push(newEmail);
  saveScheduledEmails(list);
  return newEmail;
}

export function scheduleBulkEmails(
  items: Array<Omit<ScheduledEmail, "id" | "created_at" | "status">>
): ScheduledEmail[] {
  const list = getScheduledEmails();
  const createdList: ScheduledEmail[] = [];
  const batchId = `batch_${Date.now()}`;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const newEmail: ScheduledEmail = {
      ...item,
      id: `sched_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      batch_id: item.batch_id || batchId,
      created_at: new Date().toISOString(),
      status: "pending",
    };
    createdList.push(newEmail);
    list.push(newEmail);
  }

  saveScheduledEmails(list);
  return createdList;
}

export function cancelScheduledEmail(id: string): void {
  const list = getScheduledEmails();
  const updated = list.map((item) => {
    if (item.id === id && item.status === "pending") {
      return { ...item, status: "cancelled" as const };
    }
    return item;
  });
  saveScheduledEmails(updated);
}

export function deleteScheduledEmail(id: string): void {
  const list = getScheduledEmails();
  const updated = list.filter((item) => item.id !== id);
  saveScheduledEmails(updated);
}

export function clearFinishedScheduledEmails(): void {
  const list = getScheduledEmails();
  const updated = list.filter((item) => item.status === "pending");
  saveScheduledEmails(updated);
}

let isProcessingQueue = false;

export async function processDueScheduledEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  if (isProcessingQueue) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const list = getScheduledEmails();
  const now = Date.now();
  const dueItems = list.filter(
    (item) => item.status === "pending" && new Date(item.scheduled_at).getTime() <= now
  );

  if (dueItems.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  isProcessingQueue = true;
  let sentCount = 0;
  let failedCount = 0;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const item of dueItems) {
      try {
        const cleanSubject = stripEmailFormatting(item.subject);
        const formattedBody = formatEmailToHtml(item.message);

        // Dynamically resolve CV if stripped from storage
        const cvLib = readStoredCvLibrary();
        const matchedCv = item.cv_id ? cvLib.find((c) => c.id === item.cv_id) : null;
        const activeCv = getActiveCv();
        const legacyCv = readStoredCv();

        const effectiveCvBase64 =
          item.cv_base64 ||
          matchedCv?.base64 ||
          activeCv?.base64 ||
          legacyCv?.base64;

        const effectiveCvFileName =
          item.cv_filename ||
          matchedCv?.fileName ||
          activeCv?.fileName ||
          legacyCv?.fileName ||
          `${(item.candidate_name || "Candidat").replace(/\s+/g, "_")}_Resume.pdf`;

        // Dynamically generate cover letter if requested and not stored
        let effectiveCoverLetterBase64 = item.cover_letter_base64;
        let effectiveCoverLetterFileName = item.cover_letter_filename;

        if (!effectiveCoverLetterBase64 && item.has_cover_letter) {
          try {
            const letterPdf = generateCoverLetterPdf({
              company: item.company_name,
              position: item.position || "Stage PFE / Emploi",
              body: item.message,
              subject: item.subject,
            });
            effectiveCoverLetterBase64 = letterPdf.getBase64();
            effectiveCoverLetterFileName = letterPdf.fileName;
          } catch (err) {
            console.warn("Cover letter dynamic generation warning:", err);
          }
        }

        if (item.channel === "direct") {
          await sendDirectApplication({
            company: item.company_name,
            position: item.position || "Stage PFE / Emploi",
            email: item.recipient_email,
            candidateName: item.candidate_name,
            subject: cleanSubject,
            message: formattedBody,
            cv_base64: effectiveCvBase64,
            cv_filename: effectiveCvFileName,
            cv_data: effectiveCvBase64,
            cv_name: effectiveCvFileName,
            cover_letter_base64: effectiveCoverLetterBase64,
            cover_letter_filename: effectiveCoverLetterFileName,
            extra_attachment_base64: item.extra_attachment_base64,
            extra_attachment_filename: item.extra_attachment_filename,
            notes: "Envoi programmé MailPilot (Direct)",
            jobUrl: "",
          });
        } else if (item.channel === "draft_smtp") {
          await createDirectDraftApplication({
            company: item.company_name,
            position: item.position || "Stage PFE / Emploi",
            email: item.recipient_email,
            candidateName: item.candidate_name,
            subject: cleanSubject,
            message: formattedBody,
            cv_base64: effectiveCvBase64,
            cv_filename: effectiveCvFileName,
            cv_data: effectiveCvBase64,
            cv_name: effectiveCvFileName,
            cover_letter_base64: effectiveCoverLetterBase64,
            cover_letter_filename: effectiveCoverLetterFileName,
            extra_attachment_base64: item.extra_attachment_base64,
            extra_attachment_filename: item.extra_attachment_filename,
            notes: "Brouillon direct programmé MailPilot (Gmail)",
            jobUrl: "",
          });
        } else {
          await sendApplication({
            company: item.company_name,
            position: item.position || "Stage PFE / Emploi",
            email: item.recipient_email,
            candidateName: item.candidate_name,
            subject: cleanSubject,
            message: formattedBody,
            cv_base64: effectiveCvBase64,
            cv_filename: effectiveCvFileName,
            cv_data: effectiveCvBase64,
            cv_name: effectiveCvFileName,
            cover_letter_base64: effectiveCoverLetterBase64,
            cover_letter_filename: effectiveCoverLetterFileName,
            extra_attachment_base64: item.extra_attachment_base64,
            extra_attachment_filename: item.extra_attachment_filename,
            notes: "Brouillon programmé MailPilot (n8n)",
            jobUrl: "",
          });
        }

        // Record in Supabase applications
        if (user) {
          await supabase.from("applications").insert([
            {
              user_id: user.id,
              company: item.company_name,
              position: item.position || "Stage PFE / Emploi",
              email: item.recipient_email,
              status: "success",
            },
          ]);
        }

        // Sync with tracker
        await syncEmailDispatchToTracker({
          company: item.company_name,
          position: item.position || "Stage PFE / Emploi",
          email: item.recipient_email,
          status: "success",
        });

        item.status = "sent";
        item.sent_at = new Date().toISOString();
        sentCount++;
      } catch (err: unknown) {
        item.status = "failed";
        item.error_message = err instanceof Error ? err.message : "Échec de l'envoi";
        failedCount++;
      }
    }

    saveScheduledEmails(list);
  } finally {
    isProcessingQueue = false;
  }

  return { processed: dueItems.length, sent: sentCount, failed: failedCount };
}

export async function sendScheduledNow(id: string): Promise<boolean> {
  const list = getScheduledEmails();
  const target = list.find((item) => item.id === id);
  if (!target || target.status !== "pending") return false;

  // Set scheduled_at to past so it processes immediately
  target.scheduled_at = new Date(Date.now() - 1000).toISOString();
  saveScheduledEmails(list);
  const result = await processDueScheduledEmails();
  return result.sent > 0;
}

