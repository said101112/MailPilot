"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Clipboard,
  Loader2,
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
  { value: "ai_data", label: "🤖 Data Science & IA", role: "Stage PFE Data Science & IA" },
  { value: "cloud_devops", label: "☁️ Cloud & DevOps", role: "Stage PFE Cloud & DevOps" },
  { value: "software_engineering", label: "💻 Software", role: "Stage PFE Software Engineering" },
  { value: "fullstack", label: "🌐 Full Stack", role: "Stage PFE Full Stack Developer" },
  { value: "cybersecurity", label: "🛡️ Cybersécurité", role: "Stage PFE Cybersécurité" },
  { value: "backend", label: "⚙️ Backend", role: "Stage PFE Backend Developer" },
];

const EXAMPLE_COMPANIES = `Google
Amazon
Microsoft
Capgemini
Thales
Sopra Steria
Dassault Systèmes
Ubisoft`;

const EXAMPLE_WITH_DETAILS = `Doctolib
Capgemini, Lyon
Thales | Cybersécurité | Rennes | Entretien
Swile
ManoMano, Frontend React
BlaBlaCar | Remote`;

const EXAMPLE_EMAIL = `Bonjour Said,
Nous accusons bonne réception de votre candidature pour le poste de Data Scientist chez Mistral AI à Paris.
recrutement@mistral.ai`;

export default function SmartPasteModal({
  open,
  onClose,
  onSaved,
}: SmartPasteModalProps) {
  // Mobile active tab: "input" | "preview"
  const [mobileTab, setMobileTab] = useState<"input" | "preview">("input");

  // Essential configuration (no clutter)
  const [defaultDomain, setDefaultDomain] = useState("software_engineering");
  const [defaultPosition, setDefaultPosition] = useState("Stage PFE Software Engineering");
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>("sent");
  const [defaultJobType, setDefaultJobType] = useState("pfe");
  const [defaultDate, setDefaultDate] = useState(() => formatDateISO(new Date()));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [rawText, setRawText] = useState("");
  const [candidates, setCandidates] = useState<ParsedCandidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
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
      fullstack: prefix ? `${prefix}Full Stack` : "Développeur Full Stack",
      backend: prefix ? `${prefix}Backend` : "Développeur Backend",
      frontend: prefix ? `${prefix}Frontend` : "Développeur Frontend",
      cybersecurity: prefix ? `${prefix}Cybersécurité` : "Ingénieur Cybersécurité",
      mobile: prefix ? `${prefix}Mobile` : "Développeur Mobile",
      qa: prefix ? `${prefix}QA / Testing` : "Ingénieur QA / Test",
      embedded: prefix ? `${prefix}Systèmes Embarqués` : "Ingénieur Embarqué",
      other: prefix ? `${prefix}Ingénieur` : "Ingénieur Logiciel",
    };

    return titles[domain] || (prefix ? `${prefix}Ingénieur` : "Ingénieur Logiciel");
  };

  const handleDomainChange = (domain: string) => {
    setDefaultDomain(domain);
    const newTitle = getRoleTitleForDomain(domain, defaultJobType);
    setDefaultPosition(newTitle);

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
      workMode: "onsite",
    }),
    [defaultPosition, defaultStatus, defaultDate, defaultJobType, defaultDomain],
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
    if (mobileTab === "input") {
      setMobileTab("preview");
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
        toast.success("Texte collé !");
      }
    } catch {
      toast.error("Veuillez utiliser Ctrl+V pour coller.");
    }
  };

  const handleSaveAll = async () => {
    const validCandidates = candidates.filter((c) => c.values.companyName.trim());
    if (validCandidates.length === 0) {
      toast.error("Veuillez ajouter au moins une entreprise.");
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
          : `🎉 ${count} candidatures enregistrées avec succès !`,
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
    <div className="fixed inset-0 z-[75] flex flex-col items-center justify-end sm:justify-center overflow-y-auto bg-[rgba(9,12,16,0.65)] sm:p-4 backdrop-blur-xs">
      <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-4xl flex-col bg-white sm:rounded-2xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden">
        
        {/* Header: Clean & Compact */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff3ef] text-[#ff5722]">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 sm:text-base">
                Saisie Express Candidatures
              </h2>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Collez votre liste d&apos;entreprises (1 par ligne) pour tout créer en un clic.
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

        {/* Essential Domain & Role Bar (No Redundancy) */}
        <div className="border-b border-gray-100 bg-[#fffcfb] px-4 py-2.5 sm:px-6">
          {/* Domain Chips - Horizontal scrollable without breaking */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <span className="text-[11px] font-semibold text-gray-500 shrink-0 mr-1">
              Domaine :
            </span>
            {POPULAR_DOMAINS.map((dom) => (
              <button
                key={dom.value}
                type="button"
                onClick={() => handleDomainChange(dom.value)}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  defaultDomain === dom.value
                    ? "border-[#ff5722] bg-[#fff3ef] font-bold text-[#ff5722] shadow-2xs"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                {dom.label}
              </button>
            ))}
          </div>

          {/* Simple Target Role & Quick Settings */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                Poste cible :
              </span>
              <input
                type="text"
                value={defaultPosition}
                onChange={(e) => setDefaultPosition(e.target.value)}
                placeholder="Intitulé du poste..."
                className="editorial-input h-7.5 flex-1 text-xs font-semibold text-gray-900"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-medium text-[#ff5722] hover:underline self-end sm:self-auto shrink-0"
            >
              {showAdvanced ? "Masquer options" : "⚙️ Plus d'options (date, statut...)"}
            </button>
          </div>

          {/* Collapsible Advanced Options (Hidden by default to avoid clutter) */}
          {showAdvanced && (
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Contrat</label>
                <EditorialSelect
                  className="editorial-select h-7 w-full text-xs"
                  value={defaultJobType}
                  onChange={(val) => handleJobTypeChange(val)}
                  options={JOB_TYPES}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Statut</label>
                <EditorialSelect
                  className="editorial-select h-7 w-full text-xs"
                  value={defaultStatus}
                  onChange={(val) => setDefaultStatus(val as JobStatus)}
                  options={JOB_STATUSES.map((st) => ({
                    value: st,
                    label: JOB_STATUS_LABELS[st],
                  }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Date</label>
                <input
                  type="date"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="editorial-input h-7 w-full text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400">Autre domaine</label>
                <EditorialSelect
                  className="editorial-select h-7 w-full text-xs"
                  value={defaultDomain}
                  onChange={(val) => handleDomainChange(val)}
                  options={JOB_DOMAINS}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile View Switcher (Tabs for Mobile) */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 sm:hidden">
          <button
            type="button"
            onClick={() => setMobileTab("input")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-semibold border-b-2 transition",
              mobileTab === "input"
                ? "border-[#ff5722] text-[#ff5722] bg-white"
                : "border-transparent text-gray-500",
            )}
          >
            📝 1. Coller le texte
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={cn(
              "flex-1 py-2 text-center text-xs font-semibold border-b-2 transition flex items-center justify-center gap-1.5",
              mobileTab === "preview"
                ? "border-[#ff5722] text-[#ff5722] bg-white"
                : "border-transparent text-gray-500",
            )}
          >
            ⚡ 2. Aperçu ({candidates.length})
          </button>
        </div>

        {/* Body: Responsive Split on Desktop, Tabbed on Mobile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 h-full">
            
            {/* Input Column (Visible on Desktop OR when mobileTab === 'input') */}
            <div
              className={cn(
                "flex-col sm:col-span-5 h-full",
                mobileTab === "input" ? "flex" : "hidden sm:flex",
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="editorial-label">
                  Entreprises (1 par ligne)
                </span>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#ff5722] hover:underline"
                >
                  <Clipboard className="h-3 w-3" />
                  {copiedSuccess ? "Copié !" : "Coller"}
                </button>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Tapez ou collez une entreprise par ligne :
Google
Capgemini, Lyon
Thales | Cyber | Rennes
Swile
ManoMano | Frontend
BlaBlaCar`}
                className="editorial-textarea h-44 sm:h-56 w-full font-mono text-xs leading-relaxed"
              />

              {/* Quick Sample Buttons */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-400 mr-0.5">
                  Exemples :
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(EXAMPLE_COMPANIES);
                    if (window.innerWidth < 640) setMobileTab("preview");
                  }}
                  className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-900 hover:bg-amber-100 transition"
                >
                  <Rocket className="h-3 w-3 text-amber-600" />
                  8 Entreprises
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(EXAMPLE_WITH_DETAILS);
                    if (window.innerWidth < 640) setMobileTab("preview");
                  }}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10.5px] text-gray-700 hover:bg-gray-100 transition"
                >
                  Avec détails
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(EXAMPLE_EMAIL);
                    if (window.innerWidth < 640) setMobileTab("preview");
                  }}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10.5px] text-gray-700 hover:bg-gray-100 transition"
                >
                  Email
                </button>
              </div>

              {/* Mobile CTA to switch to preview */}
              {candidates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileTab("preview")}
                  className="mt-3 sm:hidden w-full editorial-button-secondary py-2 text-xs font-semibold text-[#ff5722] border-[#ff5722]/30 bg-[#fff3ef]"
                >
                  Voir les {candidates.length} candidatures extraites ➔
                </button>
              )}
            </div>

            {/* Preview Column (Visible on Desktop OR when mobileTab === 'preview') */}
            <div
              className={cn(
                "flex-col sm:col-span-7 rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4",
                mobileTab === "preview" ? "flex" : "hidden sm:flex",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="editorial-label">
                    Candidatures prêtes ({candidates.length})
                  </span>
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
                    Effacer tout
                  </button>
                )}
              </div>

              {candidates.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-6 text-center">
                  <Sparkles className="mb-2 h-6 w-6 text-gray-300" />
                  <p className="text-xs font-semibold text-gray-700">
                    Aucune entreprise saisie
                  </p>
                  <p className="mt-1 max-w-xs text-[11px] text-gray-400">
                    Collez votre liste d&apos;entreprises à gauche pour générer les candidatures.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMobileTab("input")}
                    className="mt-3 sm:hidden text-xs font-medium text-[#ff5722] underline"
                  >
                    Aller à la saisie ➔
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col justify-between space-y-2.5">
                  
                  {/* Desktop Table (Hidden on Mobile) */}
                  <div className="hidden sm:block max-h-[260px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 border-b border-gray-100 bg-gray-50/90 text-[10px] font-bold uppercase text-gray-500 backdrop-blur-xs">
                        <tr>
                          <th className="px-3 py-2">Entreprise</th>
                          <th className="px-3 py-2">Poste</th>
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
                                  className="h-6 w-28 rounded border border-transparent px-1.5 text-xs font-semibold text-gray-900 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
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
                                className="h-6 w-full min-w-[120px] rounded border border-transparent px-1.5 text-xs text-gray-800 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={cand.values.location}
                                onChange={(e) =>
                                  handleUpdateCandidate(idx, { location: e.target.value })
                                }
                                placeholder="Ville"
                                className="h-6 w-20 rounded border border-transparent px-1 text-[11px] text-gray-600 hover:border-gray-300 focus:border-[#ff5722] focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <EditorialSelect
                                className="h-6 w-28 text-[10px]"
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

                  {/* Mobile Cards (Shown only on Mobile) */}
                  <div className="sm:hidden space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
                    {candidates.map((cand, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <CompanyLogo
                              name={cand.values.companyName}
                              className="h-7 w-7 shrink-0"
                            />
                            <input
                              type="text"
                              value={cand.values.companyName}
                              onChange={(e) =>
                                handleUpdateCandidate(idx, { companyName: e.target.value })
                              }
                              className="text-xs font-bold text-gray-900 border-b border-transparent focus:border-[#ff5722] focus:outline-none px-1"
                              placeholder="Entreprise"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(idx)}
                            className="text-gray-300 hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={cand.values.position}
                            onChange={(e) =>
                              handleUpdateCandidate(idx, { position: e.target.value })
                            }
                            className="editorial-input h-7 text-xs text-gray-700"
                            placeholder="Poste"
                          />
                          <EditorialSelect
                            className="editorial-select h-7 text-[10px]"
                            value={cand.values.status}
                            onChange={(next) =>
                              handleUpdateCandidate(idx, { status: next as JobStatus })
                            }
                            options={JOB_STATUSES.map((status) => ({
                              value: status,
                              label: JOB_STATUS_LABELS[status],
                            }))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Company input */}
                  <div className="flex items-center gap-1.5 pt-1">
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
                      placeholder="+ Ajouter une entreprise..."
                      className="editorial-input h-7 flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuickCompany}
                      disabled={!quickCompanyInput.trim()}
                      className="editorial-button-secondary h-7 px-2.5 text-xs font-medium shrink-0"
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

        {/* Modal Footer (Sticky at bottom, Mobile-Friendly) */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
          <button
            type="button"
            className="editorial-button-secondary text-xs px-3 h-8 sm:h-9"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="editorial-button-primary h-8 sm:h-9 px-4 sm:px-5 text-xs font-semibold"
              onClick={handleSaveAll}
              disabled={saving || candidates.length === 0}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  {candidates.length <= 1
                    ? "Enregistrer"
                    : `Tout enregistrer (${candidates.length})`}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
