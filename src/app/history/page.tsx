"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: string;
  created_at: string;
  company: string | null;
  position: string | null;
  email: string;
  status: "success" | "error";
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

function buildPayloadPreview(item: HistoryItem) {
  return JSON.stringify(
    {
      workflow: "truckapply.dispatch.email",
      candidate: {
        company: item.company,
        position: item.position,
        email: item.email,
      },
      executionId: item.id,
      status: item.status,
    },
    null,
    2,
  );
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [daysFilter, setDaysFilter] = useState<30 | 90 | 365>(30);

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
      setSelectedId(nextHistory[0]?.id ?? null);
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

  const clearHistory = async () => {
    if (!confirm("Clear the entire execution history?")) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setHistory([]);
      setSelectedId(null);
      toast.success("History cleared.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to clear history.";
      toast.error(message);
    }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) {
        throw error;
      }

      setHistory((previous) => previous.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      toast.success("Record deleted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete row.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredHistory = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysFilter);

    return history.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesDate = new Date(item.created_at) >= cutoff;
      return matchesStatus && matchesDate;
    });
  }, [daysFilter, history, statusFilter]);

  const selectedItem =
    filteredHistory.find((item) => item.id === selectedId) ?? filteredHistory[0] ?? null;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Application History
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Manage and review your carrier job applications with execution status.
            </p>
          </div>

          {history.length > 0 && (
            <button
              className="editorial-button-secondary h-8 px-3 text-xs"
              onClick={clearHistory}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
              Clear History
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff5722]" />
            <p className="text-xs text-gray-500">Loading history...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
              <HistoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                No history in the selected range
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Start sending applications to populate this operational log.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
            {/* Table */}
            <div className="rounded-lg border border-gray-200 bg-white">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
                <div className="flex gap-1">
                  {[30, 90, 365].map((value) => (
                    <button
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition",
                        daysFilter === value
                          ? "bg-gray-100 text-gray-900 font-semibold"
                          : "text-gray-500 hover:text-gray-800",
                      )}
                      key={value}
                      onClick={() => setDaysFilter(value as 30 | 90 | 365)}
                      type="button"
                    >
                      {value} days
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {[
                    { label: "All", value: "all" },
                    { label: "Success", value: "success" },
                    { label: "Failed", value: "error" },
                  ].map((option) => (
                    <button
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition",
                        statusFilter === option.value
                          ? "bg-gray-100 text-gray-900 font-semibold"
                          : "text-gray-500 hover:text-gray-800",
                      )}
                      key={option.value}
                      onClick={() =>
                        setStatusFilter(option.value as "all" | "success" | "error")
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                      <th className="px-5 py-2.5">Company / Role</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((item) => {
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr
                          className={cn(
                            "cursor-pointer transition hover:bg-gray-50/80",
                            isSelected && "bg-gray-50",
                          )}
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-900">
                              {item.company || "Unknown Carrier"}
                            </p>
                            <p className="text-gray-500">
                              {item.position || item.email}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatRowDate(item.created_at)} • {formatRowTime(item.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                                item.status === "success"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700",
                              )}
                            >
                              {item.status === "success" ? "Delivered" : "Failed"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              className="text-gray-400 hover:text-red-600 p-1"
                              disabled={deletingId === item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void deleteItem(item.id);
                              }}
                              type="button"
                              title="Delete record"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Details Panel */}
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-xs font-semibold text-gray-900">
                  Execution Details
                </h2>
                <span className="text-[11px] text-gray-400">
                  {selectedItem ? selectedItem.status : "None"}
                </span>
              </div>

              {selectedItem ? (
                <div className="space-y-4">
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-gray-400">Target Carrier</span>
                      <p className="font-semibold text-gray-900">
                        {selectedItem.company || "Carrier Dispatch"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Recipient Email</span>
                      <p className="font-mono text-gray-800">{selectedItem.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Timestamp</span>
                      <p className="text-gray-700">
                        {formatRowDate(selectedItem.created_at)} at{" "}
                        {formatRowTime(selectedItem.created_at)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">ID</span>
                      <p className="font-mono text-[11px] text-gray-500 break-all">
                        {selectedItem.id}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-medium text-gray-400">
                      Payload Preview
                    </span>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2.5 font-mono text-[10.5px] text-gray-700">
                      {buildPayloadPreview(selectedItem)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  Select a row from the table to view delivery details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
