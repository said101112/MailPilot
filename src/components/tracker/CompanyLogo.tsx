"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/tracker/format";
import { domainFromWebsite, duckduckgoIconUrl, logoDevUrl } from "@/lib/tracker/logo";

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
  if (logoUrl) sources.push(logoUrl);
  if (resolvedDomain) {
    const logodev = logoDevUrl(resolvedDomain);
    if (logodev) sources.push(logodev);
    sources.push(duckduckgoIconUrl(resolvedDomain));
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
          "shrink-0 rounded-md border border-gray-200 bg-white object-contain p-1",
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

  return (
    <div
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400",
      )}
      title={name}
    >
      {name ? (
        <span className="text-[11px] font-semibold text-gray-600">
          {initialsOf(name)}
        </span>
      ) : (
        <Building2 className="h-4 w-4" />
      )}
    </div>
  );
}
