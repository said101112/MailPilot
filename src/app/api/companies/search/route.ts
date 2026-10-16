import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface WikidataSearchHit {
  id: string;
  label?: string;
  description?: string;
}

interface CompanySuggestion {
  id: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  sector: string | null;
  location: string | null;
  wikidataId: string | null;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 300;
const cache = new Map<string, { expires: number; value: CompanySuggestion[] }>();

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "MailPilotJobTracker/1.0 (personal job application tracker)";

const BUSINESS_CLASSES = new Set([
  "Q4830453", // business enterprise
  "Q891723", // technology company
  "Q2519453", // financial services company
  "Q47461344", // organization
  "Q43229", // organization
  "Q6881511", // enterprise
  "Q1637706", // brand
  "Q7881478", // IT consultancy
]);

async function wikidataFetch(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Wikidata responded with ${response.status}`);
  }
  return response.json();
}

function extractStringClaim(entity: unknown, propertyId: string): string | null {
  const claims = (entity as { claims?: Record<string, unknown[]> })?.claims;
  const list = claims?.[propertyId];
  const first = Array.isArray(list) ? list[0] : null;
  const mainsnak = (first as { mainsnak?: { datavalue?: { value?: unknown } } })
    ?.mainsnak?.datavalue?.value;
  if (typeof mainsnak === "string") return mainsnak;
  const urlValue = (mainsnak as { [key: string]: unknown } | undefined)?.["http://www.w3.org/1999/02/22-rdf-syntax-ns#string"];
  if (typeof urlValue === "string") return urlValue;
  const idValue = (mainsnak as { id?: string } | undefined)?.id;
  return idValue ?? null;
}

function extractEntityIdClaim(entity: unknown, propertyId: string): string | null {
  const claims = (entity as { claims?: Record<string, unknown[]> })?.claims;
  const list = claims?.[propertyId];
  const first = Array.isArray(list) ? list[0] : null;
  const value = (first as { mainsnak?: { datavalue?: { value?: { id?: string } } } })
    ?.mainsnak?.datavalue?.value;
  return value?.id ?? null;
}

function extractEntityIdsClaim(entity: unknown, propertyId: string): string[] {
  const claims = (entity as { claims?: Record<string, unknown[]> })?.claims;
  const list = claims?.[propertyId];
  if (!Array.isArray(list)) return [];
  return list
    .map(
      (entry) =>
        (entry as { mainsnak?: { datavalue?: { value?: { id?: string } } } })?.mainsnak
          ?.datavalue?.value?.id,
    )
    .filter((id): id is string => Boolean(id));
}

function domainFromWebsite(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website);
    return url.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

async function fetchEntityLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (ids.length === 0) return labels;
  const unique = Array.from(new Set(ids));
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const url = `${WIKIDATA_API}?action=wbgetentities&ids=${chunk.join("|")}&props=labels&languages=en|fr&format=json`;
    const data = (await wikidataFetch(url)) as {
      entities?: Record<string, { labels?: Record<string, { value: string }> }>;
    };
    for (const id of chunk) {
      const entity = data.entities?.[id];
      const label = entity?.labels?.en?.value ?? entity?.labels?.fr?.value;
      if (label) labels.set(id, label);
    }
  }
  return labels;
}

async function buildSuggestions(hits: WikidataSearchHit[]): Promise<CompanySuggestion[]> {
  if (hits.length === 0) return [];
  const ids = hits.map((hit) => hit.id).join("|");
  const detailUrl = `${WIKIDATA_API}?action=wbgetentities&ids=${ids}&props=claims|labels|descriptions&languages=en|fr&format=json`;
  const detail = (await wikidataFetch(detailUrl)) as {
    entities?: Record<
      string,
      {
        claims?: Record<string, unknown[]>;
        labels?: Record<string, { value: string }>;
        descriptions?: Record<string, { value: string }>;
      }
    >;
  };

  const candidates: Array<{
    id: string;
    entity: NonNullable<(typeof detail.entities)>[string];
    website: string | null;
    logoFile: string | null;
    industryIds: string[];
    locationId: string | null;
  }> = [];

  for (const hit of hits) {
    const entity = detail.entities?.[hit.id];
    if (!entity) continue;

    const website = extractStringClaim(entity, "P856");
    const logoFile = extractStringClaim(entity, "P154");
    const industryIds = extractEntityIdsClaim(entity, "P452");
    const locationId =
      extractEntityIdClaim(entity, "P159") ?? extractEntityIdClaim(entity, "P276");
    const instanceOf = extractEntityIdsClaim(entity, "P31");

    const looksLikeBusiness =
      instanceOf.some((id) => BUSINESS_CLASSES.has(id)) ||
      Boolean(website) ||
      Boolean(logoFile) ||
      industryIds.length > 0;

    if (!looksLikeBusiness) continue;

    candidates.push({ id: hit.id, entity, website, logoFile, industryIds, locationId });
  }

  const labelIds = [
    ...candidates.flatMap((c) => c.industryIds),
    ...candidates.map((c) => c.locationId).filter((id): id is string => Boolean(id)),
  ];
  const labels = await fetchEntityLabels(labelIds);

  return candidates.map((candidate) => {
    const name =
      candidate.entity.labels?.en?.value ??
      candidate.entity.labels?.fr?.value ??
      hits.find((h) => h.id === candidate.id)?.label ??
      "Unknown";
    const description =
      candidate.entity.descriptions?.en?.value ??
      candidate.entity.descriptions?.fr?.value ??
      null;
    const sector =
      candidate.industryIds.map((id) => labels.get(id)).filter(Boolean).join(", ") ||
      null;
    const logoUrl = candidate.logoFile
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
          candidate.logoFile,
        )}?width=240`
      : null;

    return {
      id: candidate.id,
      name,
      domain: domainFromWebsite(candidate.website),
      logoUrl,
      website: candidate.website,
      description,
      sector: sector || null,
      location: candidate.locationId ? labels.get(candidate.locationId) ?? null : null,
      wikidataId: candidate.id,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [], source: "none" });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json({ results: cached.value, source: "cache" });
  }

  try {
    const searchUrl = `${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(
      query,
    )}&language=en&uselang=en&type=item&limit=10&format=json`;
    const searchData = (await wikidataFetch(searchUrl)) as {
      search?: WikidataSearchHit[];
    };

    const suggestions = await buildSuggestions(searchData.search ?? []);

    cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: suggestions });
    if (cache.size > CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }

    return NextResponse.json({ results: suggestions, source: "wikidata" });
  } catch {
    return NextResponse.json(
      {
        results: [],
        source: "error",
        message: "Company lookup is unavailable right now. You can create the company manually.",
      },
      { status: 200 },
    );
  }
}
