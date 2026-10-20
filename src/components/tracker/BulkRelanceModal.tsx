"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn, delay } from "@/lib/utils";
import { readCandidateName, readStoredCv } from "@/lib/workspace";
import { sendApplication } from "@/lib/api";
import {
  getStoredTemplates,
  DEFAULT_TEMPLATES,
  type MessageTemplate,
} from "@/lib/templates";
import {
  syncEmailDispatchToTracker,
  parseContactFromEmail,
} from "@/lib/tracker/syncService";
import { logEvent } from "@/lib/tracker/queries";
import {
  resolveCountryCategory,
  getCountryBadge,
} from "@/lib/tracker/countries";

export interface RelanceTarget {
  id?: string;
  company: string;
  position: string;
  email: string;
  name?: string;
  sentAt?: string;
  lastInteractionAt?: string;
  applicationId?: string;
}

interface BulkRelanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: RelanceTarget[];
  initialTemplateId?: string;
  onSuccess?: () => void;
}

type ExecutionStatus = "pending" | "sending" | "success" | "error";

interface TargetExecutionState extends RelanceTarget {
  status: ExecutionStatus;
  error?: string;
}

export default function BulkRelanceModal({
  isOpen,
  onClose,
  targets,
  initialTemplateId,
  onSuccess,
}: BulkRelanceModalProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [executionStates, setExecutionStates] = useState<TargetExecutionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ success: 0, failed: 0 });

  // Load templates & initialize form
  useEffect(() => {
    if (!isOpen) return;

    const stored = getStoredTemplates();
    setTemplates(stored);

    // Prefer chosen initialTemplateId or follow-up template if available
    const followUpTpl =
      (initialTemplateId && stored.find((t) => t.id === initialTemplateId)) ||
      stored.find((t) => t.id === "followup-7days") ||
      stored.find((t) => t.id.includes("followup")) ||
      stored[0] ||
      DEFAULT_TEMPLATES[0];

    setSelectedTemplateId(followUpTpl.id);
    setSubject(followUpTpl.subject);
    setMessage(followUpTpl.message);

    // Initialize execution list
    setExecutionStates(
      targets.map((t) => {
        const contactInfo = parseContactFromEmail(t.email, t.company);
        return {
          ...t,
          name: t.name || contactInfo.fullName,
          status: "pending",
        };
      })
    );
    setIsExecuting(false);
    setIsFinished(false);
    setCurrentIndex(0);
    setStats({ success: 0, failed: 0 });
    setPreviewIndex(0);
  }, [isOpen, targets, initialTemplateId]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen) {
      setSubject(chosen.subject);
      setMessage(chosen.message);
    }
  };

  const storedCv = useMemo(() => {
    if (typeof window === "undefined") return { base64: null, fileName: null };
    return readStoredCv();
  }, [isOpen]);

  const candidateName = useMemo(() => {
    if (typeof window === "undefined") return "Candidat";
    return readCandidateName() || "Candidat";
  }, [isOpen]);

  const currentPreviewTarget = executionStates[previewIndex] || executionStates[0];

  // Helper to substitute variables
  const renderTemplateText = (text: string, target?: RelanceTarget) => {
    if (!target) return text;
    const comp = target.company || "Entreprise";
    const pos = target.position || "Stage / Emploi";
    const contactName = target.name || parseContactFromEmail(target.email, comp).fullName;

    return text
      .replace(/\[Company\]/gi, comp)
      .replace(/\[Position\]/gi, pos)
      .replace(/\[Name\]/gi, contactName)
      .replace(/\[MyName\]/gi, candidateName);
  };

  // Launch Bulk Relance
  const handleStartBulk = async () => {
    if (executionStates.length === 0 || isExecuting) return;

    setIsExecuting(true);
    setIsFinished(false);
    let successCount = 0;
    let failedCount = 0;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updated = [...executionStates];

    for (let i = 0; i < updated.length; i++) {
      setCurrentIndex(i);
      updated[i] = { ...updated[i], status: "sending" };
      setExecutionStates([...updated]);

      const target = updated[i];
      const compToSave = target.company || "Entreprise";
      const posToSave = target.position || "Candidature";
      const contactInfo = parseContactFromEmail(target.email, compToSave);
      const contactName = target.name || contactInfo.fullName;

      const renderedSubj = renderTemplateText(subject, target);
      const renderedMsg = renderTemplateText(message, target).replace(/\n/g, "<br>");

      try {
        // 1. Send application via n8n / Gmail
        await sendApplication({
          company: compToSave,
          position: posToSave,
          email: target.email,
          name: contactName,
          subject: renderedSubj,
          message: renderedMsg,
          cv_base64: storedCv?.base64,
          cv_filename: storedCv?.fileName || `${candidateName.replace(/\s+/g, "_")}_CV.pdf`,
        });

        // 2. Insert into Supabase applications history
        if (user) {
          try {
            await supabase.from("applications").insert([
              {
                user_id: user.id,
                company: compToSave,
                position: `Relance · ${posToSave}`,
                email: target.email,
                status: "success",
              },
            ]);
          } catch (dbErr) {
            console.warn("Could not save history entry", dbErr);
          }
        }

        // 3. Sync with Tracker and record timeline event
        try {
          const syncRes = await syncEmailDispatchToTracker({
            company: compToSave,
            position: posToSave,
            email: target.email,
            status: "success",
          });

          if (syncRes.applicationId) {
            await logEvent({
              application_id: syncRes.applicationId,
              contact_id: syncRes.contactId,
              type: "follow_up_sent",
              channel: "email",
              summary: `Relance transmise par email à ${contactName} (${target.email})`,
            });
          }
        } catch (trackerErr) {
          console.warn("Tracker event creation failed:", trackerErr);
        }

        updated[i] = { ...updated[i], status: "success", error: undefined };
        successCount += 1;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Échec de l'envoi";
        updated[i] = { ...updated[i], status: "error", error: errorMsg };
        failedCount += 1;
      }

      setExecutionStates([...updated]);
      setStats({ success: successCount, failed: failedCount });

      // Small throttle delay between requests
      if (i < updated.length - 1) {
        await delay(1600);
      }
    }

    setIsExecuting(false);
    setIsFinished(true);

    if (failedCount === 0) {
      toast.success(`${successCount} relance(s) créée(s) avec succès dans Gmail !`);
    } else {
      toast.warning(`${successCount} relance(s) réussie(s), ${failedCount} échec(s).`);
    }

    onSuccess?.();
  };

  // Transfer to Bulk Upload page
  const handleOpenInBulkUpload = () => {
    try {
      const csvData = targets.map((t) => {
        const contactInfo = parseContactFromEmail(t.email, t.company);
        return {
          company: t.company,
          position: t.position,
          email: t.email,
          name: t.name || contactInfo.fullName,
          status: "pending",
        };
      });

      window.sessionStorage.setItem("truck_app_bulk_preload", JSON.stringify(csvData));
      window.sessionStorage.setItem("truck_app_bulk_template_id", selectedTemplateId);
      onClose();
      router.push("/upload");
    } catch {
      router.push("/upload");
    }
  };

  if (!isOpen) return null;

  const totalCount = executionStates.length;
  const progressPercent =
    totalCount > 0 ? Math.round(((currentIndex + 1) / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isExecuting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gradient-to-r from-orange-50/50 via-white to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5722]/10 text-[#ff5722]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Relance Groupée en 1 Clic
                </h2>
                <span className="rounded-full bg-[#ff5722]/10 px-2 py-0.5 text-xs font-semibold text-[#ff5722]">
                  {targets.length} email{targets.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Crée automatiquement les brouillons de relance dans Gmail avec votre CV attaché.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExecuting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Progress Banner (Visible during or after execution) */}
          {(isExecuting || isFinished) && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#ff5722]" />
                      <span>
                        Envoi en cours ({currentIndex + 1} / {totalCount})...
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">
                        Séquence de relance terminée !
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-gray-600">
                  <span className="text-emerald-600 font-semibold">
                    ✓ {stats.success} réussis
                  </span>
                  {stats.failed > 0 && (
                    <span className="text-red-600 font-semibold">
                      ✗ {stats.failed} erreurs
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isFinished && stats.failed === 0
                      ? "bg-emerald-500"
                      : "bg-[#ff5722]"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Targets Summary List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-gray-500" />
                Destinataires sélectionnés ({targets.length})
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs font-medium text-[#ff5722] hover:underline flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                {showPreview ? "Masquer l'aperçu dynamique" : "Aperçu du message"}
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
              {executionStates.map((target, idx) => {
                const countryBadge = getCountryBadge(null, target.email || target.company);

                return (
                    <div
                      key={target.email + idx}
                      onClick={() => setPreviewIndex(idx)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 text-xs transition cursor-pointer hover:bg-gray-50",
                        previewIndex === idx && "bg-orange-50/50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0 truncate flex items-center gap-1.5">
                          <span className="font-semibold text-gray-900 truncate">
                            {target.company}
                          </span>
                          {countryBadge && (
                            <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9.5px] font-semibold border shrink-0", countryBadge.badgeClass)}>
                              {countryBadge.flag} {countryBadge.name}
                            </span>
                          )}
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-600 truncate">{target.position}</span>
                          <span className="text-gray-400">·</span>
                          <span className="font-mono text-gray-500 text-[11px] truncate">
                            {target.email}
                          </span>
                        </div>
                      </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {target.status === "pending" && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                        En attente
                      </span>
                    )}
                    {target.status === "sending" && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-[#ff5722] font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Envoi...
                      </span>
                    )}
                    {target.status === "success" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Brouillon créé
                      </span>
                    )}
                    {target.status === "error" && (
                      <span
                        className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700 font-medium"
                        title={target.error}
                      >
                        Erreur
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-gray-500" />
                Modèle d&apos;email de relance
              </label>
              <span className="text-[11px] text-gray-400">
                Variables : <code className="text-[#ff5722]">[Company]</code>{" "}
                <code className="text-[#ff5722]">[Position]</code>{" "}
                <code className="text-[#ff5722]">[Name]</code>{" "}
                <code className="text-[#ff5722]">[MyName]</code>
              </span>
            </div>

            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={isExecuting}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722]"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Line */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Objet de l&apos;email
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isExecuting}
              placeholder="Ex: Relance : Candidature [Position] chez [Company]"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722]"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">
              Corps du message
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isExecuting}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 leading-relaxed outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] font-sans resize-y"
            />
          </div>

          {/* Dynamic Preview Box */}
          {showPreview && currentPreviewTarget && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-orange-900 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#ff5722]" />
                  Aperçu pour : {currentPreviewTarget.company} (
                  {currentPreviewTarget.email})
                </span>
                <span className="text-[11px] text-gray-500">
                  Candidat : {candidateName}
                </span>
              </div>
              <div className="rounded-lg border border-orange-200/60 bg-white p-3 text-xs space-y-2">
                <p className="font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  Objet : {renderTemplateText(subject, currentPreviewTarget)}
                </p>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-[11.5px]">
                  {renderTemplateText(message, currentPreviewTarget)}
                </div>
              </div>
            </div>
          )}

          {/* Attachment status */}
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/70 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-700">
                Pièce jointe :{" "}
                {storedCv?.fileName ? (
                  <span className="font-semibold text-gray-900">
                    {storedCv.fileName}
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    Aucun CV enregistré dans le profil
                  </span>
                )}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              Attaché automatiquement à chaque brouillon
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 bg-gray-50/60">
          <button
            type="button"
            onClick={handleOpenInBulkUpload}
            disabled={isExecuting}
            className="editorial-button-secondary h-9 px-3.5 text-xs w-full sm:w-auto flex items-center justify-center gap-1.5"
            title="Ouvrir cette liste dans la grille CSV du Bulk Upload Manager"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-gray-600" />
            <span>Ouvrir dans Bulk Upload</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isExecuting}
              className="editorial-button-secondary h-9 px-4 text-xs flex-1 sm:flex-initial"
            >
              {isFinished ? "Fermer" : "Annuler"}
            </button>

            {!isFinished ? (
              <button
                type="button"
                onClick={handleStartBulk}
                disabled={isExecuting || targets.length === 0}
                className="editorial-button-primary h-9 px-5 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-2 font-semibold shadow-xs"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Envoi ({currentIndex + 1}/{totalCount})...
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Lancer la Relance Groupée ({targets.length})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="editorial-button-primary h-9 px-5 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-2"
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
