"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Globe,
  History as HistoryIcon,
  Loader2,
  Mail,
  MinusSquare,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import CleanDataModal from "@/components/CleanDataModal";
import BulkRelanceModal, { type RelanceTarget } from "@/components/tracker/BulkRelanceModal";
import {
  syncAllHistoryApplications,
  syncEmailDispatchToTracker,
  inferCompanyFromEmail,
  parseContactFromEmail,
} from "@/lib/tracker/syncService";
import { getCountryBadge, resolveCountryCategory } from "@/lib/tracker/countries";
import { getStoredTemplates, type MessageTemplate } from "@/lib/templates";

interface HistoryItem {
  id: string;
  created_at: string;
  company: string | null;
  position: string | null;
  email: string;
  status: "success" | "error" | "failed" | string;
}

function formatRowDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRowTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysSince(dateString: string): number {
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [daysFilter, setDaysFilter] = useState<30 | 90 | 365>(30);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<"all" | "non_saudi" | "saudi" | "morocco" | "france" | "other">("all");
  const [followUpFilter, setFollowUpFilter] = useState<"all" | "7days" | "14days">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Template state for relance
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Selection & Relance
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRelanceModalOpen, setIsRelanceModalOpen] = useState(false);
  const [singleRelanceTarget, setSingleRelanceTarget] = useState<RelanceTarget | null>(null);

  const ROWS_PER_PAGE = 12;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setHistory([]);
        return;
      }

      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const nextHistory = (data || []).map((item) => ({
        id: item.id,
        created_at: item.created_at,
        company: item.company,
        position: item.position,
        email: item.email,
        status: item.status,
      })) as HistoryItem[];

      setHistory(nextHistory);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load history.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchHistory();
      // Auto-trigger background liaison so user never has to click manually
      void syncAllHistoryApplications().catch(() => undefined);
      // Load templates
      const tpls = getStoredTemplates();
      setTemplates(tpls);
      const defaultRelance =
        tpls.find((t) => t.id === "relance-courte" || t.id.includes("relance")) ?? tpls[0];
      if (defaultRelance) {
        setSelectedTemplateId(defaultRelance.id);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, daysFilter, searchQuery, companyFilter, countryFilter, followUpFilter]);

  const handleCleanAllData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Utilisateur non authentifié.");
    }

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    setHistory([]);
    toast.success("Toutes les données d'envois ont été nettoyées avec succès dans Supabase !");
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) {
        throw error;
      }

      setHistory((previous) => previous.filter((item) => item.id !== id));
      toast.success("Enregistrement supprimé.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete row.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncAllTracker = async () => {
    if (history.length === 0) {
      toast.info("Aucune candidature à synchroniser.");
      return;
    }
    setSyncing(true);
    setSyncProgress({ current: 0, total: history.length });
    try {
      const stats = await syncAllHistoryApplications((current, total) => {
        setSyncProgress({ current, total });
      });

      toast.success(
        `Synchronisation réussie ! ${stats.companiesCreated} entreprise(s) créée(s), ${stats.contactsCreated} contact(s) créés et ${stats.applicationsCreated} candidature(s) liées au Tracker.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la synchronisation.";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSingle = async (item: HistoryItem) => {
    setLinkingId(item.id);
    try {
      const res = await syncEmailDispatchToTracker({
        id: item.id,
        company: item.company,
        email: item.email,
        position: item.position,
        created_at: item.created_at,
        status: item.status,
      });

      toast.success(
        `Lié au Tracker : Entreprise "${res.companyName}" et contact "${res.contactName}" !`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de liaison.";
      toast.error(message);
    } finally {
      setLinkingId(null);
    }
  };

  // Export to CSV
  const exportHistoryCsv = () => {
    if (filteredHistory.length === 0) {
      toast.error("Aucune donnée à exporter.");
      return;
    }

    const headers = ["Company", "Position", "Recipient Email", "Status", "Date", "Time", "ID"];
    const rows = filteredHistory.map((item) => [
      `"${(item.company || "Direct").replace(/"/g, '""')}"`,
      `"${(item.position || "Candidature").replace(/"/g, '""')}"`,
      `"${item.email.replace(/"/g, '""')}"`,
      `"${item.status === "success" ? "Draft Created" : "Failed"}"`,
      `"${formatRowDate(item.created_at)}"`,
      `"${formatRowTime(item.created_at)}"`,
      `"${item.id}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mailpilot-applications-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${filteredHistory.length} candidatures exportées en CSV avec succès !`);
  };

  // Extract unique companies for filtering
  const availableCompanies = useMemo(() => {
    const compMap = new Map<string, number>();
    history.forEach((item) => {
      const compName =
        (item.company || inferCompanyFromEmail(item.email)?.name || "").trim();
      if (compName) {
        compMap.set(compName, (compMap.get(compName) ?? 0) + 1);
      }
    });
    return Array.from(compMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [history]);

  // Candidatures sent >= 7 days ago that succeeded (ready for follow-up)
  const candidatesAwaitingFollowUp = useMemo(() => {
    return history.filter((item) => {
      if (item.status !== "success") return false;
      return getDaysSince(item.created_at) >= 7;
    });
  }, [history]);

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysFilter);

    return history.filter((item) => {
      const isItemFailed = item.status === "failed" || item.status === "error";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "success" && item.status === "success") ||
        (statusFilter === "failed" && isItemFailed);

      const matchesDate = new Date(item.created_at) >= cutoff;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (item.company || "").toLowerCase().includes(q) ||
        (item.position || "").toLowerCase().includes(q) ||
        (item.email || "").toLowerCase().includes(q);

      const compName =
        (item.company || inferCompanyFromEmail(item.email)?.name || "").trim();
      const matchesCompany =
        companyFilter === "all" || compName.toLowerCase() === companyFilter.toLowerCase();

      const daysSince = getDaysSince(item.created_at);
      const matchesFollowUp =
        followUpFilter === "all" ||
        (followUpFilter === "7days" && daysSince >= 7 && item.status === "success") ||
        (followUpFilter === "14days" && daysSince >= 14 && item.status === "success");

      const detectedCountry = resolveCountryCategory(
        undefined,
        item.email || item.company
      );
      let matchesCountry = true;
      if (countryFilter === "non_saudi") {
        matchesCountry = detectedCountry !== "saudi";
      } else if (countryFilter !== "all") {
        matchesCountry = detectedCountry === countryFilter;
      }

      return (
        matchesStatus &&
        matchesDate &&
        matchesSearch &&
        matchesCompany &&
        matchesCountry &&
        matchesFollowUp
      );
    });
  }, [daysFilter, history, statusFilter, searchQuery, companyFilter, countryFilter, followUpFilter]);

  // Counts for tabs (based on selected date range)
  const counts = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysFilter);
    const inRange = history.filter((item) => new Date(item.created_at) >= cutoff);
    const total = inRange.length;
    const success = inRange.filter((item) => item.status === "success").length;
    const failed = inRange.filter((item) => item.status === "failed" || item.status === "error").length;
    return { total, success, failed };
  }, [history, daysFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ROWS_PER_PAGE));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredHistory.slice(start, start + ROWS_PER_PAGE);
  }, [filteredHistory, currentPage, ROWS_PER_PAGE]);

  // Selection handlers
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    paginatedHistory.length > 0 &&
    paginatedHistory.every((item) => selectedIds.has(item.id));

  const someVisibleSelected =
    paginatedHistory.some((item) => selectedIds.has(item.id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    const visibleIds = paginatedHistory.map((item) => item.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllAwaitingSevenDays = () => {
    const ids = new Set(candidatesAwaitingFollowUp.map((c) => c.id));
    setSelectedIds(ids);
    toast.info(`${ids.size} candidature(s) sans réponse (+7j) sélectionnée(s).`);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Convert selected rows to RelanceTarget
  const activeRelanceTargets: RelanceTarget[] = useMemo(() => {
    if (singleRelanceTarget) return [singleRelanceTarget];
    return history
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({
        id: item.id,
        company:
          item.company || inferCompanyFromEmail(item.email)?.name || "Entreprise",
        position: item.position || "Candidature",
        email: item.email,
        name: parseContactFromEmail(item.email, item.company).fullName,
        sentAt: item.created_at,
      }));
  }, [history, selectedIds, singleRelanceTarget]);

  return (
    <div className="page-shell">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Application History
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Historique complet de vos candidatures et statuts de création de brouillons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {history.length > 0 && (
              <>
                <button
                  className="editorial-button-primary h-8 px-3 text-xs flex items-center gap-1.5"
                  onClick={handleSyncAllTracker}
                  disabled={syncing}
                  type="button"
                  title="Créer et lier automatiquement les entreprises et contacts dans le Tracker"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {syncing
                      ? `Liaison en cours (${syncProgress.current}/${syncProgress.total})...`
                      : "Lier au Tracker (Entreprises & Contacts)"}
                  </span>
                </button>
                <button
                  className="editorial-button-secondary h-8 px-3 text-xs"
                  onClick={exportHistoryCsv}
                  type="button"
                  title="Télécharger l'historique complet au format CSV"
                >
                  <Download className="h-3.5 w-3.5 text-gray-600" />
                  Exporter CSV
                </button>
                <button
                  className="editorial-button-secondary h-8 px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                  onClick={() => setIsCleanModalOpen(true)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  Nettoyer les données (Clean sends)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notification Banner for Silent Applications (>= 7 days without response) */}
        {candidatesAwaitingFollowUp.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 p-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-900 sm:text-sm">
                    {candidatesAwaitingFollowUp.length} candidature{candidatesAwaitingFollowUp.length > 1 ? "s" : ""} sans réponse depuis plus d&apos;une semaine (+7 jours)
                  </p>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    Relance recommandée
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  Ces recruteurs n&apos;ont pas encore répondu. Une relance polie après une semaine relance leur attention et maximise vos opportunités.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllAwaitingSevenDays}
                className="editorial-button-secondary h-8 px-3 text-xs bg-white hover:bg-gray-50 border-amber-300 text-amber-900 font-medium"
              >
                <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-amber-700 inline" />
                Sélectionner les {candidatesAwaitingFollowUp.length} emails (+7j)
              </button>
              <button
                type="button"
                onClick={() => {
                  selectAllAwaitingSevenDays();
                  setSingleRelanceTarget(null);
                  setIsRelanceModalOpen(true);
                }}
                className="editorial-button-primary h-8 px-3.5 text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Relancer en 1 clic ({candidatesAwaitingFollowUp.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Sync to Tracker Helper Banner */}
        {history.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#ff5722]/20 bg-[#fff8f5] p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#ff5722] shrink-0" />
              <p className="text-gray-700">
                <span className="font-semibold text-gray-900">Liaison automatique Tracker</span> :{" "}
                Vos candidatures envoyées sont automatiquement rattachées à vos entreprises et contacts. Si une entreprise n&apos;existe pas encore, elle est créée avec son logo et le contact lui est lié.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncAllTracker}
              disabled={syncing}
              className="font-semibold text-[#ff5722] hover:underline shrink-0 text-left sm:text-right"
            >
              {syncing ? `Synchronisation (${syncProgress.current}/${syncProgress.total})...` : "⚡ Lier tout l'historique au Tracker →"}
            </button>
          </div>
        )}

        {/* Bulk Selection Bar (When rows are checked) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ff5722]/40 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 p-3.5 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 text-xs font-medium text-gray-900">
              <CheckSquare className="h-4 w-4 text-[#ff5722]" />
              <span>
                <strong className="font-bold text-[#ff5722] text-sm">{selectedIds.size}</strong> candidature{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="editorial-button-secondary h-8 px-3 text-xs"
              >
                Tout désélectionner
              </button>
              <button
                type="button"
                onClick={() => {
                  setSingleRelanceTarget(null);
                  setIsRelanceModalOpen(true);
                }}
                className="editorial-button-primary h-8 px-4 text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Relancer la sélection ({selectedIds.size}) en Bulk</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff5722]" />
            <p className="text-xs text-gray-500">Chargement de l'historique...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Aucun historique enregistré
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Lancez des candidatures depuis "Manual Apply" ou "Bulk Upload" pour remplir ce journal.
              </p>
            </div>
          </div>
        ) : (
          /* Widened Full Width Table */
          <div className="w-full rounded-lg border border-gray-200 bg-white shadow-xs">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Date Filters, Company Filter & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex gap-1">
                  {[30, 90, 365].map((value) => (
                    <button
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                        daysFilter === value
                          ? "bg-gray-100 text-gray-900 font-semibold"
                          : "text-gray-500 hover:text-gray-800",
                      )}
                      key={value}
                      onClick={() => setDaysFilter(value as 30 | 90 | 365)}
                      type="button"
                    >
                      {value} jours
                    </button>
                  ))}
                </div>

                {/* Filter by Company */}
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="h-8 rounded-md border border-gray-200 pl-8 pr-7 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] bg-white cursor-pointer text-gray-700 font-medium max-w-[170px] truncate"
                    title="Filtrer par entreprise"
                  >
                    <option value="all">Toutes entreprises</option>
                    {availableCompanies.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Country (with option to exclude Saudi) */}
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value as any)}
                    className={cn(
                      "h-8 rounded-md border pl-8 pr-7 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] bg-white cursor-pointer font-medium max-w-[210px] truncate",
                      countryFilter === "non_saudi"
                        ? "border-amber-300 bg-amber-50/70 text-amber-900 font-semibold"
                        : "border-gray-200 text-gray-700"
                    )}
                    title="Filtrer par pays / Exclure Arabie Saoudite"
                  >
                    <option value="all">🌐 Tous les pays</option>
                    <option value="non_saudi">🚫 Exclure Arabie Saoudite (Hors KSA)</option>
                    <option value="saudi">🇸🇦 Arabie Saoudite (Saudi)</option>
                    <option value="morocco">🇲🇦 Maroc</option>
                    <option value="france">🇫🇷 France</option>
                    <option value="other">🌍 Autre / International</option>
                  </select>
                </div>

                {/* Template Selector for Relance */}
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="h-8 rounded-md border border-gray-200 pl-8 pr-7 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] bg-white cursor-pointer text-gray-700 font-medium max-w-[190px] truncate"
                    title="Choisir le modèle d'email pour la relance"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        Modèle : {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter by Relance / Silence */}
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={followUpFilter}
                    onChange={(e) => setFollowUpFilter(e.target.value as "all" | "7days" | "14days")}
                    className={cn(
                      "h-8 rounded-md border pl-8 pr-7 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] bg-white cursor-pointer font-medium",
                      followUpFilter !== "all"
                        ? "border-amber-300 bg-amber-50/50 text-amber-900 font-semibold"
                        : "border-gray-200 text-gray-700"
                    )}
                    title="Filtrer par délai sans réponse"
                  >
                    <option value="all">Toutes échéances</option>
                    <option value="7days">Sans réponse &gt; 7j (1 semaine)</option>
                    <option value="14days">Sans réponse &gt; 14j (2 semaines)</option>
                  </select>
                </div>

                {/* Quick Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrer email, poste..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 rounded-md border border-gray-200 pl-8 pr-3 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] w-44 sm:w-52"
                  />
                </div>
              </div>

              {/* Status Filter Tabs with Real Counts */}
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                    statusFilter === "all"
                      ? "bg-gray-100 text-gray-900 font-semibold"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                  onClick={() => setStatusFilter("all")}
                >
                  <span>Tous</span>
                  <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] font-bold text-gray-700">
                    {counts.total}
                  </span>
                </button>

                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                    statusFilter === "success"
                      ? "bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                  onClick={() => setStatusFilter("success")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Draft Created</span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    {counts.success}
                  </span>
                </button>

                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                    statusFilter === "failed"
                      ? "bg-red-50 text-red-800 font-semibold border border-red-200"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                  onClick={() => setStatusFilter("failed")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span>Failed</span>
                  <span className="rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-bold text-red-800">
                    {counts.failed}
                  </span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                    <th className="w-10 px-4 py-3">
                      <button
                        type="button"
                        onClick={toggleSelectAllVisible}
                        className="flex items-center text-gray-500 hover:text-gray-900 cursor-pointer"
                        title="Sélectionner / Désélectionner toutes les lignes visibles"
                      >
                        {allVisibleSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#ff5722]" />
                        ) : someVisibleSelected ? (
                          <MinusSquare className="h-4 w-4 text-[#ff5722]" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-5 py-3">Entreprise</th>
                    <th className="px-4 py-3">Poste visé</th>
                    <th className="px-4 py-3">Email Destinataire</th>
                    <th className="px-4 py-3">Date & Heure</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                        Aucun enregistrement ne correspond à vos filtres.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((item) => {
                      const isSuccess = item.status === "success";
                      const daysSince = getDaysSince(item.created_at);
                      const isOverSevenDays = daysSince >= 7 && isSuccess;
                      const isSelected = selectedIds.has(item.id);
                      const countryBadge = getCountryBadge(undefined, item.email || item.company);

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            "transition hover:bg-gray-50/80",
                            isSelected && "bg-orange-50/40"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => toggleSelectId(item.id)}
                              className="flex items-center text-gray-500 hover:text-gray-900 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-[#ff5722]" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-300" />
                              )}
                            </button>
                          </td>

                          {/* Company */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {item.company || inferCompanyFromEmail(item.email)?.name || "Candidature Directe"}
                                  </p>
                                  {countryBadge && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9.5px] font-medium border shrink-0",
                                        countryBadge.color
                                      )}
                                    >
                                      <span>{countryBadge.flag}</span>
                                      <span>{countryBadge.label}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {inferCompanyFromEmail(item.email)?.domain && (
                                    <span className="text-[10px] text-gray-400 truncate">
                                      {inferCompanyFromEmail(item.email)?.domain}
                                    </span>
                                  )}
                                  {isOverSevenDays && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-800 border border-amber-200">
                                      ⏰ +{daysSince}j sans réponse
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Position */}
                          <td className="px-4 py-3.5 text-gray-600">
                            {item.position || "Stage PFE / Emploi"}
                          </td>

                          {/* Email & Contact */}
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-medium text-gray-900 text-xs">
                                {parseContactFromEmail(item.email, item.company).fullName}
                              </p>
                              <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
                                <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                                <span className="font-mono text-gray-700 text-[11px] truncate">
                                  {item.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                            {formatRowDate(item.created_at)} • {formatRowTime(item.created_at)}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                isSuccess
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-red-50 text-red-700 border border-red-200",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  isSuccess ? "bg-emerald-500" : "bg-red-500",
                                )}
                              />
                              {isSuccess ? "Draft Created" : "Failed"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Single Relance Button */}
                              {isSuccess && (
                                <button
                                  className="editorial-button-secondary h-7 px-2.5 text-xs text-[#ff5722] hover:bg-orange-50 hover:border-orange-200 flex items-center gap-1"
                                  onClick={() => {
                                    setSingleRelanceTarget({
                                      id: item.id,
                                      company: item.company || inferCompanyFromEmail(item.email)?.name || "Entreprise",
                                      position: item.position || "Candidature",
                                      email: item.email,
                                      name: parseContactFromEmail(item.email, item.company).fullName,
                                      sentAt: item.created_at,
                                    });
                                    setIsRelanceModalOpen(true);
                                  }}
                                  title="Faire une relance pour cet email"
                                  type="button"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Relancer</span>
                                </button>
                              )}

                              <button
                                className="editorial-icon-button"
                                disabled={linkingId === item.id}
                                onClick={() => void handleSyncSingle(item)}
                                title="Lier cette entreprise et contact au Tracker"
                                type="button"
                              >
                                {linkingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ff5722]" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </button>
                              <button
                                className="editorial-icon-button text-gray-400 hover:text-red-600 hover:bg-red-50"
                                disabled={deletingId === item.id}
                                onClick={() => void deleteItem(item.id)}
                                type="button"
                                title="Supprimer définitivement"
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredHistory.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3.5 text-xs text-gray-500">
                <div>
                  Affichage de{" "}
                  <span className="font-semibold text-gray-800">
                    {(currentPage - 1) * ROWS_PER_PAGE + 1}
                  </span>{" "}
                  à{" "}
                  <span className="font-semibold text-gray-800">
                    {Math.min(currentPage * ROWS_PER_PAGE, filteredHistory.length)}
                  </span>{" "}
                  sur{" "}
                  <span className="font-semibold text-gray-800">
                    {filteredHistory.length}
                  </span>{" "}
                  candidature{filteredHistory.length > 1 ? "s" : ""}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="editorial-button-secondary h-7 px-2.5 text-xs disabled:opacity-40 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Précédent
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            Math.abs(p - currentPage) <= 1,
                        )
                        .map((page, index, array) => {
                          const prev = array[index - 1];
                          return (
                            <div key={page} className="flex items-center">
                              {prev && page - prev > 1 && (
                                <span className="px-1 text-gray-400">...</span>
                              )}
                              <button
                                type="button"
                                className={cn(
                                  "h-7 min-w-7 rounded-md px-2 text-xs font-semibold transition cursor-pointer",
                                  currentPage === page
                                    ? "bg-[#ff5722] text-white"
                                    : "text-gray-600 hover:bg-gray-100",
                                )}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      className="editorial-button-secondary h-7 px-2.5 text-xs disabled:opacity-40 cursor-pointer"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Suivant
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clean All Data Modal */}
      <CleanDataModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onConfirm={handleCleanAllData}
        itemCount={history.length}
        title="Nettoyer l'historique des envois"
        description="Cette action supprimera définitivement tous les enregistrements d'envois et de brouillons dans Supabase en production. Cette action est irréversible."
        confirmWord="SUPPRIMER"
      />

      {/* Bulk Relance Modal */}
      <BulkRelanceModal
        isOpen={isRelanceModalOpen}
        onClose={() => {
          setIsRelanceModalOpen(false);
          setSingleRelanceTarget(null);
        }}
        targets={activeRelanceTargets}
        initialTemplateId={selectedTemplateId}
        onSuccess={() => {
          void fetchHistory();
          clearSelection();
        }}
      />
    </div>
  );
}
