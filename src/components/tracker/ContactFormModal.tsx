"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { CONTACT_ROLES } from "@/lib/tracker/constants";
import { createContact, updateContact } from "@/lib/tracker/queries";
import type { CompanyRow, ContactRow } from "@/lib/tracker/types";

interface ContactFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  companies: CompanyRow[];
  initialCompanyId?: string | null;
  editingContact?: ContactRow | null;
}

export default function ContactFormModal({
  open,
  onClose,
  onSaved,
  companies,
  initialCompanyId,
  editingContact,
}: ContactFormModalProps) {
  const [fullName, setFullName] = useState(editingContact?.full_name ?? "");
  const [role, setRole] = useState(editingContact?.role ?? "Recruteur");
  const [companyId, setCompanyId] = useState(editingContact?.company_id ?? initialCompanyId ?? "");
  const [email, setEmail] = useState(editingContact?.email ?? "");
  const [phone, setPhone] = useState(editingContact?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(editingContact?.linkedin_url ?? "");
  const [whatsapp, setWhatsapp] = useState(editingContact?.whatsapp ?? "");
  const [notes, setNotes] = useState(editingContact?.notes ?? "");
  const [nextAction, setNextAction] = useState(editingContact?.next_action ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Le nom du contact est requis.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        role: role || null,
        company_id: companyId || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        whatsapp: whatsapp.trim() || null,
        notes: notes.trim() || null,
        next_action: nextAction.trim() || null,
      };
      if (editingContact) {
        await updateContact(editingContact.id, payload);
        toast.success("Contact mis à jour.");
      } else {
        await createContact(payload);
        toast.success("Contact enregistré.");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the contact.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[rgba(9,12,16,0.58)] p-4 backdrop-blur-sm sm:items-center">
      <div className="my-6 w-full max-w-[560px] rounded-[18px] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest">
              {editingContact ? "Modifier le contact" : "Nouveau contact"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">Recruteur / interlocuteur</h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-name">
                Nom complet *
              </label>
              <input
                id="contact-name"
                className="editorial-input w-full"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-role">
                Fonction
              </label>
              <select
                id="contact-role"
                className="editorial-select w-full"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                {CONTACT_ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="contact-company">
                Entreprise
              </label>
              <select
                id="contact-company"
                className="editorial-select w-full"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
              >
                <option value="">Aucune entreprise</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                className="editorial-input w-full"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-phone">
                Téléphone
              </label>
              <input
                id="contact-phone"
                className="editorial-input w-full"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-linkedin">
                Lien LinkedIn
              </label>
              <input
                id="contact-linkedin"
                type="url"
                className="editorial-input w-full"
                value={linkedinUrl}
                onChange={(event) => setLinkedinUrl(event.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="contact-whatsapp">
                WhatsApp
              </label>
              <input
                id="contact-whatsapp"
                className="editorial-input w-full"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+212..."
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="contact-next-action">
                Prochaine action
              </label>
              <input
                id="contact-next-action"
                className="editorial-input w-full"
                value={nextAction}
                onChange={(event) => setNextAction(event.target.value)}
                placeholder="Ex : relancer par email vendredi"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="contact-notes">
                Notes
              </label>
              <textarea
                id="contact-notes"
                className="editorial-textarea min-h-[80px] w-full"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
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
