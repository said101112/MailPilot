"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  MessageSquarePlus,
  Plus,
  Target,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { LoadingBlock } from "@/components/tracker/Feedback";
import StatusBadge from "@/components/tracker/StatusBadge";
import ApplicationFormModal from "@/components/tracker/ApplicationFormModal";
import InterviewFormModal from "@/components/tracker/InterviewFormModal";
import FollowUpFormModal from "@/components/tracker/FollowUpFormModal";
import CleanDataModal from "@/components/CleanDataModal";
import {
  CHANNEL_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
} from "@/lib/tracker/constants";
import { formatDate, formatRelativeTime, percent } from "@/lib/tracker/format";
import { listApplications, listFollowUps, listInterviews } from "@/lib/tracker/queries";
import type { FollowUpRow, InterviewRow, JobApplicationRow } from "@/lib/tracker/types";

const RESPONSE_STATUSES = new Set<string>([
  "reply_received",
  "interview_hr",
  "interview_technical",
  "interview_final",
  "assessment",
  "awaiting_decision",
  "offer_received",
  "accepted",
  "rejected",
]);

const INTERVIEW_PIPELINE_STATUSES = new Set<string>([
  "interview_hr",
  "interview_technical",
  "interview_final",
  "assessment",
  "awaiting_decision",
  "offer_received",
  "accepted",
]);

const MONTH_LABELS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "text-[#ff5722] bg-[#fff3ef]",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ElementType;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-[11px] text-gray-600" title={label}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-[#ff5722]" style={{ width: `${width}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-semibold text-gray-700">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export default function TrackerDashboardPage() {
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [cleanModalOpen, setCleanModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [apps, ups, interviewsRows] = await Promise.all([
        listApplications(),
        listFollowUps({ status: "todo" }),
        listInterviews(),
      ]);
      setApplications(apps);
      setFollowUps(ups);
      setInterviews(interviewsRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the tracker.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCleanAllTrackerAndSends = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Utilisateur non connecté.");
    }

    // Delete outreach sends (applications table)
    const { error: appErr } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", user.id);
    if (appErr) throw appErr;

    // Delete tracker job applications (job_applications table)
    const { error: jobErr } = await supabase
      .from("job_applications")
      .delete()
      .eq("user_id", user.id);
    if (jobErr) throw jobErr;

    await load();
    toast.success("Toutes les données (envois et tracker) ont été nettoyées avec succès dans Supabase !");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => {
    const total = applications.length;
    const sent = applications.filter((app) => app.status === "sent").length;
    const awaiting = applications.filter((app) => app.status === "awaiting_reply").length;
    const responses = applications.filter((app) => RESPONSE_STATUSES.has(app.status)).length;
    const interviewsPlanned = interviews.filter((row) => row.status === "scheduled").length;
    const accepted = applications.filter((app) => app.status === "accepted").length;
    const rejected = applications.filter((app) => app.status === "rejected").length;
    const needsFollowUp = followUps.length;
    const pipeline = applications.filter((app) => INTERVIEW_PIPELINE_STATUSES.has(app.status)).length;

    return {
      total,
      sent,
      awaiting,
      responses,
      interviewsPlanned,
      accepted,
      rejected,
      needsFollowUp,
      responseRate: percent(responses, total),
      interviewRate: percent(pipeline, total),
    };
  }, [applications, followUps, interviews]);

  const monthly = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; count: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: MONTH_LABELS[date.getMonth()],
        count: 0,
      });
    }
    for (const app of applications) {
      const source = app.applied_at ?? app.created_at;
      const date = new Date(source);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [applications]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
    }
    return JOB_STATUSES.filter((status) => counts.has(status)).map((status) => ({
      status,
      label: JOB_STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    }));
  }, [applications]);

  const companyDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const name = app.company?.name ?? "Sans entreprise";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [applications]);

  const channelDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of applications) {
      const label = app.channel ? CHANNEL_LABELS[app.channel] ?? app.channel : "Non renseigné";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [applications]);

  const upcomingInterviews = useMemo(
    () =>
      interviews
        .filter((row) => row.status === "scheduled" && new Date(row.scheduled_at) >= new Date())
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .slice(0, 4),
    [interviews],
  );

  const recentApplications = useMemo(
    () => applications.slice(0, 6),
    [applications],
  );

  const maxMonthly = Math.max(1, ...monthly.map((b) => b.count));
  const maxStatus = Math.max(1, ...statusDistribution.map((s) => s.count));
  const maxCompany = Math.max(1, ...companyDistribution.map((c) => c.count));
  const maxChannel = Math.max(1, ...channelDistribution.map((c) => c.count));

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement du tracker..." />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Job Application Tracker
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Centralisez vos candidatures PFE, stages et emplois : entreprises, contacts,
            entretiens, relances et historique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
            onClick={() => setCleanModalOpen(true)}
          >
            <Trash2 className="mr-1.5 inline h-3.5 w-3.5 text-red-500" />
            Nettoyer les données
          </button>
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs"
            onClick={() => setInterviewOpen(true)}
          >
            <CalendarClock className="mr-1.5 inline h-3.5 w-3.5" />
            Entretien
          </button>
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs"
            onClick={() => setFollowUpOpen(true)}
          >
            <MessageSquarePlus className="mr-1.5 inline h-3.5 w-3.5" />
            Relance
          </button>
          <button
            type="button"
            className="editorial-button-primary h-8 px-3 text-xs"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-1.5 inline h-3.5 w-3.5" />
            Nouvelle candidature
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total candidatures" value={stats.total} icon={Briefcase} />
        <StatCard
          label="En attente de réponse"
          value={stats.awaiting}
          hint={`${stats.sent} envoyée(s)`}
          icon={Target}
          tone="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Réponses reçues"
          value={stats.responses}
          hint={`Taux de réponse ${stats.responseRate}%`}
          icon={MessageSquarePlus}
          tone="bg-indigo-50 text-indigo-700"
        />
        <StatCard
          label="Entretiens prévus"
          value={stats.interviewsPlanned}
          hint={`Taux d'entretien ${stats.interviewRate}%`}
          icon={CalendarClock}
          tone="bg-violet-50 text-violet-700"
        />
        <StatCard
          label="Acceptées"
          value={stats.accepted}
          icon={CheckCircle2}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Refusées"
          value={stats.rejected}
          icon={XCircle}
          tone="bg-red-50 text-red-700"
        />
        <StatCard
          label="Relances à faire"
          value={stats.needsFollowUp}
          icon={MessageSquarePlus}
          tone="bg-orange-50 text-orange-700"
        />
        <StatCard
          label="Entreprises ciblées"
          value={new Set(applications.map((a) => a.company_id).filter(Boolean)).size}
          icon={Building2}
          tone="bg-blue-50 text-blue-700"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Candidatures par mois</h2>
              <p className="text-xs text-gray-500">6 derniers mois</p>
            </div>
          </div>
          <div className="flex h-44 items-end gap-3">
            {monthly.map((bucket) => (
              <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-600">{bucket.count}</span>
                <div
                  className="w-full rounded-t-md bg-[#ff5722] transition-all"
                  style={{
                    height: `${Math.max(6, Math.round((bucket.count / maxMonthly) * 120))}px`,
                    opacity: bucket.count === 0 ? 0.15 : 1,
                  }}
                />
                <span className="text-[10px] text-gray-400">{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-semibold text-gray-900">Répartition par statut</h2>
            <p className="text-xs text-gray-500">{stats.total} candidatures</p>
          </div>
          <div className="space-y-2.5">
            {statusDistribution.length === 0 && (
              <p className="text-xs text-gray-400">Aucune donnée pour le moment.</p>
            )}
            {statusDistribution.map((item) => (
              <BarRow key={item.status} label={item.label} value={item.count} max={maxStatus} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-semibold text-gray-900">Par entreprise</h2>
            <p className="text-xs text-gray-500">Top entreprises ciblées</p>
          </div>
          <div className="space-y-2.5">
            {companyDistribution.length === 0 && (
              <p className="text-xs text-gray-400">Aucune entreprise enregistrée.</p>
            )}
            {companyDistribution.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.count} max={maxCompany} />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 border-b border-gray-100 pb-3">
            <h2 className="text-sm font-semibold text-gray-900">Par canal</h2>
            <p className="text-xs text-gray-500">Comment vous postulez</p>
          </div>
          <div className="space-y-2.5">
            {channelDistribution.length === 0 && (
              <p className="text-xs text-gray-400">Aucun canal enregistré.</p>
            )}
            {channelDistribution.map((item) => (
              <BarRow key={item.label} label={item.label} value={item.count} max={maxChannel} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Dernières candidatures</h2>
              <p className="text-xs text-gray-500">Suivi rapide</p>
            </div>
            <Link href="/tracker/applications" className="text-xs font-medium text-[#ff5722] hover:underline">
              Tout voir
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-gray-400">
              Aucune candidature. Créez la première depuis le bouton en haut à droite.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  href={`/tracker/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gray-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{app.position}</p>
                    <p className="truncate text-[11px] text-gray-500">
                      {app.company?.name ?? "—"} · {formatRelativeTime(app.applied_at ?? app.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Entretiens à venir</h2>
              <p className="text-xs text-gray-500">Rappels visuels</p>
            </div>
            <Link href="/tracker/interviews" className="text-xs font-medium text-[#ff5722] hover:underline">
              Tout voir
            </Link>
          </div>
          {upcomingInterviews.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-gray-400">
              Aucun entretien programmé.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {interview.application?.company?.name ?? "—"} ·{" "}
                      {interview.application?.position ?? ""}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {formatDate(interview.scheduled_at)} · {formatRelativeTime(interview.scheduled_at)}
                    </p>
                  </div>
                  <span className="inline-flex whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-medium text-violet-700">
                    {interview.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Raccourcis</h2>
        <p className="text-xs text-gray-500">Créer rapidement une entrée</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#ff5722] hover:bg-[#fff3ef]"
          >
            <Plus className="h-4 w-4 text-[#ff5722]" />
            <span className="text-xs font-medium text-gray-900">Ajouter une candidature</span>
          </button>
          <Link
            href="/tracker/companies?add=1"
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#ff5722] hover:bg-[#fff3ef]"
          >
            <Building2 className="h-4 w-4 text-[#ff5722]" />
            <span className="text-xs font-medium text-gray-900">Ajouter une entreprise</span>
          </Link>
          <Link
            href="/tracker/contacts?add=1"
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#ff5722] hover:bg-[#fff3ef]"
          >
            <UserPlus className="h-4 w-4 text-[#ff5722]" />
            <span className="text-xs font-medium text-gray-900">Ajouter un contact</span>
          </Link>
          <Link
            href="/tracker/follow-ups"
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-[#ff5722] hover:bg-[#fff3ef]"
          >
            <Users className="h-4 w-4 text-[#ff5722]" />
            <span className="flex items-center gap-1 text-xs font-medium text-gray-900">
              Voir les relances
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </div>

      {formOpen && (
        <ApplicationFormModal
          key="dashboard-application-form"
          open
          onClose={() => setFormOpen(false)}
          onSaved={() => void load()}
        />
      )}
      {interviewOpen && (
        <InterviewFormModal
          key="dashboard-interview-form"
          open
          onClose={() => setInterviewOpen(false)}
          onSaved={() => void load()}
          applications={applications}
        />
      )}
      {followUpOpen && (
        <FollowUpFormModal
          key="dashboard-followup-form"
          open
          onClose={() => setFollowUpOpen(false)}
          onSaved={() => void load()}
          applications={applications}
        />
      )}

      <CleanDataModal
        isOpen={cleanModalOpen}
        onClose={() => setCleanModalOpen(false)}
        onConfirm={handleCleanAllTrackerAndSends}
        title="Nettoyer toutes les données du Tracker & Envois"
        description="Cette action supprimera définitivement tous les enregistrements d'envois (applications) et de candidatures (job_applications) enregistrés dans Supabase en production. Cette action est irréversible."
        confirmWord="SUPPRIMER"
        itemCount={applications.length}
      />
    </div>
  );
}
