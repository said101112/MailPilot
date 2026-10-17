"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Layers,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EditorialSelect from "@/components/tracker/EditorialSelect";
import CompanyLogo from "@/components/tracker/CompanyLogo";
import StatusBadge from "@/components/tracker/StatusBadge";
import {
  APPLICATION_CHANNELS,
  JOB_DOMAINS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_TYPES,
  WORK_MODES,
  type JobStatus,
} from "@/lib/tracker/constants";
import { createApplication } from "@/lib/tracker/queries";
import {
  formatDateISO,
  parseExpressLine,
  parseMultipleApplications,
  parseSingleApplication,
  type ParsedCandidate,
  type ParserDefaults,
} from "@/lib/tracker/textParser";
import type { ApplicationFormValues, JobApplicationRow } from "@/lib/tracker/types";

interface SmartPasteModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (application?: JobApplicationRow) => void;
  onOpenFullForm?: (values: ApplicationFormValues) => void;
}

const POPULAR_DOMAINS = [
  { value: "ai_data", label: "🤖 Data Science & IA" },
  { value: "cloud_devops", label: "☁️ Cloud & DevOps" },
  { value: "software_engineering", label: "💻 Software Engineering" },
  { value: "fullstack", label: "🌐 Full Stack" },
  { value: "cybersecurity", label: "🛡️ Cybersécurité" },
  { value: "backend", label: "⚙️ Backend" },
];

const EXAMPLE_TURBO = `Doctolib
Capgemini, Lyon
Thales | Ingénieur Cybersécurité | Rennes | Entretien
Swile
ManoMano, Frontend React, Paris
BlaBlaCar | Remote
Deezer`;

const EXAMPLE_EMAIL = `Bonjour Said,

Nous accusons bonne réception de votre candidature pour le poste de Data Scientist / Ingénieur IA chez Mistral AI à Paris.

Votre candidature a bien été transmise à notre équipe recrutement.

Bien cordialement,
L'équipe recrutement Mistral AI
recrutement@mistral.ai
https://mistral.ai/careers/12345`;

const EXAMPLE_COMPANIES_ONLY = `Google
Amazon
Microsoft
Capgemini
Thales
Sopra Steria
Dassault Systèmes
Ubisoft`;

export default function SmartPasteModal({
  open,
  onClose,
  onSaved,
  onOpenFullForm,
}: SmartPasteModalProps) {
  // Global default values applied to rapid entries
  const [defaultDomain, setDefaultDomain] = useState("software_engineering");
  const [defaultPosition, setDefaultPosition] = useState("Stage PFE Software Engineering");
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>("sent");
  const [defaultDate, setDefaultDate] = useState(() => formatDateISO(new Date()));
  const [defaultJobType, setDefaultJobType] = useState("pfe");
  const [defaultWorkMode, setDefaultWorkMode] = useState("onsite");

  const [rawText, setRawText] = useState("");
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Quick single company input field below table
  const [quickCompanyInput, setQuickCompanyInput] = useState("");

  const getRoleTitleForDomain = (domain: string, jobType: string) => {
    const prefix =
      jobType === "pfe"
        ? "Stage PFE "
        : jobType === "internship"
        ? "Stage "
        : jobType === "alternance"
        ? "Alternance "
        : "";

    const titles: Record<string, string> = {
      ai_data: prefix ? `${prefix}Data Science & IA` : "Data Scientist / AI Engineer",
      cloud_devops: prefix ? `${prefix}Cloud & DevOps` : "Ingénieur Cloud & DevOps",
      software_engineering: prefix ? `${prefix}Software Engineering` : "Software Engineer",
      fullstack: prefix ? `${prefix}Full Stack Developer` : "Développeur Full Stack",
      backend: prefix ? `${prefix}Backend Developer` : "Développeur Backend",
      frontend: prefix ? `${prefix}Frontend Developer` : "Développeur Frontend",
      cybersecurity: prefix ? `${prefix}Cybersécurité` : "Ingénieur Cybersécurité",
      mobile: prefix ? `${prefix}Mobile Developer` : "Développeur Mobile",
      qa: prefix ? `${prefix}QA / Test Automation` : "Ingénieur QA / Testing",
      embedded: prefix ? `${prefix}Systèmes Embarqués` : "Ingénieur Embarqué / IoT",
      other: prefix ? `${prefix}Ingénieur` : "Ingénieur Logiciel",
    };

    return titles[domain] || (prefix ? `${prefix}Ingénieur` : "Ingénieur Logiciel");
  };

  const handleDomainChange = (domain: string) => {
    setDefaultDomain(domain);
    const newTitle = getRoleTitleForDomain(domain, defaultJobType);
    setDefaultPosition(newTitle);

    // Update existing candidates that haven't customized their role
    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        values: {
          ...c.values,
          domain,
          position: c.values.position === defaultPosition ? newTitle : c.values.position,
        },
      })),
    );
  };

  const handleJobTypeChange = (jobType: string) => {
    setDefaultJobType(jobType);
    const newTitle = getRoleTitleForDomain(defaultDomain, jobType);
    setDefaultPosition(newTitle);

    setCandidates((prev) =>
      prev.map((c) => ({
        ...c,
        values: {
          ...c.values,
          jobType,
          position: c.values.position === defaultPosition ? newTitle : c.values.position,
        },
      })),
    );
  };

  const parserDefaults: ParserDefaults = useMemo(
    () => ({
      position: defaultPosition,
      status: defaultStatus,
      appliedAt: defaultDate,
      jobType: defaultJobType,
      domain: defaultDomain,
      workMode: defaultWorkMode,
    }),
    [defaultPosition, defaultStatus, defaultDate, defaultJobType, defaultDomain, defaultWorkMode],
  );

  // Parse text whenever rawText or defaults change
  useEffect(() => {
    if (!rawText.trim()) {
      setCandidates([]);
      return;
    }

    const timer = window.setTimeout(() => {
      const parsed = parseMultipleApplications(rawText, parserDefaults);
      setCandidates(parsed);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [rawText, parserDefaults]);

  const handleUpdateCandidate = (index: number, patch: Partial<ApplicationFormValues>) => {
    setCandidates((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = {
        ...next[index],
        values: {
          ...next[index].values,
          ...patch,
        },
      };
      return next;
    });
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
    toast.info("Ligne retirée");
  };

  const handleAddQuickCompany = () => {
    const trimmed = quickCompanyInput.trim();
    if (!trimmed) return;
    const newCand = parseExpressLine(trimmed, parserDefaults);
    setCandidates((prev) => [...prev, newCand]);
    setQuickCompanyInput("");
    toast.success(`${newCand.values.companyName} ajouté à la liste`);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
        toast.success("Texte collé depuis le presse-papier !");
      }
    } catch {
      toast.error("Veuillez utiliser le raccourci Ctrl+V pour coller.");
    }
  };

  const handleSaveAll = async () => {
    const validCandidates = candidates.filter((c) => c.values.companyName.trim());
    if (validCandidates.length === 0) {
      toast.error("Aucune candidature valide à enregistrer.");
      return;
    }

    setSaving(true);
    let count = 0;
    try {
      for (const cand of validCandidates) {
        await createApplication(cand.values);
        count += 1;
      }
      toast.success(
        count === 1
          ? `Candidature chez ${validCandidates[0].values.companyName} enregistrée !`
          : `🎉 ${count} candidatures enregistrées avec succès dans votre Tracker !`,
      );
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
      if (count > 0) onSaved();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-[rgba(9,12,16,0.68)] p-2 backdrop-blur-xs sm:p-4">
      <div className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-gray-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.3)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff3ef] text-[#ff5722]">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-gray-900 sm:text-base">
                  Saisie Express Multi-Candidatures
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Gain de temps maximal
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Sélectionnez votre domaine (Data Science / DevOps / Software), collez vos entreprises et enregistrez tout d&apos;un coup.
              </p>
            </div>
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

        {/* Global Preset Bar (Default domain, role, status, date) */}
        <div className="border-b border-gray-100 bg-[#fffcfb] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#ff5722]" />
                Valeurs par défaut appliquées à vos candidatures :
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-[11px] font-medium text-[#ff5722] hover:underline"
            >
              {showConfig ? "Masquer les détails" : "Afficher tous les réglages"}
            </button>
          </div>

          {/* Quick Domain Selector Chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold text-gray-600">
              Choisir un domaine :
            </span>
            {POPULAR_DOMAINS.map((dom) => (
              <button
                key={dom.value}
                type="button"
                onClick={() => handleDomainChange(dom.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  defaultDomain === dom.value
                    ? "border-[#ff5722] bg-[#fff3ef] font-bold text-[#ff5722] shadow-2xs"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                {dom.label}
              </button>
            ))}
          </div>

          {/* 5-Column Preset Inputs */}
          <div
            className={cn(
              "mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-5",
              !showConfig && "hidden sm:grid",
            )}
          >
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-500">
                Domaine
              </label>
              <EditorialSelect
                className="editorial-select h-7.5 w-full text-xs font-medium"
                value={defaultDomain}
                onChange={(next) => handleDomainChange(next)}
                options={JOB_DOMAINS}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-500">
                Mon poste cible
              </label>
              <input
                type="text"
                value={defaultPosition}
                onChange={(e) => setDefaultPosition(e.target.value)}
                placeholder="Ex: Stage PFE Data Science..."
                className="editorial-input h-7.5 w-full text-xs font-medium text-gray-900"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-500">
                Contrat
              </label>
              <EditorialSelect
                className="editorial-select h-7.5 w-full text-xs"
                value={defaultJobType}
                onChange={(next) => handleJobTypeChange(next)}
                options={JOB_TYPES}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-500">
                Statut par défaut
              </label>
              <EditorialSelect
                className="editorial-select h-7.5 w-full text-xs"
                value={defaultStatus}
                onChange={(next) => setDefaultStatus(next as JobStatus)}
                options={JOB_STATUSES.map((status) => ({
                  value: status,
                  label: JOB_STATUS_LABELS[status],
                }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-500">
                Date de candidature
              </label>
              <input
                type="date"
                value={defaultDate}
                onChange={(e) => setDefaultDate(e.target.value)}
                className="editorial-input h-7.5 w-full text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Modal Main Content: Split Input & Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left: Input Textarea */}
            <div className="flex flex-col lg:col-span-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="editorial-label">
                  Collez vos entreprises (1 par ligne)
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#ff5722] hover:underline"
                >
                  <Clipboard className="h-3 w-3" />
                  {copiedSuccess ? "Copié !" : "Coller le presse-papier"}
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Tapez juste le nom de l'entreprise par ligne :
Doctolib
Capgemini, Lyon
Thales | Cyber | Rennes
Swile
ManoMano | Frontend
BlaBlaCar
Deezer

Ou collez directement une colonne Excel / Notes !`}
                className="editorial-textarea h-60 w-full font-mono text-xs leading-relaxed"
              />

              {/* Instant Examples */}
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-gray-500">
                  Remplir en 1 clic pour tester :
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRawText(EXAMPLE_COMPANIES_ONLY)}
                    className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 transition hover:bg-amber-100"
                  >
                    <Rocket className="h-3 w-3 text-amber-600" />
                    8 Entreprises (ultra-court)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(EXAMPLE_TURBO)}
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700 transition hover:bg-gray-100"
                  >
                    ⚡ Entreprise + Ville + Statut
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawText(EXAMPLE_EMAIL)}
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700 transition hover:bg-gray-100"
                  >
                    📧 Copier-coller de mail
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Dynamic Batch Table */}
            <div className="flex flex-col rounded-xl border border-gray-200 bg-gray-50/60 p-4 lg:col-span-7">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="editorial-label">
                    Candidatures prêtes à enregistrer ({candidates.length})
                  </span>
                  {candidates.length > 0 && (
                    <span className="rounded-full bg-[#ff5722]/10 px-2 py-0.5 text-[10px] font-bold text-[#ff5722]">
                      {candidates.length} détectée(s)
                    </span>
                  )}
                </div>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawText("");
                      setCandidates([]);
                    }}
                    className="text-[11px] text-gray-400 hover:text-red-600"
                  >
                    Tout vider
                  </button>
                )}
              </div>

              {candidates.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-8 text-center">
                  <Sparkles className="mb-2 h-7 w-7 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-700">
                    Tapez ou collez vos entreprises à gauche
                  </p>
                  <p className="mt-1 max-w-sm text-[11px] text-gray-400">
                    Chaque ligne sera automatiquement enregistrée avec le domaine sélectionné ({JOB_DOMAINS.find((d) => d.value === defaultDomain)?.label || defaultDomain}).
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-between space-y-3">
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 border-b border-gray-100 bg-gray-50/90 text-[10px] font-bold uppercase tracking-wider text-gray-500 backdrop-blur-xs">
                        <tr>
                          <th className="px-3 py-2">Entreprise</th>
                          <th className="px-3 py-2">Poste</th>
                          <th className="px-2 py-2">Domaine</th>
                          <th className="px-2 py-2">Ville</th>
                          <th className="px-2 py-2">Statut</th>
                          <th className="px-2 py-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {candidates.map((cand, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/75">
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <CompanyLogo
                                  name={cand.values.companyName}
                                  className="h-6 w-6 shrink-0"
                                />
                                <input
                                  type="text"
                                  value={cand.values.companyName}
                                  onChange={(e) =>
                                    handleUpdateCandidate(idx, { companyName: e.target.value })
                                  }
                                  placeholder="Entreprise"
                                  className="h-6 w-24 rounded border border-transparent px-1.5 text-xs font-semibold text-gray-900 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={cand.values.position}
                                onChange={(e) =>
                                  handleUpdateCandidate(idx, { position: e.target.value })
                                }
                                placeholder="Intitulé"
                                className="h-6 w-full min-w-[120px] rounded border border-transparent px-1.5 text-xs text-gray-800 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <EditorialSelect
                                className="h-6 w-28 text-[10px]"
                                value={cand.values.domain || defaultDomain}
                                onChange={(next) =>
                                  handleUpdateCandidate(idx, { domain: next })
                                }
                                options={JOB_DOMAINS}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={cand.values.location}
                                onChange={(e) =>
                                  handleUpdateCandidate(idx, { location: e.target.value })
                                }
                                placeholder="Lieu"
                                className="h-6 w-16 rounded border border-transparent px-1 text-[11px] text-gray-600 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <EditorialSelect
                                className="h-6 w-26 text-[10px]"
                                value={cand.values.status}
                                onChange={(next) =>
                                  handleUpdateCandidate(idx, { status: next as JobStatus })
                                }
                                options={JOB_STATUSES.map((status) => ({
                                  value: status,
                                  label: JOB_STATUS_LABELS[status],
                                }))}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveCandidate(idx)}
                                className="p-1 text-gray-300 hover:text-red-500"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add a single company on the fly */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={quickCompanyInput}
                      onChange={(e) => setQuickCompanyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddQuickCompany();
                        }
                      }}
                      placeholder="+ Ajouter rapidement une entreprise (puis Entrée)..."
                      className="editorial-input h-7 flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuickCompany}
                      disabled={!quickCompanyInput.trim()}
                      className="editorial-button-secondary h-7 px-2.5 text-xs font-medium"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3.5 sm:flex-row sm:px-6">
          <button
            type="button"
            className="editorial-button-secondary w-full text-xs sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </button>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {candidates.length > 0 && (
              <span className="text-xs font-medium text-gray-500 hidden sm:inline">
                {candidates.length} candidature{candidates.length > 1 ? "s" : ""} prête{candidates.length > 1 ? "s" : ""}
              </span>
            )}
            <button
              type="button"
              className="editorial-button-primary h-9 w-full px-5 text-xs font-semibold sm:w-auto"
              onClick={handleSaveAll}
              disabled={saving || candidates.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Enregistrement en cours...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {candidates.length <= 1
                    ? "⚡ Enregistrer la candidature"
                    : `⚡ Tout enregistrer (${candidates.length} candidatures)`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
