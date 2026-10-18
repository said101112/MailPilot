"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createCompany, ensureCompanyLogo, listCompanies, updateCompany } from "@/lib/tracker/queries";
import type { CompanyRow } from "@/lib/tracker/types";
import CompanyCombobox, { type CompanyComboboxValue } from "@/components/tracker/CompanyCombobox";
import { cn } from "@/lib/utils";

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
  const [logoUrl, setLogoUrl] = useState(editingCompany?.logo_url ?? "");
  const [wikidataId, setWikidataId] = useState(editingCompany?.wikidata_id ?? "");
  const [sector, setSector] = useState(editingCompany?.sector ?? "");
  const [location, setLocation] = useState(editingCompany?.location ?? "");
  const [description, setDescription] = useState(editingCompany?.description ?? "");
  const [notes, setNotes] = useState(editingCompany?.notes ?? "");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void listCompanies()
        .then(setCompanies)
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleComboboxChange = (next: Partial<CompanyComboboxValue>) => {
    if (next.name !== undefined) setName(next.name);
    if (next.website !== undefined) setWebsite(next.website);
    if (next.domain !== undefined) setDomain(next.domain);
    if (next.logoUrl !== undefined) setLogoUrl(next.logoUrl);
    if (next.sector !== undefined) setSector(next.sector);
    if (next.location !== undefined) setLocation(next.location);
    if (next.description !== undefined) setDescription(next.description);
    if (next.wikidataId !== undefined) setWikidataId(next.wikidataId ?? "");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom de l'entreprise est requis.");
      return;
    }
    setSaving(true);
    try {
      const resolvedLogo = await ensureCompanyLogo(logoUrl, domain, website);
      const payload = {
        name: name.trim(),
        website: website.trim() || null,
        domain: domain.trim() || null,
        logo_url: resolvedLogo || null,
        wikidata_id: wikidataId || null,
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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center overflow-y-auto bg-[rgba(9,12,16,0.65)] sm:p-4 backdrop-blur-xs">
      <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-[560px] flex-col bg-white sm:rounded-2xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden mx-auto">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest text-[10px] sm:text-xs">
              {editingCompany ? "Modifier l'entreprise" : "Nouvelle entreprise"}
            </p>
            <h2 className="mt-0.5 text-sm sm:text-base font-semibold text-gray-900">Fiche entreprise</h2>
          </div>
          <button type="button" className="editorial-icon-button" onClick={onClose} title="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <CompanyCombobox
                label="Nom *"
                showNewCompanyHint={false}
                companies={companies}
                value={{
                  companyId: null,
                  name,
                  website,
                  domain,
                  logoUrl,
                  sector,
                  location,
                  description,
                  wikidataId,
                }}
                onChange={handleComboboxChange}
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
                Pays / Localisation
              </label>
              <input
                id="company-location"
                className="editorial-input w-full"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Ex. Arabie Saoudite, Maroc, France..."
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { name: "Arabie Saoudite", flag: "🇸🇦" },
                  { name: "Maroc", flag: "🇲🇦" },
                  { name: "France", flag: "🇫🇷" },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setLocation(c.name)}
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer",
                      location.toLowerCase().includes(c.name.toLowerCase())
                        ? "bg-[#ff5722]/10 border-[#ff5722] text-[#ff5722] font-semibold"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {c.flag} {c.name}
                  </button>
                ))}
              </div>
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
        </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
            <button type="button" className="editorial-button-secondary h-8 sm:h-9 px-3 sm:px-4 text-xs" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="editorial-button-primary h-8 sm:h-9 px-4 sm:px-5 text-xs font-semibold" disabled={saving}>
              {saving && <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
