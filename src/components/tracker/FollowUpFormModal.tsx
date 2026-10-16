"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { APPLICATION_CHANNELS, FOLLOW_UP_STATUSES } from "@/lib/tracker/constants";
import {
  completeFollowUp,
  createFollowUp,
  listContacts,
  updateFollowUp,
} from "@/lib/tracker/queries";
import type { FollowUpRow, JobApplicationRow } from "@/lib/tracker/types";

interface FollowUpFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  applications: JobApplicationRow[];
  initialApplicationId?: string | null;
  editingFollowUp?: FollowUpRow | null;
}

export default function FollowUpFormModal({
  open,
  onClose,
  onSaved,
  applications,
  initialApplicationId,
  editingFollowUp,
}: FollowUpFormModalProps) {
  const [applicationId, setApplicationId] = useState(
    editingFollowUp?.application_id ?? initialApplicationId ?? applications[0]?.id ?? "",
  );
  const [contactId, setContactId] = useState(editingFollowUp?.contact_id ?? "");
  const [dueDate, setDueDate] = useState(
    editingFollowUp?.due_date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [channel, setChannel] = useState(editingFollowUp?.channel ?? "email");
  const [reason, setReason] = useState(editingFollowUp?.reason ?? "");
  const [status, setStatus] = useState(editingFollowUp?.status ?? "todo");
  const [saving, setSaving] = useState(false);
  const [contactsForCompany, setContactsForCompany] = useState<
    Array<{ id: string; full_name: string }>
  >([]);

  const selectedApplication = useMemo(
    () => applications.find((app) => app.id === applicationId),
    [applications, applicationId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedApplication?.company_id) {
        setContactsForCompany([]);
        return;
      }
      try {
        const rows = await listContacts(selectedApplication.company_id);
        if (!cancelled) {
          setContactsForCompany(rows.map((row) => ({ id: row.id, full_name: row.full_name })));
        }
      } catch {
        if (!cancelled) setContactsForCompany([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedApplication?.company_id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!applicationId) {
      toast.error("Sélectionnez une candidature.");
      return;
    }
    if (!dueDate) {
      toast.error("Indiquez une date de relance.");
      return;
    }

    setSaving(true);
    try {
      if (editingFollowUp) {
        if (status === "done" && editingFollowUp.status !== "done") {
          await completeFollowUp(editingFollowUp.id);
        } else {
          await updateFollowUp(editingFollowUp.id, {
            application_id: applicationId,
            contact_id: contactId || null,
            due_date: dueDate,
            channel,
            reason: reason.trim() || null,
            status,
          });
        }
        toast.success("Relance mise à jour.");
      } else {
        await createFollowUp({
          application_id: applicationId,
          contact_id: contactId || null,
          due_date: dueDate,
          channel,
          reason: reason.trim() || null,
          status,
        });
        toast.success("Relance programmée.");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the follow-up.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm sm:items-center">
      <div className="my-6 w-full max-w-[520px] rounded-[18px] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest">
              {editingFollowUp ? "Modifier la relance" : "Nouvelle relance"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">Prochaine action</h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="followup-application">
                Candidature
              </label>
              <select
                id="followup-application"
                className="editorial-select w-full"
                value={applicationId}
                onChange={(event) => {
                  setApplicationId(event.target.value);
                  setContactId("");
                }}
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
              <label className="editorial-label" htmlFor="followup-date">
                Date de relance
              </label>
              <input
                id="followup-date"
                type="date"
                className="editorial-input w-full"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="followup-channel">
                Canal
              </label>
              <select
                id="followup-channel"
                className="editorial-select w-full"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              >
                {APPLICATION_CHANNELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="followup-contact">
                Contact à joindre
              </label>
              <select
                id="followup-contact"
                className="editorial-select w-full"
                value={contactId}
                onChange={(event) => setContactId(event.target.value)}
              >
                <option value="">Aucun</option>
                {contactsForCompany.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="followup-status">
                État
              </label>
              <select
                id="followup-status"
                className="editorial-select w-full"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {FOLLOW_UP_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="followup-reason">
                Raison / note
              </label>
              <textarea
                id="followup-reason"
                className="editorial-textarea min-h-[80px] w-full"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex : relancer le recruteur après 7 jours sans réponse..."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" className="editorial-button-secondary h-9 px-4" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="editorial-button-primary h-9 px-4" disabled={saving}>
              {saving && <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
