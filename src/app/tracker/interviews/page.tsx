"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Plus, Sparkles, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState, LoadingBlock } from "@/components/tracker/Feedback";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import InterviewFormModal from "@/components/tracker/InterviewFormModal";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_TONES,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/tracker/constants";
import { formatDateTime, formatRelativeTime } from "@/lib/tracker/format";
import { listApplications, listInterviews, updateInterview } from "@/lib/tracker/queries";
import type { InterviewRow, JobApplicationRow } from "@/lib/tracker/types";

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [interviewRows, applicationRows] = await Promise.all([
        listInterviews(),
        listApplications(),
      ]);
      setInterviews(interviewRows);
      setApplications(applicationRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load interviews.");
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

  const { upcoming, past } = useMemo(() => {
    const sorted = [...interviews].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    return {
      upcoming: sorted.filter((row) => new Date(row.scheduled_at).getTime() >= now),
      past: sorted
        .filter((row) => new Date(row.scheduled_at).getTime() < now)
        .reverse(),
    };
  }, [interviews, now]);

  const changeStatus = async (interview: InterviewRow, status: string) => {
    try {
      await updateInterview(interview.id, { status });
      toast.success("Entretien mis à jour.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the interview.");
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <LoadingBlock label="Chargement des entretiens..." />
      </div>
    );
  }

  const renderInterview = (interview: InterviewRow, showActions: boolean) => (
    <div key={interview.id} className="p-3.5 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <CompanyLogo
            name={interview.application?.company?.name ?? "?"}
            logoUrl={interview.application?.company?.logo_url}
            className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {interview.application?.company?.name ?? "—"}
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10.5px] font-medium shrink-0",
                  INTERVIEW_STATUS_TONES[interview.status] ?? "bg-gray-100 text-gray-600",
                )}
              >
                {INTERVIEW_STATUS_LABELS[interview.status] ?? interview.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 truncate">
              {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type} ·{" "}
              <Link
                href={`/tracker/applications/${interview.application_id}`}
                className="font-medium text-[#ff5722] hover:underline"
              >
                {interview.application?.position ?? "Candidature"}
              </Link>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3 shrink-0" />
                {formatDateTime(interview.scheduled_at)} ({interview.timezone ?? "UTC"})
              </span>
              <span className="flex items-center gap-1">
                {interview.format === "onsite" ? (
                  <MapPin className="h-3 w-3 shrink-0" />
                ) : (
                  <Video className="h-3 w-3 shrink-0" />
                )}
                {INTERVIEW_FORMAT_LABELS[interview.format ?? ""] ?? interview.format ?? "—"}
              </span>
              {interview.status === "scheduled" && (
                <span className="font-medium text-amber-600">
                  {formatRelativeTime(interview.scheduled_at)}
                </span>
              )}
            </p>
            {interview.interviewers && (
              <p className="mt-1 text-[11px] text-gray-500">Interlocuteurs : {interview.interviewers}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {interview.meeting_url && (
            <a
              href={interview.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="editorial-button-secondary h-8 px-3 text-xs flex-1 sm:flex-initial text-center"
            >
              Rejoindre
            </a>
          )}
          {showActions && (
            <EditorialSelect
              className="editorial-select h-8 text-xs flex-1 sm:flex-initial"
              value={interview.status}
              onChange={(next) => void changeStatus(interview, next)}
              options={["scheduled", "completed", "postponed", "cancelled"].map((status) => ({
                value: status,
                label: INTERVIEW_STATUS_LABELS[status],
              }))}
            />
          )}
        </div>
      </div>
      {(interview.prep_notes || interview.result || interview.feedback) && (
        <div className="mt-3 grid gap-2 rounded-md bg-gray-50 p-3 text-[11px] text-gray-600 sm:grid-cols-3">
          {interview.prep_notes && (
            <p><span className="font-semibold text-gray-700">Préparation :</span> {interview.prep_notes}</p>
          )}
          {interview.feedback && (
            <p><span className="font-semibold text-gray-700">Feedback :</span> {interview.feedback}</p>
          )}
          {interview.result && (
            <p><span className="font-semibold text-gray-700">Résultat :</span> {interview.result}</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Entretiens</h1>
          <p className="mt-1 text-xs text-gray-500">
            {upcoming.length} à venir · {past.length} terminé(s).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            href="/tracker/prep"
            className="editorial-button-secondary h-8 px-3 text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto text-[#ff5722] hover:text-[#e64a19] border-orange-200 bg-[#fff3ef] font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mon Aide-Mémoire & Questions</span>
          </Link>
          <button
            type="button"
            className="editorial-button-primary h-8 px-3 text-xs w-full sm:w-auto"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="mr-1.5 inline h-3.5 w-3.5" />
            Programmer un entretien
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">À venir</h2>
          <p className="text-xs text-gray-500">Rappels visuels des entretiens programmés.</p>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucun entretien à venir"
            description="Programmez un entretien depuis une fiche de candidature ou le bouton en haut à droite."
          />
        ) : (
          <div className="divide-y divide-gray-100">{upcoming.map((row) => renderInterview(row, true))}</div>
        )}
      </div>

      {past.length > 0 && (
        <div className="mt-5 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Historique</h2>
            <p className="text-xs text-gray-500">Entretiens passés et leurs résultats.</p>
          </div>
          <div className="divide-y divide-gray-100">{past.map((row) => renderInterview(row, true))}</div>
        </div>
      )}

      {modalOpen && (
        <InterviewFormModal
          key="interviews-page-form"
          open
          onClose={() => setModalOpen(false)}
          onSaved={() => void load()}
          applications={applications}
        />
      )}
    </div>
  );
}
