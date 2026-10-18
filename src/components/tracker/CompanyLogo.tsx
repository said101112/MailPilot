"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/tracker/format";
import {
  domainFromWebsite,
  getCompanyBrandGradient,
  googleFaviconUrl,
  iconHorseUrl,
  logoDevUrl,
  lookupKnownCompanyLogo,
  unavatarUrl,
} from "@/lib/tracker/logo";

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  domain?: string | null;
  website?: string | null;
  className?: string;
}

export default function CompanyLogo({
  name,
  logoUrl,
  domain,
  website,
  className,
}: CompanyLogoProps) {
  const resolvedDomain = domain ?? domainFromWebsite(website);

  const sources: string[] = [];

  // 1. Check curated high-resolution company directory first (Maroc, Saudi, France, Global)
  const knownLogo = lookupKnownCompanyLogo(name, resolvedDomain);
  if (knownLogo) sources.push(knownLogo);

  // 2. Custom logo URL passed as prop
  if (logoUrl && !sources.includes(logoUrl)) {
    sources.push(logoUrl);
  }

  // 3. Domain-based resolution cascade (100% free, 0 API key)
  if (resolvedDomain) {
    // If user configured a valid logo.dev token
    const logodev = logoDevUrl(resolvedDomain);
    if (logodev && !sources.includes(logodev)) sources.push(logodev);

    // Google S2 Favicon (High-res 128px, free, clean 404 response on miss)
    const googleS2 = googleFaviconUrl(resolvedDomain, 128);
    if (!sources.includes(googleS2)) sources.push(googleS2);

    // Icon Horse CDN (Free, extracts real high-res site icons)
    const iconHorse = iconHorseUrl(resolvedDomain);
    if (!sources.includes(iconHorse)) sources.push(iconHorse);

    // Unavatar CDN (Free multi-provider fallback)
    const unavatar = unavatarUrl(resolvedDomain);
    if (!sources.includes(unavatar)) sources.push(unavatar);
  }

  const sourcesKey = sources.join("|");
  const [state, setState] = useState({ key: sourcesKey, index: 0 });
  if (state.key !== sourcesKey) {
    setState({ key: sourcesKey, index: 0 });
  }

  const sizeClass = className ?? "h-9 w-9";
  const src = state.index < sources.length ? sources[state.index] : undefined;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-lg border border-gray-200/80 bg-white object-contain p-1 shadow-sm transition-transform hover:scale-105",
        )}
        onError={() =>
          setState((current) =>
            current.key === sourcesKey
              ? { key: sourcesKey, index: current.index + 1 }
              : current,
          )
        }
      />
    );
  }

  // Premium Branded Gradient Avatar for companies without logos
  const brand = getCompanyBrandGradient(name);

  return (
    <div
      className={cn(
        sizeClass,
        "relative flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-sm transition-transform hover:scale-105 ring-1 ring-inset",
        brand.bg,
        brand.ring,
      )}
      title={name}
    >
      {name ? (
        <span className={cn("text-[11px] font-bold tracking-tight", brand.text)}>
          {initialsOf(name)}
        </span>
      ) : (
        <Building2 className="h-4 w-4 text-white/90" />
      )}
      <div className="absolute inset-0 rounded-lg bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
    </div>
  );
}
