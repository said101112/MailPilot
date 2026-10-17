"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import type { CompanyRow } from "@/lib/tracker/types";

export interface CompanyComboboxValue {
  companyId: string | null;
  name: string;
  website: string;
  domain: string;
  logoUrl: string;
  sector: string;
  location: string;
  description: string;
  wikidataId: string | null;
}

interface OnlineResult {
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

interface CompanyComboboxProps {
  companies: CompanyRow[];
  value: CompanyComboboxValue;
  onChange: (patch: Partial<CompanyComboboxValue>) => void;
  disabled?: boolean;
  label?: string;
  showNewCompanyHint?: boolean;
}

export default function CompanyCombobox({
  companies,
  value,
  onChange,
  disabled,
  label = "Entreprise",
  showNewCompanyHint = true,
}: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value.name);
  const [prevName, setPrevName] = useState(value.name);
  const [onlineResults, setOnlineResults] = useState<OnlineResult[]>([]);
  const [onlineQuery, setOnlineQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSetRef = useRef<Map<string, string | null>>(new Map());

  if (value.name !== prevName) {
    setPrevName(value.name);
    setQuery(value.name);
  }

  const rememberSet = useCallback((patch: Partial<CompanyComboboxValue>) => {
    const map = autoSetRef.current;
    if (patch.website !== undefined) map.set("website", patch.website);
    if (patch.domain !== undefined) map.set("domain", patch.domain);
    if (patch.logoUrl !== undefined) map.set("logoUrl", patch.logoUrl);
    if (patch.sector !== undefined) map.set("sector", patch.sector);
    if (patch.location !== undefined) map.set("location", patch.location);
    if (patch.description !== undefined) map.set("description", patch.description);
    if (patch.wikidataId !== undefined) map.set("wikidataId", patch.wikidataId);
  }, []);

  const stillUntouched = (key: string): boolean => {
    if (!autoSetRef.current.has(key)) return false;
    const stored = autoSetRef.current.get(key);
    const current = (value as unknown as Record<string, string | null>)[key];
    return stored === current;
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const searchOnline = useCallback(async (term: string) => {
    const normalized = term.trim().toLowerCase();
    if (term.trim().length < 2) {
      setOnlineQuery(normalized);
      setOnlineResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/companies/search?q=${encodeURIComponent(term)}`);
      if (!response.ok) throw new Error("search failed");
      const payload = (await response.json()) as { results?: OnlineResult[] };
      setOnlineQuery(normalized);
      setOnlineResults(payload.results ?? []);
    } catch {
      setOnlineQuery(normalized);
      setOnlineResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const commitTypedName = (nextName: string) => {
    const patch: Partial<CompanyComboboxValue> = { companyId: null, name: nextName };
    if (stillUntouched("website")) patch.website = "";
    if (stillUntouched("domain")) patch.domain = "";
    if (stillUntouched("logoUrl")) patch.logoUrl = "";
    if (stillUntouched("sector")) patch.sector = "";
    if (stillUntouched("location")) patch.location = "";
    if (stillUntouched("description")) patch.description = "";
    if (stillUntouched("wikidataId")) patch.wikidataId = null;
    autoSetRef.current.clear();
    onChange(patch);
  };

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    commitTypedName(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void searchOnline(next);
    }, 350);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (disabled || value.companyId) return;
      const typed = value.name.trim().toLowerCase();
      if (typed.length < 3) return;

      const local = companies.find(
        (company) => company.name.trim().toLowerCase() === typed,
      );
      const onlineForTyped = onlineQuery === typed ? onlineResults : [];
      const exactOnline = onlineForTyped.find(
        (result) => result.name.trim().toLowerCase() === typed,
      );
      const singleOnline = onlineForTyped.length === 1 ? onlineForTyped[0] : null;

      const fill: Partial<CompanyComboboxValue> = {};
      if (local) {
        if (!value.website && local.website) fill.website = local.website;
        if (!value.domain && local.domain) fill.domain = local.domain;
        if (!value.logoUrl && local.logo_url) fill.logoUrl = local.logo_url;
        if (!value.sector && local.sector) fill.sector = local.sector;
        if (!value.location && local.location) fill.location = local.location;
        if (!value.description && local.description) fill.description = local.description;
        if (!value.wikidataId && local.wikidata_id) fill.wikidataId = local.wikidata_id;
      } else {
        const match = exactOnline ?? singleOnline;
        if (match) {
          if (!value.website && match.website) fill.website = match.website;
          if (!value.domain && match.domain) fill.domain = match.domain;
          if (!value.logoUrl && match.logoUrl) fill.logoUrl = match.logoUrl;
          if (!value.sector && match.sector) fill.sector = match.sector;
          if (!value.location && match.location) fill.location = match.location;
          if (!value.description && match.description) fill.description = match.description;
          if (!value.wikidataId && match.wikidataId) fill.wikidataId = match.wikidataId;
        }
      }

      if (Object.keys(fill).length === 0) return;
      rememberSet(fill);
      onChange(fill);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value, companies, onlineResults, onlineQuery, disabled, onChange, rememberSet]);

  const selectExisting = (company: CompanyRow) => {
    const patch: Partial<CompanyComboboxValue> = {
      companyId: company.id,
      name: company.name,
      website: company.website ?? "",
      domain: company.domain ?? "",
      logoUrl: company.logo_url ?? "",
      sector: company.sector ?? "",
      location: company.location ?? "",
      description: company.description ?? "",
      wikidataId: company.wikidata_id,
    };
    rememberSet(patch);
    onChange(patch);
    setOpen(false);
  };

  const selectOnline = (result: OnlineResult) => {
    const patch: Partial<CompanyComboboxValue> = {
      companyId: null,
      name: result.name,
      website: result.website ?? "",
      domain: result.domain ?? "",
      logoUrl: result.logoUrl ?? "",
      sector: result.sector ?? "",
      location: result.location ?? "",
      description: result.description ?? "",
      wikidataId: result.wikidataId,
    };
    rememberSet(patch);
    onChange(patch);
    setOpen(false);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const localMatches = normalizedQuery
    ? companies.filter((company) => company.name.toLowerCase().includes(normalizedQuery))
    : companies.slice(0, 6);
  const onlineMatches = onlineResults.filter(
    (result) => !localMatches.some((company) => company.name.toLowerCase() === result.name.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="editorial-label">{label}</label>
      <div className="relative mt-1.5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          className="editorial-input w-full pl-9"
          value={query}
          disabled={disabled}
          placeholder="Rechercher une entreprise (ex : CGI, Capgemini...)"
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setOpen(true)}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {value.companyId && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600">
          <Check className="h-3 w-3" />
          Entreprise existante sélectionnée — elle sera réutilisée.
        </p>
      )}
      {showNewCompanyHint && !value.companyId && value.name.trim() && (
        <p className="mt-1.5 text-[11px] text-gray-500">
          Nouvelle entreprise : une fiche sera créée automatiquement à la sauvegarde.
        </p>
      )}

      {(value.logoUrl || value.website) && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <CompanyLogo
            name={value.name}
            logoUrl={value.logoUrl}
            domain={value.domain}
            website={value.website}
            className="h-8 w-8"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-900">{value.name}</p>
            <p className="truncate text-[11px] text-gray-500">
              {[value.sector, value.location, value.website].filter(Boolean).join(" · ") ||
                "Aperçu de la fiche"}
            </p>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-[0_12px_24px_rgba(16,24,40,0.12)]">
            {localMatches.length > 0 && (
              <div className="border-b border-gray-100">
                <p className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                  Dans votre tracker
                </p>
                {localMatches.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={() => selectExisting(company)}
                  >
                    <CompanyLogo
                      name={company.name}
                      logoUrl={company.logo_url}
                      domain={company.domain}
                      website={company.website}
                      className="h-7 w-7"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-gray-900">
                        {company.name}
                      </span>
                      <span className="block truncate text-[11px] text-gray-500">
                        {[company.sector, company.location].filter(Boolean).join(" · ") ||
                          company.website ||
                          "Fiche existante"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <p className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                Entreprises en ligne
              </p>
              {searching && onlineResults.length === 0 && (
                <p className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Recherche en cours...
                </p>
              )}
              {!searching && onlineMatches.length === 0 && (
                <p className="px-3 py-3 text-xs text-gray-400">
                  Aucun résultat. Vous pouvez créer l&apos;entreprise manuellement.
                </p>
              )}
              {onlineMatches.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => selectOnline(result)}
                >
                  <CompanyLogo
                    name={result.name}
                    logoUrl={result.logoUrl}
                    domain={result.domain}
                    website={result.website}
                    className="h-7 w-7"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-gray-900">
                      {result.name}
                    </span>
                    <span className="block truncate text-[11px] text-gray-500">
                      {[result.sector, result.location, result.website]
                        .filter(Boolean)
                        .join(" · ") || result.description || "Source : Wikidata"}
                    </span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left text-xs font-medium text-[#ff5722] hover:bg-[#fff3ef]",
                )}
                onClick={() => {
                  commitTypedName(query);
                  setOpen(false);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Créer manuellement « {query.trim() || "nouvelle entreprise"} »
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
