import type { CSVRow } from "@/context/BulkUploadContext";
import { inferCompanyFromEmail } from "@/lib/emailPersonalizer";

export const EMAIL_TOKEN_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export const CSV_COLUMN_ALIASES: Record<string, string> = {
  societe: "company",
  société: "company",
  entreprise: "company",
  company: "company",
  email: "email",
  emails: "email",
  "e-mail": "email",
  mail: "email",
  mails: "email",
  courriel: "email",
  "adresse email": "email",
  adresse: "email",
  adresses: "email",
  email1: "email",
  "email 1": "email",
  email_1: "email",
  name: "name",
  "nom complet": "name",
  nom: "name",
  contact: "name",
  manager: "name",
  poste: "position",
  position: "position",
  titre: "position",
  job: "position",
};

const EMAIL_COLUMN_PATTERN = /^(e-?mails?|mails?|courriel|adresse(\s*e-?mail)?|adresses?|cc)(\s*[_-]?\d+)?$/i;

/**
 * Extracts all unique emails from raw text (used by Smart Paste and multi-email CSV cells).
 */
export function extractEmailsFromText(rawText: string): string[] {
  if (!rawText || typeof rawText !== "string") return [];
  const matches = rawText.match(EMAIL_TOKEN_REGEX) || [];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const m of matches) {
    const cleaned = m.trim().toLowerCase();
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      unique.push(cleaned);
    }
  }
  return unique;
}

/**
 * Splits a CSV email cell that may contain 1 or multiple email addresses separated by
 * commas, semicolons, slashes, pipes, whitespace, or line breaks.
 * Falls back to separator splitting if tokens are invalid so validation UI highlights typos cleanly.
 */
export function splitEmailsFromCell(rawValue: string): string[] {
  if (!rawValue || typeof rawValue !== "string") return [];
  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  const extracted = extractEmailsFromText(trimmed);
  if (extracted.length > 0) {
    // Also inspect separator segments just in case one valid email sits next to a malformed token
    const segments = trimmed
      .split(/[,;/|\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length > extracted.length) {
      const result: string[] = [];
      const seen = new Set<string>();
      for (const seg of segments) {
        const segEmails = extractEmailsFromText(seg);
        if (segEmails.length > 0) {
          for (const e of segEmails) {
            if (!seen.has(e)) {
              seen.add(e);
              result.push(e);
            }
          }
        } else if (seg.includes("@") && !seen.has(seg.toLowerCase())) {
          seen.add(seg.toLowerCase());
          result.push(seg.toLowerCase());
        }
      }
      if (result.length > 0) return result;
    }

    return extracted;
  }

  // Fallback for malformed inputs (so user sees "Invalid Email" row instead of silent skip)
  const segments = trimmed
    .split(/[,;/|\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments : [trimmed];
}

export interface ExpandCsvResult {
  rows: CSVRow[];
  sourceRowCount: number;
  expandedFromMultiCount: number;
}

/**
 * Normalizes parsed PapaParse CSV records and automatically splits rows containing
 * 2+ emails in a cell (e.g. "rh@company.com, jobs@company.com"), extra email columns
 * (email2, cc), or unquoted overflow columns (__parsed_extra).
 */
export function expandCsvRecords(
  records: Array<Record<string, unknown>>,
  options?: {
    defaultPosition?: string;
    defaultContactName?: string;
  }
): ExpandCsvResult {
  const defaultPos = options?.defaultPosition?.trim() || "Stage PFE / Emploi";
  const defaultContact = options?.defaultContactName?.trim() || "Hiring Manager";

  const expandedRows: CSVRow[] = [];
  let sourceRowCount = 0;
  let expandedFromMultiCount = 0;

  for (const rawRecord of records) {
    if (!rawRecord || typeof rawRecord !== "object") continue;

    const normalizedRow: Record<string, string> = {};
    const emailSources: string[] = [];

    for (const [rawKey, rawVal] of Object.entries(rawRecord)) {
      if (rawKey === "__parsed_extra" && Array.isArray(rawVal)) {
        for (const extraItem of rawVal) {
          if (typeof extraItem === "string" && extraItem.includes("@")) {
            emailSources.push(extraItem);
          }
        }
        continue;
      }

      if (typeof rawVal !== "string") continue;
      const trimmedVal = rawVal.trim();
      const lowerKey = rawKey.trim().toLowerCase();

      if (EMAIL_COLUMN_PATTERN.test(lowerKey)) {
        if (trimmedVal) emailSources.push(trimmedVal);
        if (!normalizedRow.email) {
          normalizedRow.email = trimmedVal;
        }
      } else {
        const mappedKey = CSV_COLUMN_ALIASES[lowerKey] || lowerKey;
        normalizedRow[mappedKey] = trimmedVal;
      }
    }

    const rowEmails: string[] = [];
    const rowSeen = new Set<string>();

    for (const src of emailSources) {
      for (const em of splitEmailsFromCell(src)) {
        const key = em.toLowerCase();
        if (!rowSeen.has(key)) {
          rowSeen.add(key);
          rowEmails.push(em);
        }
      }
    }

    if (rowEmails.length === 0) continue;

    sourceRowCount += 1;
    if (rowEmails.length > 1) {
      expandedFromMultiCount += rowEmails.length - 1;
    }

    // If names are also comma/semicolon separated cleanly matching email count, align them 1-to-1
    const rawName = normalizedRow.name || "";
    const splitNames = rawName
      .split(/[,;/|\r\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const hasAlignedNames = splitNames.length === rowEmails.length;

    rowEmails.forEach((singleEmail, idx) => {
      const inferredCompany = inferCompanyFromEmail(singleEmail)?.name || "Équipe Recrutement";
      const rowCompany = normalizedRow.company || inferredCompany;
      const rowPosition = normalizedRow.position || defaultPos;
      const rowName = (hasAlignedNames ? splitNames[idx] : rawName) || defaultContact;

      expandedRows.push({
        ...normalizedRow,
        email: singleEmail,
        company: rowCompany,
        position: rowPosition,
        name: rowName,
        status: "pending",
      });
    });
  }

  return {
    rows: expandedRows,
    sourceRowCount,
    expandedFromMultiCount,
  };
}
