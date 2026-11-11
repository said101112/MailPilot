"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  sendApplication,
  sendDirectApplication,
  validateEmailBeforeSend,
  type EmailPreflightResult,
} from "@/lib/api";
import { validateEmailFormat } from "@/lib/email";
import { supabase } from "@/lib/supabase";
import { delay } from "@/lib/utils";
import {
  readCandidateName,
  readStoredCv,
  readStoredCvLibrary,
  getActiveCv,
  readActiveCvId,
} from "@/lib/workspace";
import {
  syncEmailDispatchToTracker,
  syncAllHistoryApplications,
  inferCompanyFromEmail,
  getWithdrawnEmails,
} from "@/lib/tracker/syncService";
import type { MessageTemplate } from "@/lib/templates";
import { generateCoverLetterPdf } from "@/lib/coverLetterPdf";
import {
  formatEmailToHtml,
  personalizeEmailText,
  resolveEmailContext,
} from "@/lib/emailPersonalizer";

export interface CSVRow {
  company: string;
  email: string;
  position: string;
  name: string;
  status?: "pending" | "sending" | "success" | "error";
  error?: string;
  message?: string;
  subject?: string;
  cvId?: string;
  cvFileName?: string;
  coverLetterAttached?: boolean;
  sentAt?: string;
  [key: string]: string | boolean | undefined;
}

export type BatchStatus = "idle" | "running" | "paused" | "completed";

interface StoredBulkState {
  data: CSVRow[];
  fileName: string;
  selectedRowIndices: number[];
  selectedTemplateId: string | null;
  selectedCvId?: string | null;
  includeCoverLetter?: boolean;
  bulkChannel?: "draft" | "direct";
  antiSpamDelaySeconds?: number;
  batchStatus?: BatchStatus;
  pausedAt?: string | null;
  defaultPosition: string;
  defaultContactName: string;
  inputMode: "file" | "paste";
  pastedText: string;
  currentPage: number;
  progress: { current: number; total: number };
}

interface BulkUploadContextType {
  data: CSVRow[];
  setData: React.Dispatch<React.SetStateAction<CSVRow[]>>;
  fileName: string;
  setFileName: (name: string) => void;
  selectedRows: Set<number>;
  setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
  toggleRow: (index: number) => void;
  selectAll: (selectableIndexes: number[]) => void;
  deselectAll: () => void;
  selectedTemplateId: string | null;
  setSelectedTemplateId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCvId: string | null;
  setSelectedCvId: React.Dispatch<React.SetStateAction<string | null>>;
  updateRowCv: (rowIndex: number, cvId: string, cvFileName?: string) => void;
  includeCoverLetter: boolean;
  setIncludeCoverLetter: (value: boolean) => void;
  defaultPosition: string;
  setDefaultPosition: (pos: string) => void;
  defaultContactName: string;
  setDefaultContactName: (name: string) => void;
  inputMode: "file" | "paste";
  setInputMode: (mode: "file" | "paste") => void;
  pastedText: string;
  setPastedText: (text: string) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  isProcessing: boolean;
  batchStatus: BatchStatus;
  pausedAt: string | null;
  antiSpamDelaySeconds: number;
  setAntiSpamDelaySeconds: (sec: number) => void;
  cooldownRemaining: number;
  dailySentCount: number;
  progress: { current: number; total: number };
  setProgress: React.Dispatch<React.SetStateAction<{ current: number; total: number }>>;
  bulkChannel: "draft" | "direct";
  setBulkChannel: (channel: "draft" | "direct") => void;
  startBatchProcess: (activeTemplate: MessageTemplate, options?: { includeCoverLetter?: boolean }) => Promise<void>;
  pauseBatchProcess: () => void;
  cancelBatchProcess: () => void;
  resetBatchSession: () => void;
  clearBatch: () => void;
}

const BULK_STORAGE_KEY = "mailpilot_bulk_upload_state_v1";
const DAILY_SENT_STORAGE_KEY = "mailpilot_daily_sent_count_v1";

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readDailySentCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(DAILY_SENT_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: string; count?: number };
    if (parsed.date === getTodayDateKey() && typeof parsed.count === "number") {
      return parsed.count;
    }
    return 0;
  } catch {
    return 0;
  }
}

function incrementDailySentCount(): number {
  const nextCount = readDailySentCount() + 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        DAILY_SENT_STORAGE_KEY,
        JSON.stringify({ date: getTodayDateKey(), count: nextCount })
      );
    } catch {}
  }
  return nextCount;
}

const BulkUploadContext = createContext<BulkUploadContextType | null>(null);

export function BulkUploadProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState("routepilot_batch_template.csv");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(false);
  const [defaultPosition, setDefaultPosition] = useState("Stage PFE / Emploi");
  const [defaultContactName, setDefaultContactName] = useState("Hiring Manager");
  const [bulkChannel, setBulkChannel] = useState<"draft" | "direct">("direct");
  const [antiSpamDelaySeconds, setAntiSpamDelaySeconds] = useState<number>(25);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>("idle");
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailySentCount, setDailySentCount] = useState<number>(0);
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const cancelRequestedRef = useRef(false);
  const isHydratedRef = useRef(false);
  const includeCoverLetterRef = useRef(includeCoverLetter);
  const bulkChannelRef = useRef(bulkChannel);
  const antiSpamDelayRef = useRef(antiSpamDelaySeconds);

  useEffect(() => {
    includeCoverLetterRef.current = includeCoverLetter;
  }, [includeCoverLetter]);

  useEffect(() => {
    bulkChannelRef.current = bulkChannel;
  }, [bulkChannel]);

  useEffect(() => {
    antiSpamDelayRef.current = antiSpamDelaySeconds;
  }, [antiSpamDelaySeconds]);

  // 1. Initial Load from LocalStorage (supports pause/refresh/next-day resume seamlessly)
  useEffect(() => {
    setDailySentCount(readDailySentCount());

    try {
      const stored = window.localStorage.getItem(BULK_STORAGE_KEY);
      if (stored) {
        const parsed: StoredBulkState = JSON.parse(stored);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          // Recover any row stuck mid-flight ("sending") when page closed or refreshed
          const recoveredRows: CSVRow[] = parsed.data.map((r) =>
            r.status === "sending" ? { ...r, status: "pending", error: undefined } : r
          );

          setData(recoveredRows);
          setFileName(parsed.fileName || "bulk_contacts.csv");

          if (Array.isArray(parsed.selectedRowIndices)) {
            setSelectedRows(new Set(parsed.selectedRowIndices));
          } else {
            // Ensure remaining unsent rows are selected
            const pendingIdxs = recoveredRows
              .map((r, i) => (r.status === "pending" || r.status === "error" ? i : -1))
              .filter((i) => i !== -1);
            setSelectedRows(new Set(pendingIdxs));
          }

          if (parsed.selectedTemplateId) setSelectedTemplateId(parsed.selectedTemplateId);
          if (parsed.selectedCvId) setSelectedCvId(parsed.selectedCvId);
          if (typeof parsed.includeCoverLetter === "boolean") {
            setIncludeCoverLetter(parsed.includeCoverLetter);
            includeCoverLetterRef.current = parsed.includeCoverLetter;
          }
          if (parsed.bulkChannel === "draft" || parsed.bulkChannel === "direct") {
            setBulkChannel(parsed.bulkChannel);
            bulkChannelRef.current = parsed.bulkChannel;
          }
          if (typeof parsed.antiSpamDelaySeconds === "number" && parsed.antiSpamDelaySeconds >= 2) {
            setAntiSpamDelaySeconds(parsed.antiSpamDelaySeconds);
            antiSpamDelayRef.current = parsed.antiSpamDelaySeconds;
          }
          if (parsed.defaultPosition) setDefaultPosition(parsed.defaultPosition);
          if (parsed.defaultContactName) setDefaultContactName(parsed.defaultContactName);
          if (parsed.inputMode) setInputMode(parsed.inputMode);
          if (parsed.pastedText) setPastedText(parsed.pastedText);
          if (parsed.currentPage) setCurrentPage(parsed.currentPage);
          if (parsed.progress) setProgress(parsed.progress);

          // If batch was actively running before reload/tab close, transition cleanly to paused!
          const hasSentSome = recoveredRows.some((r) => r.status === "success");
          const hasPending = recoveredRows.some((r) => r.status === "pending" || r.status === "error");

          if (parsed.batchStatus === "running" && hasPending) {
            setBatchStatus("paused");
            setPausedAt(parsed.pausedAt || new Date().toISOString());
          } else if (parsed.batchStatus === "paused" && hasPending) {
            setBatchStatus("paused");
            setPausedAt(parsed.pausedAt || new Date().toISOString());
          } else if (hasSentSome && !hasPending) {
            setBatchStatus("completed");
            setPausedAt(null);
          } else {
            setBatchStatus(parsed.batchStatus || "idle");
            setPausedAt(parsed.pausedAt || null);
          }
        }
      }
    } catch (e) {
      console.warn("Unable to restore bulk upload state:", e);
    } finally {
      isHydratedRef.current = true;
    }
  }, []);

  // Sync selectedCvId with active CV if not set
  useEffect(() => {
    if (!selectedCvId) {
      const active = readActiveCvId();
      if (active) setSelectedCvId(active);
    }
  }, [selectedCvId]);

  // 2. Persistent Save to LocalStorage on changes
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      if (data.length === 0) {
        window.localStorage.removeItem(BULK_STORAGE_KEY);
        return;
      }
      const payload: StoredBulkState = {
        data,
        fileName,
        selectedRowIndices: Array.from(selectedRows),
        selectedTemplateId,
        selectedCvId,
        includeCoverLetter,
        bulkChannel,
        antiSpamDelaySeconds,
        batchStatus,
        pausedAt,
        defaultPosition,
        defaultContactName,
        inputMode,
        pastedText,
        currentPage,
        progress,
      };
      window.localStorage.setItem(BULK_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("Unable to persist bulk upload state:", e);
    }
  }, [
    data,
    fileName,
    selectedRows,
    selectedTemplateId,
    selectedCvId,
    includeCoverLetter,
    bulkChannel,
    antiSpamDelaySeconds,
    batchStatus,
    pausedAt,
    defaultPosition,
    defaultContactName,
    inputMode,
    pastedText,
    currentPage,
    progress,
  ]);

  const updateRowCv = useCallback(
    (rowIndex: number, cvId: string, cvFileName?: string) => {
      setData((prev) => {
        const next = [...prev];
        if (next[rowIndex]) {
          next[rowIndex] = {
            ...next[rowIndex],
            cvId,
            ...(cvFileName ? { cvFileName } : {}),
          };
        }
        return next;
      });
    },
    []
  );

  const toggleRow = useCallback(
    (index: number) => {
      if (isProcessing) return;
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [isProcessing]
  );

  const selectAll = useCallback(
    (selectableIndexes: number[]) => {
      if (isProcessing) return;
      setSelectedRows(new Set(selectableIndexes));
    },
    [isProcessing]
  );

  const deselectAll = useCallback(() => {
    if (isProcessing) return;
    setSelectedRows(new Set());
  }, [isProcessing]);

  const resetBatchSession = useCallback(() => {
    cancelRequestedRef.current = true;
    setIsProcessing(false);
    setCooldownRemaining(0);
    setBatchStatus("idle");
    setPausedAt(null);
  }, []);

  const clearBatch = useCallback(() => {
    if (isProcessing) {
      cancelRequestedRef.current = true;
    }
    setData([]);
    setFileName("routepilot_batch_template.csv");
    setSelectedRows(new Set());
    setProgress({ current: 0, total: 0 });
    setPastedText("");
    setCurrentPage(1);
    setIsProcessing(false);
    setCooldownRemaining(0);
    setBatchStatus("idle");
    setPausedAt(null);
    try {
      window.localStorage.removeItem(BULK_STORAGE_KEY);
    } catch {}
    toast.info("Batch réinitialisé.");
  }, [isProcessing]);

  const pauseBatchProcess = useCallback(() => {
    if (!isProcessing) return;
    cancelRequestedRef.current = true;
    setCooldownRemaining(0);
    setBatchStatus("paused");
    setPausedAt(new Date().toISOString());
    toast.info("Mise en pause de l'envoi...");
  }, [isProcessing]);

  const cancelBatchProcess = useCallback(() => {
    pauseBatchProcess();
  }, [pauseBatchProcess]);

  const startBatchProcess = useCallback(
    async (
      activeTemplate: MessageTemplate,
      options?: { includeCoverLetter?: boolean }
    ) => {
      const nextData = [...data];
      const allSelected = Array.from(selectedRows).sort((a, b) => a - b);

      // Only dispatch rows not yet sent ("pending" or "error"); automatically skip already-sent rows
      const todoIndexes = allSelected.filter((idx) => nextData[idx] && nextData[idx].status !== "success");

      if (todoIndexes.length === 0) {
        if (allSelected.length > 0 && nextData.some((r) => r.status === "success")) {
          setBatchStatus("completed");
          setPausedAt(null);
          toast.info("Toutes les lignes sélectionnées ont déjà été envoyées.");
        } else {
          toast.error("Veuillez sélectionner au moins une ligne à traiter.");
        }
        return;
      }

      const alreadySentCount = nextData.filter((r) => r.status === "success").length;
      const overallTotal = alreadySentCount + todoIndexes.length;

      cancelRequestedRef.current = false;
      setIsProcessing(true);
      setBatchStatus("running");
      setPausedAt(null);
      setCooldownRemaining(0);

      const savedName = readCandidateName();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const emailValidationCache = new Map<string, EmailPreflightResult>();
      const withdrawnSet = await getWithdrawnEmails();
      const activeChannel = bulkChannelRef.current;

      let successCount = 0;
      let failCount = 0;
      let wasPaused = false;

      setProgress({ current: alreadySentCount, total: overallTotal });

      for (let step = 0; step < todoIndexes.length; step += 1) {
        if (cancelRequestedRef.current) {
          wasPaused = true;
          break;
        }

        const index = todoIndexes[step];
        nextData[index] = { ...nextData[index], status: "sending", error: undefined };
        setData([...nextData]);
        setProgress({ current: alreadySentCount + step + 1, total: overallTotal });

        try {
          const row = nextData[index];
          const emailKey = (row.email || "").toLowerCase();

          if (withdrawnSet.has(emailKey)) {
            nextData[index] = {
              ...nextData[index],
              status: "error",
              error: "Email retiré / non délivré dans l'historique (envoi bloqué pour éviter un bounce).",
            };
            failCount += 1;
            setData([...nextData]);
            continue;
          }

          const formatResult = validateEmailFormat(emailKey);
          if (!formatResult.valid) {
            nextData[index] = {
              ...nextData[index],
              status: "error",
              error: formatResult.message,
            };
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
            nextData[index] = {
              ...nextData[index],
              status: "error",
              error: emailResult.message,
            };
            failCount += 1;
            setData([...nextData]);
            continue;
          }

          const isEnglishTpl = activeTemplate.id.includes("_en");
          const rowCtx = resolveEmailContext(
            {
              email: row.email,
              company: row.company,
              contactName: row.name || defaultContactName,
              position: row.position || defaultPosition,
              candidateName: savedName,
              isEnglish: isEnglishTpl,
            },
            activeTemplate.message
          );

          const plainMessage = personalizeEmailText(activeTemplate.message, {
            email: row.email,
            company: rowCtx.companyName,
            contactName: rowCtx.firstName,
            position: row.position || defaultPosition,
            candidateName: savedName,
            isEnglish: rowCtx.isEnglish,
            boldCompany: true,
            extraFields: row as unknown as Record<string, unknown>,
          });
          const processedMessage = formatEmailToHtml(plainMessage);
          const processedSubject = personalizeEmailText(activeTemplate.subject, {
            email: row.email,
            company: rowCtx.companyName,
            contactName: rowCtx.firstName,
            position: row.position || defaultPosition,
            candidateName: savedName,
            isEnglish: rowCtx.isEnglish,
            stripFormatting: true,
            extraFields: row as unknown as Record<string, unknown>,
          });

          // Resolve CV for this row: row-specific CV -> batch default CV -> active CV -> legacy fallback
          const cvLibrary = readStoredCvLibrary();
          const effectiveCvId = row.cvId || selectedCvId;
          const matchedCv = effectiveCvId ? cvLibrary.find((c) => c.id === effectiveCvId) : null;
          const activeCv = getActiveCv();
          const legacyCv = readStoredCv();

          const finalCvBase64 = matchedCv?.base64 || activeCv?.base64 || legacyCv.base64;
          const finalCvFileName =
            matchedCv?.fileName ||
            activeCv?.fileName ||
            legacyCv.fileName ||
            `${savedName.replace(/\s+/g, "_")}_Resume.pdf`;

          let finalCoverLetterBase64: string | undefined = undefined;
          let finalCoverLetterFileName: string | undefined = undefined;

          const shouldAttachCoverLetter =
            options?.includeCoverLetter !== undefined
              ? options.includeCoverLetter
              : (includeCoverLetterRef.current || includeCoverLetter);

          if (shouldAttachCoverLetter) {
            try {
              const letterPdf = generateCoverLetterPdf({
                company: rowCtx.companyName || "Recruteur",
                position: row.position || defaultPosition,
                contactName: rowCtx.firstName || undefined,
                body: plainMessage,
                subject: processedSubject,
              });
              finalCoverLetterBase64 = letterPdf.getBase64();
              finalCoverLetterFileName = letterPdf.fileName;
              console.log(
                `[MailPilot] Cover letter generated for ${rowCtx.companyName || "Recruteur"}: ${finalCoverLetterFileName} (${finalCoverLetterBase64.length} chars)`
              );
            } catch (err) {
              console.warn("Cover letter PDF generation warning:", err);
            }
          }

          if (activeChannel === "direct") {
            await sendDirectApplication({
              ...row,
              message: processedMessage,
              subject: processedSubject,
              cv_base64: finalCvBase64,
              cv_filename: finalCvFileName,
              cv_data: finalCvBase64,
              cv_name: finalCvFileName,
              cover_letter_base64: finalCoverLetterBase64,
              cover_letter_filename: finalCoverLetterFileName,
            });
            setDailySentCount(incrementDailySentCount());
          } else {
            await sendApplication({
              ...row,
              message: processedMessage,
              subject: processedSubject,
              cv_base64: finalCvBase64,
              cv_filename: finalCvFileName,
              cv_data: finalCvBase64,
              cv_name: finalCvFileName,
              cover_letter_base64: finalCoverLetterBase64,
              cover_letter_filename: finalCoverLetterFileName,
            });
          }

          if (user) {
            const compToSave = rowCtx.companyName || null;
            await supabase.from("applications").insert([
              {
                user_id: user.id,
                company: compToSave,
                position: row.position || null,
                email: row.email,
                status: "success",
              },
            ]);

            // Sync with Tracker
            try {
              await syncEmailDispatchToTracker({
                company: compToSave,
                position: row.position,
                email: row.email,
                status: "success",
              });
            } catch (syncErr) {
              console.warn("Bulk tracker sync failed:", syncErr);
            }
          }

          nextData[index] = {
            ...nextData[index],
            status: "success",
            error: undefined,
            sentAt: new Date().toISOString(),
            coverLetterAttached: !!finalCoverLetterBase64,
          };
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

        // Persist updated row & keep ONLY unfinished rows selected continuously (safe against sudden refresh/close)
        setData([...nextData]);
        const liveRemaining = new Set<number>();
        for (const idx of allSelected) {
          if (nextData[idx] && nextData[idx].status !== "success") {
            liveRemaining.add(idx);
          }
        }
        setSelectedRows(liveRemaining);

        // Anti-spam randomized human-like cooldown before next email (interruptible every 500ms!)
        if (step < todoIndexes.length - 1) {
          if (cancelRequestedRef.current) {
            wasPaused = true;
            break;
          }

          const baseSeconds = activeChannel === "direct" ? antiSpamDelayRef.current : 2;
          // Apply +/- 20% natural jitter for direct SMTP so intervals never look robotic
          const jitterFactor = activeChannel === "direct" ? 0.8 + Math.random() * 0.4 : 1;
          const waitSeconds = Math.max(2, Math.round(baseSeconds * jitterFactor));

          setCooldownRemaining(waitSeconds);
          const deadline = Date.now() + waitSeconds * 1000;

          while (Date.now() < deadline) {
            if (cancelRequestedRef.current) {
              wasPaused = true;
              break;
            }
            const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setCooldownRemaining(remaining);
            await delay(500);
          }
          setCooldownRemaining(0);

          if (wasPaused || cancelRequestedRef.current) {
            wasPaused = true;
            break;
          }
        }
      }

      // Final selection cleanup: keep only remaining pending or error rows
      const remainingSelection = new Set<number>();
      nextData.forEach((row, index) => {
        if (row.status === "pending" || row.status === "error") {
          remainingSelection.add(index);
        }
      });

      setSelectedRows(remainingSelection);
      setIsProcessing(false);
      setCooldownRemaining(0);

      const remainingPendingCount = nextData.filter(
        (r) => r.status === "pending" || r.status === "error"
      ).length;

      if (wasPaused || cancelRequestedRef.current) {
        const nowIso = new Date().toISOString();
        setBatchStatus("paused");
        setPausedAt(nowIso);
        toast.info(
          `⏸️ Envoi mis en pause (${alreadySentCount + successCount} envoyé(s), ${remainingPendingCount} restant(s)). Vous pouvez actualiser ou reprendre plus tard !`
        );
      } else {
        setBatchStatus(remainingPendingCount === 0 ? "completed" : "idle");
        setPausedAt(null);

        if (failCount > 0 && successCount === 0) {
          toast.error(`Traitement terminé : les ${failCount} envois ont échoué.`);
        } else if (failCount > 0) {
          toast.warning(
            activeChannel === "direct"
              ? `Envoi terminé : ${successCount} envoyés directement, ${failCount} en échec.`
              : `Traitement terminé : ${successCount} brouillons créés, ${failCount} en échec.`
          );
        } else if (successCount > 0) {
          toast.success(
            activeChannel === "direct"
              ? `Envoi terminé : ${successCount} candidature${successCount > 1 ? "s" : ""} envoyée${successCount > 1 ? "s" : ""} sans spam !`
              : `Traitement terminé : ${successCount} brouillons créés dans Gmail !`
          );
        }
      }

      if (successCount > 0) {
        void syncAllHistoryApplications()
          .then((res) => {
            if (res.applicationsCreated > 0 || res.companiesCreated > 0) {
              toast.success(
                `Tracker synchronisé : ${res.companiesCreated} entreprise(s) et ${res.contactsCreated} contact(s) liés.`
              );
            }
          })
          .catch((err) => console.warn("Background auto-sync failed:", err));
      }
    },
    [
      data,
      selectedRows,
      selectedCvId,
      includeCoverLetter,
      defaultPosition,
      defaultContactName,
      bulkChannel,
      antiSpamDelaySeconds,
    ]
  );

  return (
    <BulkUploadContext.Provider
      value={{
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
        selectedCvId,
        setSelectedCvId,
        updateRowCv,
        includeCoverLetter,
        setIncludeCoverLetter,
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
        batchStatus,
        pausedAt,
        antiSpamDelaySeconds,
        setAntiSpamDelaySeconds,
        cooldownRemaining,
        dailySentCount,
        progress,
        setProgress,
        bulkChannel,
        setBulkChannel,
        startBatchProcess,
        pauseBatchProcess,
        cancelBatchProcess,
        resetBatchSession,
        clearBatch,
      }}
    >
      {children}
    </BulkUploadContext.Provider>
  );
}

export function useBulkUpload() {
  const context = useContext(BulkUploadContext);
  if (!context) {
    throw new Error("useBulkUpload must be used within a BulkUploadProvider");
  }
  return context;
}
