"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import CompanyFormModal from "@/components/tracker/CompanyFormModal";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import { listApplications, listCompanies, listContacts } from "@/lib/tracker/queries";
import type { CompanyRow, JobApplicationRow } from "@/lib/tracker/types";
import {
  COUNTRY_OPTIONS,
  getCountryBadge,
  resolveCountryCategory,
} from "@/lib/tracker/countries";
import { syncSaudiDirectory } from "@/lib/tracker/saudiDirectory";
import { cn } from "@/lib/utils";

const sortOptions = [
  { value: "name_asc", label: "Nom (A → Z)" },
  { value: "name_desc", label: "Nom (Z → A)" },
  { value: "most_apps", label: "Plus de candidatures" },
  { value: "most_contacts", label: "Plus de contacts" },
  { value: "recent", label: "Plus récentes d'abord" },
];

const pageSizeOptions = [
  { value: "12", label: "12 / page" },
  { value: "24", label: "24 / page" },
  { value: "48", label: "48 / page" },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [contactsCount, setContactsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [syncingSaudi, setSyncingSaudi] = useState(false);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);

  const load = useCallback(async () => {
    try {
      const [companyRows, applicationRows, contactRows] = await Promise.all([
        listCompanies(),
        listApplications(),
        listContacts(),
      ]);
      setCompanies(companyRows);
      setApplications(applicationRows);
      const counts: Record<string, number> = {};
      for (const contact of contactRows) {
        if (contact.company_id) {
          counts[contact.company_id] = (counts[contact.company_id] ?? 0) + 1;
        }
      }
      setContactsCount(counts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load companies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "1") {
        setEditing(null);
        setModalOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleSyncSaudi = async () => {
    setSyncingSaudi(true);
    try {
      const res = await syncSaudiDirectory();
      toast.success(
        `Annuaire Arabie Saoudite synchronisé : ${res.createdCompanies + res.updatedCompanies} entreprise(s), ${res.createdContacts + res.updatedContacts} contact(s).`
      );
      localStorage.setItem("tracker_saudi_contacts_synced_v2", "true");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la synchronisation.");
    } finally {
      setSyncingSaudi(false);
    }
  };

  const isFiltered = search.trim() !== "" || countryFilter !== "all" || sortBy !== "name_asc";

  const handleResetFilters = () => {
    setSearch("");
    setCountryFilter("all");
    setSortBy("name_asc");
    setPage(1);
  };

  const statsByCompany = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    for (const app of applications) {
      if (!app.company_id) continue;
      const entry = map.get(app.company_id) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (!["rejected", "withdrawn", "closed_expired", "accepted"].includes(app.status)) {
        entry.active += 1;
      }
      map.set(app.company_id, entry);
    }
    return map;
  }, [applications]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = companies.filter((company) => {
      // 1. Country Category filter
      if (countryFilter !== "all") {
        const country = resolveCountryCategory(company.location, company.domain || company.name);
        if (countryFilter === "non_saudi") {
          if (country === "saudi") return false;
        } else if (country !== countryFilter) {
          return false;
        }
      }

      // 2. Search query
      if (!term) return true;
      return [company.name, company.sector, company.location, company.website, company.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "most_apps") {
        const aApps = statsByCompany.get(a.id)?.total ?? 0;
        const bApps = statsByCompany.get(b.id)?.total ?? 0;
        return bApps - aApps;
      }
      if (sortBy === "most_contacts") {
        const aCt = contactsCount[a.id] ?? 0;
        const bCt = contactsCount[b.id] ?? 0;
        return bCt - aCt;
      }
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [companies, search, countryFilter, sortBy, statsByCompany, contactsCount]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement des entreprises..." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Entreprises</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            {companies.length} entreprise(s) · catégorisées par pays (Arabie Saoudite, Maroc, France, etc.).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={syncingSaudi}
            className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
            onClick={handleSyncSaudi}
            title="Attacher et catégoriser les 60 entreprises et contacts d'Arabie Saoudite"
          >
            <span className="text-sm leading-none">🇸🇦</span>
            <span>{syncingSaudi ? "Synchronisation..." : "Attacher contacts Saudi (60)"}</span>
          </button>
          <button
            type="button"
            className="editorial-button-primary h-8 px-3 text-xs flex items-center justify-center shrink-0"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-1.5 inline h-3.5 w-3.5" />
            Nouvelle entreprise
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              className="editorial-input w-full pl-9 pr-8 text-xs"
              placeholder="Rechercher nom, secteur, ville..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Country Category Filter (Saudi, Maroc, France, Other) */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={countryFilter}
            onChange={(val) => {
              setCountryFilter(val);
              setPage(1);
            }}
            options={COUNTRY_OPTIONS}
          />

          {/* Sort By */}
          <EditorialSelect
            className="editorial-select w-full text-xs"
            value={sortBy}
            onChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
            options={sortOptions}
          />
        </div>

        {/* Filter status & Reset button */}
        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Filtres actifs :{" "}
              <span className="font-medium text-gray-800">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </span>{" "}
              sur {companies.length}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-[#ff5722] transition-colors"
              onClick={handleResetFilters}
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Building2}
            title={companies.length === 0 ? "Aucune entreprise" : "Aucun résultat trouvé"}
            description={
              companies.length === 0
                ? "Les entreprises apparaissent ici dès que vous créez une candidature ou que vous en ajoutez une manuellement."
                : "Aucune entreprise ne correspond à vos critères de recherche ou de filtre."
            }
            action={
              companies.length === 0 ? (
                <button
                  type="button"
                  className="editorial-button-primary mt-2 h-8 px-3 text-xs"
                  onClick={() => setModalOpen(true)}
                >
                  Ajouter une entreprise
                </button>
              ) : (
                <button
                  type="button"
                  className="editorial-button-secondary mt-2 h-8 px-3 text-xs"
                  onClick={handleResetFilters}
                >
                  Réinitialiser les filtres
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((company) => {
              const stats = statsByCompany.get(company.id) ?? { total: 0, active: 0 };
              const country = resolveCountryCategory(company.location, company.domain || company.name);
              const countryBadge = getCountryBadge(country);

              return (
                <Link
                  key={company.id}
                  href={`/tracker/companies/${company.id}`}
                  className="group flex flex-col justify-between min-w-0 w-full rounded-lg border border-gray-200 bg-white p-3.5 sm:p-4 transition-colors hover:border-[#ff5722]"
                >
                  <div>
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <CompanyLogo
                        name={company.name}
                        logoUrl={company.logo_url}
                        domain={company.domain}
                        website={company.website}
                        className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-[#ff5722] transition-colors">
                            {company.name}
                          </p>
                          {countryBadge && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium border",
                                countryBadge.badgeClass
                              )}
                              title={countryBadge.name}
                            >
                              <span>{countryBadge.flag}</span>
                              <span className="hidden sm:inline">{countryBadge.name}</span>
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-gray-500 mt-0.5">
                          {[company.sector, company.location].filter(Boolean).join(" · ") ||
                            company.website ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    {company.description && (
                      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-gray-500 break-words">
                        {company.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-[11px] text-gray-500">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 shrink-0">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        {stats.total} candidature(s)
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Users className="h-3 w-3 text-gray-400" />
                        {contactsCount[company.id] ?? 0} contact(s)
                      </span>
                    </div>
                    {stats.active > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 shrink-0">
                        {stats.active} en cours
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Companies Pagination */}
          {filtered.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Affichage de{" "}
                  <span className="font-semibold text-gray-800">
                    {(currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  à{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * pageSize, filtered.length)}
                  </span>{" "}
                  sur <span className="font-semibold text-gray-800">{filtered.length}</span>{" "}
                  entreprise{filtered.length > 1 ? "s" : ""}
                </span>
                <div className="w-28">
                  <EditorialSelect
                    className="editorial-select h-7 text-xs"
                    value={String(pageSize)}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                    options={pageSizeOptions}
                  />
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    className="editorial-button-secondary h-7 px-2 text-xs disabled:opacity-40 cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:mr-0.5" />
                    <span className="hidden sm:inline">Précédent</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, index, array) => {
                        const prev = array[index - 1];
                        return (
                          <div key={p} className="flex items-center">
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-gray-400">...</span>
                            )}
                            <button
                              type="button"
                              className={cn(
                                "h-7 min-w-7 rounded-md px-2 text-xs font-semibold transition cursor-pointer",
                                currentPage === p
                                  ? "bg-[#ff5722] text-white"
                                  : "text-gray-600 hover:bg-gray-100",
                              )}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    className="editorial-button-secondary h-7 px-2 text-xs disabled:opacity-40 cursor-pointer"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <ChevronRight className="h-3.5 w-3.5 sm:ml-0.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <CompanyFormModal
          key={editing?.id ?? "new-company"}
          open
          onClose={() => setModalOpen(false)}
          onSaved={() => void load()}
          editingCompany={editing}
        />
      )}
    </div>
  );
}
