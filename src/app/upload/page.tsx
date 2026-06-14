"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  MinusSquare
} from "lucide-react";
import { sendApplication } from "@/lib/api";
import { delay, cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface CSVRow {
  company: string;
  email: string;
  position: string;
  name: string;
  status?: "pending" | "sending" | "success" | "error";
  error?: string;
  message?: string;
  subject?: string;
  [key: string]: string | undefined;
}

// Maps common French/variant CSV headers to the expected field names
const COLUMN_ALIASES: Record<string, string> = {
  "société": "company",
  "societe": "company",
  "entreprise": "company",
  "company": "company",
  "email": "email",
  "e-mail": "email",
  "mail": "email",
  "adresse email": "email",
  "nom complet": "name",
  "nom": "name",
  "name": "name",
  "hr name": "name",
  "contact": "name",
  "poste": "position",
  "position": "position",
  "titre": "position",
  "job": "position",
};

const INITIAL_TEMPLATES = [
  { id: "default", name: "Candidature Standard", subject: "Candidature pour le poste de [Position] chez [Company]", message: "Bonjour [Name],\n\nJe me permets de vous contacter pour le poste de [Position] chez [Company]. Mon parcours et mes compétences correspondent parfaitement aux attentes de votre équipe.\n\nCordialement,\n[MyName]" },
  { id: "short", name: "Relance Rapide", subject: "Suivi : Poste [Position] @ [Company]", message: "Bonjour [Name],\n\nJe fais suite à ma candidature pour le poste de [Position]. Je reste très enthousiaste à l'idée de rejoindre [Company] !\n\nBien à vous,\n[MyName]" },
  { id: "creative", name: "Créatif / Moderne", subject: "Je suis le [Position] qu'il vous faut ! 🚀", message: "Bonjour équipe [Company] !\n\nJ'ai vu l'offre pour le poste de [Position] et elle m'a immédiatement captivé. Voici pourquoi je serais un excellent ajout à votre équipe..." },
];

export default function UploadPage() {
  const [data, setData] = useState<CSVRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState(INITIAL_TEMPLATES[0].id);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection helpers
  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    const pendingIndexes = data
      .map((row, idx) => (row.status === "pending" || row.status === "error") ? idx : -1)
      .filter(idx => idx !== -1);
    setSelectedRows(new Set(pendingIndexes));
  };

  const deselectAll = () => setSelectedRows(new Set());

  const isAllSelected = data.length > 0 && selectedRows.size === data.filter(r => r.status === "pending" || r.status === "error").length;
  const isSomeSelected = selectedRows.size > 0 && !isAllSelected;

  useEffect(() => {
    const saved = localStorage.getItem("truck-app-templates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved templates");
      }
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as Record<string, string>[];

        // Normalize headers: lowercase + map French aliases to expected field names
        const normalizedData = parsedData.map(row => {
          const normalizedRow: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            const lowerKey = key.trim().toLowerCase();
            const mappedKey = COLUMN_ALIASES[lowerKey] || lowerKey;
            normalizedRow[mappedKey] = value?.trim() || "";
          });
          return normalizedRow;
        });

        const validRows = normalizedData.filter(row => row.email);

        if (validRows.length === 0) {
          toast.error("Aucune ligne valide. Vérifiez que votre CSV contient une colonne 'Email' ou 'email'.");
          return;
        }

        setData(validRows.map(row => ({ ...row, status: "pending" } as CSVRow)));
        setProgress({ current: 0, total: validRows.length });
        // Auto-select all rows
        setSelectedRows(new Set(validRows.map((_, i) => i)));
        toast.success(`${validRows.length} candidatures chargées avec succès`);
      },
      error: (error) => {
        toast.error("Erreur de parsing CSV : " + error.message);
      }
    });
  };

  const startBatchProcess = async () => {
    const selectedIndexes = Array.from(selectedRows).sort((a, b) => a - b);
    if (selectedIndexes.length === 0) {
      toast.error("Sélectionnez au moins une ligne à envoyer.");
      return;
    }
    setIsProcessing(true);

    const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
    const savedName = localStorage.getItem("truck-app-candidate-name") || "Candidat";
    const { data: { user } } = await supabase.auth.getUser();

    let successCount = 0;
    let failCount = 0;
    setProgress({ current: 0, total: selectedIndexes.length });

    for (let s = 0; s < selectedIndexes.length; s++) {
      const i = selectedIndexes[s];
      const newData = [...data];
      newData[i].status = "sending";
      setData(newData);
      setProgress({ current: s + 1, total: selectedIndexes.length });

      try {
        const row = data[i];

        const replace = (text: string) => {
          let processedText = text;
          // Loop through all keys in the CSV row and replace [Key] in the template
          Object.keys(row).forEach(key => {
            const regex = new RegExp(`\\[${key}\\]`, 'gi');
            processedText = processedText.replace(regex, row[key as keyof CSVRow] || "");
          });
          // Also replace MyName from signature
          return processedText.replace(/\[MyName\]/gi, savedName);
        };

        const processedMessage = replace(template.message).replace(/\n/g, '<br>');
        const processedSubject = replace(template.subject);

        const cvBase64 = localStorage.getItem("truck-app-cv-base64") || "";

        await sendApplication({
          ...row,
          message: processedMessage,
          subject: processedSubject,
          cv_base64: cvBase64,
        });

        // Save to Supabase
        if (user) {
          await supabase.from('applications').insert([{
            user_id: user.id,
            company: row.company || null,
            position: row.position || null,
            email: row.email,
            status: 'success'
          }]);
        }

        newData[i].status = "success";
        successCount++;
      } catch (err: any) {
        newData[i].status = "error";
        newData[i].error = err.message;
        failCount++;
      }

      setData([...newData]);

      if (s < selectedIndexes.length - 1) {
        await delay(2000);
      }
    }

    // Clear selection for successfully sent rows
    setSelectedRows(prev => {
      const next = new Set(prev);
      selectedIndexes.forEach(i => {
        if (data[i].status === "success") next.delete(i);
      });
      return next;
    });

    setIsProcessing(false);
    toast.success(`Terminé : ${successCount} envoyées, ${failCount} échouées`);
  };

  const clearData = () => {
    setData([]);
    setProgress({ current: 0, total: 0 });
    setSelectedRows(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold text-[9px] uppercase tracking-[0.15em] rounded-full">
              <Layers className="w-3 h-3" /> Envoi en masse
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Bulk <span className="text-blue-500">Upload</span></h1>
            <p className="text-[#9CA3AF] text-sm">Importez un fichier CSV pour automatiser vos candidatures.</p>
          </div>

          {data.length > 0 && !isProcessing && (
            <button
              onClick={clearData}
              className="flex items-center gap-2 px-3 py-2 border border-red-500/20 bg-red-500/5 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
        </div>

        {data.length === 0 ? (
          /* Upload Zone */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="saas-card rounded-2xl md:rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center space-y-5 hover:border-blue-500/30 cursor-pointer transition-all group border-dashed border-2 border-[#1F2937]"
          >
            <div className="p-5 bg-blue-600/10 rounded-2xl group-hover:scale-110 transition-transform border border-blue-500/20">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-base font-bold text-white">Glissez votre fichier CSV ici</p>
              <p className="text-xs text-[#4B5563]">ou cliquez pour parcourir • Colonnes : Email (requis), Société, Nom Complet, Poste</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Progress & Controls */}
            <div className="saas-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-white flex items-center gap-2">
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Envoi en cours...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 text-blue-500" /> Prêt à envoyer</>
                  )}
                </span>
                <span className="text-[#9CA3AF] text-xs font-bold">
                  {isProcessing ? `${progress.current} / ${progress.total}` : `${selectedRows.size} sélectionnée${selectedRows.size > 1 ? 's' : ''} sur ${data.length}`}
                </span>
              </div>

              {!isProcessing && (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 bg-[#0C1220] rounded-xl border border-[#1F2937]">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1">
                      <FileText className="w-3 h-3" /> Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="bg-transparent text-sm outline-none cursor-pointer text-blue-400 font-bold w-full"
                    >
                      {templates.map(t => <option key={t.id} value={t.id} className="bg-[#0C1220]">{t.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="h-2 w-full bg-[#0C1220] rounded-full overflow-hidden border border-[#1F2937]">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              {!isProcessing && (
                <button
                  onClick={startBatchProcess}
                  disabled={selectedRows.size === 0}
                  className={cn(
                    "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all",
                    selectedRows.size > 0
                      ? "btn-saas-primary shadow-blue-900/20"
                      : "bg-[#1F2937] text-[#4B5563] cursor-not-allowed shadow-none"
                  )}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {selectedRows.size > 0
                    ? `Lancer l'envoi (${selectedRows.size} candidature${selectedRows.size > 1 ? 's' : ''})`
                    : "Sélectionnez des lignes"}
                </button>
              )}
            </div>

            {/* Selection Toolbar */}
            {!isProcessing && (
              <div className="saas-card rounded-2xl p-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={isAllSelected ? deselectAll : selectAll}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-[#1F2937] hover:border-blue-500/30 hover:bg-blue-500/5 text-[#9CA3AF] hover:text-blue-400"
                >
                  {isAllSelected ? (
                    <><CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Tout désélectionner</>
                  ) : (
                    <><Square className="w-3.5 h-3.5" /> Tout sélectionner</>
                  )}
                </button>
                {selectedRows.size > 0 && (
                  <span className="px-2.5 py-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] uppercase tracking-wider rounded-full">
                    {selectedRows.size} / {data.length}
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            <div className="saas-card rounded-2xl overflow-hidden">
              {/* Mobile Cards */}
              <div className="sm:hidden divide-y divide-[#1F2937]">
                {data.map((row, idx) => (
                  <div
                    key={idx}
                    onClick={() => !isProcessing && (row.status === "pending" || row.status === "error") && toggleRow(idx)}
                    className={cn(
                      "p-4 flex items-center gap-3 transition-all",
                      !isProcessing && (row.status === "pending" || row.status === "error") && "cursor-pointer",
                      selectedRows.has(idx) && "bg-blue-500/5 border-l-2 border-l-blue-500"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      {selectedRows.has(idx) ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className={cn("w-4 h-4", row.status === "success" ? "text-emerald-500/30" : "text-[#374151]")} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{row.email}</p>
                      <p className="text-xs text-[#4B5563] truncate">{row.company || "—"} • {row.name || "—"} • {row.position || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {row.status === "pending" && <div className="w-2 h-2 rounded-full bg-[#374151]" />}
                      {row.status === "sending" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                      {row.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {row.status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                      <span className={cn(
                        "text-[10px] font-bold capitalize",
                        row.status === "success" && "text-emerald-500",
                        row.status === "error" && "text-red-500",
                        row.status === "sending" && "text-blue-400",
                        row.status === "pending" && "text-[#4B5563]"
                      )}>{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0C1220] border-b border-[#1F2937]">
                      <th className="px-3 py-3 w-10">
                        <button
                          onClick={isAllSelected ? deselectAll : selectAll}
                          disabled={isProcessing}
                          className="flex items-center justify-center text-[#4B5563] hover:text-blue-400 transition-colors disabled:opacity-50"
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : isSomeSelected ? (
                            <MinusSquare className="w-4 h-4 text-blue-500/60" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em]">Entreprise</th>
                      <th className="px-5 py-3 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em]">Nom</th>
                      <th className="px-5 py-3 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em]">Email</th>
                      <th className="px-5 py-3 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em]">Poste</th>
                      <th className="px-5 py-3 text-[9px] font-black text-[#4B5563] uppercase tracking-[0.15em] text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {data.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => !isProcessing && (row.status === "pending" || row.status === "error") && toggleRow(idx)}
                        className={cn(
                          "group transition-colors",
                          !isProcessing && (row.status === "pending" || row.status === "error") && "cursor-pointer",
                          selectedRows.has(idx)
                            ? "bg-blue-500/5 hover:bg-blue-500/10"
                            : "hover:bg-[#111827]/50"
                        )}
                      >
                        <td className="px-3 py-3 w-10">
                          {selectedRows.has(idx) ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className={cn("w-4 h-4", row.status === "success" ? "text-emerald-500/30" : "text-[#374151]")} />
                          )}
                        </td>
                        <td className="px-5 py-3 font-medium text-sm text-white">{row.company || "—"}</td>
                        <td className="px-5 py-3 text-sm text-[#9CA3AF]">{row.name || "—"}</td>
                        <td className="px-5 py-3 text-sm text-[#9CA3AF]">{row.email}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 bg-[#0C1220] rounded-md text-xs text-[#9CA3AF] border border-[#1F2937]">
                            {row.position || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {row.status === "pending" && <div className="w-2 h-2 rounded-full bg-[#374151]" />}
                            {row.status === "sending" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                            {row.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {row.status === "error" && (
                              <div className="group/err relative">
                                <XCircle className="w-4 h-4 text-red-500 cursor-help" />
                                <div className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-red-950 border border-red-900 rounded-lg text-[10px] text-red-200 opacity-0 group-hover/err:opacity-100 transition-opacity pointer-events-none z-10">
                                  {row.error || "Erreur inconnue"}
                                </div>
                              </div>
                            )}
                            <span className={cn(
                              "text-xs font-bold capitalize",
                              row.status === "success" && "text-emerald-500",
                              row.status === "error" && "text-red-500",
                              row.status === "sending" && "text-blue-400",
                              row.status === "pending" && "text-[#4B5563]"
                            )}>
                              {row.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
