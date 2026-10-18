"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import CompanyFormModal from "@/components/tracker/CompanyFormModal";
import { listApplications, listCompanies, listContacts } from "@/lib/tracker/queries";
import type { CompanyRow, JobApplicationRow } from "@/lib/tracker/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [contactsCount, setContactsCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter((company) =>
      [company.name, company.sector, company.location, company.website]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [companies, search]);

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
            {companies.length} entreprise(s) · logos, contacts et candidatures centralisés.
          </p>
        </div>
        <button
          type="button"
          className="editorial-button-primary h-8 px-3 text-xs w-full sm:w-auto flex items-center justify-center self-start sm:self-auto shrink-0"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1.5 inline h-3.5 w-3.5" />
          Nouvelle entreprise
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-2.5 sm:px-5 sm:py-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            className="editorial-input w-full pl-9 text-xs"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Building2}
            title="Aucune entreprise"
            description="Les entreprises apparaissent ici dès que vous créez une candidature ou que vous en ajoutez une manuellement."
            action={
              <button
                type="button"
                className="editorial-button-primary mt-2 h-8 px-3 text-xs"
                onClick={() => setModalOpen(true)}
              >
                Ajouter une entreprise
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => {
            const stats = statsByCompany.get(company.id) ?? { total: 0, active: 0 };
            return (
              <Link
                key={company.id}
                href={`/tracker/companies/${company.id}`}
                className="group block min-w-0 w-full rounded-lg border border-gray-200 bg-white p-3.5 sm:p-4 transition-colors hover:border-[#ff5722]"
              >
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <CompanyLogo
                    name={company.name}
                    logoUrl={company.logo_url}
                    domain={company.domain}
                    website={company.website}
                    className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-[#ff5722] transition-colors">{company.name}</p>
                    <p className="truncate text-[11px] text-gray-500">
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
