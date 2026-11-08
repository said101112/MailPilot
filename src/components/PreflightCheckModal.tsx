"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Database,
  FileText,
  RefreshCw,
  Send,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { getIntegrationStatus, type IntegrationStatusResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PreflightCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus: IntegrationStatusResponse | null;
  onStatusUpdated?: (status: IntegrationStatusResponse) => void;
}

export default function PreflightCheckModal({
  isOpen,
  onClose,
  initialStatus,
  onStatusUpdated,
}: PreflightCheckModalProps) {
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(initialStatus);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const runTest = async () => {
    setIsTesting(true);
    try {
      const res = await getIntegrationStatus();
      setStatus(res);
      if (onStatusUpdated) onStatusUpdated(res);

      const smtpOk = res.smtp?.healthy === true;

      if (smtpOk) {
        toast.success("Votre compte est bien connecté ! Vous pouvez envoyer vos candidatures.");
      } else {
        toast.info("Vérification terminée. Consultez l'état ci-dessous.");
      }
    } catch {
      toast.error("Impossible de tester la connexion pour le moment.");
    } finally {
      setIsTesting(false);
    }
  };

  const smtpHealthy = status?.smtp?.healthy === true;
  const n8nHealthy =
    status?.n8n.configured &&
    status.n8n.reachable !== false &&
    status.n8n.healthy !== false;
  const supabaseHealthy = status?.supabase.configured === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                smtpHealthy
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              )}
            >
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                État de Connexion
              </h2>
              <p className="text-xs text-gray-500">
                Vérification avant envoi de vos candidatures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Verdict Banner */}
        <div className="my-4">
          {smtpHealthy ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Tout est prêt pour l&apos;envoi !
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Votre boîte email est bien connectée. Vos candidatures arriveront directement dans la boîte principale du recruteur.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 flex items-start gap-3">
              <TriangleAlert className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">
                  Connexion en attente
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  L&apos;envoi direct nécessite la connexion de votre compte email. En attendant, le mode Brouillon reste disponible.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Channels List */}
        <div className="space-y-3">
          {/* Envoi Direct */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-900">
                  Envoi Direct (Boîte Principale)
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  smtpHealthy
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                {smtpHealthy ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Connecté</span>
                  </>
                ) : (
                  <span>Non connecté</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              {smtpHealthy
                ? `Prêt à envoyer avec l'adresse ${status?.smtp?.user || ""}.`
                : "Permet d'envoyer directement les emails aux recruteurs sans passer par les spams."}
            </p>
          </div>

          {/* Mode Brouillon */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#ff5722]" />
                <span className="text-xs font-bold text-gray-900">
                  Mode Brouillon Gmail
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  n8nHealthy
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                {n8nHealthy ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Disponible</span>
                  </>
                ) : (
                  <span>En attente</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              Génère la candidature dans vos brouillons Gmail pour vous permettre de la relire avant l&apos;envoi.
            </p>
          </div>

          {/* Suivi & Tracker */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-900">
                  Tableau de bord & Suivi
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  supabaseHealthy
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                )}
              >
                {supabaseHealthy ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>Actif</span>
                  </>
                ) : (
                  <span>Erreur</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-gray-600">
              Chaque candidature envoyée est automatiquement enregistrée dans votre Tracker.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={runTest}
            disabled={isTesting}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isTesting && "animate-spin text-blue-600")} />
            <span>{isTesting ? "Test en cours..." : "Tester à nouveau"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-900 hover:bg-black text-white transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
