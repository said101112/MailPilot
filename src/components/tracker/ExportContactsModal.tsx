"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileSpreadsheet, Globe, X } from "lucide-react";
import { toast } from "sonner";
import type { ContactRow } from "@/lib/tracker/types";
import { resolveCountryCategory } from "@/lib/tracker/countries";
import { cn } from "@/lib/utils";

export type ExportScope = "filtered" | "non_saudi" | "all" | "saudi" | "morocco" | "france";
export type ExportFormat = "simple" | "full";

interface ExportContactsModalProps {
  open: boolean;
  onClose: () => void;
  contacts: ContactRow[];
  filteredContacts: ContactRow[];
  isFiltered: boolean;
}

export default function ExportContactsModal({
  open,
  onClose,
  contacts,
  filteredContacts,
  isFiltered,
}: ExportContactsModalProps) {
  const [scope, setScope] = useState<ExportScope>(isFiltered ? "filtered" : "non_saudi");
  const [format, setFormat] = useState<ExportFormat>("simple");
  const [excludeEmptyEmail, setExcludeEmptyEmail] = useState(true);

  // Compute category counts
  const counts = useMemo(() => {
    let nonSaudi = 0;
    let saudi = 0;
    let morocco = 0;
    let france = 0;

    for (const c of contacts) {
      const country = resolveCountryCategory(
        c.company?.location,
        c.email || c.company?.name
      );
      if (country === "saudi") {
        saudi++;
      } else {
        nonSaudi++;
      }
      if (country === "morocco") morocco++;
      if (country === "france") france++;
    }

    return {
      total: contacts.length,
      filtered: filteredContacts.length,
      nonSaudi,
      saudi,
      morocco,
      france,
    };
  }, [contacts, filteredContacts]);

  // Selected contacts based on scope
  const targetContacts = useMemo(() => {
    switch (scope) {
      case "filtered":
        return filteredContacts;
      case "non_saudi":
        return contacts.filter((c) => {
          const country = resolveCountryCategory(
            c.company?.location,
            c.email || c.company?.name
          );
          return country !== "saudi";
        });
      case "saudi":
        return contacts.filter((c) => {
          const country = resolveCountryCategory(
            c.company?.location,
            c.email || c.company?.name
          );
          return country === "saudi";
        });
      case "morocco":
        return contacts.filter((c) => {
          const country = resolveCountryCategory(
            c.company?.location,
            c.email || c.company?.name
          );
          return country === "morocco";
        });
      case "france":
        return contacts.filter((c) => {
          const country = resolveCountryCategory(
            c.company?.location,
            c.email || c.company?.name
          );
          return country === "france";
        });
      case "all":
      default:
        return contacts;
    }
  }, [scope, contacts, filteredContacts]);

  const exportableContacts = useMemo(() => {
    if (!excludeEmptyEmail) return targetContacts;
    return targetContacts.filter((c) => Boolean(c.email?.trim()));
  }, [targetContacts, excludeEmptyEmail]);

  // Preview snippet
  const previewLines = useMemo(() => {
    const previewHeader = format === "simple" ? "company,email" : "company,email,name,role";
    const sample = exportableContacts.slice(0, 3).map((c) => {
      const comp = c.company?.name || "Direct";
      const em = c.email || "";
      if (format === "simple") {
        return `"${comp}","${em}"`;
      }
      const nm = c.full_name || "";
      const rl = c.role || "";
      return `"${comp}","${em}","${nm}","${rl}"`;
    });
    return [previewHeader, ...sample];
  }, [exportableContacts, format]);

  const handleDownload = () => {
    if (exportableContacts.length === 0) {
      toast.error("Aucun contact à exporter pour cette sélection.");
      return;
    }

    const header = format === "simple" ? "company,email" : "company,email,name,role,location";
    const rows = exportableContacts.map((c) => {
      const comp = (c.company?.name || "Direct").replace(/"/g, '""');
      const em = (c.email || "").replace(/"/g, '""');
      if (format === "simple") {
        return `"${comp}","${em}"`;
      }
      const nm = (c.full_name || "").replace(/"/g, '""');
      const rl = (c.role || "").replace(/"/g, '""');
      const loc = (c.company?.location || "").replace(/"/g, '""');
      return `"${comp}","${em}","${nm}","${rl}","${loc}"`;
    });

    const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `mailpilot-contacts-${scope}-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${exportableContacts.length} contact(s) exporté(s) en CSV avec succès !`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center overflow-y-auto bg-[rgba(9,12,16,0.65)] sm:p-4 backdrop-blur-xs">
      <div className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-[560px] flex-col bg-white sm:rounded-2xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden mx-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5722]/10 text-[#ff5722]">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                Exporter les contacts en CSV
              </h2>
              <p className="text-[11px] text-gray-500">
                Téléchargez la liste entreprise & email prête pour vos campagnes
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Section 1: Scope */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-900 flex items-center justify-between">
              <span>1. Périmètre des contacts</span>
              <span className="text-[11px] font-normal text-gray-500">
                {exportableContacts.length} sélectionné(s)
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option: Current Filtered */}
              <button
                type="button"
                onClick={() => setScope("filtered")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  scope === "filtered"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Vue filtrée actuelle</span>
                  {scope === "filtered" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  {counts.filtered} contact(s) selon vos filtres
                </p>
              </button>

              {/* Option: All except Saudi */}
              <button
                type="button"
                onClick={() => setScope("non_saudi")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  scope === "non_saudi"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1">
                    <span>🌐</span>
                    <span>Hors Arabie Saoudite</span>
                  </span>
                  {scope === "non_saudi" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  {counts.nonSaudi} contact(s) (Maroc, France, etc.)
                </p>
              </button>

              {/* Option: Saudi only */}
              <button
                type="button"
                onClick={() => setScope("saudi")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  scope === "saudi"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1">
                    <span>🇸🇦</span>
                    <span>Arabie Saoudite uniquement</span>
                  </span>
                  {scope === "saudi" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  {counts.saudi} contact(s) en Arabie Saoudite
                </p>
              </button>

              {/* Option: All contacts */}
              <button
                type="button"
                onClick={() => setScope("all")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  scope === "all"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Tous les contacts</span>
                  {scope === "all" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  Totalité des {counts.total} contact(s)
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Format */}
          <div className="space-y-2">
            <label className="font-semibold text-gray-900 block">
              2. Colonnes du fichier CSV
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("simple")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  format === "simple"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Emails & Entreprises (Simple)</span>
                  {format === "simple" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  Colonnes : <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10.5px]">company,email</code>
                </p>
                <span className="text-[10px] text-emerald-600 font-medium">
                  ✓ Idéal pour réimporter dans Bulk Upload
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("full")}
                className={cn(
                  "p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1",
                  format === "full"
                    ? "border-[#ff5722] bg-[#fff8f5] text-gray-900 ring-1 ring-[#ff5722]"
                    : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Complet avec Nom & Fonction</span>
                  {format === "full" && <Check className="h-3.5 w-3.5 text-[#ff5722]" />}
                </div>
                <p className="text-[11px] text-gray-500">
                  Colonnes : <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10.5px]">company,email,name,role</code>
                </p>
                <span className="text-[10px] text-gray-500">
                  Pour archivage ou CRM
                </span>
              </button>
            </div>
          </div>

          {/* Filter options: exclude empty emails */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="exclude-empty"
              type="checkbox"
              checked={excludeEmptyEmail}
              onChange={(e) => setExcludeEmptyEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#ff5722] focus:ring-[#ff5722]"
            />
            <label htmlFor="exclude-empty" className="text-xs text-gray-700 cursor-pointer select-none">
              Exclure les contacts sans adresse email (recommandé pour l&apos;envoi)
            </label>
          </div>

          {/* Preview snippet */}
          <div className="space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-500 block">
              Aperçu du contenu CSV
            </span>
            <div className="font-mono text-[11px] text-gray-700 space-y-0.5 leading-relaxed overflow-x-auto whitespace-pre">
              {previewLines.map((line, idx) => (
                <div key={idx} className={idx === 0 ? "font-semibold text-gray-900" : ""}>
                  {line}
                </div>
              ))}
              {exportableContacts.length > 3 && (
                <div className="text-gray-400 italic">... ({exportableContacts.length - 3} lignes supplémentaires)</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-3.5 bg-gray-50/75">
          <button
            type="button"
            className="editorial-button-secondary h-8 px-3 text-xs"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={exportableContacts.length === 0}
            className="editorial-button-primary h-8 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger CSV ({exportableContacts.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
