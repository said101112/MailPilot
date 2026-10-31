"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Star,
  Tag,
  Check,
  X,
  Upload,
  ShieldCheck,
  FileCheck2,
  Cloud,
  CloudCheck,
  RefreshCw,
  Smartphone,
  Copy,
  ExternalLink,
  Code2,
} from "lucide-react";
import {
  type CvProfile,
  readStoredCvLibrary,
  readActiveCvId,
  writeActiveCvId,
  upsertCvProfile,
  removeCvProfile,
  syncWithSupabase,
  getCloudSyncStatus,
  WORKSPACE_CV_EVENT,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";

const SQL_MIGRATION_SNIPPET = `-- ============================================================================
-- Table: public.user_cvs
-- Exécutez ce script dans votre SQL Editor Supabase pour activer la synchro
-- multi-appareils (Téléphone, PC, Tablette)
-- ============================================================================

create table if not exists public.user_cvs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  file_name text not null,
  base64 text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_cvs_user_id_idx on public.user_cvs (user_id);

alter table public.user_cvs enable row level security;

drop policy if exists "Users can select own cvs" on public.user_cvs;
create policy "Users can select own cvs"
  on public.user_cvs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own cvs" on public.user_cvs;
create policy "Users can insert own cvs"
  on public.user_cvs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own cvs" on public.user_cvs;
create policy "Users can update own cvs"
  on public.user_cvs for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own cvs" on public.user_cvs;
create policy "Users can delete own cvs"
  on public.user_cvs for delete
  using (auth.uid() = user_id);`;

export default function CvLibraryPage() {
  const [library, setLibrary] = useState<CvProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<{ available: boolean; syncing: boolean }>({
    available: false,
    syncing: false,
  });
  const [previewCv, setPreviewCv] = useState<CvProfile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncData = () => {
    const items = readStoredCvLibrary();
    setLibrary(items);
    const currActive = readActiveCvId();
    setActiveId(currActive || (items.length > 0 ? items[0].id : null));
    setCloudStatus(getCloudSyncStatus());
  };

  useEffect(() => {
    syncData();
    window.addEventListener(WORKSPACE_CV_EVENT, syncData);
    window.addEventListener("storage", syncData);

    // Initial cloud sync
    void handleManualSync(false);

    return () => {
      window.removeEventListener(WORKSPACE_CV_EVENT, syncData);
      window.removeEventListener("storage", syncData);
    };
  }, []);

  const activeCv = library.find((c) => c.id === activeId) || library[0] || null;

  const handleManualSync = async (notify = true) => {
    setIsSyncing(true);
    const ok = await syncWithSupabase(() => {
      syncData();
    });
    setIsSyncing(false);
    setCloudStatus(getCloudSyncStatus());

    if (notify) {
      if (ok) {
        toast.success("Synchronisation Cloud réussie ! Vos CVs sont à jour sur tous vos appareils.");
      } else {
        toast.info("La table Cloud Supabase n'est pas encore créée. Cliquez sur 'Activer la synchro mobile' ci-dessous.");
      }
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SNIPPET);
    setCopiedSql(true);
    toast.success("Script SQL copié dans le presse-papier !");
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Veuillez sélectionner un document PDF (.pdf uniquement).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Le fichier PDF est trop volumineux (maximum 15 Mo).");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;
      const cleanName = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      const autoLabel =
        cleanName.length > 28 ? cleanName.substring(0, 28) + "..." : cleanName;

      const newProfile: CvProfile = {
        id: `cv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        label: autoLabel || "Nouveau CV",
        fileName: file.name,
        base64,
        updatedAt: new Date().toISOString(),
        isDefault: library.length === 0,
      };

      upsertCvProfile(newProfile, library.length === 0);
      setIsUploading(false);
      toast.success(`CV "${newProfile.label}" enregistré et synchronisé !`);
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Échec de la lecture du fichier PDF.");
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSetDefault = (id: string) => {
    writeActiveCvId(id);
    setActiveId(id);
    const chosen = library.find((c) => c.id === id);
    toast.success(`"${chosen?.label || "CV"}" est maintenant le CV par défaut.`);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le profil "${label}" ?`)) {
      removeCvProfile(id);
      toast.info(`Profil "${label}" supprimé.`);
      if (previewCv?.id === id) setPreviewCv(null);
    }
  };

  const handleDownload = (profile: CvProfile) => {
    if (!profile.base64) return;
    const link = document.createElement("a");
    link.href = profile.base64;
    link.download = profile.fileName || "cv.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startRename = (profile: CvProfile) => {
    setEditingId(profile.id);
    setEditLabelValue(profile.label);
  };

  const saveRename = (id: string) => {
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

  const getApproxSizeKb = (base64: string) => {
    const len = base64.length;
    const bytes = len * 0.75;
    return Math.round(bytes / 1024);
  };

  return (
    <div className="page-shell">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#ff5722]" />
              <span>Bibliothèque de CVs</span>
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Gérez vos différents profils de CV (Data / IA, Fullstack, PFE, etc.) et synchronisez-les automatiquement entre votre ordinateur et votre téléphone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleManualSync(true)}
              disabled={isSyncing}
              className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
              title="Synchroniser avec le Cloud Supabase"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin text-[#ff5722]")} />
              <span>{isSyncing ? "Synchronisation..." : "Synchroniser Cloud"}</span>
            </button>

            <Link
              href="/upload"
              className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Accéder au Bulk Upload</span>
            </Link>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5 shadow-2xs font-semibold"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>{isUploading ? "Import en cours..." : "Importer un CV (PDF)"}</span>
            </button>
          </div>
        </div>

        {/* Cloud Status Banner */}
        {cloudStatus.available ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <CloudCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Cloud Supabase Actif :</strong> Vos CVs sont automatiquement sauvegardés et synchronisés sur votre téléphone et vos autres appareils.
              </span>
            </div>
            <button
              onClick={() => handleManualSync(true)}
              className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
            >
              Actualiser
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <Smartphone className="h-4 w-4 text-[#ff5722] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">
                  Activer la synchronisation mobile (Téléphone & PC)
                </p>
                <p className="text-gray-600 mt-0.5">
                  Pour retrouver automatiquement vos CVs sur votre smartphone, exécutez la table <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-mono">user_cvs</code> dans votre console Supabase.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSqlModal(true)}
                className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5 font-semibold"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Voir le script SQL</span>
              </button>
              <button
                type="button"
                onClick={handleCopySql}
                className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSql ? "Copié !" : "Copier SQL"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Metric Strip */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-2xs">
          <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <div className="p-4">
              <span className="text-xs text-gray-500 font-medium">Profils Enregistrés</span>
              <p className="mt-1 text-xl font-bold text-gray-900">{library.length}</p>
            </div>
            <div className="p-4">
              <span className="text-xs text-[#ff5722] font-medium">CV Actif par Défaut</span>
              <p className="mt-1 text-sm font-bold text-gray-900 truncate">
                {activeCv ? activeCv.label : "Aucun CV"}
              </p>
            </div>
            <div className="p-4">
              <span className="text-xs text-emerald-600 font-medium">Mode de Sauvegarde</span>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {cloudStatus.available
                    ? "Cloud Supabase + Cache Local (PC & Mobile)"
                    : "IndexedDB Local (Illimité)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CV Grid */}
        {library.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {library.map((profile) => {
              const isDefault = profile.id === activeId;
              const isEditing = editingId === profile.id;
              const sizeKb = getApproxSizeKb(profile.base64);

              return (
                <div
                  key={profile.id}
                  className={cn(
                    "relative flex flex-col justify-between rounded-lg border bg-white p-5 shadow-2xs transition hover:shadow-xs",
                    isDefault
                      ? "border-[#ff5722] ring-1 ring-[#ff5722]/30"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div>
                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-6 w-7 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-600">
                          PDF
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          ~{sizeKb} Ko
                        </span>
                      </div>

                      {isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#ff5722] border border-[#ff5722]/20">
                          <Star className="h-3 w-3 fill-[#ff5722]" />
                          Actif par défaut
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(profile.id)}
                          className="text-[11px] text-gray-400 hover:text-[#ff5722] transition flex items-center gap-1"
                        >
                          <Star className="h-3 w-3" />
                          <span>Définir par défaut</span>
                        </button>
                      )}
                    </div>

                    {/* Label & Filename */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 mb-2">
                        <input
                          type="text"
                          value={editLabelValue}
                          onChange={(e) => setEditLabelValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(profile.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="text-sm font-semibold text-gray-900 border border-[#ff5722] rounded px-2 py-1 outline-none w-full bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => saveRename(profile.id)}
                          className="p-1 rounded bg-[#ff5722] text-white hover:opacity-90"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center gap-1.5 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {profile.label}
                        </h3>
                        <button
                          type="button"
                          onClick={() => startRename(profile)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 transition"
                          title="Renommer l'étiquette du profil"
                        >
                          <Tag className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 font-mono truncate" title={profile.fileName}>
                      {profile.fileName}
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewCv(profile)}
                      className="editorial-button-secondary h-8 px-2.5 text-xs flex items-center gap-1.5 flex-1 justify-center"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Prévisualiser</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(profile)}
                      className="editorial-button-secondary h-8 px-2.5 text-xs flex items-center gap-1.5"
                      title="Télécharger le fichier PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(profile.id, profile.label)}
                      className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Supprimer ce profil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-[#ff5722]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              Aucun CV dans votre bibliothèque
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Importez vos différents CVs PDF (Data & IA, Développeur Web, PFE, etc.) pour pouvoir les assigner individuellement à chaque entreprise lors de vos envois.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="editorial-button-primary h-9 px-4 text-xs font-semibold"
              >
                <UploadCloud className="h-4 w-4 mr-1.5" />
                <span>Importer un premier CV</span>
              </button>
            </div>
          </div>
        )}

        {/* Integration Instructions Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2">
            <ShieldCheck className="h-4 w-4 text-[#ff5722]" />
            <span>Comment vos CVs sont synchronisés et utilisés</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs text-gray-600 leading-relaxed">
            <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3.5">
              <span className="font-semibold text-gray-900 flex items-center gap-1.5 mb-1">
                <Smartphone className="h-3.5 w-3.5 text-[#ff5722]" />
                Synchro Téléphone & PC
              </span>
              <p className="text-gray-500 text-[11.5px]">
                Connecté avec votre compte, vos CVs importés sur PC sont directement disponibles sur votre smartphone et vice-versa.
              </p>
            </div>

            <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3.5">
              <span className="font-semibold text-gray-900 flex items-center gap-1.5 mb-1">
                <FileCheck2 className="h-3.5 w-3.5 text-[#ff5722]" />
                Dans le Bulk Upload
              </span>
              <p className="text-gray-500 text-[11.5px]">
                En haut du tableau, vous disposez du sélecteur global de CV par défaut. Dans le tableau, chaque ligne possède sa colonne <strong>"CV Assigné"</strong>.
              </p>
            </div>

            <div className="rounded-md border border-gray-100 bg-gray-50/50 p-3.5">
              <span className="font-semibold text-gray-900 flex items-center gap-1.5 mb-1">
                <FileCheck2 className="h-3.5 w-3.5 text-[#ff5722]" />
                Dans le Manual Apply
              </span>
              <p className="text-gray-500 text-[11.5px]">
                Le CV marqué <strong>"Actif par défaut"</strong> est automatiquement envoyé au webhook n8n pour créer le brouillon Gmail.
              </p>
            </div>
          </div>
        </div>

        {/* SQL Migration Modal */}
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative flex flex-col w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#ff5722]" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Activer la synchronisation Supabase (Multi-Appareils)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSqlModal(false)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs text-gray-600">
                <p>
                  Pour que vos CVs soient sauvegardés dans le cloud et accessibles depuis votre téléphone, copiez ce script et exécutez-le dans l'<strong>Éditeur SQL de votre console Supabase</strong> :
                </p>

                <div className="relative">
                  <pre className="max-h-64 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-[11.5px] text-gray-100 leading-relaxed">
                    {SQL_MIGRATION_SNIPPET}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white transition backdrop-blur-xs"
                  >
                    {copiedSql ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSql ? "Copié !" : "Copier le code"}</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <a
                    href="https://supabase.com/dashboard/project/lulrhipthiagtaarigmf/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5 font-semibold"
                  >
                    <span>Ouvrir l'Éditeur SQL Supabase</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSqlModal(false);
                      void handleManualSync(true);
                    }}
                    className="editorial-button-secondary h-8 px-3 text-xs"
                  >
                    J'ai exécuté le script, tester la synchro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview Modal */}
        {previewCv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative flex flex-col w-full max-w-4xl h-[85vh] rounded-xl bg-white shadow-2xl overflow-hidden border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-[10px] font-bold text-red-600">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-gray-900 truncate">
                      {previewCv.label}
                    </h3>
                    <p className="text-[10.5px] text-gray-400 font-mono truncate">
                      {previewCv.fileName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewCv)}
                    className="editorial-button-secondary h-8 px-3 text-xs flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Télécharger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCv(null)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 w-full bg-gray-100">
                <iframe
                  src={previewCv.base64}
                  className="w-full h-full border-none"
                  title={`Prévisualisation ${previewCv.label}`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
