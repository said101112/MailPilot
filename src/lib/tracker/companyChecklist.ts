import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";

export type CompanyCategoryKey =
  | "dev_tech"
  | "sap"
  | "salesforce"
  | "data_ai"
  | "fintech"
  | "other";

export interface CompanyCategoryConfig {
  key: CompanyCategoryKey;
  label: string;
  emoji: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export interface ChecklistCompany {
  id: string;
  name: string;
  category: CompanyCategoryKey;
  isDone: boolean;
  doneAt?: string | null;
  linkedinUrl?: string;
  website?: string;
  notes?: string;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const CHECKLIST_CATEGORIES: CompanyCategoryConfig[] = [
  {
    key: "dev_tech",
    label: "Dev Tech & IA",
    emoji: "💻",
    color: "#ff5722",
    badgeBg: "bg-orange-50",
    badgeText: "text-[#ff5722] border-orange-200",
  },
  {
    key: "sap",
    label: "SAP & ERP",
    emoji: "🏢",
    color: "#0284c7",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700 border-sky-200",
  },
  {
    key: "salesforce",
    label: "Salesforce & CRM",
    emoji: "☁️",
    color: "#0284c7",
    badgeBg: "bg-cyan-50",
    badgeText: "text-cyan-800 border-cyan-200",
  },
  {
    key: "data_ai",
    label: "Data & BI",
    emoji: "📊",
    color: "#8b5cf6",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-700 border-purple-200",
  },
  {
    key: "fintech",
    label: "Fintech & Banque",
    emoji: "🏦",
    color: "#10b981",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700 border-emerald-200",
  },
  {
    key: "other",
    label: "Autre secteur",
    emoji: "📁",
    color: "#64748b",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700 border-gray-200",
  },
];

export const CHECKLIST_STORAGE_KEY = "truck_app_company_checklist_v1";
export const CHECKLIST_UPDATED_EVENT = "truck_app_checklist_updated";

export const DEFAULT_CHECKLIST_COMPANIES: ChecklistCompany[] = [
  // Dev Tech & IA
  {
    id: "chk-docaposte",
    name: "Docaposte Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/docaposte-maroc/",
    website: "https://www.docaposte.com",
    notes: "Filiale numérique de La Poste. Pôles dev Java, Cloud et solutions numériques.",
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-capgemini",
    name: "Capgemini Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/capgemini/",
    website: "https://www.capgemini.com",
    notes: "Centre d'excellence Nearshore à Rabat & Casablanca. Projets Full Stack & IA.",
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-devoteam",
    name: "Devoteam Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/devoteam/",
    website: "https://www.devoteam.com",
    notes: "Transformation digitale, Cloud AWS/Azure et microservices.",
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-alten",
    name: "Alten Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/alten-maroc/",
    website: "https://www.alten.ma",
    notes: "Ingénierie logicielle, delivery center Fès & Rabat.",
    sortOrder: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-tessi",
    name: "Tessi Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/tessi-maroc/",
    website: "https://www.tessi.eu",
    notes: "Digitalisation des processus métiers, applications web et IA documentaire.",
    sortOrder: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-sqli",
    name: "SQLI Maroc",
    category: "dev_tech",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/sqli/",
    website: "https://www.sqli.com",
    notes: "Agence digitale et ESN européenne basée à Rabat et Oujda.",
    sortOrder: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // SAP & ERP
  {
    id: "chk-viseo",
    name: "VISEO Maroc",
    category: "sap",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/viseo/",
    website: "https://www.viseo.com",
    notes: "Partenaire de référence intégrateur SAP (S/4HANA) et solutions Cloud ERP.",
    sortOrder: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-inetum",
    name: "Inetum Maroc",
    category: "sap",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/inetum/",
    website: "https://www.inetum.com",
    notes: "Pôle d'intégration ERP SAP & Microsoft Dynamics pour l'Afrique et l'Europe.",
    sortOrder: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-deloitte",
    name: "Deloitte Nearshore Maroc",
    category: "sap",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/deloitte/",
    website: "https://www.deloitte.com",
    notes: "Consulting en technologies d'entreprise, intégration SAP et Cloud.",
    sortOrder: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Salesforce & CRM
  {
    id: "chk-waeg",
    name: "Waeg (IBM Company)",
    category: "salesforce",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/waeg/",
    website: "https://www.waeg.com",
    notes: "Leader européen du conseil et intégration Salesforce multi-cloud.",
    sortOrder: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "chk-cloudfirst",
    name: "Cloud First Maroc",
    category: "salesforce",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/search/results/all/?keywords=Salesforce%20Maroc",
    notes: "Écosystème et partenaires Salesforce au Maroc.",
    sortOrder: 21,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Data & BI
  {
    id: "chk-attijari-data",
    name: "Attijari Data & Innovation Lab",
    category: "data_ai",
    isDone: false,
    linkedinUrl: "https://www.linkedin.com/company/attijariwafa-bank/",
    website: "https://www.attijariwafabank.com",
    notes: "Pôle data science, modèles prédictifs et architecture de données bancaires.",
    sortOrder: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * 100% Free Company Logo Resolution
 */
export function getCompanyLogoUrl(companyName: string, website?: string): string {
  // If website provided, use Google Favicon high-res or Clearbit
  if (website) {
    try {
      const url = new URL(website.startsWith("http") ? website : `https://${website}`);
      const domain = url.hostname.replace(/^www\./, "");
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {}
  }

  // Derive domain from name
  const clean = companyName
    .toLowerCase()
    .replace(/\s*(maroc|morocco|france|international|group|holding|nearshore)\s*/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (!clean) return "";
  return `https://www.google.com/s2/favicons?domain=${clean}.com&sz=128`;
}

/**
 * Generate 1-click LinkedIn Search URL for employees/recruiters of a company
 */
export function getLinkedInSearchUrl(companyName: string): string {
  const query = encodeURIComponent(`${companyName} recruteur OR lead OR rh OR ingénieur`);
  return `https://www.linkedin.com/search/results/people/?keywords=${query}`;
}

// ---------------------------------------------------------------------------
// LocalStorage & Supabase Sync Engine
// ---------------------------------------------------------------------------

async function resolveUserId(): Promise<string | null> {
  try {
    const uid = await getAuthUserId();
    if (uid) return uid;
  } catch {}
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function loadLocalChecklist(): ChecklistCompany[] {
  if (typeof window === "undefined") {
    return [...DEFAULT_CHECKLIST_COMPANIES];
  }

  try {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(DEFAULT_CHECKLIST_COMPANIES));
      return [...DEFAULT_CHECKLIST_COMPANIES];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(DEFAULT_CHECKLIST_COMPANIES));
      return [...DEFAULT_CHECKLIST_COMPANIES];
    }

    return parsed;
  } catch (e) {
    console.warn("Error reading local checklist:", e);
    return [...DEFAULT_CHECKLIST_COMPANIES];
  }
}

export function saveLocalChecklist(companies: ChecklistCompany[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(companies));
    window.dispatchEvent(new Event(CHECKLIST_UPDATED_EVENT));
  } catch (e) {
    console.error("Unable to save local checklist:", e);
  }
}

export async function syncChecklistWithSupabase(): Promise<ChecklistCompany[]> {
  const local = loadLocalChecklist();
  const userId = await resolveUserId();

  if (!userId) {
    return local;
  }

  try {
    const { data: remoteRows, error } = await supabase
      .from("user_company_checklist")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("Supabase checklist query warning:", error.message);
      return local;
    }

    // If remote is empty, seed remote with local data
    if (!remoteRows || remoteRows.length === 0) {
      await pushLocalChecklistToSupabase(userId, local);
      return local;
    }

    // Format remote rows
    const formatted: ChecklistCompany[] = remoteRows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: (r.category as CompanyCategoryKey) || "dev_tech",
      isDone: Boolean(r.is_done),
      doneAt: r.done_at,
      linkedinUrl: r.linkedin_url || "",
      website: r.website || "",
      notes: r.notes || "",
      sortOrder: r.sort_order ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    saveLocalChecklist(formatted);
    return formatted;
  } catch (err) {
    console.warn("Sync checklist failed:", err);
    return local;
  }
}

async function pushLocalChecklistToSupabase(userId: string, companies: ChecklistCompany[]) {
  try {
    const payload = companies.map((c, idx) => ({
      id: c.id,
      user_id: userId,
      name: c.name,
      category: c.category || "dev_tech",
      is_done: Boolean(c.isDone),
      done_at: c.doneAt || null,
      linkedin_url: c.linkedinUrl || "",
      website: c.website || "",
      notes: c.notes || "",
      sort_order: c.sortOrder ?? idx,
      created_at: c.createdAt || new Date().toISOString(),
      updated_at: c.updatedAt || new Date().toISOString(),
    }));

    await supabase
      .from("user_company_checklist")
      .upsert(payload, { onConflict: "user_id,id" });
  } catch (err) {
    console.error("Failed to seed initial checklist to Supabase:", err);
  }
}

export async function upsertChecklistCompanyRemote(company: ChecklistCompany): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase.from("user_company_checklist").upsert(
      {
        id: company.id,
        user_id: userId,
        name: company.name,
        category: company.category,
        is_done: company.isDone,
        done_at: company.doneAt || null,
        linkedin_url: company.linkedinUrl || "",
        website: company.website || "",
        notes: company.notes || "",
        sort_order: company.sortOrder ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" }
    );
  } catch (e) {
    console.warn("Failed to upsert company checklist to Supabase:", e);
  }
}

export async function deleteChecklistCompanyRemote(companyId: string): Promise<void> {
  const userId = await resolveUserId();
  if (!userId) return;

  try {
    await supabase
      .from("user_company_checklist")
      .delete()
      .eq("user_id", userId)
      .eq("id", companyId);
  } catch (e) {
    console.warn("Failed to delete company checklist from Supabase:", e);
  }
}

