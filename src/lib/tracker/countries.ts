export type CountryCategory = "all" | "saudi" | "morocco" | "france" | "other";

export interface CountryBadgeData {
  code: "saudi" | "morocco" | "france" | "other";
  name: string;
  label: string;
  flag: string;
  color: string;
  badgeClass: string;
}

export const COUNTRY_OPTIONS = [
  { value: "all", label: "Tous les pays" },
  { value: "non_saudi", label: "🌐 Hors Arabie Saoudite (Maroc, France, etc.)" },
  { value: "saudi", label: "🇸🇦 Arabie Saoudite (Saudi)" },
  { value: "morocco", label: "🇲🇦 Maroc" },
  { value: "france", label: "🇫🇷 France" },
  { value: "other", label: "🌍 Autre / International" },
] as const;

export const KNOWN_SAUDI_DOMAINS = new Set([
  "arabianfal.com",
  "aldawaa.com",
  "alojaimi.com",
  "rawabiholding.com",
  "dnata.com",
  "alesayi_motors.com",
  "alesayi-motors.com",
  "alarayan.com",
  "mcmermott.com",
  "mcdermott.com",
  "aytb.com",
  "gtecorp.com",
  "nesr.com",
  "farm.com",
  "farm.com.sa",
  "alhumamlaw.com",
  "gulfteksaudi.com",
  "catcosa.com",
  "tafear.com",
  "sraco.com",
  "sraco.com.sa",
  "atco.com",
  "atco.com.sa",
  "sa.yokogawa.com",
  "shadeco.com",
  "alkafaa.com",
  "kbr.com",
  "batook.com",
  "shawarmer.com",
  "archirodon.net",
  "binajinah.com",
  "nesma.com",
  "abdulla-fouad.com",
  "innosoft.sa",
  "startime.com",
  "musk.sa.com",
  "sabksa.com",
  "bonyan.sa",
  "innovest.com",
  "nhc.sa",
  "artar.com.sa",
  "darwaemaar.com",
  "almasah.net",
  "almoosahospital.com",
  "sghgroup.net",
  "drsulaimanalhabib.com",
  "jhah.com",
  "alahsahospital.com",
  "almanahospital.com",
  "familycare.com",
  "ramclinics.com",
  "fakeeh.care",
  "mouwasat.com",
  "dallah-hospital.com",
  "almurjanhospital.com",
]);

export const KNOWN_SAUDI_EMAILS = new Set([
  "cv@arabianfal.com",
  "cv@aldawaa.com",
  "hr.qrm@hotmail.com",
  "rec@alojaimi.com",
  "recruitment@rawabiholding.com",
  "job.s6@hotmail.com",
  "careers@dnata.com",
  "hr@alesayi_motors.com",
  "hr@alarayan.com",
  "recruiting.ksa@mcmermott.com",
  "recruitment@aytb.com",
  "wadaef@gtecorp.com",
  "careers@nesr.com",
  "recruit@farm.com",
  "info@alhumamlaw.com",
  "hr1@gulfteksaudi.com",
  "catcosa@catcosa.com",
  "cv@tafear.com",
  "recruitment@sraco.com",
  "info@atco.com",
  "hrdepartmental@sa.yokogawa.com",
  "recruitment@shadeco.com",
  "klc.hr@alkafaa.com",
  "kbr-amcdehr@kbr.com",
  "recruitment@batook.com",
  "career@shawarmer.com",
  "hrsupport@archirodon.net",
  "jobs@binajinah.com",
  "marketing.np@nesma.com",
  "wadaef2019@abdulla-fouad.com",
  "careers@innosoft.sa",
  "m@startime.com",
  "job@musk.sa.com",
  "shababwatansa@gmail.com",
  "j@sabksa.com",
  "al.alshaikh@bonyan.sa",
  "ymohammed@innovest.com",
  "s.alwadi@nhc.sa",
  "i.atassi@artar.com.sa",
  "oalkhunaizi@darwaemaar.com",
  "jobs@almasah.net",
  "recruitment.amjad@gmail.com",
  "jobrydlaw@gmail.com",
  "job@almoosahospital.com",
  "recruitment@almoosahospital.com",
  "jobs@sghgroup.net",
  "career.dmm@sghgroup.net",
  "talent.acquisition@drsulaimanalhabib.com",
  "careers@jhah.com",
  "hrd@alahsahospital.com",
  "career@almanahospital.com",
  "info@familycare.com",
  "info@ramclinics.com",
  "hr.dsfhr@fakeeh.care",
  "career@mouwasat.com",
  "careers@dallah-hospital.com",
  "hr.phc@drsulaimanalhabib.com",
  "careers@almurjanhospital.com",
  "hiringnow.ksa@gmail.com",
]);

/**
 * Resolves country category based on location, domain, or email.
 */
export function resolveCountryCategory(
  location?: string | null,
  emailOrDomain?: string | null
): "saudi" | "morocco" | "france" | "other" | null {
  const loc = (location || "").toLowerCase().trim();
  const target = (emailOrDomain || "").toLowerCase().trim();

  // 1. Check Saudi Arabia
  if (
    loc.includes("saudi") ||
    loc.includes("saoudite") ||
    loc.includes("ksa") ||
    loc.includes("riyadh") ||
    loc.includes("riyad") ||
    loc.includes("jeddah") ||
    loc.includes("dammam") ||
    loc.includes("khobar") ||
    target.endsWith(".sa") ||
    target.includes(".com.sa") ||
    target.includes(".sa.com") ||
    KNOWN_SAUDI_EMAILS.has(target) ||
    KNOWN_SAUDI_DOMAINS.has(target) ||
    target.includes("ksa") ||
    target.includes("saudi")
  ) {
    return "saudi";
  }

  // 2. Check Morocco
  if (
    loc.includes("maroc") ||
    loc.includes("morocco") ||
    loc.includes("casablanca") ||
    loc.includes("rabat") ||
    loc.includes("tanger") ||
    loc.includes("marrakech") ||
    loc.includes("agadir") ||
    loc.includes("fès") ||
    loc.includes("fes") ||
    target.endsWith(".ma") ||
    target.includes(".co.ma")
  ) {
    return "morocco";
  }

  // 3. Check France
  if (
    loc.includes("france") ||
    loc.includes("paris") ||
    loc.includes("lyon") ||
    loc.includes("marseille") ||
    loc.includes("bordeaux") ||
    loc.includes("nantes") ||
    loc.includes("toulouse") ||
    loc.includes("lille") ||
    loc.includes("rennes") ||
    target.endsWith(".fr")
  ) {
    return "france";
  }

  // 4. Other location specified
  if (loc.length > 0) {
    return "other";
  }

  return null;
}

/**
 * Returns UI badge configuration for a country code or location/domain inputs.
 */
export function getCountryBadge(
  categoryOrLocation?: string | null,
  emailOrDomain?: string | null
): CountryBadgeData | null {
  let category: "saudi" | "morocco" | "france" | "other" | null = null;
  if (
    categoryOrLocation === "saudi" ||
    categoryOrLocation === "morocco" ||
    categoryOrLocation === "france" ||
    categoryOrLocation === "other"
  ) {
    category = categoryOrLocation;
  } else {
    category = resolveCountryCategory(categoryOrLocation, emailOrDomain);
  }

  if (category === "saudi") {
    return {
      code: "saudi",
      name: "Arabie Saoudite",
      label: "Arabie Saoudite",
      flag: "🇸🇦",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    };
  }
  if (category === "morocco") {
    return {
      code: "morocco",
      name: "Maroc",
      label: "Maroc",
      flag: "🇲🇦",
      color: "bg-red-50 text-red-800 border-red-200",
      badgeClass: "bg-red-50 text-red-800 border-red-200",
    };
  }
  if (category === "france") {
    return {
      code: "france",
      name: "France",
      label: "France",
      flag: "🇫🇷",
      color: "bg-blue-50 text-blue-800 border-blue-200",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    };
  }
  if (category === "other") {
    return {
      code: "other",
      name: "International",
      label: "International",
      flag: "🌍",
      color: "bg-gray-50 text-gray-700 border-gray-200",
      badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    };
  }
  return null;
}
