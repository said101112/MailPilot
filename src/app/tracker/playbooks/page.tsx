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
  HelpCircle,
  Layers,
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

type QuickViewType = "folder" | "all_favorites" | "all_dialogues" | "all_pitchs";

export default function PlaybooksPage() {
  const [folders, setFolders] = useState<ExpressionFolder[]>(DEFAULT_EXPRESSION_FOLDERS);
  const [items, setItems] = useState<ExpressionItem[]>(DEFAULT_EXPRESSION_ITEMS);
  const [activeFolderId, setActiveFolderId] = useState<string>("folder-rh-phone");
  const [activeView, setActiveView] = useState<QuickViewType>("folder");
  const [searchQuery, setSearchQuery] = useState("");
  const [subTypeFilter, setSubTypeFilter] = useState<"all" | "dialogue" | "paragraph">("all");
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

  // Counts
  const counts = useMemo(() => {
    const folderMap: Record<string, number> = {};
    for (const f of folders) folderMap[f.id] = 0;

    let favorites = 0;
    let dialogues = 0;
    let pitchs = 0;

    for (const it of items) {
      if (folderMap[it.folderId] !== undefined) folderMap[it.folderId]++;
      if (it.isFavorite) favorites++;
      if (it.type === "dialogue") dialogues++;
      if (it.type === "paragraph") pitchs++;
    }

    return { folderMap, favorites, dialogues, pitchs, total: items.length };
  }, [folders, items]);

  // Active folder object
  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === activeFolderId) || folders[0] || null;
  }, [folders, activeFolderId]);

  // Filtered items
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Primary view filter
      if (activeView === "all_favorites") {
        if (!item.isFavorite) return false;
      } else if (activeView === "all_dialogues") {
        if (item.type !== "dialogue") return false;
      } else if (activeView === "all_pitchs") {
        if (item.type !== "paragraph") return false;
      } else {
        // Active folder
        if (item.folderId !== activeFolderId) return false;
      }

      // 2. Sub-type filter inside view
      if (subTypeFilter === "dialogue" && item.type !== "dialogue") return false;
      if (subTypeFilter === "paragraph" && item.type !== "paragraph") return false;

      // 3. Search query
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
  }, [items, activeView, activeFolderId, subTypeFilter, searchQuery]);

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
    setActiveView("folder");
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
    setActiveView("folder");
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

  // Title of current right-side view
  const currentViewDetails = useMemo(() => {
    if (activeView === "all_favorites") {
      return {
        title: "Toutes les fiches favorites",
        subtitle: "Accès express à vos répliques et pitchs mis en favoris ⭐",
        icon: Star,
        color: "#f59e0b",
        isFolder: false,
      };
    }
    if (activeView === "all_dialogues") {
      return {
        title: "Tous les dialogues RH & Appels",
        subtitle: "Vue d'ensemble de tous vos scénarios de conversation téléphonique",
        icon: Phone,
        color: "#ff5722",
        isFolder: false,
      };
    }
    if (activeView === "all_pitchs") {
      return {
        title: "Tous les pitchs & présentations",
        subtitle: "Vue continue de tous vos discours au format paragraphe",
        icon: Mic,
        color: "#3b82f6",
        isFolder: false,
      };
    }
    return {
      title: activeFolder?.name || "Dossier thématique",
      subtitle: activeFolder?.description || "Fiches d'entretien et répliques",
      icon: Folder,
      iconName: activeFolder?.icon,
      color: activeFolder?.color || "#ff5722",
      isFolder: true,
    };
  }, [activeView, activeFolder]);

  return (
    <div className="page-shell min-h-screen bg-[#fafaf9] pb-16">
      <div className="mx-auto max-w-[1140px] space-y-6">
        {/* ========================================================================= */}
        {/* CLEAN TOP HEADER                                                          */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#ff5722] border border-orange-100 shadow-2xs">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Playbooks & Scénarios RH
              </h1>
              <p className="text-xs text-gray-500">
                Antisèches d&apos;entretien, scripts d&apos;appels et pitchs prêts pour le téléphone.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCheatsheetMode(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-[#ff5722] hover:bg-orange-50 transition cursor-pointer shadow-2xs"
              title="Affichage optimisé pour quand un recruteur appelle"
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
        {/* TWO-COLUMN MODERN WORKSPACE LAYOUT                                        */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT SIDEBAR: DOSSIERS & VUES RAPIDES (Width: 280px)                    */}
          {/* ----------------------------------------------------------------------- */}
          <aside className="w-full lg:w-72 shrink-0 space-y-5">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une réplique..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8.5 pr-3 text-xs text-gray-900 shadow-2xs focus:border-[#ff5722] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Views Navigation */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs space-y-1">
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Vues Rapides
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveView("all_favorites");
                  setSubTypeFilter("all");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer",
                  activeView === "all_favorites"
                    ? "bg-amber-50 text-amber-900 font-bold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-2">
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      activeView === "all_favorites"
                        ? "fill-amber-400 text-amber-500"
                        : "text-amber-500"
                    )}
                  />
                  <span>Favoris</span>
                </div>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                  {counts.favorites}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView("all_dialogues");
                  setSubTypeFilter("all");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer",
                  activeView === "all_dialogues"
                    ? "bg-orange-50 text-[#ff5722] font-bold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-orange-500" />
                  <span>Tous les dialogues RH</span>
                </div>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                  {counts.dialogues}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView("all_pitchs");
                  setSubTypeFilter("all");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition cursor-pointer",
                  activeView === "all_pitchs"
                    ? "bg-blue-50 text-blue-800 font-bold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-2">
                  <Mic className="h-3.5 w-3.5 text-blue-500" />
                  <span>Tous les pitchs</span>
                </div>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] font-bold text-gray-600">
                  {counts.pitchs}
                </span>
              </button>
            </div>

            {/* Folders List (Vertical Notion/Apple Notes style) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs space-y-1">
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Dossiers Thématiques
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFolderToEdit(null);
                    setIsFolderModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#ff5722] hover:opacity-80"
                >
                  <Plus className="h-3 w-3" />
                  <span>Nouveau</span>
                </button>
              </div>

              <div className="space-y-1">
                {folders.map((folder) => {
                  const isSelected = activeView === "folder" && activeFolderId === folder.id;
                  const count = counts.folderMap[folder.id] || 0;

                  return (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setActiveView("folder");
                      }}
                      className={cn(
                        "group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer",
                        isSelected
                          ? "bg-orange-50/70 border border-orange-200/90 text-gray-900 font-bold shadow-2xs"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white shadow-2xs"
                          style={{ backgroundColor: folder.color || "#ff5722" }}
                        >
                          {renderFolderIcon(folder.icon, "h-3.5 w-3.5")}
                        </div>
                        <span className="truncate text-xs">{folder.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                            isSelected
                              ? "bg-orange-100 text-[#ff5722]"
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {count}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToEdit(folder);
                            setIsFolderModalOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 transition"
                          title="Modifier le dossier"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Emergency Call Tip */}
            <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3.5 text-xs text-orange-950 space-y-1 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#ff5722]">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Astuce Appel Entrant :</span>
              </div>
              <p className="text-[11px] text-orange-900/80 leading-relaxed">
                Quand un recruteur appelle, ouvrez le <strong>Mode Appel Téléphone</strong> pour garder vos répliques en plein écran aéré sous les yeux.
              </p>
            </div>
          </aside>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT MAIN PANEL: ITEMS VIEW                                            */}
          {/* ----------------------------------------------------------------------- */}
          <main className="flex-1 min-w-0 space-y-4 w-full">
            {/* View Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-2xs mt-0.5"
                  style={{ backgroundColor: currentViewDetails.color }}
                >
                  {currentViewDetails.iconName
                    ? renderFolderIcon(currentViewDetails.iconName, "h-4.5 w-4.5")
                    : <currentViewDetails.icon className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                    {currentViewDetails.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currentViewDetails.subtitle}
                  </p>
                </div>
              </div>

              {/* Sub-filters & Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sub-type filter pills */}
                <div className="inline-flex rounded-xl bg-gray-100 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSubTypeFilter("all")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                      subTypeFilter === "all"
                        ? "bg-white text-gray-900 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Tous ({displayedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTypeFilter("dialogue")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                      subTypeFilter === "dialogue"
                        ? "bg-white text-orange-600 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Dialogues
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTypeFilter("paragraph")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                      subTypeFilter === "paragraph"
                        ? "bg-white text-blue-600 shadow-2xs"
                        : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    Pitchs
                  </button>
                </div>

                {/* If folder: Edit / Delete folder options */}
                {currentViewDetails.isFolder && activeFolder && (
                  <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFolderToEdit(activeFolder);
                        setIsFolderModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                      title="Modifier le dossier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {folders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(activeFolder.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Supprimer ce dossier"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            {displayedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3 shadow-2xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5722]">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">
                  Aucune fiche dans cette vue
                </h3>
                <p className="mx-auto max-w-sm text-xs text-gray-500">
                  {searchQuery
                    ? "Aucune réplique ne correspond à votre recherche. Essayez d'autres mots-clés."
                    : "Ce dossier ne contient pas encore de fiche. Cliquez sur 'Smart Paste' pour coller du texte brut ou importer un scénario."}
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
              <div className="space-y-4">
                {displayedItems.map((item) => (
                  <div key={item.id}>
                    {item.type === "dialogue" ? (
                      <DialogueViewer
                        item={item}
                        onToggleFavorite={handleToggleFavorite}
                        onDelete={handleDeleteItem}
                      />
                    ) : (
                      <ParagraphViewer
                        item={item}
                        onToggleFavorite={handleToggleFavorite}
                        onDelete={handleDeleteItem}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN PHONE / CHEATSHEET LIVE MODAL                                  */}
      {/* ========================================================================= */}
      {isCheatsheetMode && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Top Urgent Bar */}
          <div className="flex items-center justify-between border-b border-orange-200 bg-[#fff5f2] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
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
                onClick={() => {
                  setActiveFolderId(f.id);
                  setActiveView("folder");
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                  activeView === "folder" && f.id === activeFolderId
                    ? "bg-[#ff5722] text-white shadow-2xs font-bold"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                )}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4">
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
