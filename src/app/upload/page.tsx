"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MinusSquare,
  Play,
  Send,
  Sparkles,
  Square,
  UploadCloud,
} from "lucide-react";
import {
  getIntegrationStatus,
  sendApplication,
  validateEmailBeforeSend,
  type EmailPreflightResult,
  type IntegrationStatusResponse,
} from "@/lib/api";
import { validateEmailFormat } from "@/lib/email";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_LIBRARY_EVENT,
  cloneDefaultTemplates,
  getStoredTemplates,
} from "@/lib/templates";
import { supabase } from "@/lib/supabase";
import { cn, delay } from "@/lib/utils";
import { readCandidateName, readStoredCv } from "@/lib/workspace";
import CvUploadCard from "@/components/CvUploadCard";
import {
  syncEmailDispatchToTracker,
  syncAllHistoryApplications,
  inferCompanyFromEmail,
  parseContactFromEmail,
  getWithdrawnEmails,
} from "@/lib/tracker/syncService";
import { useBulkUpload, type CSVRow } from "@/context/BulkUploadContext";

type ValidationState =
  | "processing"
  | "sent"
  | "error"
  | "invalid-email"
  | "duplicate"
  | "withdrawn"
  | "incomplete"
  | "ready";

const MAX_CSV_BYTES = 25 * 1024 * 1024;

const COLUMN_ALIASES: Record<string, string> = {
  societe: "company",
  entreprise: "company",
  company: "company",
  email: "email",
  "e-mail": "email",
  mail: "email",
  name: "name",
  "nom complet": "name",
  nom: "name",
  contact: "name",
  manager: "name",
  poste: "position",
  position: "position",
  titre: "position",
  job: "position",
};

const VALIDATION_LABELS: Record<ValidationState, string> = {
  processing: "Drafting",
  sent: "Draft Created",
  error: "Error",
  "invalid-email": "Invalid Email",
  duplicate: "Duplicate",
  withdrawn: "Blocked",
  incomplete: "Incomplete",
  ready: "Ready",
};

function formatTemplateName(name: string) {
  return name === "Standard" ? "Standard Application" : name;
}

function getValidationState(
  row: CSVRow,
  duplicateEmails: Set<string>,
  withdrawnEmails: Set<string> = new Set()
): ValidationState {
  if (row.status === "sending") return "processing";
  if (row.status === "success") return "sent";
  if (row.status === "error") return "error";
  const cleanEmail = (row.email || "").toLowerCase();
  if (!validateEmailFormat(cleanEmail).valid) return "invalid-email";
  if (withdrawnEmails.has(cleanEmail)) return "withdrawn";
  if (duplicateEmails.has(cleanEmail)) return "duplicate";
  if (!row.company || !row.position || !row.name) return "incomplete";
  return "ready";
}

function extractEmailsFromText(rawText: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = rawText.match(emailRegex) || [];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const m of matches) {
    const cleaned = m.trim().toLowerCase();
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      unique.push(cleaned);
    }
  }
  return unique;
}

const COMMON_FREE_PROVIDERS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.fr",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

function guessCompanyFromEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length < 2) return "Recruteur";
  const domain = parts[1].toLowerCase();
  if (COMMON_FREE_PROVIDERS.has(domain)) {
    return "Recruteur Direct";
  }
  const cleanDomain = domain.replace(
    /^(recrutement|recruitment|carrieres|carriere|careers|career|rh|hr|jobs|job|talent|talents|contact|stages|stage|pfe)\./i,
    "",
  );
  const domainParts = cleanDomain.split(".");
  const namePart =
    domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domainParts[0];
  if (!namePart) return "Entreprise";
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

export default function UploadPage() {
  const {
    data,
    setData,
    fileName,
    setFileName,
    selectedRows,
    setSelectedRows,
    toggleRow,
    selectAll,
    deselectAll,
    selectedTemplateId,
    setSelectedTemplateId,
    defaultPosition,
    setDefaultPosition,
    defaultContactName,
    setDefaultContactName,
    inputMode,
    setInputMode,
    pastedText,
    setPastedText,
    currentPage,
    setCurrentPage,
    isProcessing,
    progress,
    setProgress,
    startBatchProcess: contextStartBatchProcess,
    cancelBatchProcess,
    clearBatch,
  } = useBulkUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [templates, setTemplates] = useState(cloneDefaultTemplates);
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatusResponse | null>(null);
  const [withdrawnEmails, setWithdrawnEmails] = useState<Set<string>>(new Set());
  const ROWS_PER_PAGE = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getWithdrawnEmails().then((set) => setWithdrawnEmails(set));
  }, []);

  useEffect(() => {
    const loadIntegrationStatus = async () => {
      setIntegrationLoading(true);

      try {
        const nextStatus = await getIntegrationStatus();
        setIntegrationStatus(nextStatus);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load integration status.";
        toast.error(message);
      } finally {
        setIntegrationLoading(false);
      }
    };

    void loadIntegrationStatus();
  }, []);

  useEffect(() => {
    const syncTemplates = () => {
      const stored = getStoredTemplates();
      setTemplates(stored);
      if (stored.length > 0) {
        setSelectedTemplateId((prev) => prev || stored[0].id);
      }
    };

    syncTemplates();

    window.addEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
    window.addEventListener("storage", syncTemplates);

  }, []);

  // Check for preloaded rows (e.g. transferred from BulkRelanceModal)
  useEffect(() => {
    try {
      const preload = window.sessionStorage.getItem("truck_app_bulk_preload");
      if (preload) {
        const rows = JSON.parse(preload);
        if (Array.isArray(rows) && rows.length > 0) {
          setData(rows);
          const initialSelection = new Set<number>();
          rows.forEach((_, idx) => initialSelection.add(idx));
          setSelectedRows(initialSelection);
          setFileName(`relance_batch_${new Date().toISOString().slice(0, 10)}.csv`);

          const tplId = window.sessionStorage.getItem("truck_app_bulk_template_id");
          if (tplId) setSelectedTemplateId(tplId);

          toast.success(`${rows.length} candidature(s) pour relance chargées dans le Bulk Upload !`);
          window.sessionStorage.removeItem("truck_app_bulk_preload");
          window.sessionStorage.removeItem("truck_app_bulk_template_id");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoadSevenDaysAwaiting = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Veuillez vous connecter.");
        return;
      }

      const { data: apps, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "success")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = (apps || []).filter(
        (a) => new Date(a.created_at).getTime() <= sevenDaysAgo
      );

      if (filtered.length === 0) {
        toast.info("Aucune candidature sans réponse depuis plus de 7 jours trouvée.");
        return;
      }

      const loadedRows: CSVRow[] = filtered.map((a) => {
        const comp = a.company || inferCompanyFromEmail(a.email)?.name || "Entreprise";
        const contact = parseContactFromEmail(a.email, comp);
        return {
          company: comp,
          position: a.position || "Candidature",
          email: a.email,
          name: contact.fullName,
          status: "pending",
        };
      });

      setData(loadedRows);
      const sel = new Set<number>();
      loadedRows.forEach((_, i) => sel.add(i));
      setSelectedRows(sel);
      setFileName(`relance_7jours_${new Date().toISOString().slice(0, 10)}.csv`);

      const followUpTpl = templates.find((t) => t.id === "followup-7days") || templates[0];
      if (followUpTpl) setSelectedTemplateId(followUpTpl.id);

      toast.success(`${loadedRows.length} candidature(s) sans réponse (+7j) importées !`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement.");
    }
  };

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();

    data.forEach((row) => {
      const key = (row.email || "").toLowerCase();
      if (!key) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([email]) => email),
    );
  }, [data]);

  const validationCounts = useMemo(() => {
    const counts: Record<ValidationState, number> = {
      processing: 0,
      sent: 0,
      error: 0,
      "invalid-email": 0,
      duplicate: 0,
      withdrawn: 0,
      incomplete: 0,
      ready: 0,
    };

    data.forEach((row) => {
      counts[getValidationState(row, duplicateEmails, withdrawnEmails)] += 1;
    });

    return counts;
  }, [data, duplicateEmails, withdrawnEmails]);

  const selectableIndexes = useMemo(
    () =>
      data
        .map((row, index) => {
          const cleanEmail = (row.email || "").toLowerCase();
          // Exclude emails marked as withdrawn/not found in history
          if (withdrawnEmails.has(cleanEmail)) return -1;
          return row.status === "pending" || row.status === "error" ? index : -1;
        })
        .filter((index) => index !== -1),
    [data, withdrawnEmails],
  );

  const readyCount = validationCounts.ready;
  const issueCount =
    validationCounts.duplicate +
    validationCounts["invalid-email"] +
    validationCounts.withdrawn +
    validationCounts.incomplete +
    validationCounts.error;
  const selectedCount = selectedRows.size;
  const progressPercent =
    progress.total > 0 && isProcessing
      ? Math.round((progress.current / progress.total) * 100)
      : data.length > 0
        ? Math.round((readyCount / data.length) * 100)
        : 0;
  const isAllSelected =
    selectableIndexes.length > 0 && selectedRows.size === selectableIndexes.length;
  const isSomeSelected = selectedRows.size > 0 && !isAllSelected;
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) ?? templates[0] ?? DEFAULT_TEMPLATES[0];
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
  const paginatedData = data.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const n8nBlocked =
    integrationStatus?.n8n.configured === false ||
    integrationStatus?.n8n.reachable === false ||
    integrationStatus?.n8n.healthy === false;

  const processCsvFile = (file: File) => {
    const lowerFileName = file.name.toLowerCase();

    if (!lowerFileName.endsWith(".csv")) {
      toast.error("Please upload a CSV file.");
      return;
    }

    if (file.size > MAX_CSV_BYTES) {
      toast.error("The CSV file is too large. Max size is 25 MB.");
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as Record<string, string>[];

        const normalizedData = parsedData.map((row) => {
          const normalizedRow: Record<string, string> = {};

          Object.entries(row).forEach(([key, value]) => {
            const lowerKey = key.trim().toLowerCase();
            const mappedKey = COLUMN_ALIASES[lowerKey] || lowerKey;
            normalizedRow[mappedKey] = value?.trim() || "";
          });

          return normalizedRow;
        });

        const validRows = normalizedData.filter((row) => row.email);

        if (validRows.length === 0) {
          toast.error("No valid rows found. Add at least one email column.");
          return;
        }

        const nextRows = validRows.map(
          (row) =>
            ({
              ...row,
              status: "pending",
            }) as CSVRow,
        );

        setData(nextRows);
        setProgress({ current: 0, total: validRows.length });
        setSelectedRows(new Set(nextRows.map((_, index) => index)));
        setCurrentPage(1);
        toast.success(`${validRows.length} rows imported into the batch queue.`);
      },
      error: (error) => {
        toast.error(`CSV parsing failed: ${error.message}`);
      },
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processCsvFile(file);
    event.target.value = "";
  };

  const detectedEmails = useMemo(() => {
    return extractEmailsFromText(pastedText);
  }, [pastedText]);

  const handleImportPastedEmails = () => {
    if (detectedEmails.length === 0) {
      toast.error("Aucune adresse email valide détectée dans le texte.");
      return;
    }

    const nextRows: CSVRow[] = detectedEmails.map((email) => ({
      email,
      company: guessCompanyFromEmail(email),
      position: defaultPosition.trim() || "Stage PFE / Emploi",
      name: defaultContactName.trim() || "Hiring Manager",
      status: "pending",
    }));

    setFileName(`linkedin-paste-${detectedEmails.length}-contacts.csv`);
    setData(nextRows);
    setProgress({ current: 0, total: nextRows.length });
    setSelectedRows(new Set(nextRows.map((_, index) => index)));
    setCurrentPage(1);
    toast.success(`${detectedEmails.length} contacts extraits et importés avec succès !`);
  };

  const handleSelectAll = () => {
    if (isProcessing) return;
    selectAll(selectableIndexes);
  };

  const handleStartBatchProcess = async () => {
    if (integrationLoading) {
      toast.info("Checking workflow health. Try again in a moment.");
      return;
    }

    if (n8nBlocked) {
      toast.error(integrationStatus?.n8n.message || "n8n is not ready.");
      return;
    }

    await contextStartBatchProcess(activeTemplate);
  };

  const getValidationMessage = (row: CSVRow, state: ValidationState) => {
    if (row.error) return row.error;

    switch (state) {
      case "duplicate":
        return "Duplicate email detected in this batch.";
      case "invalid-email":
        return "Email format is invalid.";
      case "incomplete":
        return "Missing company, position, or contact name.";
      case "processing":
        return "Currently generating draft in Gmail.";
      case "sent":
        return "Draft created successfully in Gmail with CV attached.";
      case "error":
        return row.error || "Delivery failed - draft was not created.";
      case "withdrawn":
        return "Email marqué comme non délivré / retiré dans l'historique (exclu pour éviter un bounce).";
      case "ready":
      default:
        return "Validated and ready for launch.";
    }
  };

  const renderStatusChip = (state: ValidationState) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        state === "ready" && "bg-blue-50 text-blue-700",
        state === "sent" && "bg-emerald-50 text-emerald-700",
        state === "processing" && "bg-amber-50 text-amber-700",
        state === "withdrawn" && "bg-amber-50 text-amber-900 border border-amber-200 font-semibold",
        (state === "duplicate" ||
          state === "invalid-email" ||
          state === "incomplete" ||
          state === "error") &&
          "bg-red-50 text-red-700",
      )}
    >
      {state === "withdrawn" && <Ban className="h-3 w-3 text-amber-700" />}
      <span>{VALIDATION_LABELS[state]}</span>
    </span>
  );

  return (
    <div className="page-shell">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Bulk Upload Manager
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Import CSV contact lists, validate data, and generate Gmail drafts in bulk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSevenDaysAwaiting}
              className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5 shadow-2xs font-semibold"
              title="Importer les candidatures envoyées depuis plus d'une semaine sans réponse pour lancer une relance"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Importer relances (+7j)</span>
            </button>
            <a
              className="editorial-button-secondary h-8 px-3 text-xs"
              download
              href="/routepilot-template.csv"
            >
              <Download className="h-3.5 w-3.5" />
              Download Template CSV
            </a>
            <Link className="editorial-button-secondary h-8 px-3 text-xs" href="/templates">
              <FileText className="h-3.5 w-3.5" />
              Templates
            </Link>
          </div>
        </div>

        {/* Candidate Resume Attachment Section */}
        <CvUploadCard variant="banner" />

        {/* Hidden File Input */}
        <input
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
          ref={fileInputRef}
          type="file"
        />

        {/* STATE 1: NO FILE LOADED (Organized 2-Column Upload View) */}
        {data.length === 0 ? (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: Dual Mode Upload / Paste (7 cols) */}
            <div className="lg:col-span-7">
              {/* Tab Selector */}
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer",
                    inputMode === "file"
                      ? "bg-[#fff3ef] text-[#ff5722] border border-[#ff5722]/30 shadow-xs"
                      : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50",
                  )}
                >
                  <UploadCloud className="h-4 w-4" />
                  Fichier CSV
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer",
                    inputMode === "paste"
                      ? "bg-[#fff3ef] text-[#ff5722] border border-[#ff5722]/30 shadow-xs"
                      : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  Copier-Coller / LinkedIn
                  {detectedEmails.length > 0 && (
                    <span className="rounded-full bg-[#ff5722] text-white px-2 py-0.5 text-[10px] font-bold">
                      {detectedEmails.length}
                    </span>
                  )}
                </button>
              </div>

              {/* View A: Drag & Drop CSV */}
              {inputMode === "file" ? (
                <div
                  className={cn(
                    "flex min-h-[420px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer",
                    isDragging
                      ? "border-[#ff5722] bg-[#fff3ef]/40"
                      : "border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-white",
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragLeave={() => setIsDragging(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) processCsvFile(file);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3ef] text-[#ff5722]">
                    <UploadCloud className="h-7 w-7" />
                  </div>

                  <h2 className="mt-4 text-sm font-semibold text-gray-900">
                    Déposez votre fichier CSV ici
                  </h2>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                    Glissez-déposez votre tableur, ou cliquez n'importe où dans ce cadre pour sélectionner un fichier sur votre ordinateur.
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-2">
                    <button
                      className="editorial-button-primary h-8 px-4 text-xs font-semibold"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Sélectionner un fichier CSV
                    </button>
                    <span className="text-[11px] text-gray-400">
                      Taille max. 25 Mo • Format .csv
                    </span>
                  </div>
                </div>
              ) : (
                /* View B: Smart Paste / LinkedIn Email Extraction */
                <div className="flex min-h-[420px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#fff3ef] text-[#ff5722]">
                        <ClipboardPaste className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                          Collez votre texte ou post LinkedIn
                        </h2>
                        <p className="text-xs text-gray-500">
                          Extraction automatique des emails, déduplication et inférence d'entreprises.
                        </p>
                      </div>
                    </div>
                    {detectedEmails.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {detectedEmails.length} email{detectedEmails.length > 1 ? "s" : ""} détecté{detectedEmails.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="editorial-label mb-1.5 block">
                      Collez le texte brut (post LinkedIn, liste d'emails, texte avec adresses) :
                    </label>
                    <textarea
                      className="w-full min-h-[160px] rounded-lg border border-gray-300 p-3 text-xs font-mono placeholder:font-sans placeholder-gray-400 focus:border-[#ff5722] focus:outline-none focus:ring-1 focus:ring-[#ff5722] leading-relaxed resize-y"
                      placeholder={`Collez ici une liste d'emails ou un post LinkedIn partagé...\n\nExemples pris en compte :\n• rh@soprasteria.com, recrutement@wavestone.com\n• Post LinkedIn : "Voici les recruteurs qui embauchent ce mois-ci : envoyez vos CVs à stage@renault.com ou contact@thalesgroup.com !"\n• Liste d'emails séparés par des virgules ou retours à la ligne.`}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                    />
                  </div>

                  {/* Batch defaults for missing columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="editorial-label mb-1 block">Poste ciblé par défaut</label>
                      <input
                        type="text"
                        className="editorial-input h-9 text-xs"
                        placeholder="ex: Stage PFE / Candidature Spontanée"
                        value={defaultPosition}
                        onChange={(e) => setDefaultPosition(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="editorial-label mb-1 block">Contact / Titre par défaut</label>
                      <input
                        type="text"
                        className="editorial-input h-9 text-xs"
                        placeholder="ex: Hiring Manager"
                        value={defaultContactName}
                        onChange={(e) => setDefaultContactName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <div className="text-[11px] text-gray-500">
                      {detectedEmails.length > 0 ? (
                        <span className="text-emerald-600 font-medium">
                          ✓ {detectedEmails.length} email{detectedEmails.length > 1 ? "s" : ""} unique{detectedEmails.length > 1 ? "s" : ""}. Les noms d'entreprises seront déduits des domaines.
                        </span>
                      ) : (
                        <span>Collez un texte ci-dessus pour détecter les adresses email.</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {pastedText && (
                        <button
                          type="button"
                          className="editorial-button-secondary h-8 px-3 text-xs"
                          onClick={() => setPastedText("")}
                        >
                          Effacer
                        </button>
                      )}
                      <button
                        type="button"
                        className="editorial-button-primary h-8 px-4 text-xs font-semibold"
                        disabled={detectedEmails.length === 0}
                        onClick={handleImportPastedEmails}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Importer ({detectedEmails.length})
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Requirements & Instructions (5 cols) */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {inputMode === "paste" ? (
                /* Card 1 for Paste Mode: How LinkedIn copy-paste works */
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
                    <Sparkles className="h-4 w-4 text-[#ff5722]" />
                    <span>Détection Intelligente LinkedIn</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                    Pas besoin de préparer un fichier Excel ou CSV à la main :
                  </p>

                  <div className="mt-3.5 space-y-2.5 text-xs text-gray-600">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[11px] font-bold text-[#ff5722]">1</span>
                      <span>Copiez n'importe quel post ou liste partagée sur LinkedIn.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[11px] font-bold text-[#ff5722]">2</span>
                      <span>Collez tout le texte : les emails sont automatiquement extraits et les doublons éliminés.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[11px] font-bold text-[#ff5722]">3</span>
                      <span>L'entreprise est déduite du domaine (ex: <code className="font-mono text-gray-800 bg-gray-100 px-1 py-0.5 rounded text-[10.5px]">@wavestone.com</code> ➔ Wavestone).</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3ef] text-[11px] font-bold text-[#ff5722]">4</span>
                      <span>Cliquez sur Importer, prévisualisez dans le tableau et créez tous vos brouillons Gmail !</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Card 1 for File Mode: Expected Column Headers */
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <h3 className="text-xs font-semibold text-gray-900">
                    Colonnes attendues dans le CSV
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Votre tableur devrait contenir ces colonnes clés :
                  </p>

                  <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-100 text-xs">
                    <div className="flex items-center justify-between p-2.5">
                      <span className="font-mono font-semibold text-gray-800">company</span>
                      <span className="text-gray-500">Nom de l'entreprise</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="font-mono font-semibold text-gray-800">email</span>
                      <span className="text-gray-500">Adresse email du recruteur</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="font-mono font-semibold text-gray-800">position</span>
                      <span className="text-gray-500">Titre du poste ou de l'offre</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5">
                      <span className="font-mono font-semibold text-gray-800">name</span>
                      <span className="text-gray-500">Nom du contact / recruteur</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: Protections Active */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-semibold text-gray-900">
                  Automated Pipeline Protections
                </h3>
                <div className="mt-3 space-y-2.5 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>Duplicate detection automatically flags repeated emails.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>Pre-flight syntax & domain verification before sending.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>Automated 2-second delay between dispatches.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STATE 2: FILE LOADED (Active Batch Review & Execution) */
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-2 divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
                <div className="p-4">
                  <span className="text-xs text-gray-500">Total Contacts</span>
                  <p className="mt-1 text-xl font-bold text-gray-900">{data.length}</p>
                </div>
                <div className="p-4">
                  <span className="text-xs text-emerald-600 font-medium">Ready to Draft</span>
                  <p className="mt-1 text-xl font-bold text-gray-900">{readyCount}</p>
                </div>
                <div className="p-4">
                  <span className="text-xs text-amber-600 font-medium">Flagged Rows</span>
                  <p className="mt-1 text-xl font-bold text-gray-900">{issueCount}</p>
                </div>
                <div className="p-4">
                  <span className="text-xs text-blue-600 font-medium">Selected for Queue</span>
                  <p className="mt-1 text-xl font-bold text-gray-900">{selectedCount}</p>
                </div>
              </div>
            </div>

            {/* Batch Controls Bar */}
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#ff5722]" />
                  <span className="max-w-[200px] truncate">{fileName}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Template:</span>
                  <select
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 outline-none focus:border-[#ff5722]"
                    value={selectedTemplateId || activeTemplate.id}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatTemplateName(t.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  onClick={clearBatch}
                  type="button"
                  disabled={isProcessing}
                >
                  Clear & New File
                </button>

                <button
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  disabled={data.length === 0 || isProcessing}
                  onClick={isAllSelected ? deselectAll : handleSelectAll}
                  type="button"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </button>

                <button
                  className="editorial-button-primary h-8 px-4 text-xs font-semibold"
                  disabled={
                    data.length === 0 ||
                    selectedRows.size === 0 ||
                    isProcessing ||
                    integrationLoading ||
                    n8nBlocked
                  }
                  onClick={handleStartBatchProcess}
                  type="button"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {isProcessing
                    ? `Creating Drafts (${progress.current}/${progress.total})`
                    : `Create Drafts (${selectedCount})`}
                </button>

                {isProcessing && (
                  <button
                    className="editorial-button-secondary h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={cancelBatchProcess}
                    type="button"
                    title="Arrêter la file d'attente"
                  >
                    Arrêter
                  </button>
                )}
              </div>
            </div>

            {/* Live Queue Progress */}
            {isProcessing && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                  <span>Queue Execution in Progress...</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full bg-[#ff5722] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Table */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                      <th className="w-10 px-4 py-2.5">
                        <button
                          className="text-gray-400 hover:text-gray-600"
                          onClick={isAllSelected ? deselectAll : handleSelectAll}
                          type="button"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-[#ff5722]" />
                          ) : isSomeSelected ? (
                            <MinusSquare className="h-3.5 w-3.5 text-[#ff5722]" />
                          ) : (
                            <Square className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-2.5">Company</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Position / Contact</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.map((row, relativeIndex) => {
                      const index = (currentPage - 1) * ROWS_PER_PAGE + relativeIndex;
                      const validationState = getValidationState(row, duplicateEmails, withdrawnEmails);
                      const isSelected = selectedRows.has(index);

                      return (
                        <tr
                          key={`${row.email}-${index}`}
                          className={cn(
                            "transition hover:bg-gray-50/80 cursor-pointer",
                            isSelected && "bg-gray-50/60",
                          )}
                          onClick={() => toggleRow(index)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleRow(index)}
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-[#ff5722]" />
                              ) : (
                                <Square className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {row.company || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">
                            {row.email || "Missing email"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{row.position || "—"}</p>
                            <p className="text-[10.5px] text-gray-400">{row.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            {renderStatusChip(validationState)}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-[11px]">
                            {getValidationMessage(row, validationState)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
                  <span>
                    Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1} to{" "}
                    {Math.min(currentPage * ROWS_PER_PAGE, data.length)} of {data.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded border border-gray-200 p-1 hover:bg-gray-50 disabled:opacity-40"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      className="rounded border border-gray-200 p-1 hover:bg-gray-50 disabled:opacity-40"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
