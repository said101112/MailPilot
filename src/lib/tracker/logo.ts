const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ?? "";

const HOSTNAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

export function hasLogoDevToken(): boolean {
  return LOGO_DEV_TOKEN.startsWith("pk_");
}

export function logoDevUrl(domain: string): string | null {
  if (!hasLogoDevToken() || !domain) return null;
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=256&format=png&fallback=404`;
}

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
