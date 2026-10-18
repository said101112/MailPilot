import { lookupKnownCompanyLogo } from "./companyDirectory";

const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ?? "";

const HOSTNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

export function hasLogoDevToken(): boolean {
  return LOGO_DEV_TOKEN.startsWith("pk_") || LOGO_DEV_TOKEN.startsWith("sk_");
}

export function logoDevUrl(domain: string): string | null {
  if (!hasLogoDevToken() || !domain) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=256&format=png&fallback=404`;
}

/**
 * 100% Free, 0-API-Key Google S2 High-Resolution Favicon service.
 * Returns HTTP 404 when not found (triggers browser onError properly).
 */
export function googleFaviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/**
 * 100% Free, 0-API-Key Icon Horse CDN.
 * Extracts real website icons and brandmarks.
 */
export function iconHorseUrl(domain: string): string {
  return `https://icon.horse/icon/${encodeURIComponent(domain)}`;
}

/**
 * 100% Free, 0-API-Key Unavatar CDN.
 */
export function unavatarUrl(domain: string): string {
  return `https://unavatar.io/${encodeURIComponent(domain)}?fallback=false`;
}

/**
 * DuckDuckGo Favicon Service.
 * Note: When not found, DDG returns an HTTP 404 with a 1478-byte gray image body.
 */
export function duckduckgoIconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export function domainFromWebsite(website?: string | null): string | null {
  if (!website) return null;
  try {
    const hostname = new URL(
      website.startsWith("http") ? website : `https://${website}`,
    ).hostname;
    return hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function normalizeDomain(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const host = domainFromWebsite(trimmed) ?? trimmed;
  return HOSTNAME_PATTERN.test(host) ? host : null;
}

function scoreIconTag(tag: string, href: string): number {
  let score = 0;
  if (/apple-touch-icon/i.test(tag)) score += 300;
  if (/mask-icon/i.test(tag)) score += 150;
  if (/\.svg(\?|$)/i.test(href) || /svg\+xml/i.test(tag)) score += 500;
  const sizes = /sizes\s*=\s*["'](\d+)\s*[xX]\s*(\d+)["']/i.exec(tag);
  if (sizes) {
    score += Math.min(Math.max(Number(sizes[1]), Number(sizes[2])), 512);
  } else if (!/\.svg(\?|$)/i.test(href)) {
    score += 16;
  }
  return score;
}

export function extractBestIconUrl(html: string, baseUrl: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const tag of tags) {
    const rel = /rel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    if (!/icon/i.test(rel)) continue;
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href || href.startsWith("data:")) continue;

    const score = scoreIconTag(tag, href);
    if (score <= bestScore) continue;

    try {
      bestUrl = new URL(href, baseUrl).toString();
      bestScore = score;
    } catch {
      continue;
    }
  }

  return bestUrl;
}

/**
 * Curated list of high-contrast brand gradients for unknown companies
 * providing a premium, modern SaaS look (Stripe, Linear, Notion style).
 */
const BRAND_GRADIENTS = [
  { bg: "from-blue-600 to-indigo-700", ring: "ring-blue-400/20", text: "text-white" },
  { bg: "from-emerald-600 to-teal-800", ring: "ring-emerald-400/20", text: "text-white" },
  { bg: "from-violet-600 to-purple-800", ring: "ring-violet-400/20", text: "text-white" },
  { bg: "from-amber-500 to-orange-600", ring: "ring-amber-400/20", text: "text-white" },
  { bg: "from-rose-600 to-pink-700", ring: "ring-rose-400/20", text: "text-white" },
  { bg: "from-cyan-600 to-blue-700", ring: "ring-cyan-400/20", text: "text-white" },
  { bg: "from-indigo-600 to-sky-700", ring: "ring-indigo-400/20", text: "text-white" },
  { bg: "from-fuchsia-600 to-rose-700", ring: "ring-fuchsia-400/20", text: "text-white" },
  { bg: "from-teal-600 to-emerald-700", ring: "ring-teal-400/20", text: "text-white" },
];

export function getCompanyBrandGradient(name?: string | null): {
  bg: string;
  ring: string;
  text: string;
} {
  if (!name) return BRAND_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRAND_GRADIENTS.length;
  return BRAND_GRADIENTS[index];
}

export { lookupKnownCompanyLogo };
