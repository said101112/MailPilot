"use client";

import { useState } from "react";
import { Check, FileText, Layers, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  CHECKLIST_CATEGORIES,
  type ChecklistCompany,
  type CompanyCategoryKey,
} from "@/lib/tracker/companyChecklist";

interface BulkAddCompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory: CompanyCategoryKey;
  onAddCompanies: (companies: ChecklistCompany[]) => void;
}

export default function BulkAddCompaniesModal({
  isOpen,
  onClose,
  defaultCategory,
  onAddCompanies,
}: BulkAddCompaniesModalProps) {
  const [rawText, setRawText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CompanyCategoryKey>(defaultCategory);

  if (!isOpen) return null;

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const handleImport = () => {
    if (lines.length === 0) {
      toast.error("Veuillez coller au moins un nom d'entreprise.");
      return;
    }

    const newCompanies: ChecklistCompany[] = lines.map((name, index) => {
      // Clean up bullet numbers if pasted like "1. Capgemini"
      const cleanName = name.replace(/^[0-9]+[.)-]\s*/, "").trim();

      return {
        id: `chk-bulk-${Date.now()}-${index}`,
        name: cleanName,
        category: selectedCategory,
        isDone: false,
        notes: "",
        sortOrder: index,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    onAddCompanies(newCompanies);
    toast.success(`${newCompanies.length} entreprise(s) ajoutée(s) à la checklist !`);
    setRawText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-[#ff5722]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Ajouter des entreprises en masse
              </h2>
              <p className="text-xs text-gray-500">
                Collez une liste de noms (un par ligne) depuis Excel ou vos notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700">
            Catégorie pour ces entreprises :
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CHECKLIST_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex items-center gap-1.5 rounded-xl p-2 border text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "border-[#ff5722] bg-orange-50/80 text-[#ff5722] font-bold shadow-2xs"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-gray-700">
              Noms des entreprises (1 par ligne) :
            </label>
            <span className="text-gray-400">
              {lines.length} entreprise{lines.length > 1 ? "s" : ""} détectée{lines.length > 1 ? "s" : ""}
            </span>
          </div>

          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Exemple :\nDocaposte Maroc\nCapgemini\nAlten Maroc\nOrange Business\nDevoteam`}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs sm:text-sm font-mono text-gray-800 focus:border-[#ff5722] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={handleImport}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-2xs transition cursor-pointer ${
              lines.length === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#ff5722] hover:bg-[#f4511e]"
            }`}
          >
            <Check className="h-4 w-4" />
            <span>Importer {lines.length > 0 ? `(${lines.length})` : ""}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

