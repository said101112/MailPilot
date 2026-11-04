"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Briefcase,
  Check,
  ChevronRight,
  Code,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  Heart,
  HelpCircle,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_EXPRESSION_FOLDERS,
  DEFAULT_EXPRESSION_ITEMS,
  deleteFolderRemote,
  deleteItemRemote,
  loadLocalExpressionsData,
  saveLocalExpressionsData,
  syncExpressionsWithSupabase,
  upsertFolderRemote,
  upsertItemRemote,
  type ExpressionFolder,
  type ExpressionItem,
} from "@/lib/tracker/expressions";
import DialogueViewer from "@/components/tracker/DialogueViewer";
import ParagraphViewer from "@/components/tracker/ParagraphViewer";
import ExpressionSmartPasteModal from "@/components/tracker/ExpressionSmartPasteModal";
import FolderEditModal from "@/components/tracker/FolderEditModal";

function renderFolderIcon(iconName: string, className: string = "h-4 w-4") {
  switch (iconName) {
    case "phone":
      return <Phone className={className} />;
    case "mic":
      return <Mic className={className} />;
    case "shield":
      return <Shield className={className} />;
    case "code":
      return <Code className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "message":
      return <MessageSquare className={className} />;
    default:
      return <Folder className={className} />;
  }
}

export default function PlaybooksPage() {
  const [folders, setFolders] = useState<ExpressionFolder[]>(DEFAULT_EXPRESSION_FOLDERS);
  const [items, setItems] = useState<ExpressionItem[]>(DEFAULT_EXPRESSION_ITEMS);
  const [activeFolderId, setActiveFolderId] = useState<string>("folder-rh-phone");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "dialogue" | "paragraph" | "favorite">("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<ExpressionFolder | null>(null);

  // Live Phone / Cheatsheet Mode
  const [isCheatsheetMode, setIsCheatsheetMode] = useState(false);

  // Initial load: local first + async Supabase sync
  useEffect(() => {
    const local = loadLocalExpressionsData();
    setFolders(local.folders);
    setItems(local.items);
    if (local.folders.length > 0) {
      setActiveFolderId(local.folders[0].id);
    }

    void handleSupabaseSync();
  }, []);

  const handleSupabaseSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncExpressionsWithSupabase();
      setFolders(synced.folders);
      setItems(synced.items);
    } catch {
      // offline fallback
    } finally {
      setIsSyncing(false);
    }
  };

  // Active folder details
  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === activeFolderId) || folders[0] || null;
  }, [folders, activeFolderId]);

  // Filtered items in active folder
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // Must match active folder (unless favorite filter across all folders)
      if (filterType !== "favorite" && item.folderId !== activeFolderId) {
        return false;
      }

      if (filterType === "favorite" && !item.isFavorite) {
        return false;
      }

      if (filterType === "dialogue" && item.type !== "dialogue") return false;
      if (filterType === "paragraph" && item.type !== "paragraph") return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(q);
      const inNotes = (item.notes || "").toLowerCase().includes(q);
      const inTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      const inParagraph = (item.paragraphContent || "").toLowerCase().includes(q);
      const inDialogue = (item.turns || []).some(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          (t.alternative || "").toLowerCase().includes(q)
      );

      return inTitle || inNotes || inTags || inParagraph || inDialogue;
    });
  }, [items, activeFolderId, filterType, searchQuery]);

  // Counts per folder
  const folderCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of folders) map[f.id] = 0;
    for (const it of items) {
      if (map[it.folderId] !== undefined) map[it.folderId]++;
    }
    return map;
  }, [folders, items]);

  // Save changes
  const persistState = (newFolders: ExpressionFolder[], newItems: ExpressionItem[]) => {
    setFolders(newFolders);
    setItems(newItems);
    saveLocalExpressionsData(newFolders, newItems);
  };

  // Import items from Smart Paste
  const handleImportItems = (newItems: ExpressionItem[]) => {
    const updated = [...newItems, ...items];
    persistState(folders, updated);

    // Sync remote
    for (const it of newItems) {
      void upsertItemRemote(it);
    }
  };

  // Save/Edit Folder
  const handleSaveFolder = (folder: ExpressionFolder) => {
    const exists = folders.some((f) => f.id === folder.id);
    let updatedFolders: ExpressionFolder[];
    if (exists) {
      updatedFolders = folders.map((f) => (f.id === folder.id ? folder : f));
    } else {
      updatedFolders = [...folders, folder];
    }
    persistState(updatedFolders, items);
    setActiveFolderId(folder.id);
    void upsertFolderRemote(folder);
  };

  // Delete folder
  const handleDeleteFolder = (folderId: string) => {
    if (folders.length <= 1) {
      toast.error("Vous devez conserver au moins un dossier.");
      return;
    }
    if (!window.confirm("Supprimer ce dossier et toutes ses fiches associées ?")) return;

    const remainingFolders = folders.filter((f) => f.id !== folderId);
    const remainingItems = items.filter((it) => it.folderId !== folderId);
    persistState(remainingFolders, remainingItems);
    setActiveFolderId(remainingFolders[0].id);
    void deleteFolderRemote(folderId);
    toast.info("Dossier supprimé.");
  };

  // Toggle favorite
  const handleToggleFavorite = (itemId: string) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        const next = { ...it, isFavorite: !it.isFavorite };
        void upsertItemRemote(next);
        return next;
      }
      return it;
    });
    persistState(folders, updated);
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm("Supprimer cette fiche ?")) return;
    const updated = items.filter((it) => it.id !== itemId);
    persistState(folders, updated);
    void deleteItemRemote(itemId);
    toast.info("Fiche supprimée.");
  };

  return (
    <div className="page-shell min-h-screen bg-[#fafaf9] pb-16">
      <div className="mx-auto max-w-[1040px] space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#ff5722] shadow-2xs">
                <PhoneCall className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  Playbooks & Scénarios RH
                </h1>
                <p className="text-xs text-gray-500">
                  Antisèches d&apos;entretien, répliques téléphoniques et pitchs structurés par dossiers thématiques.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCheatsheetMode(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-[#ff5722] hover:bg-orange-100 transition cursor-pointer shadow-2xs"
              title="Affichage optimisé pour quand un recruteur appelle sur le téléphone"
            >
              <Smartphone className="h-4 w-4" />
              <span>Mode Appel Téléphone</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSmartPasteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5722] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#f4511e] transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Smart Paste (Coller)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFolderToEdit(null);
                setIsFolderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              <FolderPlus className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">Nouveau Dossier</span>
            </button>

            <button
              type="button"
              onClick={handleSupabaseSync}
              disabled={isSyncing}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-800 transition"
              title="Synchroniser avec Supabase"
            >
              <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin text-[#ff5722]")} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOLDERS ROW / TABS                                                        */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Mes Dossiers Thématiques
            </span>
            <span className="text-xs text-gray-400">
              {folders.length} dossier{folders.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {folders.map((folder) => {
              const isSelected = folder.id === activeFolderId;
              const count = folderCounts[folder.id] || 0;

              return (
                <div
                  key={folder.id}
                  onClick={() => {
                    setActiveFolderId(folder.id);
                    if (filterType === "favorite") setFilterType("all");
                  }}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border p-3.5 transition cursor-pointer shadow-2xs select-none",
                    isSelected
                      ? "border-orange-300 bg-white ring-2 ring-orange-200/60 shadow-xs"
                      : "border-gray-200 bg-white/80 hover:border-gray-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs"
                        style={{ backgroundColor: folder.color || "#ff5722" }}
                      >
                        {renderFolderIcon(folder.icon, "h-4 w-4")}
                      </div>
                      <span className="truncate text-xs font-bold text-gray-900">
                        {folder.name}
                      </span>
                    </div>

                    {/* Quick folder action dropdown/button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToEdit(folder);
                        setIsFolderModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-400 hover:text-gray-700 rounded"
                      title="Modifier le dossier"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate max-w-[140px] text-gray-400">
                      {folder.description || "Dossier thématique"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        isSelected
                          ? "bg-orange-100 text-[#ff5722]"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {count} fiche{count > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TOOLBAR: SEARCH & FILTERS                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une réplique, mot-clé, tag (ex: stage PFE, décrocher, salaire)..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-[#ff5722] focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={cn(
                "rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer",
                filterType === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Tous ({displayedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("dialogue")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer",
                filterType === "dialogue"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-700 hover:bg-orange-100"
              )}
            >
              <Phone className="h-3 w-3" />
              <span>Dialogues RH</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("paragraph")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer",
                filterType === "paragraph"
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              )}
            >
              <Mic className="h-3 w-3" />
              <span>Pitchs continus</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType("favorite")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer",
                filterType === "favorite"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              <Star className="h-3 w-3" />
              <span>Favoris</span>
            </button>
          </div>
        </div>

        {/* Current Folder Info Bar */}
        {activeFolder && filterType !== "favorite" && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700">
                Dossier : <span className="text-[#ff5722]">{activeFolder.name}</span>
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500">
                {displayedItems.length} fiche{displayedItems.length > 1 ? "s" : ""} affichée{displayedItems.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFolderToEdit(activeFolder);
                  setIsFolderModalOpen(true);
                }}
                className="text-gray-500 hover:text-gray-900 font-medium"
              >
                Modifier le dossier
              </button>
              {folders.length > 1 && (
                <>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(activeFolder.id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LIST OF EXPRESSION / SCENARIO ITEMS                                      */}
        {/* ========================================================================= */}
        {displayedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5722]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              Aucune fiche trouvée
            </h3>
            <p className="mx-auto max-w-sm text-xs text-gray-500">
              {searchQuery
                ? "Aucun résultat ne correspond à votre recherche. Essayez un autre terme."
                : "Ce dossier est vide. Cliquez sur 'Smart Paste' pour coller du texte brut ou importer un scénario."}
            </p>
            <button
              type="button"
              onClick={() => setIsSmartPasteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5722] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#f4511e] transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Coller du texte (Smart Paste)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {displayedItems.map((item) => (
              <div key={item.id} className="relative group">
                {/* Floating item actions */}
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-xl shadow-2xs border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(item.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-amber-500 transition cursor-pointer"
                    title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        item.isFavorite ? "fill-amber-400 text-amber-500" : ""
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 transition cursor-pointer"
                    title="Supprimer la fiche"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Main Viewer depending on type */}
                {item.type === "dialogue" ? (
                  <DialogueViewer item={item} />
                ) : (
                  <ParagraphViewer item={item} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN PHONE / CHEATSHEET LIVE MODAL                                  */}
      {/* ========================================================================= */}
      {isCheatsheetMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Top Urgent Bar */}
          <div className="flex items-center justify-between border-b border-orange-200 bg-[#fff5f2] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white animate-pulse">
                <PhoneCall className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-gray-900 sm:text-base">
                  Mode Appel Téléphonique RH en Direct
                </h2>
                <p className="text-[11px] text-gray-600">
                  Lecture rapide grand format : gardez cette fenêtre sous les yeux lors de votre appel.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCheatsheetMode(false)}
              className="rounded-xl border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              title="Quitter le mode plein écran"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Filter tabs inside cheatsheet */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 sm:px-6 overflow-x-auto">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolderId(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer",
                  f.id === activeFolderId
                    ? "bg-[#ff5722] text-white shadow-2xs"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                )}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
            {items
              .filter((it) => it.folderId === activeFolderId)
              .map((it) => (
                <div key={it.id}>
                  {it.type === "dialogue" ? (
                    <DialogueViewer item={it} />
                  ) : (
                    <ParagraphViewer item={it} />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <ExpressionSmartPasteModal
        isOpen={isSmartPasteOpen}
        onClose={() => setIsSmartPasteOpen(false)}
        folders={folders}
        activeFolderId={activeFolderId}
        onImportItems={handleImportItems}
      />

      <FolderEditModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folderToEdit={folderToEdit}
        onSaveFolder={handleSaveFolder}
      />
    </div>
  );
}

