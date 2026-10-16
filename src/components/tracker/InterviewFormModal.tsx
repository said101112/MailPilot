"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  INTERVIEW_FORMATS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
  type JobStatus,
} from "@/lib/tracker/constants";
import {
  changeApplicationStatus,
  createInterview,
  updateInterview,
} from "@/lib/tracker/queries";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/tracker/format";
import type { InterviewRow, JobApplicationRow } from "@/lib/tracker/types";

const TYPE_STATUS_MAP: Record<string, JobStatus> = {
  hr: "interview_hr",
  technical: "interview_technical",
  final: "interview_final",
  manager: "interview_final",
  other: "interview_hr",
};

interface InterviewFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  applications: JobApplicationRow[];
  initialApplicationId?: string | null;
  editingInterview?: InterviewRow | null;
}

export default function InterviewFormModal({
  open,
  onClose,
  onSaved,
  applications,
  initialApplicationId,
  editingInterview,
}: InterviewFormModalProps) {
  const [applicationId, setApplicationId] = useState(
    editingInterview?.application_id ?? initialApplicationId ?? applications[0]?.id ?? "",
  );
  const [type, setType] = useState(editingInterview?.type ?? "hr");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (editingInterview) return toDatetimeLocalValue(editingInterview.scheduled_at);
    const defaultTime = new Date(Date.now() + 86400000);
    defaultTime.setMinutes(0, 0, 0);
    return toDatetimeLocalValue(defaultTime.toISOString());
  });
  const [timezone, setTimezone] = useState(() => {
    if (editingInterview?.timezone) return editingInterview.timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [format, setFormat] = useState(editingInterview?.format ?? "video");
  const [meetingUrl, setMeetingUrl] = useState(editingInterview?.meeting_url ?? "");
  const [location, setLocation] = useState(editingInterview?.location ?? "");
  const [interviewers, setInterviewers] = useState(editingInterview?.interviewers ?? "");
  const [status, setStatus] = useState(editingInterview?.status ?? "scheduled");
  const [prepNotes, setPrepNotes] = useState(editingInterview?.prep_notes ?? "");
  const [statusUpdate, setStatusUpdate] = useState<string>(
    editingInterview ? "" : (TYPE_STATUS_MAP["hr"] ?? ""),
  );
  const [saving, setSaving] = useState(false);

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === applicationId),
    [applications, applicationId],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!applicationId) {
      toast.error("Sélectionnez une candidature.");
      return;
    }
    const iso = fromDatetimeLocalValue(scheduledAt);
    if (!iso) {
      toast.error("Indiquez une date et une heure valides.");
      return;
    }

    setSaving(true);
    try {
      if (editingInterview) {
        await updateInterview(editingInterview.id, {
          application_id: applicationId,
          company_id: selectedApplication?.company_id ?? null,
          type,
          scheduled_at: iso,
          timezone,
          format,
          meeting_url: meetingUrl.trim() || null,
          location: location.trim() || null,
          interviewers: interviewers.trim() || null,
          status,
          prep_notes: prepNotes.trim() || null,
        });
        toast.success("Entretien mis à jour.");
      } else {
        await createInterview({
          application_id: applicationId,
          company_id: selectedApplication?.company_id ?? null,
          type,
          scheduled_at: iso,
          timezone,
          format,
          meeting_url: meetingUrl.trim() || null,
          location: location.trim() || null,
          interviewers: interviewers.trim() || null,
          status,
          prep_notes: prepNotes.trim() || null,
        });
        toast.success("Entretien programmé.");

        if (statusUpdate && selectedApplication && selectedApplication.status !== statusUpdate) {
          await changeApplicationStatus(
            selectedApplication,
            statusUpdate as JobStatus,
            "Statut mis à jour suite à la programmation d'un entretien",
          );
          toast.info("Statut de la candidature mis à jour.");
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the interview.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm sm:items-center">
      <div className="my-6 w-full max-w-[600px] rounded-[18px] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest">
              {editingInterview ? "Modifier l'entretien" : "Nouvel entretien"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">
              {editingInterview ? "Mise à jour" : "Programmer un entretien"}
            </h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="interview-application">
                Candidature
              </label>
              <select
                id="interview-application"
                className="editorial-select w-full"
                value={applicationId}
                onChange={(event) => setApplicationId(event.target.value)}
                required
              >
                <option value="">Sélectionner...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company?.name ? `${app.company.name} — ` : ""}
                    {app.position}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-type">
                Type d&apos;entretien
              </label>
              <select
                id="interview-type"
                className="editorial-select w-full"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  if (!editingInterview) {
                    setStatusUpdate(TYPE_STATUS_MAP[event.target.value] ?? "");
                  }
                }}
              >
                {INTERVIEW_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-format">
                Format
              </label>
              <select
                id="interview-format"
                className="editorial-select w-full"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                {INTERVIEW_FORMATS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-datetime">
                Date et heure
              </label>
              <input
                id="interview-datetime"
                type="datetime-local"
                className="editorial-input w-full"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-timezone">
                Fuseau horaire
              </label>
              <input
                id="interview-timezone"
                className="editorial-input w-full"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-url">
                Lien de visioconférence
              </label>
              <input
                id="interview-url"
                type="url"
                className="editorial-input w-full"
                value={meetingUrl}
                onChange={(event) => setMeetingUrl(event.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-location">
                Adresse (présentiel)
              </label>
              <input
                id="interview-location"
                className="editorial-input w-full"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="interviewers">
                Interlocuteurs
              </label>
              <input
                id="interviewers"
                className="editorial-input w-full"
                value={interviewers}
                onChange={(event) => setInterviewers(event.target.value)}
                placeholder="Nom, fonction, email..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-status">
                Statut de l&apos;entretien
              </label>
              <select
                id="interview-status"
                className="editorial-select w-full"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {INTERVIEW_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {!editingInterview && (
              <div className="space-y-1.5">
                <label className="editorial-label" htmlFor="status-update">
                  Mettre à jour le statut
                </label>
                <select
                  id="status-update"
                  className="editorial-select w-full"
                  value={statusUpdate}
                  onChange={(event) => setStatusUpdate(event.target.value)}
                >
                  <option value="">Ne pas changer</option>
                  <option value="interview_hr">Entretien RH programmé</option>
                  <option value="interview_technical">Entretien technique programmé</option>
                  <option value="interview_final">Entretien final programmé</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="prep-notes">
                Notes de préparation
              </label>
              <textarea
                id="prep-notes"
                className="editorial-textarea min-h-[90px] w-full"
                value={prepNotes}
                onChange={(event) => setPrepNotes(event.target.value)}
                placeholder="Points à préparer, questions à poser..."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" className="editorial-button-secondary h-9 px-4" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="editorial-button-primary h-9 px-4"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
