"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createCompany, updateCompany } from "@/lib/tracker/queries";
import type { CompanyRow } from "@/lib/tracker/types";

interface CompanyFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (company: CompanyRow) => void;
  editingCompany?: CompanyRow | null;
}

export default function CompanyFormModal({
  open,
  onClose,
  onSaved,
  editingCompany,
}: CompanyFormModalProps) {
  const [name, setName] = useState(editingCompany?.name ?? "");
  const [website, setWebsite] = useState(editingCompany?.website ?? "");
  const [domain, setDomain] = useState(editingCompany?.domain ?? "");
  const [sector, setSector] = useState(editingCompany?.sector ?? "");
  const [location, setLocation] = useState(editingCompany?.location ?? "");
  const [description, setDescription] = useState(editingCompany?.description ?? "");
  const [notes, setNotes] = useState(editingCompany?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom de l'entreprise est requis.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        website: website.trim() || null,
        domain: domain.trim() || null,
        sector: sector.trim() || null,
        location: location.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
      };
      const saved = editingCompany
        ? await updateCompany(editingCompany.id, payload)
        : await createCompany(payload);
      toast.success(editingCompany ? "Entreprise mise à jour." : "Entreprise enregistrée.");
      onSaved(saved);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the company.";
      toast.error(
        message.toLowerCase().includes("companies_user_name_key") ||
          message.toLowerCase().includes("duplicate")
          ? "Une entreprise portant ce nom existe déjà."
          : message,
      );
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
              {editingCompany ? "Modifier l'entreprise" : "Nouvelle entreprise"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-gray-900">Fiche entreprise</h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="company-name">
                Nom *
              </label>
              <input
                id="company-name"
                className="editorial-input w-full"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="company-website">
                Site officiel
              </label>
              <input
                id="company-website"
                type="url"
                className="editorial-input w-full"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://www.cgi.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="company-domain">
                Domaine (pour le logo)
              </label>
              <input
                id="company-domain"
                className="editorial-input w-full"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="cgi.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="company-sector">
                Secteur d&apos;activité
              </label>
              <input
                id="company-sector"
                className="editorial-input w-full"
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                placeholder="Conseil IT, Services financiers..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="editorial-label" htmlFor="company-location">
                Localisation
              </label>
              <input
                id="company-location"
                className="editorial-input w-full"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="company-description">
                Description
              </label>
              <textarea
                id="company-description"
                className="editorial-textarea min-h-[90px] w-full"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="editorial-label" htmlFor="company-notes">
                Notes personnelles
              </label>
              <textarea
                id="company-notes"
                className="editorial-textarea min-h-[70px] w-full"
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
