"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_CATEGORIES,
  DEFAULT_CHECKLIST_COMPANIES,
  deleteChecklistCompanyRemote,
  getCompanyLogoUrl,
  getLinkedInSearchUrl,
  loadLocalChecklist,
  saveLocalChecklist,
  syncChecklistWithSupabase,
  upsertChecklistCompanyRemote,
  type ChecklistCompany,
  type CompanyCategoryKey,
} from "@/lib/tracker/companyChecklist";
import BulkAddCompaniesModal from "@/components/tracker/BulkAddCompaniesModal";
import BookmarkletHelperModal from "@/components/tracker/BookmarkletHelperModal";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 0 0 1.54-1.53c0-.85-.69-1.54-1.54-1.54a1.54 1.54 0 0 0-1.54 1.54c0 .84.69 1.53 1.54 1.53m1.37 9.74v-8.37H5.09v8.37z" />
    </svg>
  );
}

export default function CompanyChecklistPage() {
  const [companies, setCompanies] = useState<ChecklistCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Quick inline add state
  const [inlineName, setInlineName] = useState("");
  const [inlineCategory, setInlineCategory] = useState<CompanyCategoryKey>("dev_tech");
  const [inlineLinkedin, setInlineLinkedin] = useState("");

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBookmarkletModalOpen, setIsBookmarkletModalOpen] = useState(false);

  // Note editing modal or inline
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Initial load
  useEffect(() => {
    const local = loadLocalChecklist();
    setCompanies(local);

    void handleSupabaseSync();

    // Check if opened from Bookmarklet with query parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const addName = params.get("addName");
      const addUrl = params.get("addUrl");

      if (addName) {
        const newComp: ChecklistCompany = {
          id: `chk-${Date.now()}`,
          name: decodeURIComponent(addName),
          category: "dev_tech",
          isDone: false,
          linkedinUrl: addUrl ? decodeURIComponent(addUrl) : "",
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updated = [newComp, ...local];
        setCompanies(updated);
        saveLocalChecklist(updated);
        void upsertChecklistCompanyRemote(newComp);
        toast.success(`Entreprise "${newComp.name}" ajoutée depuis le Bookmarklet !`);

        // Clean url
        window.history.replaceState({}, "", "/tracker/checklist");
      }
    }
  }, []);

  const handleSupabaseSync = async () => {
    setIsSyncing(true);
    try {
      const synced = await syncChecklistWithSupabase();
      setCompanies(synced);
    } catch {
      // offline fallback
    } finally {
      setIsSyncing(false);
    }
  };

  const persistState = (newCompanies: ChecklistCompany[]) => {
    setCompanies(newCompanies);
    saveLocalChecklist(newCompanies);
  };

  // 1-Click CHECK Toggle (Fast Optimistic UI)
  const handleToggleDone = (id: string) => {
    const target = companies.find((c) => c.id === id);
    if (!target) return;

    const nextIsDone = !target.isDone;
    const nextDoneAt = nextIsDone ? new Date().toISOString() : null;

    const updated = companies.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          isDone: nextIsDone,
          doneAt: nextDoneAt,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    persistState(updated);

    const updatedItem = updated.find((c) => c.id === id)!;
    void upsertChecklistCompanyRemote(updatedItem);

    if (nextIsDone) {
      toast.success(`✅ ${target.name} marqué comme passé !`);
    } else {
      toast.info(`↩️ ${target.name} remis à faire.`);
    }
  };

  // Quick Inline Add
  const handleInlineAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = inlineName.trim();
    if (!name) {
      toast.error("Veuillez renseigner le nom de l'entreprise.");
      return;
    }

    const newCompany: ChecklistCompany = {
      id: `chk-${Date.now()}`,
      name,
      category: inlineCategory,
      isDone: false,
      linkedinUrl: inlineLinkedin.trim() || undefined,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newCompany, ...companies];
    persistState(updated);
    void upsertChecklistCompanyRemote(newCompany);

    toast.success(`"${name}" ajouté à la checklist !`);
    setInlineName("");
    setInlineLinkedin("");
  };

  // Bulk Add
  const handleBulkAdd = (bulkItems: ChecklistCompany[]) => {
    const updated = [...bulkItems, ...companies];
    persistState(updated);

    for (const item of bulkItems) {
      void upsertChecklistCompanyRemote(item);
    }
  };

  // Delete
  const handleDeleteCompany = (id: string, name: string) => {
    if (!window.confirm(`Supprimer "${name}" de la checklist ?`)) return;
    const updated = companies.filter((c) => c.id !== id);
    persistState(updated);
    void deleteChecklistCompanyRemote(id);
    toast.info("Entreprise supprimée.");
  };

  // Save Note
  const handleSaveNote = (id: string) => {
    const updated = companies.map((c) => {
      if (c.id === id) {
        return { ...c, notes: noteDraft.trim(), updatedAt: new Date().toISOString() };
      }
      return c;
    });
    persistState(updated);
    const item = updated.find((c) => c.id === id);
    if (item) void upsertChecklistCompanyRemote(item);
    setEditingNoteId(null);
    toast.success("Note enregistrée.");
  };

  // Progression Statistics per category
  const stats = useMemo(() => {
    const total = companies.length;
    const done = companies.filter((c) => c.isDone).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const catStats: Record<string, { total: number; done: number; percent: number }> = {};
    for (const cat of CHECKLIST_CATEGORIES) {
      const itemsInCat = companies.filter((c) => c.category === cat.key);
      const doneInCat = itemsInCat.filter((c) => c.isDone).length;
      catStats[cat.key] = {
        total: itemsInCat.length,
        done: doneInCat,
        percent: itemsInCat.length > 0 ? Math.round((doneInCat / itemsInCat.length) * 100) : 0,
      };
    }

    return { total, done, percent, catStats };
  }, [companies]);

  // Filtered companies
  const displayedCompanies = useMemo(() => {
    return companies.filter((comp) => {
      // Category filter
      if (selectedCategory !== "all" && comp.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === "todo" && comp.isDone) return false;
      if (statusFilter === "done" && !comp.isDone) return false;

      // Search query (name or notes)
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const inName = comp.name.toLowerCase().includes(q);
      const inNotes = (comp.notes || "").toLowerCase().includes(q);
      return inName || inNotes;
    });
  }, [companies, selectedCategory, statusFilter, searchQuery]);

  return (
    <div className="page-shell min-h-screen bg-[#fafaf9] pb-16">
      <div className="mx-auto max-w-[1140px] space-y-6">
        {/* ========================================================================= */}
        {/* TOP HEADER BANNER                                                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <CheckSquare className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Checklist Entreprises Cibles
              </h1>
              <p className="text-xs text-gray-500">
                Suivi ultra-rapide des entreprises à contacter (Check &amp; Next) par spécialité technique.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBookmarkletModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-2xs"
              title="Ajouter une entreprise en 1 clic directement depuis LinkedIn"
            >
              <Bookmark className="h-4 w-4 text-blue-600" />
              <span>Bouton LinkedIn (Gratuit)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="h-4 w-4 text-[#ff5722]" />
              <span>Ajouter en masse (Coller liste)</span>
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
        {/* GLOBAL PROGRESSION BAR                                                    */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Progression Globale :
              </span>
              <span className="text-sm font-extrabold text-gray-900">
                {stats.done} / {stats.total} entreprises traitées ({stats.percent}%)
              </span>
            </div>

            <div className="text-xs font-medium text-gray-500">
              {stats.total - stats.done > 0 ? (
                <span>Il vous reste <strong>{stats.total - stats.done}</strong> entreprise(s) à traiter</span>
              ) : (
                <span className="text-emerald-600 font-bold">🎉 Toutes les entreprises de la checklist sont faites !</span>
              )}
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${stats.percent}%` }}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH & QUICK CATEGORY TABS                                              */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          {/* Search Anti-Forget Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Vérifier si une entreprise est déjà faite... (Tapez ex: Docaposte, VISEO, Capgemini)"
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-gray-900 shadow-2xs focus:border-[#ff5722] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Tabs with Mini Progress */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "flex items-center gap-2 shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer border",
                selectedCategory === "all"
                  ? "bg-gray-900 text-white border-gray-900 shadow-2xs font-bold"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <span>Toutes les catégories</span>
              <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                {stats.done}/{stats.total}
              </span>
            </button>

            {CHECKLIST_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              const catStat = stats.catStats[cat.key] || { total: 0, done: 0, percent: 0 };

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer border",
                    isSelected
                      ? "bg-white border-[#ff5722] text-[#ff5722] ring-2 ring-orange-200/60 shadow-xs font-bold"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isSelected ? "bg-orange-100 text-[#ff5722]" : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {catStat.done}/{catStat.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status Sub-filter pills (Tous, À faire, Déjà faites) */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                  statusFilter === "all"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Tous ({displayedCompanies.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("todo")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                  statusFilter === "todo"
                    ? "bg-white text-orange-600 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                À faire uniquement
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("done")}
                className={cn(
                  "rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer",
                  statusFilter === "done"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                Déjà faites
              </button>
            </div>

            <span className="text-[11px] text-gray-400">
              {displayedCompanies.length} entreprise{displayedCompanies.length > 1 ? "s" : ""} affichée{displayedCompanies.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* QUICK INLINE ADD BAR (1 LINE)                                             */}
        {/* ========================================================================= */}
        <form
          onSubmit={handleInlineAdd}
          className="flex flex-col sm:flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xs"
        >
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              value={inlineName}
              onChange={(e) => setInlineName(e.target.value)}
              placeholder="+ Nom de l'entreprise (ex: Docaposte Maroc, Capgemini...)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-xs font-medium text-gray-900 focus:border-[#ff5722] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={inlineCategory}
              onChange={(e) => setInlineCategory(e.target.value as CompanyCategoryKey)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 shadow-2xs focus:border-[#ff5722] focus:outline-none"
            >
              {CHECKLIST_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ff5722] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#f4511e] transition cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Ajouter</span>
          </button>
        </form>

        {/* ========================================================================= */}
        {/* CHECKLIST TABLE / CARDS                                                   */}
        {/* ========================================================================= */}
        {displayedCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3 shadow-2xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckSquare className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">
              Aucune entreprise trouvée
            </h3>
            <p className="mx-auto max-w-sm text-xs text-gray-500">
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}". Utilisez la barre d'ajout rapide pour l'ajouter !`
                : "Toutes les entreprises de ce filtre sont cochées ou la catégorie est vide."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden divide-y divide-gray-100">
            {displayedCompanies.map((comp) => {
              const catConfig =
                CHECKLIST_CATEGORIES.find((c) => c.key === comp.category) ||
                CHECKLIST_CATEGORIES[0];
              const logoUrl = getCompanyLogoUrl(comp.name, comp.website);
              const linkedInUrl = comp.linkedinUrl || getLinkedInSearchUrl(comp.name);
              const isEditingNote = editingNoteId === comp.id;

              return (
                <div
                  key={comp.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 sm:py-3.5 gap-3 transition-colors",
                    comp.isDone
                      ? "bg-gray-50/70 opacity-80"
                      : "bg-white hover:bg-gray-50/50"
                  )}
                >
                  {/* Left: CHECK button + Logo + Name + Category */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Big 1-Click Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleDone(comp.id)}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 transition-all cursor-pointer shadow-2xs",
                        comp.isDone
                          ? "bg-emerald-500 border-emerald-500 text-white scale-105"
                          : "border-gray-300 bg-white hover:border-[#ff5722] hover:bg-orange-50/30"
                      )}
                      title={comp.isDone ? "Marquer comme à faire" : "Marquer comme passé (Fait)"}
                    >
                      {comp.isDone && <Check className="h-4 w-4 stroke-[3]" />}
                    </button>

                    {/* Company Logo / Favicon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt={comp.name}
                        className="h-5 w-5 object-contain"
                        onError={(e) => {
                          // fallback to initials
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <Building2 className="h-4 w-4 text-gray-400 absolute" style={{ zIndex: 0 }} />
                    </div>

                    {/* Name + Status + Category */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-xs sm:text-sm font-bold text-gray-900",
                            comp.isDone && "line-through text-gray-500 font-semibold"
                          )}
                        >
                          {comp.name}
                        </span>

                        {/* Category Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border shrink-0",
                            catConfig.badgeBg,
                            catConfig.badgeText
                          )}
                        >
                          <span>{catConfig.emoji}</span>
                          <span className="hidden sm:inline">{catConfig.label}</span>
                        </span>
                      </div>

                      {/* Subtitle / Timestamp */}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                        {comp.isDone ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Passé {comp.doneAt ? `le ${new Date(comp.doneAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}` : "récemment"}
                          </span>
                        ) : (
                          <span className="text-gray-400">Non traité (À faire)</span>
                        )}

                        {comp.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[220px] text-gray-600 italic">
                              « {comp.notes} »
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick LinkedIn Action + Notes + Delete */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {/* LinkedIn Quick Redirect */}
                    <a
                      href={linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                      title="Ouvrir la page LinkedIn de cette entreprise"
                    >
                      <LinkedinIcon className="h-3 w-3 text-blue-600" />
                      <span>LinkedIn</span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>

                    {/* Note Editor */}
                    {isEditingNote ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Note rapide..."
                          className="rounded-lg border border-gray-300 px-2 py-0.5 text-xs w-36 text-gray-900 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNote(comp.id);
                            if (e.key === "Escape") setEditingNoteId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(comp.id)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(comp.id);
                          setNoteDraft(comp.notes || "");
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                        title={comp.notes ? "Modifier la note" : "Ajouter une note"}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCompany(comp.id, comp.name)}
                      className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Supprimer de la checklist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <BulkAddCompaniesModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultCategory={(selectedCategory !== "all" ? selectedCategory : "dev_tech") as CompanyCategoryKey}
        onAddCompanies={handleBulkAdd}
      />

      <BookmarkletHelperModal
        isOpen={isBookmarkletModalOpen}
        onClose={() => setIsBookmarkletModalOpen(false)}
      />
    </div>
  );
}

