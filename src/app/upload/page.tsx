"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MinusSquare,
  Play,
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

interface CSVRow {
  company: string;
  email: string;
  position: string;
  name: string;
  status?: "pending" | "sending" | "success" | "error";
  error?: string;
  message?: string;
  subject?: string;
  [key: string]: string | undefined;
}

type ValidationState =
  | "processing"
  | "sent"
  | "error"
  | "invalid-email"
  | "duplicate"
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
  incomplete: "Incomplete",
  ready: "Ready",
};

function formatTemplateName(name: string) {
  return name === "Standard" ? "Standard Application" : name;
}

function getValidationState(row: CSVRow, duplicateEmails: Set<string>): ValidationState {
  if (row.status === "sending") return "processing";
  if (row.status === "success") return "sent";
  if (row.status === "error") return "error";
  if (!validateEmailFormat(row.email || "").valid) return "invalid-email";
  if (duplicateEmails.has((row.email || "").toLowerCase())) return "duplicate";
  if (!row.company || !row.position || !row.name) return "incomplete";
  return "ready";
}

export default function UploadPage() {
  const [data, setData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState("routepilot_batch_template.csv");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [templates, setTemplates] = useState(cloneDefaultTemplates);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatusResponse | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    return () => {
      window.removeEventListener(TEMPLATE_LIBRARY_EVENT, syncTemplates);
      window.removeEventListener("storage", syncTemplates);
    };
  }, []);

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
      incomplete: 0,
      ready: 0,
    };

    data.forEach((row) => {
      counts[getValidationState(row, duplicateEmails)] += 1;
    });

    return counts;
  }, [data, duplicateEmails]);

  const selectableIndexes = useMemo(
    () =>
      data
        .map((row, index) =>
          row.status === "pending" || row.status === "error" ? index : -1,
        )
        .filter((index) => index !== -1),
    [data],
  );

  const readyCount = validationCounts.ready;
  const issueCount =
    validationCounts.duplicate +
    validationCounts["invalid-email"] +
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

  const toggleRow = (index: number) => {
    if (isProcessing) return;

    setSelectedRows((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (isProcessing) return;
    setSelectedRows(new Set(selectableIndexes));
  };

  const deselectAll = () => {
    if (isProcessing) return;
    setSelectedRows(new Set());
  };

  const startBatchProcess = async () => {
    if (integrationLoading) {
      toast.info("Checking workflow health. Try again in a moment.");
      return;
    }

    if (n8nBlocked) {
      toast.error(integrationStatus?.n8n.message || "n8n is not ready.");
      return;
    }

    const selectedIndexes = Array.from(selectedRows).sort((a, b) => a - b);
    if (selectedIndexes.length === 0) {
      toast.error("Select at least one row before launching the queue.");
      return;
    }

    setIsProcessing(true);

    const template = activeTemplate;
    const savedName = readCandidateName();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const emailValidationCache = new Map<string, EmailPreflightResult>();

    let successCount = 0;
    let failCount = 0;
    const nextData = [...data];

    setProgress({ current: 0, total: selectedIndexes.length });

    for (let step = 0; step < selectedIndexes.length; step += 1) {
      const index = selectedIndexes[step];
      nextData[index] = { ...nextData[index], status: "sending", error: undefined };
      setData([...nextData]);
      setProgress({ current: step + 1, total: selectedIndexes.length });

      try {
        const row = nextData[index];
        const emailKey = (row.email || "").toLowerCase();

        const formatResult = validateEmailFormat(emailKey);
        if (!formatResult.valid) {
          nextData[index] = { ...nextData[index], status: "error", error: formatResult.message };
          failCount += 1;
          setData([...nextData]);
          continue;
        }

        let emailResult = emailValidationCache.get(emailKey);
        if (!emailResult) {
          emailResult = await validateEmailBeforeSend(emailKey);
          emailValidationCache.set(emailKey, emailResult);
        }

        if (!emailResult.valid) {
          nextData[index] = { ...nextData[index], status: "error", error: emailResult.message };
          failCount += 1;
          setData([...nextData]);
          continue;
        }

        const replace = (text: string) => {
          let processedText = text;

          Object.keys(row).forEach((key) => {
            const regex = new RegExp(`\\[${key}\\]`, "gi");
            processedText = processedText.replace(regex, row[key as keyof CSVRow] || "");
          });

          return processedText.replace(/\[MyName\]/gi, savedName);
        };

        const processedMessage = replace(template.message).replace(/\n/g, "<br>");
        const processedSubject = replace(template.subject);
        const { base64: cvBase64, fileName: cvFileName } = readStoredCv();

        await sendApplication({
          ...row,
          message: processedMessage,
          subject: processedSubject,
          cv_base64: cvBase64,
          cv_filename: cvFileName || `${savedName.replace(/\s+/g, "_")}_Resume.pdf`,
        });

        if (user) {
          await supabase.from("applications").insert([
            {
              user_id: user.id,
              company: row.company || null,
              position: row.position || null,
              email: row.email,
              status: "success",
            },
          ]);
        }

        nextData[index] = { ...nextData[index], status: "success", error: undefined };
        successCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown workflow failure.";
        nextData[index] = { ...nextData[index], status: "error", error: message };
        failCount += 1;

        if (user) {
          try {
            await supabase.from("applications").insert([
              {
                user_id: user.id,
                company: nextData[index].company || null,
                position: nextData[index].position || null,
                email: nextData[index].email,
                status: "failed",
              },
            ]);
          } catch (dbErr) {
            console.error("Unable to record failed application in Supabase", dbErr);
          }
        }
      }

      setData([...nextData]);

      if (step < selectedIndexes.length - 1) {
        await delay(2000);
      }
    }

    const remainingSelection = new Set<number>();
    nextData.forEach((row, index) => {
      if (row.status === "pending" || row.status === "error") {
        remainingSelection.add(index);
      }
    });

    setSelectedRows(remainingSelection);
    setIsProcessing(false);

    if (failCount > 0 && successCount === 0) {
      toast.error(`Queue completed: all ${failCount} failed.`);
    } else if (failCount > 0) {
      toast.warning(`Queue completed: ${successCount} drafts created, ${failCount} failed.`);
    } else {
      toast.success(`Queue complete: ${successCount} drafts created in Gmail.`);
    }
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
      case "ready":
      default:
        return "Validated and ready for launch.";
    }
  };

  const renderStatusChip = (state: ValidationState) => (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        state === "ready" && "bg-blue-50 text-blue-700",
        state === "sent" && "bg-emerald-50 text-emerald-700",
        state === "processing" && "bg-amber-50 text-amber-700",
        (state === "duplicate" ||
          state === "invalid-email" ||
          state === "incomplete" ||
          state === "error") &&
          "bg-red-50 text-red-700",
      )}
    >
      {VALIDATION_LABELS[state]}
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

          <div className="flex items-center gap-2">
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
            {/* Left: Upload Dropzone (7 cols) */}
            <div className="lg:col-span-7">
              <div
                className={cn(
                  "flex min-h-[380px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer",
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
                  Drop your CSV file here
                </h2>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                  Drag and drop your spreadsheet, or click anywhere inside this box to browse from your computer.
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
                    Select Batch File
                  </button>
                  <span className="text-[11px] text-gray-400">
                    Maximum file size 25MB • .csv format
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Requirements & Instructions (5 cols) */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {/* Card 1: Column Format */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-xs font-semibold text-gray-900">
                  Expected Column Headers
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Your CSV should contain these key columns:
                </p>

                <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-100 text-xs">
                  <div className="flex items-center justify-between p-2.5">
                    <span className="font-mono font-semibold text-gray-800">company</span>
                    <span className="text-gray-500">Carrier or broker name</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="font-mono font-semibold text-gray-800">email</span>
                    <span className="text-gray-500">Target dispatch contact</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="font-mono font-semibold text-gray-800">position</span>
                    <span className="text-gray-500">Role or offer title</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="font-mono font-semibold text-gray-800">name</span>
                    <span className="text-gray-500">Contact person name</span>
                  </div>
                </div>
              </div>

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
                  onClick={() => {
                    setData([]);
                    setSelectedRows(new Set());
                  }}
                  type="button"
                >
                  Clear & New File
                </button>

                <button
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  disabled={data.length === 0 || isProcessing}
                  onClick={isAllSelected ? deselectAll : selectAll}
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
                  onClick={startBatchProcess}
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
                          onClick={isAllSelected ? deselectAll : selectAll}
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
                      const validationState = getValidationState(row, duplicateEmails);
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
