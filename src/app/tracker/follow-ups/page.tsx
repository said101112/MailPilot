"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CheckSquare,
  MessageSquarePlus,
  MinusSquare,
  Search,
  Send,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import StatusBadge from "@/components/tracker/StatusBadge";
import FollowUpFormModal from "@/components/tracker/FollowUpFormModal";
import BulkRelanceModal, { type RelanceTarget } from "@/components/tracker/BulkRelanceModal";
import { CHANNEL_LABELS } from "@/lib/tracker/constants";
import { daysBetween, formatDate } from "@/lib/tracker/format";
import {
  completeFollowUp,
  deleteFollowUp,
  listApplications,
  listFollowUps,
  updateFollowUp,
} from "@/lib/tracker/queries";
import type { FollowUpRow, JobApplicationRow } from "@/lib/tracker/types";

const SILENCE_DAYS_KEY = "truck-app-tracker-silence-days";
const DEFAULT_SILENCE_DAYS = 7;

const WAITING_STATUSES = new Set(["sent", "awaiting_reply"]);

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUpRow | null>(null);
  const [preselectAppId, setPreselectAppId] = useState<string | null>(null);
  const [silenceDays, setSilenceDays] = useState(DEFAULT_SILENCE_DAYS);

  // Bulk Relance & Selection for silent applications
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [bulkRelanceOpen, setBulkRelanceOpen] = useState(false);
  const [silentSearchQuery, setSilentSearchQuery] = useState("");
  const [silentCompanyFilter, setSilentCompanyFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const [rows, apps] = await Promise.all([
        listFollowUps({ status: "todo" }),
        listApplications(),
      ]);
      setFollowUps(rows);
      setApplications(apps);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      const stored = window.localStorage.getItem(SILENCE_DAYS_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!Number.isNaN(parsed) && parsed > 0) setSilenceDays(parsed);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateSilenceDays = (value: number) => {
    const next = Math.max(1, Math.min(90, value));
    setSilenceDays(next);
    window.localStorage.setItem(SILENCE_DAYS_KEY, String(next));
  };

  const today = new Date().toISOString().slice(0, 10);

  const { overdue, dueToday, upcoming } = useMemo(() => {
    const overdueRows: FollowUpRow[] = [];
    const todayRows: FollowUpRow[] = [];
    const upcomingRows: FollowUpRow[] = [];
    for (const row of followUps) {
      if (row.due_date < today) overdueRows.push(row);
      else if (row.due_date === today) todayRows.push(row);
      else upcomingRows.push(row);
    }
    return { overdue: overdueRows, dueToday: todayRows, upcoming: upcomingRows };
  }, [followUps, today]);

  const silentCompanies = useMemo(() => {
    const map = new Map<string, number>();
    applications
      .filter((app) => WAITING_STATUSES.has(app.status))
      .filter((app) => {
        const reference = app.last_interaction_at ?? app.applied_at ?? app.created_at;
        return daysBetween(reference) >= silenceDays;
      })
      .forEach((app) => {
        const name = (app.company?.name || "Sans entreprise").trim();
        map.set(name, (map.get(name) ?? 0) + 1);
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, silenceDays]);

  const silentApplications = useMemo(
    () =>
      applications
        .filter((app) => WAITING_STATUSES.has(app.status))
        .filter((app) => {
          const reference = app.last_interaction_at ?? app.applied_at ?? app.created_at;
          return daysBetween(reference) >= silenceDays;
        })
        .sort((a, b) => {
          const refA = a.last_interaction_at ?? a.applied_at ?? a.created_at;
          const refB = b.last_interaction_at ?? b.applied_at ?? b.created_at;
          return refA.localeCompare(refB);
        }),
    [applications, silenceDays],
  );

  const filteredSilentApplications = useMemo(
    () =>
      silentApplications.filter((app) => {
        const compName = (app.company?.name || "").trim();
        const matchesCompany =
          silentCompanyFilter === "all" ||
          compName.toLowerCase() === silentCompanyFilter.toLowerCase();

        const q = silentSearchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          compName.toLowerCase().includes(q) ||
          app.position.toLowerCase().includes(q) ||
          (app.channel_email || "").toLowerCase().includes(q);

        return matchesCompany && matchesQuery;
      }),
    [silentApplications, silentCompanyFilter, silentSearchQuery]
  );

  const toggleSelectAppId = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFilteredSilent = () => {
    const ids = new Set(filteredSilentApplications.map((app) => app.id));
    setSelectedAppIds(ids);
    toast.info(`${ids.size} candidature(s) sans réponse sélectionnée(s).`);
  };

  const clearSilentSelection = () => {
    setSelectedAppIds(new Set());
  };

  const allFilteredSilentSelected =
    filteredSilentApplications.length > 0 &&
    filteredSilentApplications.every((app) => selectedAppIds.has(app.id));

  const silentRelanceTargets: RelanceTarget[] = useMemo(() => {
    return applications
      .filter((app) => selectedAppIds.has(app.id))
      .map((app) => ({
        id: app.id,
        applicationId: app.id,
        company: app.company?.name || "Entreprise",
        position: app.position,
        email: app.channel_email || "",
        name: app.primary_contact?.full_name,
        lastInteractionAt: app.last_interaction_at || app.applied_at || app.created_at,
      }))
      .filter((t) => Boolean(t.email));
  }, [applications, selectedAppIds]);

  const complete = async (row: FollowUpRow) => {
    try {
      await completeFollowUp(row.id);
      toast.success("Relance effectuée.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update.");
    }
  };

  const cancel = async (row: FollowUpRow) => {
    try {
      await updateFollowUp(row.id, { status: "cancelled" });
      toast.success("Relance annulée.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update.");
    }
  };

  const remove = async (row: FollowUpRow) => {
    if (!window.confirm("Supprimer cette relance ?")) return;
    try {
      await deleteFollowUp(row.id);
      toast.success("Relance supprimée.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete.");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement des relances..." />
      </div>
    );
  }

  const renderRow = (row: FollowUpRow) => (
    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5 sm:py-3">
      <div className="flex min-w-0 items-center gap-3 flex-1">
        <CompanyLogo
          name={row.application?.company?.name ?? "?"}
          logoUrl={row.application?.company?.logo_url}
          className="h-9 w-9 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/tracker/applications/${row.application_id}`}
            className="truncate block text-xs font-semibold text-gray-900 hover:text-[#ff5722]"
          >
            {row.application?.company?.name ?? "—"} · {row.application?.position ?? ""}
          </Link>
          <p className="text-[11px] text-gray-500 truncate">
            {formatDate(row.due_date)}
            {row.channel ? ` · ${CHANNEL_LABELS[row.channel] ?? row.channel}` : ""}
            {row.contact?.full_name ? ` · ${row.contact.full_name}` : ""}
          </p>
          {row.reason && <p className="mt-0.5 text-[11px] text-gray-500 truncate">{row.reason}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-end">
        <button
          type="button"
          className="editorial-button-primary h-8 px-3 text-xs flex-1 sm:flex-initial"
          onClick={() => void complete(row)}
        >
          <Check className="mr-1 inline h-3.5 w-3.5" />
          Effectuée
        </button>
        <button
          type="button"
          className="editorial-button-secondary h-8 px-3 text-xs flex-1 sm:flex-initial"
          onClick={() => {
            setEditing(row);
            setModalOpen(true);
          }}
        >
          Modifier
        </button>
        <button
          type="button"
          className="editorial-button-secondary h-8 px-2.5 sm:px-3 text-xs"
          onClick={() => void cancel(row)}
          title="Annuler"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="editorial-icon-button text-red-500"
          onClick={() => void remove(row)}
          title="Supprimer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Relances & prochaines actions
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {overdue.length} en retard · {dueToday.length} aujourd&apos;hui · {upcoming.length} à
            venir.
          </p>
        </div>
        <button
          type="button"
          className="editorial-button-primary h-8 px-3 text-xs w-full sm:w-auto"
          onClick={() => {
            setEditing(null);
            setPreselectAppId(null);
            setModalOpen(true);
          }}
        >
          <MessageSquarePlus className="mr-1.5 inline h-3.5 w-3.5" />
          Nouvelle relance
        </button>
      </div>

      {[
        { key: "overdue", title: "En retard", rows: overdue, tone: "text-red-600", icon: AlertTriangle },
        { key: "today", title: "Aujourd'hui", rows: dueToday, tone: "text-amber-600", icon: CalendarClock },
        { key: "upcoming", title: "Prochaines relances", rows: upcoming, tone: "text-gray-600", icon: CalendarClock },
      ].map((section) => (
        <div key={section.key} className="mt-4 rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <section.icon className={cn("h-4 w-4", section.tone)} />
            <div>
              <h2 className={cn("text-sm font-semibold", section.tone)}>{section.title}</h2>
              <p className="text-xs text-gray-500">{section.rows.length} relance(s)</p>
            </div>
          </div>
          {section.rows.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-gray-400">Rien ici.</p>
          ) : (
            <div className="divide-y divide-gray-100">{section.rows.map(renderRow)}</div>
          )}
        </div>
      ))}

      <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Candidatures sans réponse (+7j)
                </h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  {filteredSilentApplications.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Envoyées ou en attente depuis plus de{" "}
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="editorial-input mx-1 inline-block w-14 px-1.5 py-0.5 text-center text-xs font-semibold"
                  value={silenceDays}
                  onChange={(event) => updateSilenceDays(Number(event.target.value))}
                />{" "}
                jours. Prêtes pour une relance immédiate en 1 clic.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filteredSilentApplications.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFilteredSilent}
                  className="editorial-button-secondary h-8 px-3 text-xs"
                >
                  <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-gray-600 inline" />
                  Tout sélectionner ({filteredSilentApplications.length})
                </button>
              )}
              {selectedAppIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkRelanceOpen(true)}
                  className="editorial-button-primary h-8 px-3.5 text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Relancer la sélection ({selectedAppIds.size}) en Bulk</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Toolbar for silent candidatures */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100/80">
            {/* Filter by Company */}
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <select
                value={silentCompanyFilter}
                onChange={(e) => setSilentCompanyFilter(e.target.value)}
                className="h-8 rounded-md border border-gray-200 pl-8 pr-7 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] bg-white cursor-pointer text-gray-700 font-medium max-w-[180px] truncate"
              >
                <option value="all">Toutes entreprises ({silentApplications.length})</option>
                {silentCompanies.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrer entreprise, poste, email..."
                value={silentSearchQuery}
                onChange={(e) => setSilentSearchQuery(e.target.value)}
                className="h-8 rounded-md border border-gray-200 pl-8 pr-3 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] w-48 sm:w-60"
              />
            </div>

            {selectedAppIds.size > 0 && (
              <button
                type="button"
                onClick={clearSilentSelection}
                className="text-xs text-gray-500 hover:text-gray-800 underline ml-auto"
              >
                Désélectionner tout ({selectedAppIds.size})
              </button>
            )}
          </div>
        </div>

        {filteredSilentApplications.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-400">
            Aucune candidature en attente ne correspond aux filtres actuels.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredSilentApplications.map((app) => {
              const reference = app.last_interaction_at ?? app.applied_at ?? app.created_at;
              const isSelected = selectedAppIds.has(app.id);
              const days = daysBetween(reference);

              return (
                <div
                  key={app.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50/80",
                    isSelected && "bg-orange-50/40"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelectAppId(app.id)}
                      className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-[#ff5722]" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300" />
                      )}
                    </button>

                    <CompanyLogo
                      name={app.company?.name ?? "?"}
                      logoUrl={app.company?.logo_url}
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/tracker/applications/${app.id}`}
                        className="truncate text-xs font-semibold text-gray-900 hover:text-[#ff5722]"
                      >
                        {app.company?.name ?? "—"} · {app.position}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Sans réponse depuis {days} jour(s)
                        </span>
                        <span>({formatDate(reference)})</span>
                        {app.channel_email && (
                          <span className="font-mono text-gray-400 truncate">
                            · {app.channel_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status} />

                    {/* Quick Single Email Relance */}
                    {app.channel_email && (
                      <button
                        type="button"
                        className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1 font-medium"
                        onClick={() => {
                          setSelectedAppIds(new Set([app.id]));
                          setBulkRelanceOpen(true);
                        }}
                        title="Envoyer une relance par email immédiatement"
                      >
                        <Send className="h-3 w-3" />
                        <span>Relancer</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="editorial-button-secondary h-8 px-2.5 sm:px-3 text-xs"
                      onClick={() => {
                        setEditing(null);
                        setPreselectAppId(app.id);
                        setModalOpen(true);
                      }}
                      title="Programmer une tâche de relance manuelle dans le calendrier"
                    >
                      <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5 text-gray-500" />
                      Rappel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <FollowUpFormModal
          key={editing?.id ?? preselectAppId ?? "new-followup"}
          open
          onClose={() => setModalOpen(false)}
          onSaved={() => void load()}
          applications={applications}
          initialApplicationId={editing ? null : preselectAppId}
          editingFollowUp={editing}
        />
      )}

      {/* Bulk Relance Modal */}
      <BulkRelanceModal
        isOpen={bulkRelanceOpen}
        onClose={() => {
          setBulkRelanceOpen(false);
        }}
        targets={silentRelanceTargets}
        onSuccess={() => {
          void load();
          clearSilentSelection();
        }}
      />
    </div>
  );
}
