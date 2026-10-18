"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  APPLICATION_CHANNELS,
  JOB_DOMAINS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_TYPES,
  WORK_MODES,
} from "@/lib/tracker/constants";
import { emptyFormValues, formValuesFromApplication } from "@/lib/tracker/form";
import {
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  listCompanies,
  listContacts,
  updateApplication,
} from "@/lib/tracker/queries";
import type { ApplicationFormValues, CompanyRow, ContactRow, JobApplicationRow } from "@/lib/tracker/types";
import CompanyCombobox from "@/components/tracker/CompanyCombobox";
import type { CompanyComboboxValue } from "@/components/tracker/CompanyCombobox";
import EditorialSelect from "@/components/tracker/EditorialSelect";

function comboboxPatchToFormValues(
  patch: Partial<CompanyComboboxValue>,
): Partial<ApplicationFormValues> {
  const next: Partial<ApplicationFormValues> = {};
  if (patch.companyId !== undefined) {
    next.companyId = patch.companyId;
    next.primaryContactId = null;
  }
  if (patch.name !== undefined) next.companyName = patch.name;
  if (patch.website !== undefined) next.companyWebsite = patch.website;
  if (patch.domain !== undefined) next.companyDomain = patch.domain;
  if (patch.logoUrl !== undefined) next.companyLogoUrl = patch.logoUrl;
  if (patch.sector !== undefined) next.companySector = patch.sector;
  if (patch.location !== undefined) next.companyLocation = patch.location;
  if (patch.description !== undefined) next.companyDescription = patch.description;
  if (patch.wikidataId !== undefined) next.companyWikidataId = patch.wikidataId;
  return next;
}

interface ApplicationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (application: JobApplicationRow) => void;
  onDeleted?: (id: string) => void;
  editingApplication?: JobApplicationRow | null;
  prefillCompany?: CompanyRow | null;
  prefillValues?: ApplicationFormValues | null;
  onOpenSmartPaste?: () => void;
}

export default function ApplicationFormModal({
  open,
  onClose,
  onSaved,
  onDeleted,
  editingApplication,
  prefillCompany,
  prefillValues,
  onOpenSmartPaste,
}: ApplicationFormModalProps) {
  const [values, setValues] = useState<ApplicationFormValues>(() => {
    if (editingApplication) return formValuesFromApplication(editingApplication);
    if (prefillValues) return { ...prefillValues };
    const today = new Date().toISOString().slice(0, 10);
    if (prefillCompany) {
      return emptyFormValues({
        companyId: prefillCompany.id,
        companyName: prefillCompany.name,
        companyWebsite: prefillCompany.website ?? "",
        companyDomain: prefillCompany.domain ?? "",
        companyLogoUrl: prefillCompany.logo_url ?? "",
        companySector: prefillCompany.sector ?? "",
        companyLocation: prefillCompany.location ?? "",
        companyDescription: prefillCompany.description ?? "",
        companyWikidataId: prefillCompany.wikidata_id,
        appliedAt: today,
      });
    }
    return emptyFormValues({ appliedAt: today });
  });

  useEffect(() => {
    if (prefillValues && open && !editingApplication) {
      setValues({ ...prefillValues });
    }
  }, [prefillValues, open, editingApplication]);

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = Boolean(editingApplication);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const [companyRows, contactRows] = await Promise.all([
            listCompanies(),
            listContacts(),
          ]);
          setCompanies(companyRows);
          setContacts(contactRows);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to load the form.");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const patch = useCallback((next: Partial<ApplicationFormValues>) => {
    setValues((current) => ({ ...current, ...next }));
  }, []);

  const companyContacts = useMemo(() => {
    if (!values.companyId) return contacts;
    return contacts.filter((contact) => contact.company_id === values.companyId);
  }, [contacts, values.companyId]);

  const handleDelete = async () => {
    if (!editingApplication) return;
    const name = values.companyName || values.position || "cette candidature";
    if (!window.confirm(`Supprimer définitivement la candidature chez "${name}" ?`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteApplication(editingApplication.id);
      toast.success(`Candidature chez ${name} supprimée.`);
      onDeleted?.(editingApplication.id);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.position.trim()) {
      toast.error("Le intitulé du poste est requis.");
      return;
    }
    if (!values.companyName.trim()) {
      toast.error("Le nom de l'entreprise est requis.");
      return;
    }

    setSaving(true);
    try {
      if (editingApplication) {
        const previousStatus = editingApplication.status;
        const updated = await updateApplication(editingApplication.id, values);
        if (previousStatus !== values.status) {
          await changeApplicationStatus(
            editingApplication,
            values.status as never,
            "Statut modifié depuis le formulaire",
          );
        }
        toast.success("Candidature mise à jour.");
        onSaved({ ...updated, status: values.status });
      } else {
        const created = await createApplication(values);
        toast.success("Candidature enregistrée.");
        onSaved(created);
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the application.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center overflow-y-auto bg-[rgba(9,12,16,0.65)] sm:p-4 backdrop-blur-xs">
      <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-[720px] flex-col bg-white sm:rounded-2xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden mx-auto">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="editorial-label uppercase tracking-widest text-[10px] sm:text-xs">
              {isEdit ? "Modifier la candidature" : "Nouvelle candidature"}
            </p>
            <h2 className="mt-0.5 text-sm sm:text-base font-semibold text-gray-900 truncate max-w-[260px] sm:max-w-md">
              {isEdit ? values.position || "Candidature" : "Enregistrer une candidature"}
            </h2>
          </div>
          <button
            type="button"
            className="editorial-icon-button"
            onClick={onClose}
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-3 text-xs text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#ff5722]" />
            Chargement du formulaire...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5">
              {!isEdit && onOpenSmartPaste && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-[#ff5722]/20 bg-[#fff3ef] p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#ff5722] shrink-0" />
                    <span className="text-gray-700">
                      Vous avez un email ou un texte de candidature ?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSmartPaste();
                    }}
                    className="font-semibold text-[#ff5722] hover:underline text-left sm:text-right shrink-0"
                  >
                    ⚡ Remplir automatiquement par texte
                  </button>
                </div>
              )}

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Poste
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="editorial-label" htmlFor="position">
                      Intitulé du poste ou stage *
                    </label>
                    <input
                      id="position"
                      className="editorial-input w-full"
                      value={values.position}
                      onChange={(event) => patch({ position: event.target.value })}
                      placeholder="Ex : Stagiaire Software Engineering / PFE"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="jobType">
                      Type
                    </label>
                    <EditorialSelect
                      id="jobType"
                      className="editorial-select w-full"
                      value={values.jobType}
                      onChange={(next) => patch({ jobType: next })}
                      options={JOB_TYPES}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="domain">
                      Domaine
                    </label>
                    <EditorialSelect
                      id="domain"
                      className="editorial-select w-full"
                      value={values.domain}
                      onChange={(next) => patch({ domain: next })}
                      options={JOB_DOMAINS}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="editorial-label" htmlFor="description">
                      Description de l&apos;offre
                    </label>
                    <textarea
                      id="description"
                      className="editorial-textarea min-h-[120px] w-full"
                      value={values.description}
                      onChange={(event) => patch({ description: event.target.value })}
                      placeholder="Collez ici le texte complet de l'annonce..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="offerUrl">
                      URL de l&apos;offre
                    </label>
                    <input
                      id="offerUrl"
                      type="url"
                      className="editorial-input w-full"
                      value={values.offerUrl}
                      onChange={(event) => patch({ offerUrl: event.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="location">
                      Localisation
                    </label>
                    <input
                      id="location"
                      className="editorial-input w-full"
                      value={values.location}
                      onChange={(event) => patch({ location: event.target.value })}
                      placeholder="Casablanca, Paris..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="publishedAt">
                      Date de publication
                    </label>
                    <input
                      id="publishedAt"
                      type="date"
                      className="editorial-input w-full"
                      value={values.publishedAt}
                      onChange={(event) => patch({ publishedAt: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="appliedAt">
                      Date de candidature
                    </label>
                    <input
                      id="appliedAt"
                      type="date"
                      className="editorial-input w-full"
                      value={values.appliedAt}
                      onChange={(event) => patch({ appliedAt: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="workMode">
                      Mode de travail
                    </label>
                    <EditorialSelect
                      id="workMode"
                      className="editorial-select w-full"
                      value={values.workMode}
                      onChange={(next) => patch({ workMode: next })}
                      options={WORK_MODES}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Entreprise
                </h3>
                <CompanyCombobox
                  companies={companies}
                  value={{
                    companyId: values.companyId,
                    name: values.companyName,
                    website: values.companyWebsite,
                    domain: values.companyDomain,
                    logoUrl: values.companyLogoUrl,
                    sector: values.companySector,
                    location: values.companyLocation,
                    description: values.companyDescription,
                    wikidataId: values.companyWikidataId,
                  }}
                  onChange={(next) => {
                    patch(comboboxPatchToFormValues(next));
                  }}
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Canal de candidature
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="channel">
                      Canal utilisé
                    </label>
                    <EditorialSelect
                      id="channel"
                      className="editorial-select w-full"
                      value={values.channel}
                      onChange={(next) => patch({ channel: next })}
                      options={APPLICATION_CHANNELS}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="primaryContact">
                      Contact principal
                    </label>
                    <EditorialSelect
                      id="primaryContact"
                      className="editorial-select w-full"
                      value={values.primaryContactId ?? ""}
                      onChange={(next) => patch({ primaryContactId: next || null })}
                      options={[
                        { value: "", label: "Aucun contact" },
                        ...companyContacts.map((contact) => ({
                          value: contact.id,
                          label: `${contact.full_name}${contact.role ? ` — ${contact.role}` : ""}`,
                        })),
                      ]}
                    />
                    {values.companyId && companyContacts.length === 0 && (
                      <p className="text-[11px] text-gray-400">
                        Ajoutez un contact depuis la fiche entreprise.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="channelUrl">
                      Lien (profil LinkedIn, page de candidature...)
                    </label>
                    <input
                      id="channelUrl"
                      type="url"
                      className="editorial-input w-full"
                      value={values.channelUrl}
                      onChange={(event) => patch({ channelUrl: event.target.value })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="channelEmail">
                      Email utilisé
                    </label>
                    <input
                      id="channelEmail"
                      type="email"
                      className="editorial-input w-full"
                      value={values.channelEmail}
                      onChange={(event) => patch({ channelEmail: event.target.value })}
                      placeholder="recrutement@entreprise.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="channelPhone">
                      Téléphone / WhatsApp
                    </label>
                    <input
                      id="channelPhone"
                      className="editorial-input w-full"
                      value={values.channelPhone}
                      onChange={(event) => patch({ channelPhone: event.target.value })}
                      placeholder="+212..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="editorial-label" htmlFor="status">
                      Statut
                    </label>
                    <EditorialSelect
                      id="status"
                      className="editorial-select w-full"
                      value={values.status}
                      onChange={(next) => patch({ status: next })}
                      options={JOB_STATUSES.map((status) => ({
                        value: status,
                        label: JOB_STATUS_LABELS[status],
                      }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="shrink-0 flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
              {isEdit && editingApplication ? (
                <button
                  type="button"
                  className="editorial-button-secondary h-8 sm:h-9 px-2.5 sm:px-3 text-red-600 hover:border-red-200 hover:bg-red-50 text-xs"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5 animate-spin text-red-600" />
                  ) : (
                    <Trash2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
                  )}
                  Supprimer
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="editorial-button-secondary h-8 sm:h-9 px-3 sm:px-4 text-xs"
                  onClick={onClose}
                  disabled={saving || deleting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={cn("editorial-button-primary h-8 sm:h-9 px-3.5 sm:px-5 text-xs font-semibold", (saving || deleting) && "opacity-60")}
                  disabled={saving || deleting}
                >
                  {saving && <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Enregistrer" : "Créer la candidature"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
