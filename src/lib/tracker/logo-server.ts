import {
  duckduckgoIconUrl,
  extractBestIconUrl,
  logoDevUrl,
  normalizeDomain,
} from "./logo";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new Map<string, { expires: number; url: string | null }>();

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*" },
    });
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function probeImage(url: string, timeoutMs = 4000): Promise<boolean> {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response || !response.ok) return false;
  await response.body?.cancel().catch(() => undefined);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.startsWith("image/") || contentType.includes("icon");
}

async function scrapeSiteIcon(domain: string): Promise<string | null> {
  for (const scheme of ["https", "http"]) {
    const origin = `${scheme}://${domain}`;
    const response = await fetchWithTimeout(origin, 5000);
    if (!response || !response.ok) continue;
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("html")) {
      await response.body?.cancel().catch(() => undefined);
      continue;
    }
    let html: string;
    try {
      html = (await response.text()).slice(0, 500_000);
    } catch {
      continue;
    }
    const iconUrl = extractBestIconUrl(html, origin);
    if (iconUrl && (await probeImage(iconUrl))) return iconUrl;
  }
  return null;
}

export async function resolveLogoForDomain(
  input: string,
  options?: { quickOnly?: boolean },
): Promise<string | null> {
  const domain = normalizeDomain(input);
  if (!domain) return null;

  const cacheKey = `${options?.quickOnly ? "quick:" : "full:"}${domain}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.url;

  let resolved: string | null = null;

  const logodev = logoDevUrl(domain);
  if (logodev && (await probeImage(logodev))) {
    resolved = logodev;
  }

  if (!resolved && !options?.quickOnly) {
    resolved = await scrapeSiteIcon(domain);
  }

  if (!resolved) {
    const ddg = duckduckgoIconUrl(domain);
    if (await probeImage(ddg)) resolved = ddg;
  }

  if (!resolved && !options?.quickOnly) {
    for (const scheme of ["https", "http"]) {
      const rootFavicon = `${scheme}://${domain}/favicon.ico`;
      if (await probeImage(rootFavicon)) {
        resolved = rootFavicon;
        break;
      }
    }
  }

  cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, url: resolved });
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  return resolved;
}
