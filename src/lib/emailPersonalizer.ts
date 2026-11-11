/**
 * Smart Email & Template Personalization Engine
 * Dynamically tailors greetings, company mentions, and natural tone based on recipient email domain:
 * - Corporate domain (e.g. @airbus.com, @careers.capgemini.com): infers company ("Airbus", "Capgemini") and injects natural phrasing.
 * - Personal/webmail domain (e.g. @gmail.com, @outlook.com): omits artificial company mentions smoothly.
 * - Personal email prefix (e.g. sara.alami@...): uses "Bonjour Sara," / "Hello Sara,"; generic prefix (recrutement@...): uses clean "Bonjour," / "Hello,".
 */

export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.fr",
  "yahoo.co.uk",
  "ymail.com",
  "hotmail.com",
  "hotmail.fr",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.fr",
  "aol.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "bbox.fr",
  "menara.ma",
  "iam.net.ma",
]);

const RECRUITING_SUBDOMAINS = new Set([
  "careers",
  "career",
  "carriere",
  "carrieres",
  "jobs",
  "job",
  "recrutement",
  "recruitment",
  "recruiting",
  "talent",
  "talents",
  "hr",
  "rh",
  "drh",
  "contact",
  "info",
  "mail",
  "email",
  "smtp",
  "stages",
  "stage",
  "pfe",
  "group",
  "groupe",
  "campus",
  "join",
  "apply",
  "team",
]);

const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "com.ma",
  "co.ma",
  "net.ma",
  "org.ma",
  "com.fr",
  "co.fr",
  "com.au",
  "com.br",
  "co.in",
  "com.es",
  "com.tr",
]);

const ACRONYM_MAP: Record<string, string> = {
  cgi: "CGI",
  ibm: "IBM",
  sap: "SAP",
  ey: "EY",
  pwc: "PwC",
  kpmg: "KPMG",
  bcg: "BCG",
  ovh: "OVH",
  ovhcloud: "OVHcloud",
  hp: "HP",
  hpe: "HPE",
  dxc: "DXC",
  ntt: "NTT",
  tcs: "TCS",
  bnp: "BNP",
  sfr: "SFR",
  ems: "EMS",
  it: "IT",
  ai: "AI",
  aws: "AWS",
  cbi: "CBI",
  sg: "Société Générale",
  bnpparibas: "BNP Paribas",
  societegenerale: "Société Générale",
  soprasteria: "Sopra Steria",
  capgemini: "Capgemini",
  accenture: "Accenture",
  devoteam: "Devoteam",
  wavestone: "Wavestone",
  thalesgroup: "Thales",
  airbus: "Airbus",
};

const GENERIC_LOCAL_TOKENS = new Set([
  "recrutement",
  "recruitment",
  "recruteur",
  "recruiting",
  "rh",
  "hr",
  "drh",
  "careers",
  "career",
  "carriere",
  "carrieres",
  "jobs",
  "job",
  "talent",
  "talents",
  "acquisition",
  "contact",
  "contacts",
  "info",
  "infos",
  "hello",
  "bonjour",
  "salut",
  "hi",
  "stage",
  "stages",
  "pfe",
  "intern",
  "internship",
  "internships",
  "candidature",
  "candidatures",
  "apply",
  "team",
  "equipe",
  "support",
  "admin",
  "direction",
  "hiring",
  "people",
  "staffing",
  "office",
  "service",
  "services",
  "commercial",
  "sales",
  "marketing",
  "tech",
  "it",
  "dev",
  "data",
  "ai",
  "ia",
  "cloud",
  "digital",
  "engineering",
  "ingenierie",
  "communication",
  "com",
  "presse",
  "france",
  "maroc",
  "morocco",
  "paris",
  "rabat",
  "casa",
  "casablanca",
  "tanger",
  "tangier",
  "lyon",
  "noreply",
  "no-reply",
  "mail",
  "email",
  "cv",
  "resume",
  "work",
  "join",
  "joinus",
  "opportunities",
  "direct",
]);

const GENERIC_COMPANY_PLACEHOLDERS = new Set([
  "",
  "entreprise",
  "votre entreprise",
  "votre équipe",
  "l'entreprise",
  "équipe recrutement",
  "equipe recrutement",
  "recruteur",
  "recruiter",
  "recruteur direct",
  "recrutement direct",
  "direct",
  "direct hire",
  "company",
  "société",
  "societe",
  "unknown",
  "hiring team",
  "the hiring team",
  "hiring manager",
  "n/a",
  "-",
]);

const GENERIC_NAME_PLACEHOLDERS = new Set([
  "",
  "hiring manager",
  "responsable recrutement",
  "équipe recrutement",
  "equipe recrutement",
  "directeur ressources humaines",
  "talent acquisition",
  "ressources humaines",
  "contact entreprise",
  "contact général",
  "contact",
  "drh",
  "rh",
  "hr",
  "recrutement",
  "recruteur",
  "recruteur direct",
  "madame, monsieur",
  "madame monsieur",
  "dear hiring team",
  "direct",
  "team",
]);

export function isPublicEmailDomain(email: string): boolean {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length < 2) return false;
  return PUBLIC_EMAIL_DOMAINS.has(parts[1]);
}

function formatCompanyRoot(rawRoot: string): string {
  const clean = rawRoot.trim().toLowerCase();
  if (!clean) return "";

  if (ACRONYM_MAP[clean]) {
    return ACRONYM_MAP[clean];
  }

  return clean
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => {
      if (ACRONYM_MAP[word]) return ACRONYM_MAP[word];
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Infer clean company name and domain from recipient email address.
 * Returns null when domain is a free/personal email provider (Gmail, Outlook, Yahoo, etc.).
 */
export function inferCompanyFromEmail(email: string): {
  name: string;
  domain: string;
  website: string;
} | null {
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length < 2) return null;
  const fullDomain = parts[1].trim();
  if (!fullDomain || !fullDomain.includes(".")) return null;

  if (PUBLIC_EMAIL_DOMAINS.has(fullDomain)) return null;

  const segments = fullDomain.split(".").filter(Boolean);
  if (segments.length < 2) return null;

  // Strip known multi-part country TLDs (e.g. co.uk, com.ma) or standard TLD
  const lastTwo = `${segments[segments.length - 2]}.${segments[segments.length - 1]}`;
  const withoutTld =
    segments.length >= 3 && MULTI_PART_TLDS.has(lastTwo)
      ? segments.slice(0, -2)
      : segments.slice(0, -1);

  if (withoutTld.length === 0) return null;

  // Strip leading recruiting subdomains (e.g. careers.capgemini.com -> capgemini)
  let rootSegments = [...withoutTld];
  while (rootSegments.length > 1 && RECRUITING_SUBDOMAINS.has(rootSegments[0])) {
    rootSegments.shift();
  }

  const rawRoot = rootSegments.join("-");
  if (!rawRoot || rawRoot.length < 2) return null;

  const formattedName = formatCompanyRoot(rawRoot);
  if (!formattedName) return null;

  return {
    name: formattedName,
    domain: fullDomain,
    website: `https://${fullDomain}`,
  };
}

/**
 * Extract a genuine human first name from email local part or explicit contact name.
 * Returns null if the address/name looks like a generic inbox (recrutement@, hr@, talent@),
 * allowing greetings to cleanly default to "Bonjour," / "Hello,".
 */
export function inferFirstNameFromEmail(
  email: string,
  explicitName?: string | null
): string | null {
  if (explicitName) {
    const cleanExplicit = explicitName.trim();
    const lowerExplicit = cleanExplicit.toLowerCase();

    const startsWithGenericPrefix =
      lowerExplicit.startsWith("recrutement ") ||
      lowerExplicit.startsWith("direction ") ||
      lowerExplicit.startsWith("ressources ") ||
      lowerExplicit.startsWith("talent ") ||
      lowerExplicit.startsWith("contact ") ||
      lowerExplicit.startsWith("équipe ") ||
      lowerExplicit.startsWith("equipe ") ||
      lowerExplicit.startsWith("hiring ") ||
      lowerExplicit.startsWith("team ");

    if (
      cleanExplicit &&
      !GENERIC_NAME_PLACEHOLDERS.has(lowerExplicit) &&
      !startsWithGenericPrefix
    ) {
      const firstToken = cleanExplicit.split(/\s+/)[0];
      if (
        firstToken &&
        firstToken.length >= 2 &&
        !GENERIC_LOCAL_TOKENS.has(firstToken.toLowerCase()) &&
        /^[a-zà-ÿ'-]+$/i.test(firstToken)
      ) {
        return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
      }
    }
  }

  const partsAt = email.trim().toLowerCase().split("@");
  const localPart = partsAt[0] || "";
  if (!localPart) return null;

  // Ignore digits at end (e.g. hr2027)
  const cleanLocal = localPart.replace(/[0-9]+$/g, "");
  const tokens = cleanLocal.split(/[._-]+/).filter(Boolean);

  // Only treat multi-part personal format (firstname.lastname) as confident first name
  if (tokens.length >= 2) {
    const first = tokens[0];
    const second = tokens[1];
    const hasGenericToken = tokens.some((t) => GENERIC_LOCAL_TOKENS.has(t));

    if (
      !hasGenericToken &&
      first.length >= 2 &&
      second.length >= 2 &&
      /^[a-zà-ÿ]+$/i.test(first) &&
      /^[a-zà-ÿ]+$/i.test(second)
    ) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }

  return null;
}

export interface EmailPersonalizationOptions {
  email?: string;
  company?: string | null;
  contactName?: string | null;
  position?: string | null;
  candidateName?: string | null;
  isEnglish?: boolean;
  boldCompany?: boolean;
  stripFormatting?: boolean;
  extraFields?: Record<string, unknown>;
}

export interface ResolvedEmailContext {
  companyName: string | null;
  firstName: string | null;
  greeting: string;
  isPublicProvider: boolean;
  isEnglish: boolean;
}

function detectLanguage(text: string, explicitEnglish?: boolean): boolean {
  if (typeof explicitEnglish === "boolean") return explicitEnglish;
  const lower = text.toLowerCase();
  return (
    lower.includes("kind regards") ||
    lower.includes("best regards") ||
    lower.includes("dear hiring") ||
    lower.includes("[at company]") ||
    lower.includes("application –") ||
    lower.includes("final-year internship") ||
    lower.includes("6-month final-year internship") ||
    lower.includes("seeking a 6-month") ||
    lower.includes("seeking a 4-to-6-month")
  );
}

/**
 * Resolve dynamic context (real company vs webmail, real first name vs neutral greeting)
 */
export function resolveEmailContext(
  options: EmailPersonalizationOptions,
  sampleText = ""
): ResolvedEmailContext {
  const email = (options.email || "").trim();
  const isPublicProvider = email ? isPublicEmailDomain(email) : false;
  const inferred = email ? inferCompanyFromEmail(email) : null;

  let companyName: string | null = null;
  const explicitCompany = options.company?.trim() || "";
  if (
    explicitCompany &&
    !GENERIC_COMPANY_PLACEHOLDERS.has(explicitCompany.toLowerCase())
  ) {
    companyName = explicitCompany;
  } else if (inferred?.name) {
    companyName = inferred.name;
  }

  const firstName = inferFirstNameFromEmail(email, options.contactName);
  const isEnglish = detectLanguage(sampleText, options.isEnglish);
  const greeting = isEnglish
    ? firstName
      ? `Hello ${firstName},`
      : "Hello,"
    : firstName
      ? `Bonjour ${firstName},`
      : "Bonjour,";

  return {
    companyName,
    firstName,
    greeting,
    isPublicProvider,
    isEnglish,
  };
}

/**
 * Normalize extra horizontal spaces left behind when optional phrases are omitted,
 * without touching intentional line breaks (\n).
 */
function cleanInlineSpacing(text: string): string {
  return text
    .replace(/[^\S\r\n]{2,}/g, " ")
    .replace(/ +([,.;:!?])/g, "$1")
    .trim();
}

/**
 * Render subject or message text dynamically with zero awkward placeholders.
 */
export function personalizeEmailText(
  text: string,
  options: EmailPersonalizationOptions
): string {
  const ctx = resolveEmailContext(options, text);
  const candidateName = options.candidateName?.trim() || "Said Nichan";
  const defaultPosition = ctx.isEnglish ? "Final-Year Internship" : "Stage PFE";
  const positionValue = options.position?.trim() || defaultPosition;

  let result = text;

  // 1. Optional CSV extra fields (excluding special dynamic tags handled below)
  if (options.extraFields) {
    Object.entries(options.extraFields).forEach(([key, val]) => {
      if (typeof val !== "string") return;
      const lowerKey = key.toLowerCase();
      if (["company", "name", "myname", "position"].includes(lowerKey)) return;
      const regex = new RegExp(`\\[${key}\\]`, "gi");
      result = result.replace(regex, val);
    });
  }

  // 2. Greeting
  result = result.replace(/\[Greeting\]/gi, ctx.greeting);

  // 3. Conditional company tags: included ONLY when corporate company is identified
  if (ctx.companyName) {
    const styledCompany =
      options.boldCompany && !options.stripFormatting
        ? `**${ctx.companyName}**`
        : ctx.companyName;

    result = result
      .replace(/\[chez Company\]/gi, ` chez ${styledCompany}`)
      .replace(/\[at Company\]/gi, ` at ${styledCompany}`)
      .replace(/\[ - Company\]/gi, ` - ${ctx.companyName}`)
      .replace(/\[- Company\]/gi, ` - ${ctx.companyName}`)
      .replace(/\[Company\]/gi, ctx.companyName)
      .replace(/\{company\}/gi, ctx.companyName);
  } else {
    // Webmail (@gmail.com, @outlook.com, etc.) or unknown company -> remove company suffix gracefully
    result = result
      .replace(/\[chez Company\]/gi, "")
      .replace(/\[at Company\]/gi, "")
      .replace(/\[ - Company\]/gi, "")
      .replace(/\[- Company\]/gi, "")
      // Smart cleanup if user/custom template uses raw [Company]
      .replace(/\s+au sein de votre entreprise\s+\[Company\]/gi, " au sein de votre entreprise")
      .replace(/\s+au sein de\s+\[Company\]/gi, " au sein de votre équipe")
      .replace(/\s+chez\s+\[Company\]/gi, "")
      .replace(/\s+pour\s+\[Company\]/gi, "")
      .replace(/\s+at\s+\[Company\]/gi, "")
      .replace(/\s+with\s+\[Company\]/gi, "")
      .replace(/\s*-\s*\[Company\]/gi, "")
      .replace(/\[Company\]/gi, ctx.isEnglish ? "your team" : "votre équipe")
      .replace(/\{company\}/gi, ctx.isEnglish ? "your team" : "votre équipe");
  }

  // 4. Position
  if (!options.position) {
    result = result
      .replace(/in the \[Position\] role/gi, "in the open position")
      .replace(/\[Position\] role/gi, "open position");
  }
  result = result
    .replace(/\[Position\]/gi, positionValue)
    .replace(/\{position\}/gi, positionValue);

  // 5. Contact Name / HR Name
  if (ctx.firstName) {
    result = result
      .replace(/\[Name\]/gi, ctx.firstName)
      .replace(/\[HR Name\]/gi, ctx.firstName);
  } else {
    result = result
      .replace(/Bonjour\s+\[Name\]\s*,?/gi, "Bonjour,")
      .replace(/Hello\s+\[Name\]\s*,?/gi, "Hello,")
      .replace(/\[Name\]/gi, ctx.isEnglish ? "Hiring Team" : "Équipe Recrutement")
      .replace(/\[HR Name\]/gi, ctx.isEnglish ? "Hiring Team" : "Équipe Recrutement");
  }

  // 6. Candidate signature
  result = result
    .replace(/\[MyName\]/gi, candidateName)
    .replace(/\{name\}/gi, candidateName);

  // 7. Preserve line breaks while normalizing any inline double spaces
  const cleaned = result
    .split("\n")
    .map((line) => cleanInlineSpacing(line))
    .join("\n");

  return options.stripFormatting ? stripEmailFormatting(cleaned) : cleaned;
}

/**
 * Strip bold markdown (`**...**`) and HTML `<strong>` tags into clean plain text
 * (used for PDFs, email Subject lines, Gmail Web URLs, and plain-text email fallbacks).
 */
export function stripEmailFormatting(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/<\/?strong>/gi, "");
}

/**
 * Convert markdown bold (`**...**`) and newlines into semantic HTML (`<strong>...</strong>`, `<br>`)
 * suitable for Gmail SMTP and n8n Gmail Drafts.
 */
export function formatEmailToHtml(text: string): string {
  const withBold = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  if (withBold.includes("<br") || withBold.includes("<p")) {
    return withBold;
  }
  return withBold.replace(/\r?\n/g, "<br>");
}

