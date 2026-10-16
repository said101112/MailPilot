"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/tracker/format";

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  domain?: string | null;
  website?: string | null;
  className?: string;
}

function domainFrom(website?: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith("http") ? website : `https://${website}`)
      .hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function CompanyLogo({
  name,
  logoUrl,
  domain,
  website,
  className,
}: CompanyLogoProps) {
  const resolvedDomain = domain ?? domainFrom(website);
  const [stage, setStage] = useState<"primary" | "favicon" | "fallback">(
    logoUrl ? "primary" : resolvedDomain ? "favicon" : "fallback",
  );

  const sizeClass = className ?? "h-9 w-9";

  if (stage === "primary" && logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-md border border-gray-200 bg-white object-contain p-1",
        )}
        onError={() => setStage(resolvedDomain ? "favicon" : "fallback")}
      />
    );
  }

  if (stage === "favicon" && resolvedDomain) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?domain=${resolvedDomain}&sz=128`}
        alt={`${name} logo`}
        className={cn(
          sizeClass,
          "shrink-0 rounded-md border border-gray-200 bg-white object-contain p-1",
        )}
        onError={() => setStage("fallback")}
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
