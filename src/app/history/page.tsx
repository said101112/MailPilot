"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  History as HistoryIcon,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import CleanDataModal from "@/components/CleanDataModal";
import {
  syncAllHistoryApplications,
  syncEmailDispatchToTracker,
  inferCompanyFromEmail,
  parseContactFromEmail,
} from "@/lib/tracker/syncService";

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

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [daysFilter, setDaysFilter] = useState<30 | 90 | 365>(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [linkingId, setLinkingId] = useState<string | null>(null);

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
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, daysFilter, searchQuery]);

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

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [daysFilter, history, statusFilter, searchQuery]);

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
              {/* Date Filters & Search */}
              <div className="flex flex-wrap items-center gap-3">
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

                {/* Quick Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrer entreprise, email, poste..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 rounded-md border border-gray-200 pl-8 pr-3 text-xs outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] w-52 sm:w-64"
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
                    <th className="px-5 py-3">Entreprise</th>
                    <th className="px-4 py-3">Poste visé</th>
                    <th className="px-4 py-3">Email Destinataire</th>
                    <th className="px-4 py-3">Date & Heure</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                        Aucun enregistrement ne correspond à vos filtres.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((item) => {
                      const isSuccess = item.status === "success";
                      return (
                        <tr
                          key={item.id}
                          className="transition hover:bg-gray-50/80"
                        >
                          {/* Company */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">
                                  {item.company || inferCompanyFromEmail(item.email)?.name || "Candidature Directe"}
                                </p>
                                {inferCompanyFromEmail(item.email)?.domain && (
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {inferCompanyFromEmail(item.email)?.domain}
                                  </p>
                                )}
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

      <CleanDataModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onConfirm={handleCleanAllData}
        itemCount={history.length}
        title="Nettoyer l'historique des envois"
        description="Cette action supprimera définitivement tous les enregistrements d'envois et de brouillons dans Supabase en production. Cette action est irréversible."
        confirmWord="SUPPRIMER"
      />
    </div>
  );
}
