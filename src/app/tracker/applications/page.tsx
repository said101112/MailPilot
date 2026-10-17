"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  ListFilter,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import StatusBadge from "@/components/tracker/StatusBadge";
import ApplicationFormModal from "@/components/tracker/ApplicationFormModal";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import {
  CHANNEL_LABELS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  KANBAN_COLUMNS,
  type JobStatus,
} from "@/lib/tracker/constants";
import { formatDate, formatRelativeTime } from "@/lib/tracker/format";
import {
  changeApplicationStatus,
  listApplications,
  listFollowUps,
  listInterviews,
} from "@/lib/tracker/queries";
import type { FollowUpRow, InterviewRow, JobApplicationRow } from "@/lib/tracker/types";

type ViewMode = "table" | "kanban" | "calendar";

const PAGE_SIZE = 10;
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function nextFollowUpDate(app: JobApplicationRow): string | null {
  const dates = (app.follow_ups ?? [])
    .filter((fu) => fu.status === "todo")
    .map((fu) => fu.due_date)
    .sort();
  return dates[0] ?? null;
}

function CalendarView({
  interviews,
  followUps,
  onInterviewClick,
}: {
  interviews: InterviewRow[];
  followUps: FollowUpRow[];
  onInterviewClick: (interview: InterviewRow) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const dayKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Array<{ kind: "interview" | "follow_up"; label: string; payload?: InterviewRow }>>();
    for (const interview of interviews) {
      const date = new Date(interview.scheduled_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const list = map.get(key) ?? [];
      list.push({
        kind: "interview",
        label: `Entretien · ${interview.application?.company?.name ?? interview.application?.position ?? ""}`,
        payload: interview,
      });
      map.set(key, list);
    }
    for (const followUp of followUps) {
      const list = map.get(followUp.due_date) ?? [];
      list.push({
        kind: "follow_up",
        label: `Relance · ${followUp.application?.company?.name ?? followUp.application?.position ?? ""}`,
      });
      map.set(followUp.due_date, list);
    }
    return map;
  }, [interviews, followUps]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {MONTH_LABELS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="editorial-icon-button"
            onClick={() => setMonthOffset((v) => v - 1)}
            title="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs"
            onClick={() => setMonthOffset(0)}
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            className="editorial-icon-button"
            onClick={() => setMonthOffset((v) => v + 1)}
            title="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/75">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-[11px] font-semibold text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const key = day ? dayKey(day) : null;
          const items = key ? itemsByDay.get(key) ?? [] : [];
          const isToday =
            key ===
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          return (
            <div
              key={index}
              className={cn(
                "min-h-[92px] border-b border-r border-gray-100 p-1.5 last:border-r-0",
                isToday && "bg-[#fff3ef]",
              )}
            >
              {day && (
                <>
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      isToday ? "text-[#ff5722]" : "text-gray-600",
                    )}
                  >
                    {day}
                  </p>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 2).map((item, itemIndex) => (
                      <button
                        key={itemIndex}
                        type="button"
                        onClick={() => {
                          if (item.kind === "interview" && item.payload) {
                            onInterviewClick(item.payload);
                          }
                        }}
                        className={cn(
                          "block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium",
                          item.kind === "interview"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-amber-50 text-amber-700",
                        )}
                        title={item.label}
                      >
                        {item.label}
                      </button>
                    ))}
                    {items.length > 2 && (
                      <p className="px-1 text-[10px] text-gray-400">+{items.length - 2}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplicationRow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const [apps, interviewRows, followUpRows] = await Promise.all([
        listApplications(),
        listInterviews(),
        listFollowUps({ status: "todo" }),
      ]);
      setApplications(apps);
      setInterviews(interviewRows);
      setFollowUps(followUpRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [app.position, app.company?.name, app.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [applications, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDrop = async (columnId: string) => {
    if (!draggingId) return;
    const column = KANBAN_COLUMNS.find((c) => c.id === columnId);
    const app = applications.find((a) => a.id === draggingId);
    setDraggingId(null);
    if (!column || !app) return;

    const targetStatus = column.statuses.includes(app.status as JobStatus)
      ? (app.status as JobStatus)
      : column.defaultStatus;
    if (targetStatus === app.status) return;

    const previous = applications;
    setApplications((rows) =>
      rows.map((row) => (row.id === app.id ? { ...row, status: targetStatus } : row)),
    );
    try {
      await changeApplicationStatus(app, targetStatus, "Déplacé dans le Kanban");
      toast.success(`Statut : ${JOB_STATUS_LABELS[targetStatus]}`);
      void load();
    } catch (error) {
      setApplications(previous);
      toast.error(error instanceof Error ? error.message : "Unable to move the application.");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement des candidatures..." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Candidatures
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            {filtered.length} candidature(s) · vue tableau, Kanban ou calendrier.
          </p>
        </div>
        <button
          type="button"
          className="editorial-button-primary h-8 px-3 text-xs"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 inline h-3.5 w-3.5" />
          Nouvelle candidature
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-5 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              className="editorial-input w-full pl-9"
              placeholder="Rechercher un poste, une entreprise..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <EditorialSelect
            className="editorial-select w-48"
            value={statusFilter}
            onChange={(next) => {
              setStatusFilter(next as JobStatus | "all");
              setPage(1);
            }}
            options={[
              { value: "all", label: "Tous les statuts" },
              ...JOB_STATUSES.map((status) => ({
                value: status,
                label: JOB_STATUS_LABELS[status],
              })),
            ]}
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5">
          {([
            { id: "table", icon: ListFilter, label: "Tableau" },
            { id: "kanban", icon: Columns3, label: "Kanban" },
            { id: "calendar", icon: CalendarDays, label: "Calendrier" },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium",
                view === item.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-800",
              )}
              onClick={() => setView(item.id)}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" && (
        <div className="mt-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Aucune candidature"
              description="Enregistrez votre première candidature pour démarrer le suivi."
              action={
                <button
                  type="button"
                  className="editorial-button-primary mt-2 h-8 px-3 text-xs"
                  onClick={() => setFormOpen(true)}
                >
                  Ajouter une candidature
                </button>
              }
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                      <th className="px-5 py-2.5">Entreprise</th>
                      <th className="px-5 py-2.5">Poste</th>
                      <th className="px-5 py-2.5">Canal</th>
                      <th className="px-5 py-2.5">Envoyée le</th>
                      <th className="px-5 py-2.5">Statut</th>
                      <th className="px-5 py-2.5">Contact</th>
                      <th className="px-5 py-2.5">Prochaine relance</th>
                      <th className="px-5 py-2.5">Dernière interaction</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.map((app) => {
                      const followUpDate = nextFollowUpDate(app);
                      return (
                        <tr
                          key={app.id}
                          className="cursor-pointer transition-colors hover:bg-gray-50/80"
                          onClick={() => {
                            router.push(`/tracker/applications/${app.id}`);
                          }}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <CompanyLogo
                                name={app.company?.name ?? "?"}
                                logoUrl={app.company?.logo_url}
                                website={app.company?.website}
                                className="h-8 w-8"
                              />
                              <span className="font-semibold text-gray-900">
                                {app.company?.name ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Link
                              href={`/tracker/applications/${app.id}`}
                              className="font-medium text-gray-900 hover:text-[#ff5722]"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {app.position}
                            </Link>
                            {app.location && (
                              <p className="text-gray-500">{app.location}</p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {app.channel ? CHANNEL_LABELS[app.channel] ?? app.channel : "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{formatDate(app.applied_at)}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {app.primary_contact?.full_name ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {followUpDate ? formatDate(followUpDate) : "—"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {formatRelativeTime(app.last_interaction_at)}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              className="editorial-icon-button"
                              title="Modifier"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditing(app);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <p className="text-[11px] text-gray-500">
                    Page {page} / {totalPages} · {filtered.length} résultats
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="editorial-button-secondary h-8 px-3 text-xs"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="editorial-button-secondary h-8 px-3 text-xs"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "kanban" && (
        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {KANBAN_COLUMNS.map((column) => {
              const columnApps = filtered.filter((app) =>
                column.statuses.includes(app.status as JobStatus),
              );
              return (
                <div
                  key={column.id}
                  className="w-64 shrink-0 rounded-lg border border-gray-200 bg-gray-50/60"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleDrop(column.id)}
                >
                  <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                    <p className="text-xs font-semibold text-gray-900">{column.title}</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-600">
                      {columnApps.length}
                    </span>
                  </div>
                  <div className="min-h-[120px] space-y-2 p-2">
                    {columnApps.length === 0 && (
                      <p className="px-1 py-4 text-center text-[11px] text-gray-400">
                        Glissez une candidature ici
                      </p>
                    )}
                    {columnApps.map((app) => (
                      <Link
                        key={app.id}
                        href={`/tracker/applications/${app.id}`}
                        draggable
                        onDragStart={() => setDraggingId(app.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={cn(
                          "block cursor-grab rounded-md border border-gray-200 bg-white p-3 shadow-sm transition hover:border-[#ff5722] active:cursor-grabbing",
                          draggingId === app.id && "opacity-50",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <CompanyLogo
                            name={app.company?.name ?? "?"}
                            logoUrl={app.company?.logo_url}
                            website={app.company?.website}
                            className="h-6 w-6"
                          />
                          <p className="truncate text-[11px] font-medium text-gray-500">
                            {app.company?.name ?? "—"}
                          </p>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs font-semibold text-gray-900">
                          {app.position}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <StatusBadge status={app.status} />
                          <span className="text-[10px] text-gray-400">
                            {formatDate(app.applied_at)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "calendar" && (
        <div className="mt-4">
          <CalendarView
            interviews={interviews}
            followUps={followUps}
            onInterviewClick={() => {
              router.push("/tracker/interviews");
            }}
          />
        </div>
      )}

      {formOpen && (
        <ApplicationFormModal
          key={editing?.id ?? "new-application"}
          open
          onClose={() => setFormOpen(false)}
          onSaved={() => void load()}
          editingApplication={editing}
        />
      )}
    </div>
  );
}
