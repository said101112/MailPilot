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
import EditorialSelect from "@/components/tracker/EditorialSelect";

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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center overflow-y-auto bg-[rgba(9,12,16,0.65)] sm:p-4 backdrop-blur-xs">
      <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-[600px] flex-col bg-white sm:rounded-2xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden mx-auto">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest text-[10px] sm:text-xs">
              {editingInterview ? "Modifier l'entretien" : "Nouvel entretien"}
            </p>
            <h2 className="mt-0.5 text-sm sm:text-base font-semibold text-gray-900">
              {editingInterview ? "Mise à jour" : "Programmer un entretien"}
            </h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="interview-application">
                Candidature
              </label>
              <EditorialSelect
                id="interview-application"
                className="editorial-select w-full"
                value={applicationId}
                onChange={setApplicationId}
                placeholder="Sélectionner..."
                options={[
                  { value: "", label: "Sélectionner..." },
                  ...applications.map((app) => ({
                    value: app.id,
                    label: `${app.company?.name ? `${app.company.name} — ` : ""}${app.position}`,
                  })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-type">
                Type d&apos;entretien
              </label>
              <EditorialSelect
                id="interview-type"
                className="editorial-select w-full"
                value={type}
                onChange={(next) => {
                  setType(next);
                  if (!editingInterview) {
                    setStatusUpdate(TYPE_STATUS_MAP[next] ?? "");
                  }
                }}
                options={INTERVIEW_TYPES}
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="interview-format">
                Format
              </label>
              <EditorialSelect
                id="interview-format"
                className="editorial-select w-full"
                value={format}
                onChange={setFormat}
                options={INTERVIEW_FORMATS}
              />
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
              <EditorialSelect
                id="interview-status"
                className="editorial-select w-full"
                value={status}
                onChange={setStatus}
                options={INTERVIEW_STATUSES}
              />
            </div>
            {!editingInterview && (
              <div className="space-y-1.5">
                <label className="editorial-label" htmlFor="status-update">
                  Mettre à jour le statut
                </label>
                <EditorialSelect
                  id="status-update"
                  className="editorial-select w-full"
                  value={statusUpdate}
                  onChange={setStatusUpdate}
                  options={[
                    { value: "", label: "Ne pas changer" },
                    { value: "interview_hr", label: "Entretien RH programmé" },
                    { value: "interview_technical", label: "Entretien technique programmé" },
                    { value: "interview_final", label: "Entretien final programmé" },
                  ]}
                />
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
        </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
            <button type="button" className="editorial-button-secondary h-8 sm:h-9 px-3 sm:px-4 text-xs" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="editorial-button-primary h-8 sm:h-9 px-4 sm:px-5 text-xs font-semibold"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
