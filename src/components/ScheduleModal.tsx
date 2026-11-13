"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Send,
  Sparkles,
  Sun,
  Sunrise,
  X,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { scheduleEmail, scheduleBulkEmails, type ScheduledEmail } from "@/lib/schedulerService";

interface ScheduleModalSingleProps {
  mode: "single";
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (scheduled: ScheduledEmail) => void;
  emailData: {
    recipient_email: string;
    company_name: string;
    position: string;
    candidate_name: string;
    subject: string;
    message: string;
    cv_id?: string;
    cv_filename?: string;
    cv_base64?: string;
    has_cover_letter?: boolean;
    cover_letter_filename?: string;
    cover_letter_base64?: string;
    channel: "direct" | "draft";
  };
}

interface ScheduleModalBulkProps {
  mode: "bulk";
  isOpen: boolean;
  onClose: () => void;
  onScheduledBulk?: (scheduledList: ScheduledEmail[]) => void;
  batchData: {
    batch_name: string;
    channel: "direct" | "draft";
    rows: Array<{
      email: string;
      company: string;
      position: string;
      name: string;
      subject: string;
      message: string;
      cv_id?: string;
      cv_filename?: string;
      cv_base64?: string;
      has_cover_letter?: boolean;
      cover_letter_filename?: string;
      cover_letter_base64?: string;
    }>;
  };
}

export type ScheduleModalProps = ScheduleModalSingleProps | ScheduleModalBulkProps;

export default function ScheduleModal(props: ScheduleModalProps) {
  const { mode, isOpen, onClose } = props;

  // Helpers to calculate preset dates
  const presets = useMemo(() => {
    const now = new Date();

    // 1. Tomorrow morning 08:30
    const tomorrowMorning = new Date(now);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(8, 30, 0, 0);

    // 2. Tomorrow afternoon 14:00
    const tomorrowAfternoon = new Date(now);
    tomorrowAfternoon.setDate(tomorrowAfternoon.getDate() + 1);
    tomorrowAfternoon.setHours(14, 0, 0, 0);

    // 3. Next Monday 09:00
    const nextMonday = new Date(now);
    const dayOfWeek = nextMonday.getDay();
    const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    return {
      tomorrowMorning,
      tomorrowAfternoon,
      nextMonday,
    };
  }, []);

  // Format datetime-local string
  const toLocalIso = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [selectedPreset, setSelectedPreset] = useState<"tomorrow_am" | "tomorrow_pm" | "monday" | "custom">("tomorrow_am");
  const [customDateTime, setCustomDateTime] = useState<string>(() => toLocalIso(presets.tomorrowMorning));
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60); // for bulk
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetDate = useMemo(() => {
    if (selectedPreset === "tomorrow_am") return presets.tomorrowMorning;
    if (selectedPreset === "tomorrow_pm") return presets.tomorrowAfternoon;
    if (selectedPreset === "monday") return presets.nextMonday;
    return new Date(customDateTime);
  }, [selectedPreset, customDateTime, presets]);

  if (!isOpen) return null;

  const hasValidDate = !isNaN(targetDate.getTime());
  const isValidDate = hasValidDate && targetDate.getTime() > Date.now();

  const handleConfirm = () => {
    if (!isValidDate) {
      toast.error("Veuillez sélectionner une date et heure dans le futur.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "single") {
        const item = scheduleEmail({
          recipient_email: props.emailData.recipient_email,
          company_name: props.emailData.company_name,
          position: props.emailData.position,
          candidate_name: props.emailData.candidate_name,
          subject: props.emailData.subject,
          message: props.emailData.message,
          cv_id: props.emailData.cv_id,
          cv_filename: props.emailData.cv_filename,
          cv_base64: props.emailData.cv_base64,
          has_cover_letter: props.emailData.has_cover_letter || !!props.emailData.cover_letter_base64,
          cover_letter_filename: props.emailData.cover_letter_filename,
          cover_letter_base64: props.emailData.cover_letter_base64,
          channel: props.emailData.channel,
          scheduled_at: targetDate.toISOString(),
        });

        toast.success(
          `Candidature pour ${item.company_name} programmée pour le ${targetDate.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })} à ${targetDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} !`
        );

        if (props.onScheduled) props.onScheduled(item);
      } else {
        // Bulk mode: space each email by intervalSeconds
        const rows = props.batchData?.rows ?? [];
        const itemsToSchedule = rows.map((row, idx) => {
          const emailTime = new Date(targetDate.getTime() + idx * intervalSeconds * 1000);
          return {
            recipient_email: row.email,
            company_name: row.company,
            position: row.position,
            candidate_name: row.name,
            subject: row.subject,
            message: row.message,
            cv_id: row.cv_id,
            cv_filename: row.cv_filename,
            cv_base64: row.cv_base64,
            has_cover_letter: row.has_cover_letter || !!row.cover_letter_base64,
            cover_letter_filename: row.cover_letter_filename,
            cover_letter_base64: row.cover_letter_base64,
            channel: props.batchData.channel,
            batch_name: props.batchData.batch_name,
            scheduled_at: emailTime.toISOString(),
          };
        });

        const created = scheduleBulkEmails(itemsToSchedule);

        toast.success(
          `Lot de ${created.length} candidatures programmé avec succès ! Premier envoi prévu le ${targetDate.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          })} à ${targetDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`
        );

        if (props.onScheduledBulk) props.onScheduledBulk(created);
      }

      onClose();
    } catch {
      toast.error("Erreur lors de la programmation de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = mode === "bulk" ? (props.batchData?.rows?.length ?? 0) : 1;
  const lastDate = mode === "bulk" && count > 1 && hasValidDate
    ? new Date(targetDate.getTime() + (count - 1) * intervalSeconds * 1000)
    : targetDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50/70 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {mode === "single"
                  ? "Programmer l'Envoi Direct"
                  : `Programmer le Lot (${count} candidatures)`}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                L&apos;email sera expédié à l&apos;heure choisie via Gmail SMTP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-2">
              Horaires recommandés (Taux d&apos;ouverture maximal)
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* Preset 1: Demain matin */}
              <button
                type="button"
                onClick={() => setSelectedPreset("tomorrow_am")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                  selectedPreset === "tomorrow_am"
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-1 text-blue-600 mb-1">
                  <Sunrise className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Matin</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">08h30</p>
                <span className="text-[10px] sm:text-[10.5px] text-gray-500 truncate">
                  {presets.tomorrowMorning.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                </span>
              </button>

              {/* Preset 2: Demain après-midi */}
              <button
                type="button"
                onClick={() => setSelectedPreset("tomorrow_pm")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                  selectedPreset === "tomorrow_pm"
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-1 text-amber-600 mb-1">
                  <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Après-midi</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">14h00</p>
                <span className="text-[10px] sm:text-[10.5px] text-gray-500 truncate">
                  {presets.tomorrowAfternoon.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
                </span>
              </button>

              {/* Preset 3: Lundi matin */}
              <button
                type="button"
                onClick={() => setSelectedPreset("monday")}
                className={cn(
                  "p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                  selectedPreset === "monday"
                    ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-1 text-purple-600 mb-1">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">Lundi pro.</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">09h00</p>
                <span className="text-[10px] sm:text-[10.5px] text-gray-500 truncate">
                  {presets.nextMonday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </button>
            </div>
          </div>

          {/* Custom Date & Time Picker */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Ou choisir une date et heure personnalisées :
              </label>
              {selectedPreset === "custom" && (
                <span className="text-[11px] font-medium text-blue-600">Personnalisé ✓</span>
              )}
            </div>
            <div className="relative">
              <input
                type="datetime-local"
                min={toLocalIso(new Date())}
                value={customDateTime}
                onChange={(e) => {
                  setCustomDateTime(e.target.value);
                  setSelectedPreset("custom");
                }}
                className={cn(
                  "w-full rounded-xl border p-2.5 text-xs font-medium outline-none transition cursor-pointer",
                  selectedPreset === "custom"
                    ? "border-blue-500 bg-blue-50/30"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              />
            </div>
          </div>

          {/* Bulk Spacing Option */}
          {mode === "bulk" && count > 1 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  Cadence d&apos;envoi anti-spam
                </span>
                <span className="text-[11px] text-gray-500">Délai entre chaque mail</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "30 secondes", val: 30 },
                  { label: "60 s (Idéal)", val: 60 },
                  { label: "2 minutes", val: 120 },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setIntervalSeconds(opt.val)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-xs font-medium transition cursor-pointer text-center",
                      intervalSeconds === opt.val
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-300 font-bold"
                        : "bg-gray-100/80 text-gray-600 hover:bg-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-950 flex items-start gap-2.5">
            <Send className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <p className="font-semibold text-blue-900">
                {mode === "single" ? (
                  hasValidDate ? (
                    <>
                      Envoi prévu le{" "}
                      <strong>
                        {targetDate.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </strong>{" "}
                      à{" "}
                      <strong>
                        {targetDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </strong>
                    </>
                  ) : (
                    <>Veuillez sélectionner un horaire valide.</>
                  )
                ) : (
                  hasValidDate ? (
                    <>
                      {count} candidatures programmées du{" "}
                      <strong>{targetDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong> au{" "}
                      <strong>{lastDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong> ({targetDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}).
                    </>
                  ) : (
                    <>Veuillez sélectionner un horaire valide.</>
                  )
                )}
              </p>
              <p className="text-[11px] text-blue-700">
                L&apos;email sera conservé dans votre file d&apos;attente et expédié automatiquement sans action supplémentaire.
              </p>
            </div>
          </div>

          {!isValidDate && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Veuillez sélectionner un horaire futur.</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4 bg-gray-50/80 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center justify-center"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValidDate || isSubmitting}
            className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isSubmitting
                ? "Programmation en cours..."
                : `Confirmer la programmation (${count})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

