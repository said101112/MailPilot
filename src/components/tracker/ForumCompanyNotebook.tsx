"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Copy,
  Cpu,
  Database,
  Download,
  Edit2,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  Upload,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CompanyLogo from "./CompanyLogo";
import {
  FORUM_FILTER_PRESETS,
  loadForumCompanies,
  parseRawForumText,
  resetForumCompaniesToDefault,
  saveForumCompanies,
  syncForumCompaniesToSupabase,
  type ForumCompanyEntry,
  type ForumVisitStatus,
} from "@/lib/tracker/forumDirectory";

const STATUS_CONFIG: Record<
  ForumVisitStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  priority: {
    label: "⭐ Priorité Haute",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Flame,
  },
  to_visit: {
    label: "À visiter",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: BookOpen,
  },
  cv_submitted: {
    label: "CV Déposé",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: CheckCircle2,
  },
  contact_made: {
    label: "Contact Obtenu",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: UserCheck,
  },
  skip: {
    label: "Non intéressé",
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    icon: X,
  },
};

export default function ForumCompanyNotebook() {
  const [companies, setCompanies] = useState<ForumCompanyEntry[]>(() => loadForumCompanies());
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState("");
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ForumCompanyEntry | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New company form state
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCategory, setNewCompanyCategory] = useState("1. Entreprises IT et sociétés de services numériques");
  const [newCompanyDomains, setNewCompanyDomains] = useState("");
  const [newCompanyStand, setNewCompanyStand] = useState("");
  const [newCompanyNotes, setNewCompanyNotes] = useState("");
  const [newCompanyTagline, setNewCompanyTagline] = useState("");

  const updateAndSave = (next: ForumCompanyEntry[]) => {
    setCompanies(next);
    saveForumCompanies(next);
  };

  const handleStatusChange = (id: string, status: ForumVisitStatus) => {
    const next = companies.map((c) =>
      c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
    );
    updateAndSave(next);
    toast.success(`Statut mis à jour : ${STATUS_CONFIG[status].label}`);
  };

  const handleNotesChange = (id: string, notes: string) => {
    const next = companies.map((c) =>
      c.id === id ? { ...c, notes, updatedAt: new Date().toISOString() } : c
    );
    updateAndSave(next);
  };

  const handleStandChange = (id: string, stand: string) => {
    const next = companies.map((c) =>
      c.id === id ? { ...c, stand, updatedAt: new Date().toISOString() } : c
    );
    updateAndSave(next);
  };

  const handleDelete = (id: string) => {
    const next = companies.filter((c) => c.id !== id);
    updateAndSave(next);
    toast.info("Entreprise retirée du bloc-notes.");
  };

  const handleSyncSupabase = async () => {
    setIsSyncingSupabase(true);
    try {
      const res = await syncForumCompaniesToSupabase(companies);
      toast.success(
        `Synchronisé avec Supabase ! ${res.created} ajoutée(s), ${res.updated} mise(s) à jour.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur de synchronisation avec Supabase."
      );
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleImportSubmit = () => {
    if (!rawImportText.trim()) {
      toast.error("Veuillez coller du texte à importer.");
      return;
    }
    const parsed = parseRawForumText(rawImportText);
    if (parsed.length === 0) {
      toast.error("Aucune entreprise n'a pu être extraite. Vérifiez le format.");
      return;
    }
    const next = [...companies, ...parsed];
    updateAndSave(next);
    toast.success(`${parsed.length} entreprise(s) importée(s) avec succès !`);
    setRawImportText("");
    setIsImportModalOpen(false);
  };

  const handleAddCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast.error("Veuillez renseigner le nom de l'entreprise.");
      return;
    }

    const domainsList = newCompanyDomains
      .split(/[·|,;]/)
      .map((d) => d.trim())
      .filter(Boolean);

    const newEntry: ForumCompanyEntry = {
      id: `forum-custom-${Date.now()}`,
      category: newCompanyCategory.trim() || "1. Entreprises IT et sociétés de services numériques",
      companyName: newCompanyName.trim(),
      domain: `${newCompanyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      logoUrl: null,
      website: null,
      domains: domainsList.length > 0 ? domainsList : [newCompanyDomains.trim()],
      rawDomainsText: newCompanyDomains.trim(),
      tagline: newCompanyTagline.trim() || null,
      stand: newCompanyStand.trim() || null,
      status: "to_visit",
      notes: newCompanyNotes.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    const next = [newEntry, ...companies];
    updateAndSave(next);
    toast.success(`Entreprise ${newEntry.companyName} ajoutée au bloc-notes !`);

    setNewCompanyName("");
    setNewCompanyDomains("");
    setNewCompanyStand("");
    setNewCompanyNotes("");
    setNewCompanyTagline("");
    setIsAddModalOpen(false);
  };

  // Profile matching predicate
  const matchesDomainPreset = (entry: ForumCompanyEntry, presetId: string): boolean => {
    if (presetId === "all") return true;
    if (presetId === "top_data") {
      return Boolean(entry.topObjective?.includes("data"));
    }
    if (presetId === "top_dev") {
      return Boolean(entry.topObjective?.includes("dev"));
    }
    if (presetId === "top_cloud") {
      return Boolean(entry.topObjective?.includes("cloud"));
    }
    if (presetId === "top_sap") {
      return Boolean(entry.topObjective?.includes("sap"));
    }

    const preset = FORUM_FILTER_PRESETS.find((p) => p.id === presetId);
    if (!preset || !preset.keywords) return true;

    const haystack = (
      entry.rawDomainsText +
      " " +
      entry.domains.join(" ") +
      " " +
      (entry.notes || "")
    ).toLowerCase();

    return preset.keywords.some((kw) => haystack.includes(kw));
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // Domain preset filter
      if (!matchesDomainPreset(c, selectedFilter)) return false;

      // Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullContent = (
          c.companyName +
          " " +
          c.rawDomainsText +
          " " +
          (c.stand || "") +
          " " +
          (c.notes || "") +
          " " +
          (c.tagline || "") +
          " " +
          c.category
        ).toLowerCase();
        if (!fullContent.includes(query)) return false;
      }

      return true;
    });
  }, [companies, selectedFilter, statusFilter, searchQuery]);

  // Group by category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ForumCompanyEntry[]> = {};
    for (const item of filteredCompanies) {
      const cat = item.category || "Autres Entreprises";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredCompanies]);

  // Statistics
  const stats = useMemo(() => {
    const total = companies.length;
    const priority = companies.filter((c) => c.status === "priority").length;
    const cvSubmitted = companies.filter((c) => c.status === "cv_submitted").length;
    const contactMade = companies.filter((c) => c.status === "contact_made").length;
    const toVisit = companies.filter((c) => c.status === "to_visit").length;
    return { total, priority, cvSubmitted, contactMade, toVisit };
  }, [companies]);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff5722] text-white shadow-2xs">
                <Building2 className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Bloc-Notes & Guide Forum Entreprises
              </h2>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-[#ff5722]">
                {companies.length} entreprises répertoriées
              </span>
            </div>
            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
              Votre antisèche pour les salons de recrutement : repérez instantanément qui recrute en{" "}
              <strong className="text-gray-900 font-bold">DATA / IA</strong>,{" "}
              <strong className="text-gray-900 font-bold">DEV</strong>,{" "}
              <strong className="text-gray-900 font-bold">CLOUD</strong> ou{" "}
              <strong className="text-gray-900 font-bold">CYBER</strong>, notez le numéro de stand et gardez le fil de vos échanges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="editorial-button-primary h-9 px-3.5 text-xs flex items-center gap-1.5 font-bold cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              title="Coller une liste ou un document pour importer"
            >
              <Upload className="h-3.5 w-3.5 text-[#ff5722]" />
              <span>Coller / Importer</span>
            </button>

            <button
              type="button"
              onClick={handleSyncSupabase}
              disabled={isSyncingSupabase}
              className="h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition disabled:opacity-50"
              title="Sauvegarder dans la table companies de Supabase"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncingSupabase && "animate-spin")} />
              <span>{isSyncingSupabase ? "Sauvegarde..." : "Sauvegarder Supabase"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm("Recharger la liste complète officielle (34 entreprises avec les 3 catégories et objectifs) ?")) {
                  const refreshed = resetForumCompaniesToDefault();
                  setCompanies(refreshed);
                  toast.success("Liste complète rechargée (34 entreprises) !");
                }
              }}
              className="h-9 px-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 text-xs flex items-center gap-1 cursor-pointer shadow-2xs transition"
              title="Recharger les 34 entreprises officielles"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Réinitialiser (34)</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-orange-100/80">
          <div className="rounded-xl bg-white/90 p-2.5 border border-gray-100 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-gray-400">Total Stands</span>
            <div className="text-base font-extrabold text-gray-900">{stats.total}</div>
          </div>
          <div className="rounded-xl bg-amber-50/80 p-2.5 border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700">⭐ Prioritaires</span>
            <div className="text-base font-extrabold text-amber-900">{stats.priority}</div>
          </div>
          <div className="rounded-xl bg-blue-50/80 p-2.5 border border-blue-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-700">À visiter</span>
            <div className="text-base font-extrabold text-blue-900">{stats.toVisit}</div>
          </div>
          <div className="rounded-xl bg-purple-50/80 p-2.5 border border-purple-200/80 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-purple-700">CV Déposés</span>
            <div className="text-base font-extrabold text-purple-900">{stats.cvSubmitted}</div>
          </div>
          <div className="rounded-xl bg-emerald-50/80 p-2.5 border border-emerald-200/80 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-emerald-700">Contacts Faits</span>
            <div className="text-base font-extrabold text-emerald-900">{stats.contactMade}</div>
          </div>
        </div>
      </div>

      {/* FILTER BAR: BY TRACK & SEARCH */}
      <div className="space-y-3">
        {/* Profile pills (DATA, DEV, CLOUD, CYBER...) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="h-3.5 w-3.5 text-[#ff5722]" />
            <span>Profil recherché :</span>
          </span>
          {FORUM_FILTER_PRESETS.map((preset) => {
            const isSelected = selectedFilter === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedFilter(preset.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border",
                  isSelected
                    ? "bg-[#ff5722] text-white border-[#ff5722] shadow-xs font-bold"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une entreprise, un domaine, un stand ou un mot-clé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="editorial-input pl-9 h-9 text-xs w-full bg-white shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="editorial-input h-9 text-xs font-medium bg-white px-2.5 cursor-pointer shadow-2xs"
            >
              <option value="all">Tous les statuts</option>
              <option value="priority">⭐ Priorité Haute</option>
              <option value="to_visit">À visiter</option>
              <option value="cv_submitted">CV Déposé</option>
              <option value="contact_made">Contact Obtenu</option>
              <option value="skip">Non intéressé</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LIST / TABLE ACCORDING TO USER'S SCREENSHOT */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center space-y-3">
          <Building2 className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Aucune entreprise trouvée</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Aucune entreprise ne correspond au filtre sélectionné. Essayez d&apos;élargir vos critères de recherche.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedFilter("all");
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="editorial-button-secondary text-xs px-3 py-1.5"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ff5722]" />
                  <span>{category}</span>
                  <span className="text-gray-400 font-semibold lowercase">
                    ({items.length} {items.length > 1 ? "entreprises" : "entreprise"})
                  </span>
                </h3>
              </div>

              {/* Table Styled Container */}
              <div className="rounded-2xl border border-gray-200/90 bg-white shadow-2xs divide-y divide-gray-100 overflow-hidden">
                {/* Table Header (hidden on mobile, visible on desktop) */}
                <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <div className="col-span-3">Entreprise</div>
                  <div className="col-span-5">Domaines principaux / Profils</div>
                  <div className="col-span-2">Stand & Statut</div>
                  <div className="col-span-2 text-right">Bloc-Notes & Actions</div>
                </div>

                {/* Rows */}
                {items.map((entry) => {
                  const statusConf = STATUS_CONFIG[entry.status];
                  const StatusIcon = statusConf.icon;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "p-4 sm:px-4 sm:py-3.5 transition hover:bg-orange-50/20",
                        entry.status === "priority" && "bg-amber-50/30"
                      )}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start sm:items-center">
                        {/* Column 1: Company Logo + Name + Tagline */}
                        <div className="sm:col-span-3 flex items-center gap-3">
                          <CompanyLogo
                            name={entry.companyName}
                            domain={entry.domain}
                            logoUrl={entry.logoUrl}
                            className="h-9 w-9 shrink-0 rounded-lg shadow-2xs border border-gray-100"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 truncate">
                                {entry.companyName}
                              </span>
                              {entry.status === "priority" && (
                                <span className="text-amber-500" title="Priorité haute">
                                  ★
                                </span>
                              )}
                            </div>
                            {entry.tagline && (
                              <span className="inline-block mt-0.5 rounded px-1.5 py-0.2 bg-gray-100 text-[10px] font-medium text-gray-600 truncate max-w-[140px]">
                                {entry.tagline}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Column 2: Domaines principaux (matches user screenshot with · separator) */}
                        <div className="sm:col-span-5">
                          <div className="text-xs font-medium text-gray-700 leading-relaxed flex flex-wrap items-center gap-1">
                            {entry.domains.map((dom, idx) => {
                              const isHighlighted =
                                selectedFilter !== "all" &&
                                FORUM_FILTER_PRESETS.find((p) => p.id === selectedFilter)
                                  ?.keywords?.some((kw) => dom.toLowerCase().includes(kw));

                              return (
                                <span key={idx} className="inline-flex items-center">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[11px] font-semibold transition",
                                      isHighlighted
                                        ? "bg-[#ff5722] text-white shadow-2xs font-bold"
                                        : "bg-gray-100/90 text-gray-800 hover:bg-gray-200"
                                    )}
                                  >
                                    {dom}
                                  </span>
                                  {idx < entry.domains.length - 1 && (
                                    <span className="text-gray-300 mx-1 font-bold">·</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 3: Stand & Status Selector */}
                        <div className="sm:col-span-2 space-y-1.5">
                          {/* Stand Input */}
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="Stand ex: A12"
                              value={entry.stand || ""}
                              onChange={(e) => handleStandChange(entry.id, e.target.value)}
                              className="text-[11px] font-semibold text-gray-800 bg-transparent hover:bg-gray-50 focus:bg-white rounded px-1 py-0.5 border border-transparent focus:border-gray-200 w-full"
                            />
                          </div>

                          {/* Status Chip / Dropdown */}
                          <div className="relative">
                            <select
                              value={entry.status}
                              onChange={(e) =>
                                handleStatusChange(entry.id, e.target.value as ForumVisitStatus)
                              }
                              className={cn(
                                "w-full text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer appearance-none",
                                statusConf.bg,
                                statusConf.text,
                                statusConf.border
                              )}
                            >
                              <option value="to_visit">À visiter</option>
                              <option value="priority">⭐ Priorité Haute</option>
                              <option value="cv_submitted">📄 CV Déposé</option>
                              <option value="contact_made">🤝 Contact Obtenu</option>
                              <option value="skip">❌ Non intéressé</option>
                            </select>
                          </div>
                        </div>

                        {/* Column 4: Quick Notes & Actions */}
                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCompany(entry)}
                            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                            title="Ouvrir le bloc-notes complet"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Supprimer cette entreprise"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable/Inline Notes Preview */}
                      {entry.notes && (
                        <div className="mt-2 text-[11px] text-gray-600 bg-gray-50/80 rounded-lg p-2 border border-gray-100 flex items-start gap-1.5">
                          <BookOpen className="h-3 w-3 text-[#ff5722] shrink-0 mt-0.5" />
                          <span className="flex-1 font-medium">{entry.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD COMPANY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#ff5722]" />
                <span>Ajouter une entreprise au forum</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCompanySubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Nom de l&apos;entreprise *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Capgemini, Inetum, S2M..."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="editorial-input h-9 text-xs w-full mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Catégorie / Secteur</label>
                <input
                  type="text"
                  placeholder="Ex: 1. Entreprises IT et sociétés de services numériques"
                  value={newCompanyCategory}
                  onChange={(e) => setNewCompanyCategory(e.target.value)}
                  className="editorial-input h-9 text-xs w-full mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Domaines principaux / Profils recherchés
                </label>
                <input
                  type="text"
                  placeholder="DEV · DATA/IA · CLOUD/DEVOPS · CYBER"
                  value={newCompanyDomains}
                  onChange={(e) => setNewCompanyDomains(e.target.value)}
                  className="editorial-input h-9 text-xs w-full mt-1"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Séparez par des puces (·), des virgules ou des barres
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Numéro de stand</label>
                  <input
                    type="text"
                    placeholder="Stand A12"
                    value={newCompanyStand}
                    onChange={(e) => setNewCompanyStand(e.target.value)}
                    className="editorial-input h-9 text-xs w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Slogan / Tag</label>
                  <input
                    type="text"
                    placeholder="Make it real."
                    value={newCompanyTagline}
                    onChange={(e) => setNewCompanyTagline(e.target.value)}
                    className="editorial-input h-9 text-xs w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Bloc-notes / Ce qu&apos;il faut retenir</label>
                <textarea
                  rows={3}
                  placeholder="Prend les profils Data PFE, stand très demandé, parler à M. X..."
                  value={newCompanyNotes}
                  onChange={(e) => setNewCompanyNotes(e.target.value)}
                  className="editorial-textarea text-xs w-full mt-1 p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="editorial-button-secondary text-xs px-3 py-1.5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="editorial-button-primary text-xs px-4 py-1.5 font-bold"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SMART PASTE / IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#ff5722]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Coller / Importer la liste du forum
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Copiez-collez directement les lignes depuis votre document ou tableau (avec séparateurs tabulation, deux-points ou tiret) :
            </p>

            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[11px] font-mono text-gray-600">
              Inetum : DEV · DATA/BI/IA · CLOUD/DEVOPS<br />
              Sofrecom : DEV · DATA/IA · CLOUD/DEVOPS · CYBER<br />
              Capgemini : DEV · DATA/IA · CLOUD/DEVOPS · CYBER
            </div>

            <textarea
              rows={8}
              placeholder="Collez ici votre texte..."
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              className="editorial-textarea w-full text-xs font-mono p-3 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                L&apos;import ajoute ces entreprises à votre liste existante.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="editorial-button-secondary text-xs px-3 py-1.5"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="editorial-button-primary text-xs px-4 py-1.5 font-bold"
                >
                  Extraire & Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT COMPANY & NOTES MODAL */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <CompanyLogo
                  name={editingCompany.companyName}
                  domain={editingCompany.domain}
                  logoUrl={editingCompany.logoUrl}
                  className="h-8 w-8 rounded-lg"
                />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingCompany.companyName} — Bloc-Notes & Stand
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Domaines principaux</label>
                <input
                  type="text"
                  value={editingCompany.rawDomainsText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const doms = text.split(/[·|,;]/).map((d) => d.trim()).filter(Boolean);
                    setEditingCompany({
                      ...editingCompany,
                      rawDomainsText: text,
                      domains: doms,
                    });
                  }}
                  className="editorial-input h-9 text-xs w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Numéro de Stand</label>
                  <input
                    type="text"
                    placeholder="Stand A12"
                    value={editingCompany.stand || ""}
                    onChange={(e) =>
                      setEditingCompany({ ...editingCompany, stand: e.target.value })
                    }
                    className="editorial-input h-9 text-xs w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Statut au forum</label>
                  <select
                    value={editingCompany.status}
                    onChange={(e) =>
                      setEditingCompany({
                        ...editingCompany,
                        status: e.target.value as ForumVisitStatus,
                      })
                    }
                    className="editorial-input h-9 text-xs w-full mt-1 font-semibold"
                  >
                    <option value="to_visit">À visiter</option>
                    <option value="priority">⭐ Priorité Haute</option>
                    <option value="cv_submitted">📄 CV Déposé</option>
                    <option value="contact_made">🤝 Contact Obtenu</option>
                    <option value="skip">❌ Non intéressé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Bloc-Notes personnel / Notes de passage
                </label>
                <textarea
                  rows={5}
                  placeholder="Ce qu'il faut se rappeler : noms des interlocuteurs, projets phares à citer, grille d'indemnité évoquée, email du manager..."
                  value={editingCompany.notes || ""}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, notes: e.target.value })
                  }
                  className="editorial-textarea text-xs w-full mt-1 p-3 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="editorial-button-secondary text-xs px-3 py-1.5"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = companies.map((c) =>
                    c.id === editingCompany.id
                      ? { ...editingCompany, updatedAt: new Date().toISOString() }
                      : c
                  );
                  updateAndSave(next);
                  toast.success("Modifications enregistrées !");
                  setEditingCompany(null);
                }}
                className="editorial-button-primary text-xs px-4 py-1.5 font-bold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
