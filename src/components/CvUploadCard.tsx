"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Plus,
  Check,
  Tag,
} from "lucide-react";
import {
  type CvProfile,
  readStoredCvLibrary,
  readActiveCvId,
  writeActiveCvId,
  upsertCvProfile,
  removeCvProfile,
  WORKSPACE_CV_EVENT,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

interface CvUploadCardProps {
  variant?: "compact" | "banner" | "form";
  className?: string;
}

export default function CvUploadCard({
  variant = "compact",
  className,
}: CvUploadCardProps) {
  const [library, setLibrary] = useState<CvProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncData = () => {
    const libs = readStoredCvLibrary();
    setLibrary(libs);
    const currActive = readActiveCvId();
    setActiveId(currActive || (libs.length > 0 ? libs[0].id : null));
  };

  useEffect(() => {
    syncData();
    window.addEventListener(WORKSPACE_CV_EVENT, syncData);
    window.addEventListener("storage", syncData);

    return () => {
      window.removeEventListener(WORKSPACE_CV_EVENT, syncData);
      window.removeEventListener("storage", syncData);
    };
  }, []);

  const activeCv = library.find((c) => c.id === activeId) || library[0] || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Veuillez sélectionner un fichier PDF valide (.pdf uniquement).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier PDF est trop volumineux. Taille max: 5 Mo.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;
      const cleanName = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      const autoLabel =
        cleanName.length > 25 ? cleanName.substring(0, 25) + "..." : cleanName;

      const newProfile: CvProfile = {
        id: `cv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: autoLabel || "Nouveau CV",
        fileName: file.name,
        base64,
        updatedAt: new Date().toISOString(),
      };

      upsertCvProfile(newProfile, true);
      setIsUploading(false);
      toast.success(`CV "${newProfile.label}" ajouté à votre bibliothèque !`);
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Échec de la lecture du fichier PDF.");
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSelectActive = (id: string) => {
    writeActiveCvId(id);
    setActiveId(id);
    const selected = library.find((c) => c.id === id);
    if (selected) {
      toast.info(`CV par défaut : ${selected.label}`);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = library.find((c) => c.id === id);
    removeCvProfile(id);
    toast.info(`CV "${item?.label || "document"}" retiré.`);
  };

  const handleDownload = (profile: CvProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile.base64) return;

    const link = document.createElement("a");
    link.href = profile.base64;
    link.download = profile.fileName || "resume.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startRename = (profile: CvProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setEditLabelValue(profile.label);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editLabelValue.trim()) {
      setEditingId(null);
      return;
    }
    const item = library.find((c) => c.id === id);
    if (item) {
      upsertCvProfile({ ...item, label: editLabelValue.trim() }, false);
      toast.success("Nom du profil mis à jour.");
    }
    setEditingId(null);
  };

  const hasCv = library.length > 0 && Boolean(activeCv);

  // Variant 1: Compact (for Sidebar)
  if (variant === "compact") {
    return (
      <div className={cn("p-2 border-t border-gray-100", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400">
            Bibliothèque CVs ({library.length})
          </span>
          {hasCv ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Prêt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Requis
            </span>
          )}
        </div>

        {hasCv && activeCv ? (
          <div className="space-y-1.5">
            <div className="group flex items-center justify-between rounded-md border border-gray-200 bg-white p-2 text-xs shadow-xs transition hover:border-[#ff5722]/40">
              <div
                className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Cliquer pour ajouter un autre CV"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-50 text-red-600 font-bold text-[10px]">
                  PDF
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-gray-900 group-hover:text-[#ff5722]">
                    {activeCv.label}
                  </p>
                  <p className="truncate text-[9.5px] text-gray-400">
                    {activeCv.fileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 pl-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleDownload(activeCv, e)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  title="Télécharger"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(activeCv.id, e)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Supprimer ce CV"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {library.length > 1 && (
              <select
                className="w-full text-[10.5px] rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700 outline-none focus:border-[#ff5722]"
                value={activeId || ""}
                onChange={(e) => handleSelectActive(e.target.value)}
              >
                {library.map((c) => (
                  <option key={c.id} value={c.id}>
                    Profil : {c.label} ({c.fileName})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-gray-300 py-1 text-[10.5px] text-gray-500 hover:border-[#ff5722] hover:text-[#ff5722]"
            >
              <Plus className="h-3 w-3" />
              <span>Ajouter un autre CV</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50/50 px-3 py-2 text-xs text-gray-600 transition hover:border-[#ff5722] hover:bg-white hover:text-[#ff5722]"
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="font-medium">
              {isUploading ? "Import en cours..." : "Importer un CV (PDF)"}
            </span>
          </button>
        )}
      </div>
    );
  }

  // Variant 2: Banner (for Bulk Upload and Apply pages)
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition bg-white shadow-2xs",
        hasCv ? "border-gray-200" : "border-amber-200 bg-amber-50/40",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
              hasCv ? "bg-red-50 text-red-600" : "bg-amber-100 text-amber-700"
            )}
          >
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-gray-900">
                Bibliothèque de CVs ({library.length} profil{library.length > 1 ? "s" : ""})
              </h4>
              {hasCv ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Prêt pour l'envoi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-800">
                  <AlertCircle className="h-3 w-3" />
                  Aucun CV importé
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              Gérez vos différents profils de CV (Data/IA, Fullstack, PFE...) et associez le bon CV à chaque entreprise avant envoi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5 shadow-2xs font-semibold"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{isUploading ? "Importation..." : "Ajouter un CV (PDF)"}</span>
          </button>
        </div>
      </div>

      {/* CV Profiles Library Grid */}
      {library.length > 0 ? (
        <div className="mt-3.5 pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              Profils disponibles (Sélectionnez le CV par défaut) :
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {library.map((profile) => {
              const isSelected = profile.id === activeId;
              const isEditing = editingId === profile.id;

              return (
                <div
                  key={profile.id}
                  onClick={() => handleSelectActive(profile.id)}
                  className={cn(
                    "relative group flex flex-col justify-between p-3 rounded-md border text-xs cursor-pointer transition",
                    isSelected
                      ? "border-[#ff5722] bg-[#fffaf8] shadow-2xs ring-1 ring-[#ff5722]/30"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded font-bold text-[9px]",
                          isSelected
                            ? "bg-[#ff5722] text-white"
                            : "bg-red-50 text-red-600"
                        )}
                      >
                        PDF
                      </div>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => saveRename(profile.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <input
                              type="text"
                              value={editLabelValue}
                              onChange={(e) => setEditLabelValue(e.target.value)}
                              autoFocus
                              onBlur={() => saveRename(profile.id)}
                              className="text-xs font-semibold text-gray-900 border border-[#ff5722] rounded px-1.5 py-0.5 outline-none bg-white w-full"
                            />
                            <button
                              type="submit"
                              className="p-1 rounded bg-[#ff5722] text-white hover:opacity-90"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 truncate">
                              {profile.label}
                            </span>
                            {isSelected && (
                              <span className="rounded bg-[#ff5722]/10 px-1.5 py-0.2 text-[9.5px] font-bold text-[#ff5722]">
                                Défaut
                              </span>
                            )}
                          </div>
                        )}
                        <p className="truncate text-[10.5px] text-gray-500 mt-0.5">
                          {profile.fileName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <button
                      type="button"
                      onClick={(e) => startRename(profile, e)}
                      className="hover:text-gray-700 flex items-center gap-1 text-[10.5px]"
                      title="Renommer l'étiquette"
                    >
                      <Tag className="h-3 w-3" />
                      <span>Renommer</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(profile, e)}
                        className="p-1 rounded hover:bg-gray-100 hover:text-gray-700"
                        title="Télécharger"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(profile.id, e)}
                        className="p-1 rounded hover:bg-red-50 hover:text-red-600"
                        title="Supprimer ce profil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
          <p className="text-xs text-gray-500">
            Aucun CV pour l'instant. Importez votre premier CV PDF pour commencer vos envois groupés.
          </p>
        </div>
      )}
    </div>
  );
}
