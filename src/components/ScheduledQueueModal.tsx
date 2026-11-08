"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  Play,
  RotateCcw,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getScheduledEmails,
  cancelScheduledEmail,
  deleteScheduledEmail,
  sendScheduledNow,
  clearFinishedScheduledEmails,
  SCHEDULED_UPDATED_EVENT,
  type ScheduledEmail,
} from "@/lib/schedulerService";

interface ScheduledQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduledQueueModal({ isOpen, onClose }: ScheduledQueueModalProps) {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [filter, setFilter] = useState<"pending" | "sent" | "all">("pending");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const refresh = () => {
    setEmails(getScheduledEmails());
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener(SCHEDULED_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(SCHEDULED_UPDATED_EVENT, refresh);
  }, []);

  if (!isOpen) return null;

  const pendingCount = emails.filter((e) => e.status === "pending").length;
  const sentCount = emails.filter((e) => e.status === "sent").length;

  const filteredEmails = emails.filter((e) => {
    if (filter === "pending") return e.status === "pending";
    if (filter === "sent") return e.status === "sent";
    return true;
  });

  const handleSendNow = async (id: string) => {
    setLoadingId(id);
    try {
      const ok = await sendScheduledNow(id);
      if (ok) {
        toast.success("Email expédié immédiatement avec succès !");
        refresh();
      } else {
        toast.error("Impossible d'expédier cet email.");
      }
    } catch {
      toast.error("Erreur lors de l'envoi immédiat.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = (id: string) => {
    cancelScheduledEmail(id);
    toast.info("Programmation annulée.");
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteScheduledEmail(id);
    toast.info("Candidature retirée de la liste.");
    refresh();
  };

  const formatCountdown = (isoDate: string) => {
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return "Imminent (en cours d'envoi)";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Dans ${days}j ${hours % 24}h`;
    }
    if (hours > 0) return `Dans ${hours}h ${minutes}m`;
    return `Dans ${minutes} min`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                File d&apos;Attente des Emails Programmés
              </h3>
              <p className="text-xs text-gray-500">
                {pendingCount} email{pendingCount > 1 ? "s" : ""} en attente de délivrance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Bar & Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-1 rounded-xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                filter === "pending"
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              <Clock className="h-3 w-3" />
              <span>En attente ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("sent")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                filter === "sent"
                  ? "bg-white text-emerald-700 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Envoyés ({sentCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
                filter === "all"
                  ? "bg-white text-gray-900 shadow-2xs font-bold"
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              <span>Tous ({emails.length})</span>
            </button>
          </div>

          {sentCount > 0 && (
            <button
              type="button"
              onClick={() => {
                clearFinishedScheduledEmails();
                toast.info("Historique des emails envoyés nettoyé.");
                refresh();
              }}
              className="text-xs text-gray-400 hover:text-gray-700 transition cursor-pointer underline"
            >
              Nettoyer l&apos;historique envoyé
            </button>
          )}
        </div>

        {/* Content List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {filteredEmails.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
              <Clock className="h-10 w-10 text-gray-300 stroke-1" />
              <p className="text-sm font-medium text-gray-600">Aucun email dans cette catégorie</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Vous pouvez programmer des candidatures individuelles depuis &quot;Candidature Spontanée&quot; ou par lots entiers depuis &quot;Envoi Groupé&quot;.
              </p>
            </div>
          ) : (
            filteredEmails.map((item) => {
              const isPending = item.status === "pending";
              const isSent = item.status === "sent";
              const isCancelled = item.status === "cancelled";
              const isFailed = item.status === "failed";
              const dateObj = new Date(item.scheduled_at);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    isPending
                      ? "border-blue-200 bg-blue-50/20"
                      : isSent
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-gray-200 bg-gray-50/40"
                  )}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm truncate">
                        🏢 {item.company_name}
                      </span>
                      <span className="text-xs text-gray-500 font-mono truncate">
                        &lt;{item.recipient_email}&gt;
                      </span>
                      {item.batch_name && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                          Lot
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-700 font-medium truncate">
                      Objet : {item.subject}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1 font-semibold text-blue-700">
                        <Clock className="h-3 w-3" />
                        Prévu le {dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à{" "}
                        {dateObj.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {isPending && (
                          <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                            {formatCountdown(item.scheduled_at)}
                          </span>
                        )}
                      </span>

                      {item.cv_filename && (
                        <span className="flex items-center gap-1">
                          <FileCheck className="h-3 w-3 text-gray-400" />
                          {item.cv_filename}
                        </span>
                      )}

                      {item.cover_letter_filename && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-purple-500" />
                          Lettre PDF
                        </span>
                      )}
                    </div>

                    {isFailed && item.error_message && (
                      <p className="text-[11px] text-red-600">
                        Erreur : {item.error_message}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendNow(item.id)}
                          disabled={loadingId === item.id}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Expédier immédiatement via Gmail SMTP"
                        >
                          {loadingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Envoyer direct</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCancel(item.id)}
                          className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium transition cursor-pointer"
                          title="Annuler la programmation"
                        >
                          Annuler
                        </button>
                      </>
                    )}

                    {isSent && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Envoyé
                      </span>
                    )}

                    {isCancelled && (
                      <span className="text-xs text-gray-400 italic">Annulé</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/80">
          <span className="text-xs text-gray-500">
            Les envois s&apos;exécutent automatiquement via votre compte Gmail connecté (SMTP).
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

