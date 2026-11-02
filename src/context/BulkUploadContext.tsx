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
  [key: string]: string | boolean | undefined;
}

interface StoredBulkState {
  data: CSVRow[];
  fileName: string;
  selectedRowIndices: number[];
  selectedTemplateId: string | null;
  selectedCvId?: string | null;
  includeCoverLetter?: boolean;
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
  progress: { current: number; total: number };
  setProgress: React.Dispatch<React.SetStateAction<{ current: number; total: number }>>;
  startBatchProcess: (activeTemplate: MessageTemplate, options?: { includeCoverLetter?: boolean }) => Promise<void>;
  cancelBatchProcess: () => void;
  clearBatch: () => void;
}

const BULK_STORAGE_KEY = "mailpilot_bulk_upload_state_v1";

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
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const cancelRequestedRef = useRef(false);
  const isHydratedRef = useRef(false);
  const includeCoverLetterRef = useRef(includeCoverLetter);

  useEffect(() => {
    includeCoverLetterRef.current = includeCoverLetter;
  }, [includeCoverLetter]);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BULK_STORAGE_KEY);
      if (stored) {
        const parsed: StoredBulkState = JSON.parse(stored);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          setData(parsed.data);
          setFileName(parsed.fileName || "bulk_contacts.csv");
          if (Array.isArray(parsed.selectedRowIndices)) {
            setSelectedRows(new Set(parsed.selectedRowIndices));
          }
          if (parsed.selectedTemplateId) setSelectedTemplateId(parsed.selectedTemplateId);
          if (parsed.selectedCvId) setSelectedCvId(parsed.selectedCvId);
          if (typeof parsed.includeCoverLetter === "boolean") {
            setIncludeCoverLetter(parsed.includeCoverLetter);
            includeCoverLetterRef.current = parsed.includeCoverLetter;
          }
          if (parsed.defaultPosition) setDefaultPosition(parsed.defaultPosition);
          if (parsed.defaultContactName) setDefaultContactName(parsed.defaultContactName);
          if (parsed.inputMode) setInputMode(parsed.inputMode);
          if (parsed.pastedText) setPastedText(parsed.pastedText);
          if (parsed.currentPage) setCurrentPage(parsed.currentPage);
          if (parsed.progress) setProgress(parsed.progress);
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
    try {
      window.localStorage.removeItem(BULK_STORAGE_KEY);
    } catch {}
    toast.info("Batch réinitialisé.");
  }, [isProcessing]);

  const cancelBatchProcess = useCallback(() => {
    if (!isProcessing) return;
    cancelRequestedRef.current = true;
    toast.warning("Interruption de l'envoi demandée...");
  }, [isProcessing]);

  const startBatchProcess = useCallback(
    async (
      activeTemplate: MessageTemplate,
      options?: { includeCoverLetter?: boolean }
    ) => {
      const selectedIndexes = Array.from(selectedRows).sort((a, b) => a - b);
      if (selectedIndexes.length === 0) {
        toast.error("Veuillez sélectionner au moins une ligne à traiter.");
        return;
      }

      cancelRequestedRef.current = false;
      setIsProcessing(true);

      const savedName = readCandidateName();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const emailValidationCache = new Map<string, EmailPreflightResult>();
      const withdrawnSet = await getWithdrawnEmails();

      let successCount = 0;
      let failCount = 0;
      const nextData = [...data];

      setProgress({ current: 0, total: selectedIndexes.length });

      for (let step = 0; step < selectedIndexes.length; step += 1) {
        if (cancelRequestedRef.current) {
          toast.warning(`File d'attente interrompue à l'étape ${step}/${selectedIndexes.length}.`);
          break;
        }

        const index = selectedIndexes[step];
        nextData[index] = { ...nextData[index], status: "sending", error: undefined };
        setData([...nextData]);
        setProgress({ current: step + 1, total: selectedIndexes.length });

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

          const replace = (text: string) => {
            let processedText = text;
            Object.keys(row).forEach((key) => {
              const val = row[key as keyof CSVRow];
              if (typeof val === "string") {
                const regex = new RegExp(`\\[${key}\\]`, "gi");
                processedText = processedText.replace(regex, val);
              }
            });
            return processedText.replace(/\[MyName\]/gi, savedName);
          };

          const processedMessage = replace(activeTemplate.message).replace(/\n/g, "<br>");
          const processedSubject = replace(activeTemplate.subject);

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
                company: row.company || "L'Entreprise",
                position: row.position || defaultPosition,
                contactName: row.name || defaultContactName,
                body: activeTemplate.message,
                subject: activeTemplate.subject,
              });
              finalCoverLetterBase64 = letterPdf.getBase64();
              finalCoverLetterFileName = letterPdf.fileName;
              console.log(
                `[MailPilot] Cover letter generated for ${row.company || "Company"}: ${finalCoverLetterFileName} (${finalCoverLetterBase64.length} chars)`
              );
            } catch (err) {
              console.warn("Cover letter PDF generation warning:", err);
            }
          }

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

          if (user) {
            const compToSave = row.company || inferCompanyFromEmail(row.email)?.name || null;
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

        setData([...nextData]);

        if (step < selectedIndexes.length - 1 && !cancelRequestedRef.current) {
          await delay(2000);
        }
      }

      // Remaining selection: keep rows that are still pending or in error
      const remainingSelection = new Set<number>();
      nextData.forEach((row, index) => {
        if (row.status === "pending" || row.status === "error") {
          remainingSelection.add(index);
        }
      });

      setSelectedRows(remainingSelection);
      setIsProcessing(false);

      if (failCount > 0 && successCount === 0) {
        toast.error(`Traitement terminé : les ${failCount} envois ont échoué.`);
      } else if (failCount > 0) {
        toast.warning(
          `Traitement terminé : ${successCount} brouillons créés, ${failCount} en échec.`
        );
      } else if (successCount > 0) {
        toast.success(`Traitement terminé : ${successCount} brouillons créés dans Gmail !`);
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
        progress,
        setProgress,
        startBatchProcess,
        cancelBatchProcess,
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
