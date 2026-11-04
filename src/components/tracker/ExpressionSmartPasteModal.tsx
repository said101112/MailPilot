"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Copy, FileText, Folder, MessageSquare, PhoneCall, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  parseSmartPaste,
  type ExpressionFolder,
  type ExpressionItem,
} from "@/lib/tracker/expressions";
import DialogueViewer from "./DialogueViewer";
import ParagraphViewer from "./ParagraphViewer";

interface ExpressionSmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: ExpressionFolder[];
  activeFolderId: string;
  onImportItems: (items: ExpressionItem[]) => void;
}

const SAMPLE_PHONE_PASTE = `1. Quand tu décroches le téléphone
RH : Bonjour, je suis Madame X de la société [Nom de l'entreprise].
Toi : Bonjour Madame, oui, je vous écoute.
Ou plus naturellement :
Toi : Allô, bonjour !
RH : Bonjour, est-ce que je parle bien à Saïd Nichan ?
Toi : Oui, tout à fait, c'est bien moi.
RH : Vous êtes disponible pour parler quelques minutes ?
Toi : Oui, bien sûr, je suis disponible. Je vous écoute.

2. Si la RH te dit : « Je vous appelle concernant votre candidature »
RH : Je vous appelle concernant votre candidature pour le stage PFE chez nous.
Toi : Ah oui, tout à fait ! Merci de m'avoir contacté. Je suis ravi d'échanger avec vous.
RH : Vous êtes toujours à la recherche d'un stage PFE ?`;

export default function ExpressionSmartPasteModal({
  isOpen,
  onClose,
  folders,
  activeFolderId,
  onImportItems,
}: ExpressionSmartPasteModalProps) {
  const [rawText, setRawText] = useState("");
  const [targetFolderId, setTargetFolderId] = useState(activeFolderId);

  // Parse in real time
  const parsedItems = useMemo(() => {
    if (!rawText.trim()) return [];
    return parseSmartPaste(rawText, targetFolderId);
  }, [rawText, targetFolderId]);

  if (!isOpen) return null;

  const handleApplySample = () => {
    setRawText(SAMPLE_PHONE_PASTE);
    toast.info("Exemple de script téléphonique inséré !");
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) {
      toast.error("Veuillez coller du texte avant d'importer.");
      return;
    }

    onImportItems(parsedItems);
    toast.success(
      `${parsedItems.length} fiche(s) importée(s) avec succès dans le dossier sélectionné !`
    );
    setRawText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/40 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Copier-Coller Intelligent (Smart Paste)
              </h2>
              <p className="text-xs text-gray-500">
                Collez n'importe quel texte brut (dialogues RH, pitchs, notes) : l'application le formate et le structure automatiquement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Target Folder Selection */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-[#ff5722]" />
              <label htmlFor="folder-select" className="text-xs font-semibold text-gray-700">
                Dossier de destination :
              </label>
            </div>

            <select
              id="folder-select"
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-2xs focus:border-[#ff5722] focus:outline-none"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Paste Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700">
                Collez votre texte brut ici :
              </label>
              <button
                type="button"
                onClick={handleApplySample}
                className="text-[11px] font-semibold text-[#ff5722] hover:underline"
              >
                Insérer l'exemple (Script Téléphonique RH)
              </button>
            </div>

            <textarea
              rows={7}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Exemple :\n1. Quand tu décroches le téléphone\nRH : Bonjour, est-ce que je parle bien à Saïd ?\nToi : Oui, tout à fait, c'est bien moi.\nRH : Avez-vous quelques minutes ?\nToi : Oui avec plaisir, je vous écoute.`}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs sm:text-sm font-mono text-gray-800 focus:border-[#ff5722] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Live Preview Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Aperçu en Direct ({parsedItems.length} fiche{parsedItems.length > 1 ? "s" : ""} détectée{parsedItems.length > 1 ? "s" : ""})
              </h3>
              {parsedItems.length > 0 && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  Prêt à être sauvegardé
                </span>
              )}
            </div>

            {parsedItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">
                Collez un texte au format dialogue ou paragraphe ci-dessus pour visualiser la mise en page élégante.
              </div>
            ) : (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[11px] font-bold text-gray-500">
                      Fiche #{idx + 1} ({item.type === "dialogue" ? "Mode Dialogue RH" : "Mode Paragraphe"})
                    </span>
                    {item.type === "dialogue" ? (
                      <DialogueViewer item={item} isCompact />
                    ) : (
                      <ParagraphViewer item={item} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-5 py-3.5 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            {parsedItems.length > 0
              ? `${parsedItems.length} fiche(s) prête(s) à être ajoutée(s)`
              : "En attente de texte..."}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={parsedItems.length === 0}
              onClick={handleConfirmImport}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer",
                parsedItems.length === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-[#ff5722] hover:bg-[#f4511e]"
              )}
            >
              <Check className="h-4 w-4" />
              <span>Enregistrer dans le dossier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

