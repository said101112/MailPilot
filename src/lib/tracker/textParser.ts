import type { ApplicationFormValues } from "./types";
import type { JobStatus } from "./constants";
import { emptyFormValues } from "./form";

export interface ParserDefaults {
  position?: string;
  status?: JobStatus;
  appliedAt?: string;
  jobType?: string;
  domain?: string;
  location?: string;
  workMode?: string;
  channel?: string;
}

export interface ParsedCandidate {
  values: ApplicationFormValues;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  confidence: {
    company: "high" | "medium" | "low";
    position: "high" | "medium" | "low";
  };
  rawSnippet: string;
}

// Common French and international tech companies for instant high-confidence recognition
export const COMMON_COMPANIES = [
  "Google", "Microsoft", "Amazon", "Apple", "Meta", "Netflix", "Tesla", "Twitter", "X",
  "Capgemini", "Thales", "Sopra Steria", "Atos", "Dassault Systèmes", "Dassault Aviation",
  "Doctolib", "BlaBlaCar", "ManoMano", "Deezer", "Payfit", "Qonto", "Swile",
  "Contentsquare", "Datadog", "Mirakl", "Ledger", "Algolia", "Mistral AI", "Mistral",
  "OVHcloud", "OVH", "Orange", "Bouygues", "SFR", "Free", "Iliad",
  "Ubisoft", "Voodoo", "Gameloft", "Criteo", "Alan", "Spendesk", "Pennylane",
  "BNP Paribas", "Société Générale", "Credit Agricole", "Crédit Mutuel", "BPCE", "AXA",
  "Renault", "Stellantis", "Peugeot", "Airbus", "Safran", "Alstom", "Schneider Electric",
  "TotalEnergies", "Engie", "EDF", "Sanofi", "L'Oréal", "LVMH", "Kering", "Hermès",
  "Carrefour", "Decathlon", "Auchan", "Fnac Darty", "Veepee", "Showroomprive",
  "Wavestone", "Devoteam", "Inetum", "Alten", "Akka", "Altran", "Accenture",
  "OCTO Technology", "Zenika", "Theodo", "Ippon", "Eleven Labs", "Dataiku",
];

export const FRENCH_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Bordeaux", "Nantes",
  "Strasbourg", "Rennes", "Montpellier", "Nice", "Grenoble", "Rouen", "Toulon",
  "Angers", "Clermont-Ferrand", "Brest", "Dijon", "Le Mans", "Aix-en-Provence",
  "Tours", "Amiens", "Limoges", "Metz", "Besançon", "Perpignan", "Orléans",
  "Caen", "Mulhouse", "Nancy", "La Défense", "Boulogne-Billancourt", "Issy-les-Moulineaux",
  "Levallois-Perret", "Neuilly-sur-Seine", "Courbevoie", "Nanterre", "Massy", "Palaiseau",
  "Sophia Antipolis", "Casablanca", "Rabat", "Tunis", "Alger", "Bruxelles", "Genève", "Montréal", "London"
];

function cleanRawText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function extractDate(text: string): string {
  const today = new Date();
  const lower = text.toLowerCase();

  if (/\b(avant-hier|avant hier)\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return formatDateISO(d);
  }

  if (/\b(hier|yesterday)\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return formatDateISO(d);
  }

  if (/\b(aujourd'hui|ce jour|today)\b/.test(lower)) {
    return formatDateISO(today);
  }

  // Format DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = text.match(/\b([0-3]?\d)[\/\.-]([0-1]?\d)[\/\.-](20\d{2})\b/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Format DD/MM (assume current year)
  const ddmm = text.match(/\b([0-3]?\d)[\/\.-]([0-1]?\d)\b/);
  if (ddmm) {
    const day = ddmm[1].padStart(2, "0");
    const month = ddmm[2].padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  // Textual dates in French: "15 octobre 2026", "3 mai", etc.
  const monthsMap: Record<string, string> = {
    janvier: "01", fevrier: "02", février: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", aout: "08", août: "08",
    septembre: "09", octobre: "10", novembre: "11", decembre: "12", décembre: "12",
  };
  const textualDate = text.match(/\b([0-3]?\d)\s+(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)(?:\s+(20\d{2}))?\b/i);
  if (textualDate) {
    const day = textualDate[1].padStart(2, "0");
    const monthName = textualDate[2].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const month = monthsMap[monthName] ?? "01";
    const year = textualDate[3] || String(today.getFullYear());
    return `${year}-${month}-${day}`;
  }

  return formatDateISO(today);
}

export function extractCompany(text: string): { name: string; confidence: "high" | "medium" | "low" } {
  // 1. Structured key-value (e.g. "Entreprise : Doctolib" or "Company: Google")
  const kvMatch = text.match(/(?:(?:entreprise|soci[ée]t[ée]|company|bo[iî]te)\s*[:=-]\s*)([A-Z0-9À-ÖØ-ß][\w\s&.-]{1,40})/i);
  if (kvMatch && kvMatch[1]?.trim()) {
    return { name: cleanCompanyName(kvMatch[1]), confidence: "high" };
  }

  // 2. Exact match on known companies directory
  for (const comp of COMMON_COMPANIES) {
    const regex = new RegExp(`\\b${comp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(text)) {
      return { name: comp, confidence: "high" };
    }
  }

  // 3. Patterns like "chez <Company>", "at <Company>", "auprès de <Company>"
  const chezMatch = text.match(/(?:chez|at|aupr[èe]s de|rejoindre)\s+([A-Z0-9À-ÖØ-ß][\w&.-]{1,30}(?:\s+[A-Z0-9À-ÖØ-ß][\w&.-]{1,20})?)/);
  if (chezMatch && chezMatch[1]?.trim()) {
    const extracted = cleanCompanyName(chezMatch[1]);
    if (extracted.length > 1 && !isStopWord(extracted)) {
      return { name: extracted, confidence: "medium" };
    }
  }

  // 4. Look for domain in email: user@company.com
  const emailDomainMatch = text.match(/@([a-zA-Z0-9-]+)\.(?:fr|com|io|co|tech|org|net|ai|dev)/i);
  if (emailDomainMatch) {
    const rawDomain = emailDomainMatch[1].toLowerCase();
    const genericDomains = ["gmail", "yahoo", "hotmail", "outlook", "live", "icloud", "proton", "protonmail"];
    if (!genericDomains.includes(rawDomain)) {
      const capitalized = rawDomain.charAt(0).toUpperCase() + rawDomain.slice(1);
      return { name: capitalized, confidence: "medium" };
    }
  }

  // 5. Look for "Candidature <Company>" or "Confirmation de votre candidature chez/pour <Company>"
  const headingMatch = text.match(/(?:candidature\s+(?:chez|pour)\s+)([A-Z0-9À-ÖØ-ß][\w&.-]{1,30})/i);
  if (headingMatch && headingMatch[1]?.trim()) {
    return { name: cleanCompanyName(headingMatch[1]), confidence: "medium" };
  }

  // 6. If short line (1-3 words), the first part is likely the company name
  const trimmed = text.trim();
  if (trimmed.length > 1 && trimmed.length < 50 && !trimmed.includes("\n")) {
    const firstWord = trimmed.split(/[\s,;|]/)[0];
    if (firstWord && !isStopWord(firstWord)) {
      return { name: cleanCompanyName(firstWord), confidence: "medium" };
    }
  }

  return { name: "", confidence: "low" };
}

export function cleanCompanyName(name: string): string {
  return name
    .replace(/[,\.\:\;\!\?]+$/, "")
    .replace(/\s+(pour|au|à|a|sur|via|en|le|la|les|dans|avec|comme)$/i, "")
    .trim();
}

function isStopWord(word: string): boolean {
  const stops = [
    "nous", "vous", "mon", "ma", "notre", "votre", "eux", "ce", "cette", "un", "une", "des", "le", "la", "les",
    "bonjour", "madame", "monsieur", "merci", "candidature", "entretien", "offre", "stage", "cdi", "alternance"
  ];
  return stops.includes(word.toLowerCase().trim());
}

export function extractPosition(text: string): { title: string; confidence: "high" | "medium" | "low" } {
  // 1. Structured key-value (e.g. "Poste: Développeur Full Stack" or "Rôle: Data Engineer")
  const kvMatch = text.match(/(?:(?:poste|intitul[ée]|r[oô]le|position|job title|job|offre)\s*[:=-]\s*)([^\n\r,;]+)/i);
  if (kvMatch && kvMatch[1]?.trim()) {
    return { title: cleanPositionTitle(kvMatch[1]), confidence: "high" };
  }

  // 2. Patterns: "au poste de <Poste>", "pour le poste de <Poste>", "en tant que <Poste>"
  const rolePattern = text.match(/(?:au poste de|pour le poste de|en tant que|pour un poste de|intitulé du poste\s*:?)\s+([^\n\r,\.;]+?)(?=\s+(?:chez|auprès de|dans|à|a|en|sur|via|le|du)\b|[,\.\n\r]|$)/i);
  if (rolePattern && rolePattern[1]?.trim()) {
    return { title: cleanPositionTitle(rolePattern[1]), confidence: "high" };
  }

  // 3. Regex matching standard engineering / tech job titles
  const jobTitleRegex = /\b((?:Stage\s+|Alternance\s+|PFE\s+)?(?:D[ée]veloppeur|Developer|Dev|Ing[ée]nieur[e]?|Architecte|Consultant[e]?|Tech Lead|Lead Dev|Data Scientist|Data Analyst|Data Engineer|DevOps|SRE|Cloud Architect|Product Owner|Product Manager|Scrum Master|Designer|UI\/UX|QA Tester|QA Engineer|Software Engineer)(?:\s+(?:Full\s*Stack|Front\s*end|Back\s*end|React|Node|Vue|Angular|Python|Java|Golang|PHP|C\+\+|\.NET|iOS|Android|Mobile|Cloud|AWS|GCP|Azure|Cyber|Cybers[ée]curit[ée]|Data|IA|AI|ML|Syst[èe]mes?|Logiciel|Web|DevOps))?)\b/i;
  const matchTitle = text.match(jobTitleRegex);
  if (matchTitle && matchTitle[1]?.trim()) {
    return { title: cleanPositionTitle(matchTitle[1]), confidence: "medium" };
  }

  return { title: "", confidence: "low" };
}

function cleanPositionTitle(title: string): string {
  return title
    .replace(/[,\.\:\;\!\?]+$/, "")
    .replace(/\s+(chez|at|auprès de|dans|pour|sur|via|à|a)\s+.*$/i, "")
    .trim();
}

export function extractLocation(text: string): string {
  // 1. Structured key-value (e.g. "Lieu: Paris", "Location: Nantes")
  const kvMatch = text.match(/(?:(?:lieu|ville|localisation|location|city)\s*[:=-]\s*)([A-Z0-9À-ÖØ-ß][\w\s&.-]{1,35})/i);
  if (kvMatch && kvMatch[1]?.trim()) {
    return kvMatch[1].trim();
  }

  // 2. City dictionary match
  for (const city of FRENCH_CITIES) {
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(text)) {
      return city;
    }
  }

  // 3. Remote check
  if (/\b(full\s*remote|t[ée]l[ée]travail\s*total|100%\s*remote|100%\s*t[ée]l[ée]travail|remote|t[ée]l[ée]travail)\b/i.test(text)) {
    return "Remote";
  }

  return "";
}

export function extractWorkMode(text: string): "remote" | "hybrid" | "onsite" {
  const lower = text.toLowerCase();
  if (/\b(full\s*remote|100%\s*remote|100%\s*t[ée]l[ée]travail|t[ée]l[ée]travail\s*total|remote|t[ée]l[ée]travail)\b/.test(lower)) {
    return "remote";
  }
  if (/\b(hybride|hybrid|t[ée]l[ée]travail\s*partiel|\d\s*jours?\s*de\s*t[ée]l[ée]travail)\b/.test(lower)) {
    return "hybrid";
  }
  if (/\b(pr[ée]sentiel|sur\s*site|sur\s*place|onsite)\b/.test(lower)) {
    return "onsite";
  }
  return "onsite";
}

export function extractStatus(text: string): JobStatus {
  const lower = text.toLowerCase();

  // Rejected
  if (
    /\b(refus|refus[ée]e?|rejet[ée]e?|pas retenu|pas donn[ée] suite|malheureusement|n[ée]gatif|d[ée]favorable)\b/.test(lower) &&
    !/\b(ne sera pas refus|aucun refus)\b/.test(lower)
  ) {
    return "rejected";
  }

  // Offer
  if (/\b(offre\s*re[çc]ue|proposition\s*(?:d'embauche|financi[èe]re|salariale)|promesse\s*d'embauche|f[ée]licitations)\b/.test(lower)) {
    return "offer_received";
  }

  // Interviews
  if (/\b(entretien\s*final|final\s*round|rencontre\s*associ[ée]s)\b/.test(lower)) {
    return "interview_final";
  }
  if (/\b(entretien\s*technique|test\s*technique|live\s*coding|entretien\s*tech)\b/.test(lower)) {
    return "interview_technical";
  }
  if (
    /\b(entretien\s*rh|call\s*rh|screening|[ée]change\s*rh|entretien\s*t[ée]l[ée]phonique|premier\s*entretien|invitation\s*[àa]\s*un\s*entretien|planifier\s*un\s*entretien)\b/.test(lower) ||
    (/\bentretien\b/.test(lower) && !/\brefus\b/.test(lower))
  ) {
    return "interview_hr";
  }

  // Assessment
  if (/\b(test\s*technique\s*re[çc]u|[ée]valuation|assessment|cas\s*pratique|hackerrank|codingame)\b/.test(lower)) {
    return "assessment";
  }

  // Reply received
  if (/\b(r[ée]ponse\s*re[çc]ue|retour\s*du\s*recruteur)\b/.test(lower)) {
    return "reply_received";
  }

  // Awaiting reply
  if (/\b(en\s*attente\s*de\s*r[ée]ponse|relance\s*[àa]\s*faire|waiting)\b/.test(lower)) {
    return "awaiting_reply";
  }

  // Draft
  if (/\b(brouillon|draft|[àa]\s*pr[ée]parer|sauvegard[ée]|[àa]\s*postuler|todo)\b/.test(lower)) {
    return "draft";
  }

  // Sent / Applied (default)
  return "sent";
}

export function extractJobType(text: string): "pfe" | "internship" | "cdi" | "cdd" | "alternance" | "freelance" | "other" {
  const lower = text.toLowerCase();
  if (/\b(pfe|stage\s*de\s*fin\s*d['’][ée]tudes)\b/.test(lower)) return "pfe";
  if (/\b(stage|stagiaire|internship|intern)\b/.test(lower)) return "internship";
  if (/\b(alternance|apprentissage|contrat\s*pro|alternant[e]?|apprenti[e]?)\b/.test(lower)) return "alternance";
  if (/\b(freelance|ind[ée]pendant|prestataire|prestation)\b/.test(lower)) return "freelance";
  if (/\b(cdd|dur[ée]e\s*d[ée]termin[ée]e)\b/.test(lower)) return "cdd";
  if (/\b(cdi|dur[ée]e\s*ind[ée]termin[ée]e|full-time|permanent)\b/.test(lower)) return "cdi";
  return "cdi";
}

export function extractDomain(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(devops|cloud|aws|azure|gcp|docker|kubernetes|k8s|sre|terraform|ci\/cd|infra)\b/.test(lower)) return "cloud_devops";
  if (/\b(ia|ai|data|machine\s*learning|deep\s*learning|nlp|llm|bi|business\s*intelligence|python\s*data)\b/.test(lower)) return "ai_data";
  if (/\b(cyber|s[ée]curit[ée]|security|pentest|soc|siem)\b/.test(lower)) return "cybersecurity";
  if (/\b(front|frontend|react|vue|angular|nextjs|tailwind|ui|ux)\b/.test(lower)) return "frontend";
  if (/\b(back|backend|node|express|nestjs|spring|django|flask|fastapi|laravel|symfony|golang|go|rust)\b/.test(lower)) return "backend";
  if (/\b(fullstack|full\s*stack)\b/.test(lower)) return "fullstack";
  if (/\b(mobile|ios|android|swift|kotlin|flutter|react\s*native)\b/.test(lower)) return "mobile";
  if (/\b(qa|test|recette|automatisation\s*des\s*tests|selenium|cypress|playwright)\b/.test(lower)) return "qa";
  if (/\b(embarqu[ée]|iot|firmware|c\+\+|c\/c\+\+|hardware)\b/.test(lower)) return "embedded";
  return "software_engineering";
}

export function extractChannel(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(linkedin.*message|message.*linkedin|inmail|mp\s*linkedin)\b/.test(lower)) return "linkedin_message";
  if (/\b(linkedin|sur\s*linkedin)\b/.test(lower)) return "linkedin_job";
  if (/\b(welcome\s*to\s*the\s*jungle|wttj|indeed|hellowork|apec|monster|glassdoor)\b/.test(lower)) return "job_board";
  if (/\b(whatsapp)\b/.test(lower)) return "whatsapp";
  if (/\b(cooptation|recommandation|r[ée]seau)\b/.test(lower)) return "referral";
  if (/\b(email|mail|courriel|candidature\s*spontan[ée]e)\b/.test(lower)) return "email";
  if (/\b(site\s*officiel|site\s*carri[èe]re|carri[èe]res?)\b/.test(lower)) return "company_website";
  return "linkedin_job";
}

export function extractContact(text: string): { name?: string; email?: string; phone?: string } {
  const result: { name?: string; email?: string; phone?: string } = {};

  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emails && emails.length > 0) {
    const valid = emails.find((e) => !/no-?reply|support|notification|info@|contact@|service@/i.test(e));
    result.email = valid || emails[0];
  }

  const phoneMatch = text.match(/(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].trim();
  }

  const contactMatch = text.match(/(?:(?:contact|recruteur|recruteuse|rh|interlocuteur)\s*[:=-]\s*)([A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+)?)/i);
  if (contactMatch && contactMatch[1]) {
    result.name = contactMatch[1].trim();
  }

  return result;
}

export function extractUrls(text: string): { offerUrl?: string; channelUrl?: string } {
  const urls = text.match(/https?:\/\/[^\s<>"'\)]+/g);
  if (!urls || urls.length === 0) return {};

  const offer = urls.find((u) => /job|offre|career|post|apply/i.test(u)) || urls[0];
  const channel = urls.find((u) => /linkedin\.com|welcometothejungle\.com|indeed\.com/i.test(u));

  return {
    offerUrl: offer,
    channelUrl: channel,
  };
}

/**
 * Parses an ultra-compact single line (e.g. "Doctolib", "Capgemini, React, Lyon", "Thales | Cyber | Entretien")
 */
export function parseExpressLine(
  rawLine: string,
  defaults?: ParserDefaults,
): ParsedCandidate {
  // Strip bullet points or numbers (e.g., "1. ", "- ", "* ")
  const line = rawLine.replace(/^\s*(?:\d+[\.\)\-]|[•\*\-\+])\s*/, "").trim();

  const today = formatDateISO(new Date());
  const defaultPosition = defaults?.position?.trim() || "Développeur Full Stack";
  const defaultStatus = defaults?.status || "sent";
  const defaultJobType = defaults?.jobType || "pfe";
  const defaultAppliedAt = defaults?.appliedAt || today;
  const defaultWorkMode = defaults?.workMode || "onsite";
  const defaultChannel = defaults?.channel || "linkedin_job";
  const defaultDomain = defaults?.domain || "software_engineering";

  // Check for separators: Tab, Pipe |, Semicolon ;, Comma ,, or " - "
  let parts: string[] = [];
  if (line.includes("\t")) {
    parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
  } else if (line.includes("|")) {
    parts = line.split("|").map((p) => p.trim()).filter(Boolean);
  } else if (line.includes(";")) {
    parts = line.split(";").map((p) => p.trim()).filter(Boolean);
  } else if (line.includes(" - ")) {
    parts = line.split(" - ").map((p) => p.trim()).filter(Boolean);
  } else if (line.includes(",") && !/,\s*(?:inc|ltd|sa|sas|sarl)\b/i.test(line)) {
    parts = line.split(",").map((p) => p.trim()).filter(Boolean);
  }

  if (parts.length >= 2) {
    const rawCompany = parts[0];
    const companyName = cleanCompanyName(rawCompany);
    let position = "";
    let location = defaults?.location || "";
    let status = defaultStatus;
    let appliedAt = defaultAppliedAt;

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const partLower = part.toLowerCase();

      // Check if this part is a city
      const matchedCity = extractLocation(part);
      if (matchedCity && !location) {
        location = matchedCity;
        continue;
      }

      // Check if this part is a status
      if (/\b(refus|entretien|offre|attente|envoy|draft|postul)\b/i.test(partLower)) {
        status = extractStatus(part);
        continue;
      }

      // Check if this part is a date
      if (/\b(\d{1,2}[\/\.-]\d{1,2}|hier|aujourd'hui)\b/i.test(partLower)) {
        appliedAt = extractDate(part);
        continue;
      }

      // Otherwise it's position / role
      if (!position) {
        position = part;
      }
    }

    if (!position) position = defaultPosition;
    const domain = extractDomain(position) || defaultDomain;

    const values: ApplicationFormValues = emptyFormValues({
      companyName: companyName || "Entreprise",
      position,
      location,
      status,
      jobType: defaultJobType,
      domain,
      appliedAt,
      workMode: defaultWorkMode,
      channel: defaultChannel,
      description: rawLine,
    });

    return {
      values,
      confidence: { company: "high", position: "high" },
      rawSnippet: rawLine,
    };
  }

  // If no delimiter: check if it's a known company + role (e.g. "Google Frontend" or just "Doctolib")
  let companyName = "";
  let position = "";

  for (const comp of COMMON_COMPANIES) {
    const regex = new RegExp(`^${comp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b(.*)$`, "i");
    const m = line.match(regex);
    if (m) {
      companyName = comp;
      const rest = m[1].trim();
      if (rest) {
        position = rest.replace(/^(?:[-–|:,]|pour|au poste de)\s*/i, "").trim();
      }
      break;
    }
  }

  if (!companyName) {
    const words = line.split(/\s+/);
    if (words.length <= 3) {
      companyName = line;
      position = defaultPosition;
    } else {
      // Natural language line (e.g. "hier j'ai postulé chez...")
      return parseSingleApplication(line, defaults);
    }
  }

  if (!position) position = defaultPosition;

  const location = extractLocation(line) || defaults?.location || "";
  const status = extractStatus(line) || defaultStatus;
  const appliedAt = extractDate(line) || defaultAppliedAt;
  const domain = extractDomain(position) || defaultDomain;

  const values: ApplicationFormValues = emptyFormValues({
    companyName: companyName.trim(),
    position: position.trim(),
    location,
    status,
    jobType: defaultJobType,
    domain,
    appliedAt,
    workMode: defaultWorkMode,
    channel: defaultChannel,
    description: rawLine,
  });

  return {
    values,
    confidence: { company: "high", position: "high" },
    rawSnippet: rawLine,
  };
}

/**
 * Parses a single application from raw text block (e.g. an email or free notes)
 */
export function parseSingleApplication(
  rawText: string,
  defaults?: ParserDefaults,
): ParsedCandidate {
  const text = cleanRawText(rawText);
  const company = extractCompany(text);
  const position = extractPosition(text);
  const location = extractLocation(text) || defaults?.location || "";
  const workMode = extractWorkMode(text) || defaults?.workMode || "onsite";
  const status = extractStatus(text) || defaults?.status || "sent";
  const jobType = extractJobType(text) || defaults?.jobType || "pfe";
  const channel = extractChannel(text) || defaults?.channel || "linkedin_job";
  const appliedAt = extractDate(text) || defaults?.appliedAt || formatDateISO(new Date());
  const contact = extractContact(text);
  const urls = extractUrls(text);

  const fallbackPosition =
    position.title ||
    defaults?.position?.trim() ||
    (jobType === "pfe" ? "Stage PFE Software Engineering" : "Développeur Full Stack");

  const domain = extractDomain(fallbackPosition) || defaults?.domain || "software_engineering";

  const values: ApplicationFormValues = emptyFormValues({
    position: fallbackPosition,
    companyName: company.name || "Entreprise à préciser",
    location: location,
    workMode: workMode,
    status: status,
    jobType: jobType,
    domain: domain,
    channel: channel,
    appliedAt: appliedAt,
    offerUrl: urls.offerUrl || "",
    channelUrl: urls.channelUrl || "",
    channelEmail: contact.email || "",
    channelPhone: contact.phone || "",
    description: text.length > 500 ? text.slice(0, 500) + "..." : text,
  });

  return {
    values,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    confidence: {
      company: company.confidence,
      position: position.confidence,
    },
    rawSnippet: text,
  };
}

/**
 * Automatically splits multi-candidature text.
 * If user gives 1 line per company, splits into N candidatures instantaneously!
 */
export function parseMultipleApplications(
  rawText: string,
  defaults?: ParserDefaults,
): ParsedCandidate[] {
  const cleaned = cleanRawText(rawText);
  if (!cleaned) return [];

  // Check if multiple items separated by divider "---" or "==="
  if (/^---+$|^===+$/m.test(cleaned)) {
    const blocks = cleaned.split(/^---+|===+/m).map((b) => b.trim()).filter(Boolean);
    return blocks.map((b) => parseSingleApplication(b, defaults));
  }

  // Check if numbered list (e.g., "1. ...\n2. ...\n3. ...")
  const numberedLines = cleaned.split(/\n(?=\s*\d+[\.\)\-]\s+)/g).map((b) => b.trim()).filter(Boolean);
  if (numberedLines.length > 1) {
    return numberedLines.map((line) => parseExpressLine(line, defaults));
  }

  // Split by newline
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    // Check if this looks like a single corporate email (has typical email greeting and sign-off)
    const isSingleEmail =
      /\b(bonjour|madame|monsieur|cordialement|bien cordialement|remercie|accusons r[ée]ception|votre profil a retenu)\b/i.test(cleaned) &&
      lines.length < 25 &&
      !lines.some((l) => l.includes("|") || l.includes(";") || /^\d+[\.\)\-]/.test(l));

    if (!isSingleEmail) {
      // It's a multi-entry list! Every line is a candidate
      return lines.map((line) => parseExpressLine(line, defaults));
    }
  }

  // Single line
  if (lines.length === 1 && lines[0].length < 120) {
    return [parseExpressLine(lines[0], defaults)];
  }

  // Fallback single email / paragraph
  return [parseSingleApplication(cleaned, defaults)];
}
