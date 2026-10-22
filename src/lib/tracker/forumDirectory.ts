import { supabase } from "@/lib/supabase";
import { getAuthUserId } from "@/lib/auth";
import { createCompany, listCompanies, updateCompany } from "./queries";
import { lookupKnownCompanyLogo } from "./companyDirectory";

export type ForumVisitStatus =
  | "to_visit"
  | "priority"
  | "cv_submitted"
  | "contact_made"
  | "skip";

export interface ForumCompanyEntry {
  id: string;
  category: string;
  companyName: string;
  domain?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  domains: string[];
  rawDomainsText: string;
  tagline?: string | null;
  stand?: string | null;
  status: ForumVisitStatus;
  contactPerson?: string | null;
  notes?: string | null;
  rating?: number;
  updatedAt: string;
}

export const FORUM_STORAGE_KEY = "mailpilot_forum_companies_v1";

export const FORUM_FILTER_PRESETS = [
  { id: "all", label: "Toutes les entreprises", countBadge: null },
  { id: "data", label: "DATA / BI / IA", keywords: ["data", "ia", "bi", "analytics", "rag", "llm", "science", "gouvernance"] },
  { id: "dev", label: "DEV / Logiciel", keywords: ["dev", "java", "jee", ".net", "backend", "ingénierie logicielle", "applicative", "embarqué"] },
  { id: "cloud", label: "CLOUD / DEVOPS", keywords: ["cloud", "devops", "devsecops", "infrastructure"] },
  { id: "cyber", label: "CYBER / Sécurité", keywords: ["cyber", "sécurité"] },
  { id: "sap", label: "SAP / ERP / CRM", keywords: ["sap", "erp", "salesforce", "servicenow", "btp"] },
  { id: "telecom", label: "TÉLÉCOMS / IoT", keywords: ["télécoms", "réseaux", "iot"] },
  { id: "consulting", label: "Conseil & Transfo", keywords: ["conseil", "transformation", "digitale", "processus"] },
];

export const INITIAL_FORUM_COMPANIES: ForumCompanyEntry[] = [
  {
    id: "forum-inetum",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Inetum",
    domain: "inetum.com",
    logoUrl: "https://logo.clearbit.com/inetum.com",
    website: "https://www.inetum.com",
    domains: ["DEV", "DATA/BI/IA", "CLOUD/DEVOPS", "SAP/ERP", "Salesforce", "ServiceNow"],
    rawDomainsText: "DEV · DATA/BI/IA · CLOUD/DEVOPS · SAP/ERP · Salesforce · ServiceNow",
    tagline: "Inetum",
    stand: "Stand A01",
    status: "priority",
    notes: "Prend des profils Data & Cloud. Parler de mon projet de traitement par batch et intégration APIs.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sofrecom",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Sofrecom",
    domain: "sofrecom.com",
    logoUrl: "https://logo.clearbit.com/sofrecom.com",
    website: "https://www.sofrecom.com",
    domains: ["DEV", "DATA/IA", "CLOUD/DEVOPS", "Télécoms", "CYBER"],
    rawDomainsText: "DEV · DATA/IA · CLOUD/DEVOPS · Télécoms · CYBER",
    tagline: "Orange Group",
    stand: "Stand A02",
    status: "to_visit",
    notes: "Filiale d'Orange. Projets télécoms, data et cloud en Afrique et Moyen-Orient.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-sii",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "SII Group Maroc",
    domain: "sii-group.com",
    logoUrl: "https://logo.clearbit.com/sii-group.com",
    website: "https://sii-group.com",
    domains: ["DEV", "DATA/IA", "Ingénierie logicielle", "Logiciel embarqué", "Télécoms"],
    rawDomainsText: "DEV · DATA/IA · Ingénierie logicielle · Logiciel embarqué · Télécoms",
    tagline: "Groupe SII",
    stand: "Stand A03",
    status: "to_visit",
    notes: "Société d'ingénierie avec grosse présence au Maroc. Pôle software et data.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-skatys",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "SKATYS",
    domain: "skatys.com",
    logoUrl: null,
    website: "https://www.skatys.com",
    domains: ["SAP/ERP", "SAP BTP", "BI/DATA", "Analytics", "IA appliquée aux processus métier"],
    rawDomainsText: "SAP/ERP · SAP BTP · BI/DATA · Analytics · IA appliquée aux processus métier",
    tagline: "Conseil & Intégration",
    stand: "Stand A04",
    status: "to_visit",
    notes: "Cabinet spécialisé SAP et Business Analytics. Focus IA appliquée aux processus métier.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-capgemini",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Capgemini",
    domain: "capgemini.com",
    logoUrl: "https://logo.clearbit.com/capgemini.com",
    website: "https://www.capgemini.com",
    domains: ["DEV", "DATA/IA", "CLOUD/DEVOPS", "Ingénierie logicielle", "CYBER"],
    rawDomainsText: "DEV · DATA/IA · CLOUD/DEVOPS · Ingénierie logicielle · CYBER",
    tagline: "Make it real.",
    stand: "Stand B01",
    status: "priority",
    notes: "Énorme recruteur PFE au Maroc (Casablanca, Rabat). Pôles Insights & Data et Cloud Infrastructure.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-viseo",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "VISEO",
    domain: "viseo.com",
    logoUrl: "https://logo.clearbit.com/viseo.com",
    website: "https://www.viseo.com",
    domains: ["SAP/ERP", "DEV Java/.NET", "Salesforce", "DATA/BI"],
    rawDomainsText: "SAP/ERP · DEV Java/.NET · Salesforce · DATA/BI",
    tagline: "VISEO Global",
    stand: "Stand B02",
    status: "to_visit",
    notes: "Cabinet de conseil et services numériques. Pôles dev backend et intégration data.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-s2m",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "S2M",
    domain: "s2m.ma",
    logoUrl: null,
    website: "https://www.s2m.ma",
    domains: ["DEV Java/JEE", "Backend", "Intégration", "Paiement électronique", "Sécurité"],
    rawDomainsText: "DEV Java/JEE · Backend · Intégration · Paiement électronique · Sécurité",
    tagline: "Solutions Monétiques",
    stand: "Stand B03",
    status: "to_visit",
    notes: "Leader marocain des solutions de paiement et transactions électroniques sécurisées.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-leyton",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Leyton CognitX",
    domain: "leyton.com",
    logoUrl: "https://logo.clearbit.com/leyton.com",
    website: "https://www.leyton.com",
    domains: ["DEV", "DATA Engineering", "Data Science", "IA générative/LLM", "RAG", "DevSecOps"],
    rawDomainsText: "DEV · DATA Engineering · Data Science · IA générative/LLM · RAG · DevSecOps",
    tagline: "Unlock New Potential",
    stand: "Stand C01",
    status: "priority",
    notes: "Filiale tech et IA de Leyton. Très forte orientation RAG, LLM et Data Science opérationnelle. À cibler en priorité absolue !",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-orange",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Orange Business",
    domain: "orange-business.com",
    logoUrl: "https://logo.clearbit.com/orange-business.com",
    website: "https://www.orange-business.com",
    domains: ["DATA/IA", "CLOUD/DEVOPS", "CYBER", "Réseaux", "IoT", "Intégration numérique"],
    rawDomainsText: "DATA/IA · CLOUD/DEVOPS · CYBER · Réseaux · IoT · Intégration numérique",
    tagline: "Orange Jobs",
    stand: "Stand C02",
    status: "priority",
    notes: "Pôle B2B d'Orange. Projets cloud souverain, cybersécurité et plateformes data.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-afd",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "AFD.TECH — Accenture",
    domain: "afdtech.com",
    logoUrl: null,
    website: "https://www.afdtech.com",
    domains: ["CLOUD/DEVOPS", "DATA", "CYBER", "Réseaux télécoms", "Infrastructure"],
    rawDomainsText: "CLOUD/DEVOPS · DATA · CYBER · Réseaux télécoms · Infrastructure",
    tagline: "Accenture Industry X",
    stand: "Stand C03",
    status: "to_visit",
    notes: "Société de conseil en ingénierie réseaux et cloud rattachée au groupe Accenture.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-atlas",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Atlas Cloud Services",
    domain: "atlascloudservices.com",
    logoUrl: null,
    website: "https://atlascloudservices.com",
    domains: ["CLOUD", "Infrastructure", "DATA/IA", "Modernisation applicative"],
    rawDomainsText: "CLOUD · Infrastructure · DATA/IA · Modernisation applicative",
    tagline: "Data Center & Cloud",
    stand: "Stand D01",
    status: "to_visit",
    notes: "Opérateur de Data Center certifié Tier III et Tier IV au Maroc (Benguerir, UM6P).",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-deloitte",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Deloitte",
    domain: "deloitte.com",
    logoUrl: "https://logo.clearbit.com/deloitte.com",
    website: "https://www.deloitte.com",
    domains: ["DATA/IA", "CLOUD", "CYBER", "Transformation digitale", "ERP/SAP selon l'équipe"],
    rawDomainsText: "DATA/IA · CLOUD · CYBER · Transformation digitale · ERP/SAP selon l'équipe",
    tagline: "Deloitte Nearshore",
    stand: "Stand D02",
    status: "priority",
    notes: "Centre de livraison Nearshore à Casablanca. Recrutement massif sur l'IA, la Cyber et le Cloud.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-mazars",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Forvis Mazars",
    domain: "forvismazars.com",
    logoUrl: null,
    website: "https://www.forvismazars.com",
    domains: ["DATA/BI", "Gouvernance des données", "CYBER", "Conseil technologique"],
    rawDomainsText: "DATA/BI · Gouvernance des données · CYBER · Conseil technologique",
    tagline: "Audit & Advisory",
    stand: "Stand E01",
    status: "to_visit",
    notes: "Pôle conseil en gouvernance data, audit des systèmes d'information et cybersécurité.",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "forum-grantthornton",
    category: "1. Entreprises IT et sociétés de services numériques",
    companyName: "Fidaroc Grant Thornton",
    domain: "grantthornton.ma",
    logoUrl: null,
    website: "https://www.grantthornton.ma",
    domains: ["DATA/BI", "Conseil", "Transformation numérique"],
    rawDomainsText: "DATA/BI · Conseil · Transformation numérique",
    tagline: "Conseil & Audit",
    stand: "Stand E02",
    status: "to_visit",
    notes: "Cabinet d'audit et de conseil. Projets BI, modélisation et transformation digitale.",
    updatedAt: new Date().toISOString(),
  },
];

export function loadForumCompanies(): ForumCompanyEntry[] {
  if (typeof window === "undefined") return INITIAL_FORUM_COMPANIES;
  try {
    const raw = localStorage.getItem(FORUM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(INITIAL_FORUM_COMPANIES));
      return INITIAL_FORUM_COMPANIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_FORUM_COMPANIES;
  } catch (err) {
    console.error("Failed to load forum companies from storage:", err);
    return INITIAL_FORUM_COMPANIES;
  }
}

export function saveForumCompanies(entries: ForumCompanyEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to save forum companies to storage:", err);
  }
}

/**
 * Intelligent parser that accepts raw text or copied tables (such as from PDF, Word, or Markdown)
 * Example input:
 *   Inetum : DEV · DATA/BI/IA · CLOUD/DEVOPS · SAP/ERP
 *   Capgemini  DEV · DATA/IA · CLOUD/DEVOPS
 */
export function parseRawForumText(
  text: string,
  defaultCategory = "1. Entreprises IT et sociétés de services numériques"
): ForumCompanyEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ForumCompanyEntry[] = [];
  let currentCategory = defaultCategory;

  for (const line of lines) {
    // Check if line is a category header (e.g., "1. Entreprises IT...", "### 2. Banques...")
    if (/^(\d+\.|\#{1,3}\s*\d*|[A-Z\s]{4,}:)/i.test(line) && !line.includes("·") && !line.includes("\t")) {
      currentCategory = line.replace(/^[#\s]+/, "");
      continue;
    }

    // Try splitting by tab, colon, or dash
    let companyName = "";
    let domainsText = "";

    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
      companyName = parts[0] || "";
      domainsText = parts.slice(1).join(" · ");
    } else if (line.includes(":") && !line.toLowerCase().startsWith("http")) {
      const idx = line.indexOf(":");
      companyName = line.slice(0, idx).trim();
      domainsText = line.slice(idx + 1).trim();
    } else if (line.includes(" - ")) {
      const idx = line.indexOf(" - ");
      companyName = line.slice(0, idx).trim();
      domainsText = line.slice(idx + 3).trim();
    } else {
      // Fallback: take first 2 words as name and the rest as domains
      const words = line.split(/\s+/);
      companyName = words[0] || "";
      domainsText = words.slice(1).join(" ");
    }

    if (!companyName) continue;

    // Split domains by "·", "|", ",", "/", or ";"
    const domains = domainsText
      .split(/[·|,;]/)
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const logoUrl = lookupKnownCompanyLogo(companyName);
    const domain = `${slug}.com`;

    results.push({
      id: `forum-${slug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: currentCategory,
      companyName,
      domain,
      logoUrl: logoUrl || null,
      website: `https://www.${domain}`,
      domains: domains.length > 0 ? domains : [domainsText],
      rawDomainsText: domainsText,
      status: "to_visit",
      stand: "",
      notes: "",
      updatedAt: new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Synchronize forum companies with Supabase `companies` table.
 * If a company with same name exists, update its `description` and `notes`.
 * Otherwise, insert a new company.
 */
export async function syncForumCompaniesToSupabase(
  entries: ForumCompanyEntry[]
): Promise<{ created: number; updated: number }> {
  const existingCompanies = await listCompanies();
  const existingByName = new Map(
    existingCompanies.map((c) => [c.name.trim().toLowerCase(), c])
  );

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const key = entry.companyName.trim().toLowerCase();
    const existing = existingByName.get(key);

    const description = `[Forum Focus: ${entry.rawDomainsText}] ${entry.notes || ""}`.trim();
    const location = entry.stand ? `Forum: ${entry.stand}` : null;

    if (existing) {
      await updateCompany(existing.id, {
        description: description || existing.description,
        sector: entry.category,
        location: location || existing.location,
        domain: entry.domain || existing.domain,
        notes: entry.notes || existing.notes,
      });
      updated++;
    } else {
      await createCompany({
        name: entry.companyName,
        domain: entry.domain || null,
        logo_url: entry.logoUrl || null,
        website: entry.website || null,
        sector: entry.category,
        description,
        location,
        notes: entry.notes || null,
      });
      created++;
    }
  }

  return { created, updated };
}
