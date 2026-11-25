"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronLeft,
  Cloud,
  CloudOff,
  Copy,
  CopyPlus,
  ExternalLink,
  FolderOpen,
  Info,
  Lightbulb,
  List,
  MessageSquareText,
  Pin,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  NOTE_CATEGORIES,
  NOTE_COLORS,
  NOTES_UPDATED_EVENT,
  createNoteId,
  deleteNoteRemote,
  extractUrls,
  formatRelativeNoteDate,
  loadLocalNotes,
  markNoteDeleted,
  markNoteDirty,
  saveLocalNotes,
  sortNotes,
  syncNotesWithSupabase,
  upsertNoteRemote,
  type NoteCategory,
  type NoteColor,
  type NoteItem,
  type NotesSyncStatus,
} from "@/lib/notes";

type CategoryFilter = "all" | "pinned" | NoteCategory;

function renderCategoryIcon(category: NoteCategory, className = "h-3.5 w-3.5") {
  switch (category) {
    case "reply":
      return <MessageSquareText className={className} />;
    case "info":
      return <Info className={className} />;
    case "idea":
      return <Lightbulb className={className} />;
    case "todo":
      return <CheckSquare className={className} />;
    default:
      return <FolderOpen className={className} />;
  }
}

const SUGGESTED_TAGS = ["LinkedIn", "Email", "RH", "PFE", "WhatsApp", "Perso"];

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  // Search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");

  // Feedback & UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState<"saved" | "saving">("saved");

  // Sync state
  const [syncStatus, setSyncStatus] = useState<NotesSyncStatus>("local_only");
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for debounced remote sync & cursor helpers
  const remoteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initial load + background Supabase sync
  useEffect(() => {
    let mounted = true;
    const timers = remoteTimersRef.current;

    const runInitialSync = async () => {
      // Yield a microtask so initial hydration completes cleanly before loading localStorage
      await Promise.resolve();
      if (!mounted) return;

      const initial = loadLocalNotes();
      setNotes(initial);
      setSelectedId(initial[0]?.id ?? null);
      setIsLoaded(true);
      setIsSyncing(true);

      const res = await syncNotesWithSupabase();
      if (!mounted) return;
      setNotes(res.notes);
      setSyncStatus(res.status);
      setSelectedId((prev) => {
        if (prev && res.notes.some((n) => n.id === prev)) return prev;
        return res.notes[0]?.id ?? null;
      });
      setIsSyncing(false);
    };

    void runInitialSync();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mailpilot_user_notes_v1") {
        setNotes(loadLocalNotes());
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await syncNotesWithSupabase();
    setNotes(res.notes);
    setSyncStatus(res.status);
    setIsSyncing(false);

    if (res.status === "synced") {
      toast.success("Bloc-notes synchronisé avec le Cloud !");
    } else if (res.status === "local_only") {
      toast.info("Connectez-vous pour synchroniser entre PC et mobile.");
    } else {
      toast.warning("Mode hors ligne — notes enregistrées localement.");
    }
  };

  // Persist locally immediately & debounce remote upsert
  const scheduleRemoteSave = (note: NoteItem, immediate = false) => {
    if (remoteTimersRef.current[note.id]) {
      clearTimeout(remoteTimersRef.current[note.id]);
    }

    if (immediate) {
      void upsertNoteRemote(note).then((status) => {
        setSyncStatus(status);
        setSaveIndicator("saved");
      });
      return;
    }

    setSaveIndicator("saving");
    remoteTimersRef.current[note.id] = setTimeout(() => {
      void upsertNoteRemote(note).then((status) => {
        setSyncStatus(status);
        setSaveIndicator("saved");
      });
      delete remoteTimersRef.current[note.id];
    }, 650);
  };

  const commitNotes = (
    nextList: NoteItem[],
    changedNote?: NoteItem,
    immediateRemote = false
  ) => {
    const sorted = sortNotes(nextList);
    setNotes(sorted);
    saveLocalNotes(sorted);
    if (changedNote) {
      markNoteDirty(changedNote.id);
      scheduleRemoteSave(changedNote, immediateRemote);
    }
  };

  // Filtered & sorted notes
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (activeFilter === "pinned" && !note.isPinned) return false;
      if (
        activeFilter !== "all" &&
        activeFilter !== "pinned" &&
        note.category !== activeFilter
      ) {
        return false;
      }

      if (!q) return true;
      const inTitle = note.title.toLowerCase().includes(q);
      const inContent = note.content.toLowerCase().includes(q);
      const inTags = note.tags.some((t) => t.toLowerCase().includes(q));
      return inTitle || inContent || inTags;
    });
  }, [notes, activeFilter, searchQuery]);

  const counts = useMemo(() => {
    const byCat: Record<NoteCategory, number> = {
      reply: 0,
      info: 0,
      idea: 0,
      todo: 0,
      other: 0,
    };
    let pinned = 0;
    for (const n of notes) {
      byCat[n.category] = (byCat[n.category] || 0) + 1;
      if (n.isPinned) pinned++;
    }
    return { total: notes.length, pinned, byCat };
  }, [notes]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  const selectedColorCfg = useMemo(
    () =>
      NOTE_COLORS.find((c) => c.key === (selectedNote?.color || "default")) ||
      NOTE_COLORS[0],
    [selectedNote?.color]
  );

  const detectedUrls = useMemo(
    () => (selectedNote ? extractUrls(selectedNote.content) : []),
    [selectedNote]
  );

  const textStats = useMemo(() => {
    const content = selectedNote?.content || "";
    const chars = content.length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [selectedNote?.content]);

  // Create new note
  const handleCreateNote = (presetCategory?: NoteCategory, presetTitle?: string) => {
    const now = new Date().toISOString();
    const resolvedCategory: NoteCategory =
      presetCategory ||
      (activeFilter !== "all" && activeFilter !== "pinned"
        ? activeFilter
        : "reply");

    const newNote: NoteItem = {
      id: createNoteId(),
      title: presetTitle || "",
      content: "",
      category: resolvedCategory,
      color:
        resolvedCategory === "reply"
          ? "blue"
          : resolvedCategory === "info"
            ? "emerald"
            : resolvedCategory === "idea"
              ? "amber"
              : "default",
      tags: [],
      isPinned: activeFilter === "pinned",
      createdAt: now,
      updatedAt: now,
    };

    const next = [newNote, ...notes];
    commitNotes(next, newNote, true);
    setSelectedId(newNote.id);
    setConfirmDeleteId(null);
    setMobileView("editor");

    // Reset filter if it would hide the new note
    if (
      activeFilter !== "all" &&
      activeFilter !== "pinned" &&
      activeFilter !== newNote.category
    ) {
      setActiveFilter("all");
    }

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 60);
  };

  const handleSelectNote = (id: string) => {
    setSelectedId(id);
    setConfirmDeleteId(null);
    setTagInput("");
    setMobileView("editor");
  };

  const handleUpdateField = <K extends keyof NoteItem>(
    field: K,
    value: NoteItem[K],
    immediateRemote = false
  ) => {
    if (!selectedNote) return;
    const updated: NoteItem = {
      ...selectedNote,
      [field]: value,
      updatedAt: new Date().toISOString(),
    };
    const next = notes.map((n) => (n.id === updated.id ? updated : n));
    commitNotes(next, updated, immediateRemote);
  };

  const handleTogglePin = (note: NoteItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated: NoteItem = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: new Date().toISOString(),
    };
    const next = notes.map((n) => (n.id === updated.id ? updated : n));
    commitNotes(next, updated, true);
    toast.success(updated.isPinned ? "Note épinglée en haut" : "Note désépinglée");
  };

  const handleDuplicateNote = () => {
    if (!selectedNote) return;
    const now = new Date().toISOString();
    const clone: NoteItem = {
      ...selectedNote,
      id: createNoteId(),
      title: selectedNote.title ? `${selectedNote.title} (copie)` : "Copie",
      isPinned: false,
      createdAt: now,
      updatedAt: now,
    };
    commitNotes([clone, ...notes], clone, true);
    setSelectedId(clone.id);
    toast.success("Note dupliquée !");
  };

  const handleDeleteNote = (id: string) => {
    if (remoteTimersRef.current[id]) {
      clearTimeout(remoteTimersRef.current[id]);
      delete remoteTimersRef.current[id];
    }

    const remaining = notes.filter((n) => n.id !== id);
    const sorted = sortNotes(remaining);
    setNotes(sorted);
    saveLocalNotes(sorted);
    markNoteDeleted(id);
    void deleteNoteRemote(id).then((status) => setSyncStatus(status));

    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(sorted[0]?.id ?? null);
      setMobileView("list");
    }
    toast.info("Note supprimée.");
  };

  const handleCopyText = async (note: NoteItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const textToCopy = note.content.trim() || note.title.trim();
    if (!textToCopy) {
      toast.warning("Cette note est vide.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(note.id);
      toast.success("Texte copié dans le presse-papiers !");
      setTimeout(() => {
        setCopiedId((prev) => (prev === note.id ? null : prev));
      }, 1800);
    } catch {
      toast.error("Impossible de copier automatiquement.");
    }
  };

  const handleAddTag = (rawTag: string) => {
    if (!selectedNote) return;
    const clean = rawTag.replace(/^#/, "").trim();
    if (!clean) return;
    if (selectedNote.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput("");
      return;
    }
    handleUpdateField("tags", [...selectedNote.tags, clean], true);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedNote) return;
    handleUpdateField(
      "tags",
      selectedNote.tags.filter((t) => t !== tagToRemove),
      true
    );
  };

  const insertAtCursor = (snippet: string) => {
    if (!selectedNote) return;
    const el = textareaRef.current;
    if (!el) {
      handleUpdateField("content", `${selectedNote.content}${snippet}`);
      return;
    }
    const start = el.selectionStart ?? selectedNote.content.length;
    const end = el.selectionEnd ?? selectedNote.content.length;
    const before = selectedNote.content.slice(0, start);
    const after = selectedNote.content.slice(end);
    const prefix = before && !before.endsWith("\n") && snippet.startsWith("•") ? "\n" : "";
    const nextContent = `${before}${prefix}${snippet}${after}`;
    handleUpdateField("content", nextContent);

    const nextPos = start + prefix.length + snippet.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleMobileBack = () => {
    if (selectedNote && remoteTimersRef.current[selectedNote.id]) {
      clearTimeout(remoteTimersRef.current[selectedNote.id]);
      delete remoteTimersRef.current[selectedNote.id];
      void upsertNoteRemote(selectedNote).then((status) => {
        setSyncStatus(status);
        setSaveIndicator("saved");
      });
    }
    setConfirmDeleteId(null);
    setMobileView("list");
  };

  // Dispatch count update for sidebar badge
  useEffect(() => {
    if (isLoaded) {
      window.dispatchEvent(new Event(NOTES_UPDATED_EVENT));
    }
  }, [notes.length, isLoaded]);

  return (
    <div className="min-h-full bg-[#fafaf9] text-gray-900">
      <div className="mx-auto max-w-[1320px] px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-5 pb-24 lg:pb-8">
        {/* ================================================================= */}
        {/* HEADER (Hidden on mobile when editor screen is active)            */}
        {/* ================================================================= */}
        <div
          className={cn(
            "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-4",
            mobileView === "editor" ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#ff5722] border border-orange-100 shadow-2xs">
              <StickyNote className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
                  Bloc-Notes &amp; Réponses
                </h1>
                <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  {counts.total} {counts.total > 1 ? "notes" : "note"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Vos réponses texte prêtes à copier, liens utiles et notes rapides sur PC &amp; mobile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            {/* Sync Status Pill */}
            <button
              type="button"
              onClick={() => void handleManualSync()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition cursor-pointer shadow-2xs",
                syncStatus === "synced"
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-50"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
              title="Synchroniser avec le Cloud (PC & Mobile)"
            >
              {syncStatus === "synced" ? (
                <Cloud className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              )}
              <span className="truncate">
                {syncStatus === "synced"
                  ? "Sync Cloud"
                  : syncStatus === "offline"
                    ? "Hors ligne"
                    : "Local"}
              </span>
              <RefreshCw
                className={cn(
                  "h-3 w-3 shrink-0 opacity-70",
                  isSyncing && "animate-spin text-[#ff5722]"
                )}
              />
            </button>

            <button
              type="button"
              onClick={() => handleCreateNote()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5722] hover:bg-[#e64a19] active:bg-[#d84315] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Nouvelle note</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SEARCH & CATEGORY FILTERS (Desktop + Mobile List view)            */}
        {/* ================================================================= */}
        <div
          className={cn(
            "flex-col gap-3",
            mobileView === "editor" ? "hidden lg:flex" : "flex"
          )}
        >
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
            {/* Search input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une note, réponse, tag..."
                className="w-full h-9 rounded-xl border border-gray-200 bg-white pl-8.5 pr-8 text-base sm:text-xs text-gray-900 shadow-2xs outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-orange-500/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Horizontal scrollable Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar min-w-0">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                  activeFilter === "all"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <span>Toutes</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    activeFilter === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  )}
                >
                  {counts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("pinned")}
                className={cn(
                  "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                  activeFilter === "pinned"
                    ? "border-amber-500 bg-amber-50 text-amber-900"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <Pin className="h-3 w-3 text-amber-500" />
                <span>Épinglées</span>
                <span className="rounded-full bg-amber-100/80 px-1.5 py-0.2 text-[10px] text-amber-800">
                  {counts.pinned}
                </span>
              </button>

              {NOTE_CATEGORIES.map((cat) => {
                const active = activeFilter === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveFilter(cat.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                      active
                        ? "border-[#ff5722] bg-orange-50 text-[#ff5722]"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cat.dotClass)} />
                    <span>{cat.shortLabel}</span>
                    <span className="text-[10px] opacity-75">
                      {counts.byCat[cat.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN SPLIT WORKSPACE (List Left + Focused Editor Right)           */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* --------------------------------------------------------------- */}
          {/* LEFT PANE: NOTES LIST                                           */}
          {/* --------------------------------------------------------------- */}
          <div
            className={cn(
              "lg:col-span-5 xl:col-span-4 flex-col gap-2.5 min-w-0 lg:max-h-[calc(100vh-225px)] lg:overflow-y-auto lg:pr-1",
              mobileView === "editor" ? "hidden lg:flex" : "flex"
            )}
          >
            {!isLoaded ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl border border-gray-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center space-y-3">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#ff5722]">
                  <StickyNote className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900">
                    {notes.length === 0
                      ? "Votre Bloc-Notes est vide"
                      : "Aucune note correspondante"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {notes.length === 0
                      ? "Ajoutez vos réponses textes, liens ou notes personnelles pour y accéder partout."
                      : "Essayez un autre mot-clé ou changez de catégorie."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {(searchQuery || activeFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveFilter("all");
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Tout afficher
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCreateNote()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff5722] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#e64a19] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Créer une note</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const catCfg =
                  NOTE_CATEGORIES.find((c) => c.key === note.category) ||
                  NOTE_CATEGORIES[4];
                const colorCfg =
                  NOTE_COLORS.find((c) => c.key === note.color) || NOTE_COLORS[0];
                const isSelected = note.id === selectedId;
                const isCopied = copiedId === note.id;

                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectNote(note.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectNote(note.id);
                      }
                    }}
                    className={cn(
                      "group relative rounded-xl border bg-white p-3.5 text-left transition cursor-pointer shadow-2xs min-w-0",
                      colorCfg.cardBorderClass,
                      isSelected
                        ? "lg:border-[#ff5722] lg:bg-orange-50/30 lg:ring-1 lg:ring-[#ff5722]/20 border-gray-200 hover:border-gray-300"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/40"
                    )}
                  >
                    {/* Card top meta + 1-tap Copy & Pin */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                          catCfg.badgeClass
                        )}
                      >
                        {renderCategoryIcon(catCfg.key, "h-2.5 w-2.5")}
                        <span>{catCfg.shortLabel}</span>
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(note, e)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-semibold transition cursor-pointer",
                            isCopied
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-50/80 text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900"
                          )}
                          title="Copier le contenu en 1 clic"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(note, e)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition cursor-pointer",
                            note.isPinned
                              ? "bg-amber-50 text-amber-500"
                              : "text-gray-300 hover:text-gray-600 lg:opacity-0 lg:group-hover:opacity-100"
                          )}
                          title={note.isPinned ? "Désépingler" : "Épingler"}
                        >
                          <Pin className={cn("h-3 w-3", note.isPinned && "fill-amber-400")} />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 break-words">
                      {note.title.trim() || "Note sans titre"}
                    </h3>

                    {/* Snippet */}
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2 whitespace-pre-line break-words leading-relaxed">
                      {note.content.trim() || "Aucun contenu — touchez pour rédiger..."}
                    </p>

                    {/* Footer: tags + date */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1 overflow-hidden min-w-0">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-medium text-gray-600 truncate max-w-[85px]"
                          >
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{note.tags.length - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatRelativeNoteDate(note.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* RIGHT PANE: DISTRACTION-FREE NOTE EDITOR                        */}
          {/* --------------------------------------------------------------- */}
          <div
            className={cn(
              "lg:col-span-7 xl:col-span-8 min-w-0",
              mobileView === "list" ? "hidden lg:block" : "block"
            )}
          >
            {selectedNote ? (
              <div
                className={cn(
                  "rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col",
                  selectedColorCfg.editorTintClass
                )}
              >
                {/* Sticky Top Editor Toolbar */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 backdrop-blur-xs px-3 py-2.5 sm:px-5 sm:py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={handleMobileBack}
                      className="inline-flex lg:hidden items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Notes</span>
                    </button>

                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 truncate">
                      {saveIndicator === "saving" ? (
                        <span className="text-[#ff5722]">Enregistrement...</span>
                      ) : (
                        <>
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Enregistré · {formatRelativeNoteDate(selectedNote.updatedAt)}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedNote)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold transition shadow-2xs cursor-pointer",
                        copiedId === selectedNote.id
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-900 hover:bg-gray-800 text-white"
                      )}
                    >
                      {copiedId === selectedNote.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copier le texte</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePin(selectedNote)}
                      className={cn(
                        "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition cursor-pointer",
                        selectedNote.isPinned
                          ? "border-amber-200 bg-amber-50 text-amber-600"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      )}
                      title={selectedNote.isPinned ? "Désépingler" : "Épingler en haut"}
                    >
                      <Pin
                        className={cn(
                          "h-4 w-4",
                          selectedNote.isPinned && "fill-amber-400"
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicateNote}
                      className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition cursor-pointer"
                      title="Dupliquer cette note"
                    >
                      <CopyPlus className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteId((prev) =>
                          prev === selectedNote.id ? null : selectedNote.id
                        )
                      }
                      className={cn(
                        "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition cursor-pointer",
                        confirmDeleteId === selectedNote.id
                          ? "border-red-300 bg-red-50 text-red-600"
                          : "border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      )}
                      title="Supprimer cette note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Non-Blocking Delete Confirmation Banner */}
                {confirmDeleteId === selectedNote.id && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-900">
                    <span className="font-semibold">
                      Supprimer définitivement cette note ?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(selectedNote.id)}
                        className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 cursor-pointer"
                      >
                        Confirmer la suppression
                      </button>
                    </div>
                  </div>
                )}

                {/* Title + Category & Color Controls */}
                <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 space-y-3 border-b border-gray-100/80">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => handleUpdateField("title", e.target.value)}
                    placeholder="Titre de la note (ex : Réponse RH LinkedIn, Liens portfolio...)"
                    className="w-full bg-transparent text-base sm:text-lg font-bold text-gray-900 placeholder:text-gray-300 outline-none"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Category selector pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                      {NOTE_CATEGORIES.map((cat) => {
                        const isCat = selectedNote.category === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => handleUpdateField("category", cat.key, true)}
                            className={cn(
                              "inline-flex items-center gap-1 shrink-0 rounded-lg border px-2 py-1 text-[11px] font-semibold transition cursor-pointer",
                              isCat
                                ? cat.badgeClass
                                : "border-gray-200 bg-white/80 text-gray-500 hover:bg-gray-50"
                            )}
                          >
                            {renderCategoryIcon(cat.key, "h-3 w-3")}
                            <span>{cat.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Color Dots */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10.5px] text-gray-400 font-medium mr-1">
                        Couleur :
                      </span>
                      {NOTE_COLORS.map((c) => {
                        const isSelectedColor = selectedNote.color === c.key;
                        return (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => handleUpdateField("color", c.key as NoteColor, true)}
                            title={c.label}
                            className={cn(
                              "h-5 w-5 rounded-full border border-black/10 transition cursor-pointer flex items-center justify-center",
                              c.swatchClass,
                              isSelectedColor && "ring-2 ring-offset-2 ring-gray-700 scale-105"
                            )}
                          >
                            {isSelectedColor && (
                              <Check className="h-2.5 w-2.5 text-white drop-shadow-xs" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quick Formatting Helper Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-1.5 sm:px-6 text-[11px]">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => insertAtCursor("• ")}
                      className="inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition cursor-pointer"
                      title="Insérer une puce"
                    >
                      <List className="h-3 w-3" />
                      <span>Puce</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor("☐ ")}
                      className="inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition cursor-pointer"
                      title="Insérer une case à cocher"
                    >
                      <CheckSquare className="h-3 w-3" />
                      <span>Case</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertAtCursor(new Date().toLocaleDateString("fr-FR"))
                      }
                      className="inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition cursor-pointer"
                      title="Insérer la date du jour"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Date</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor("\n──────────\n")}
                      className="inline-flex items-center gap-1 shrink-0 rounded-md px-2 py-1 font-medium text-gray-600 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-200 transition cursor-pointer"
                      title="Insérer un séparateur"
                    >
                      <span>— Ligne</span>
                    </button>
                  </div>

                  <span className="text-[10.5px] font-mono text-gray-400 shrink-0">
                    {textStats.words} mots · {textStats.chars} car.
                  </span>
                </div>

                {/* Main Textarea Editor */}
                <div className="p-4 sm:p-6 bg-white/60">
                  <textarea
                    ref={textareaRef}
                    value={selectedNote.content}
                    onChange={(e) => handleUpdateField("content", e.target.value)}
                    placeholder={
                      "Écrivez ici librement...\n\nExemples d'utilisation :\n• Réponses textes prêtes à copier pour LinkedIn, WhatsApp ou Email\n• Vos liens (Portfolio, GitHub, LinkedIn, Drive)\n• Informations personnelles, notes d'appel ou pense-bête"
                    }
                    className="w-full min-h-[290px] sm:min-h-[360px] lg:min-h-[400px] bg-transparent text-base sm:text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 outline-none resize-y"
                  />
                </div>

                {/* Detected Clickable Links Strip */}
                {detectedUrls.length > 0 && (
                  <div className="border-t border-gray-100 bg-emerald-50/40 px-4 py-2.5 sm:px-6 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-800 shrink-0">
                      Liens détectés :
                    </span>
                    {detectedUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 transition max-w-[230px] sm:max-w-[300px]"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Tags Editor Footer */}
                <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-3 sm:px-6 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 mr-1">
                      <Tag className="h-3 w-3" />
                      Tags :
                    </span>

                    {selectedNote.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-gray-700"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                          aria-label={`Retirer le tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }}
                      className="inline-flex items-center gap-1"
                    >
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="+ tag..."
                        className="w-24 sm:w-28 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-base sm:text-[11px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#ff5722]"
                      />
                      {tagInput.trim() && (
                        <button
                          type="submit"
                          className="rounded-full bg-[#ff5722] px-2 py-0.5 text-[10px] font-bold text-white cursor-pointer"
                        >
                          OK
                        </button>
                      )}
                    </form>
                  </div>

                  {/* Quick Suggested Tags */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                    <span className="text-[10px] text-gray-400 shrink-0">Suggestions :</span>
                    {SUGGESTED_TAGS.filter(
                      (st) =>
                        !selectedNote.tags.some(
                          (t) => t.toLowerCase() === st.toLowerCase()
                        )
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleAddTag(st)}
                        className="shrink-0 rounded-full border border-dashed border-gray-300 bg-white/70 px-2 py-0.2 text-[10px] text-gray-500 hover:border-[#ff5722] hover:text-[#ff5722] transition cursor-pointer"
                      >
                        + {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop Empty Selection State */
              <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center space-y-5 shadow-2xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5722] border border-orange-100">
                  <StickyNote className="h-7 w-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h2 className="text-base font-bold text-gray-900">
                    Sélectionnez ou créez une note
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Gardez sous la main vos réponses textes prêtes à envoyer, liens importants, mémos rapides et idées.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateNote("reply", "Réponse rapide")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100/70 transition cursor-pointer"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    <span>+ Réponse texte</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateNote("info", "Informations utiles")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/70 transition cursor-pointer"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>+ Info / Liens</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateNote("idea")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff5722] px-4 py-2 text-xs font-bold text-white hover:bg-[#e64a19] transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouvelle note libre</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE FLOATING ACTION BUTTON (FAB)                                 */}
      {/* =================================================================== */}
      {mobileView === "list" && (
        <button
          type="button"
          onClick={() => handleCreateNote()}
          className="fixed bottom-5 right-5 z-30 flex lg:hidden h-14 w-14 items-center justify-center rounded-full bg-[#ff5722] text-white shadow-lg shadow-orange-500/30 active:scale-95 transition cursor-pointer"
          aria-label="Créer une nouvelle note"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
