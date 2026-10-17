"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Trash2, X } from "lucide-react";

interface CleanDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  confirmWord?: string;
  itemCount?: number;
}

export default function CleanDataModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Nettoyer toutes les données",
  description = "Cette action est irréversible. Toutes les données d'envois et de candidatures enregistrées dans Supabase seront définitivement supprimées.",
  confirmWord = "SUPPRIMER",
  itemCount,
}: CleanDataModalProps) {
  const [inputWord, setInputWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatch = inputWord.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleConfirm = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      setInputWord("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setInputWord("");
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-red-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
          disabled={isDeleting}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {typeof itemCount === "number" && (
              <p className="text-xs text-red-600 font-medium mt-0.5">
                {itemCount} enregistrement(s) concerné(s)
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-red-50/70 border border-red-100 p-3 text-xs text-red-800 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{description}</span>
        </div>

        <div className="mt-5 space-y-2">
          <label className="block text-xs font-medium text-gray-700">
            Pour confirmer, veuillez saisir le mot <span className="font-bold text-red-600 tracking-wider font-mono">{confirmWord}</span> :
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono tracking-wider placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
            placeholder={confirmWord}
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            disabled={isDeleting}
            autoFocus
          />
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Annuler
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
              isMatch && !isDeleting
                ? "bg-red-600 hover:bg-red-700 shadow-sm cursor-pointer"
                : "bg-gray-300 cursor-not-allowed opacity-60"
            }`}
            onClick={handleConfirm}
            disabled={!isMatch || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting ? "Suppression en cours..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );
}
