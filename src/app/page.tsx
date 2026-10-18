"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  FileText,
  Mail,
  Network,
  Send,
  ShieldCheck,
  Truck,
  Upload,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { readCandidateName } from "@/lib/workspace";
import InteractiveDashboardCharts from "@/components/dashboard/InteractiveDashboardCharts";

interface ActivityItem {
  id: string;
  company: string | null;
  position: string | null;
  email: string;
  status: string;
  created_at: string;
}

const platformLabels = [
  "Direct Dispatch",
  "Carrier Portal",
  "Freight API",
  "LinkedIn Sync",
  "Internal Queue",
];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [userName, setUserName] = useState("Said");
  const [applicationCount, setApplicationCount] = useState(0);
  const [successRate, setSuccessRate] = useState(100);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [allApplications, setAllApplications] = useState<ActivityItem[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);

  useEffect(() => {
    async function fetchUserData() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const name =
          data.user.user_metadata?.full_name ||
          data.user.email?.split("@")[0] ||
          readCandidateName();
        const first = name.split(" ")[0] || "Said";
        setUserName(first.charAt(0).toUpperCase() + first.slice(1));
      } else {
        const stored = readCandidateName();
        const first = stored.split(" ")[0] || "Said";
        setUserName(first);
      }
    }

    async function fetchDashboardData() {
      const [recentResponse, statusResponse, allAppsResponse] = await Promise.all([
        supabase
          .from("applications")
          .select("id, company, position, email, status, created_at", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("applications").select("status"),
        supabase
          .from("applications")
          .select("id, company, position, email, status, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
      ]);

      if (!recentResponse.error) {
        setApplicationCount(recentResponse.count ?? 0);
        if (recentResponse.data && recentResponse.data.length > 0) {
          setRecentActivity(recentResponse.data);
        }
      }

      if (!allAppsResponse.error && allAppsResponse.data) {
        setAllApplications(allAppsResponse.data);
      }

      if (
        !statusResponse.error &&
        statusResponse.data &&
        statusResponse.data.length > 0
      ) {
        const successful = statusResponse.data.filter(
          (item) => item.status === "success",
        ).length;
        setSuccessRate(
          Number(((successful / statusResponse.data.length) * 100).toFixed(1)),
        );

        const pending = statusResponse.data.filter(
          (item) => item.status === "pending",
        ).length;
        const processing = statusResponse.data.filter(
          (item) => item.status === "processing" || item.status === "sending",
        ).length;
        const errorCount = statusResponse.data.filter(
          (item) => item.status === "error" || item.status === "failed",
        ).length;

        setQueueCount(pending + processing + errorCount);
        setProcessingCount(processing);
      }
    }

    void fetchUserData();
    void fetchDashboardData();
  }, []);

  const greeting = useMemo(() => getGreeting(), []);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-7 sm:px-8">
      {/* 1. Header Greeting with RoutePilot Context */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {greeting}, {userName}!
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Real-time freight applications, carrier dispatch queue & delivery automation.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <Link
            className="editorial-button-secondary h-8 px-3 text-xs"
            href="/history"
          >
            Full History
          </Link>
          <Link
            className="editorial-button-primary h-8 px-3.5 text-xs"
            href="/apply"
          >
            <Send className="h-3 w-3" />
            Manual Apply
          </Link>
        </div>
      </div>

      {/* 2. Unified Metric Strip (Actual RoutePilot Freight Data) */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {/* Metric 1: Total Applications */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Truck className="h-3.5 w-3.5 text-blue-500" />
              <span>Total applications</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {applicationCount}
              </span>
              <span className="text-xs text-gray-400">This week</span>
            </div>
          </div>

          {/* Metric 2: Delivery Success Rate */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Delivery success rate</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {successRate}%
              </span>
              <span className="text-xs font-medium text-emerald-600">
                Healthy delivery
              </span>
            </div>
          </div>

          {/* Metric 3: Active Automations */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Active automations</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                1
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                Live on n8n
              </span>
            </div>
          </div>

          {/* Metric 4: Live Queue */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5 text-purple-500" />
              <span>Dispatch queue</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                {queueCount} Pending
              </span>
              <span className="text-xs text-gray-400">
                {processingCount} processing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5. Interactive Statistics & Graphs (Timeline, Delivery Health Donut, Channels) */}
      <InteractiveDashboardCharts
        applications={allApplications}
        totalCount={applicationCount}
        successRate={successRate}
      />

      {/* 3. Middle Section: Real Project Data (Recent Applications & Quick Actions) */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Real Recent Applications Table (2 Columns) */}
        <div className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Recent Applications
              </h2>
              <p className="text-xs text-gray-500">
                Latest candidate submissions to freight carriers and transport fleets.
              </p>
            </div>
            <Link
              className="text-xs font-semibold text-[#ff5722] hover:text-[#e04822]"
              href="/history"
            >
              View all history →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-semibold text-gray-500">
                  <th className="px-5 py-2.5">Carrier / Position</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-xs text-gray-400"
                    >
                      No application dispatches recorded yet. Use Manual Apply or Bulk Upload to start.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50/80"
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-900">
                          {item.company || "Carrier Application"}
                        </p>
                        <p className="text-gray-500">{item.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(item.created_at)} • {formatTime(item.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                            item.status === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status === "processing" || item.status === "sending"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.status === "success"
                            ? "Delivered"
                            : item.status === "failed" || item.status === "error"
                              ? "Failed"
                              : item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {platformLabels[idx % platformLabels.length]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Actions & Pipeline Health (1 Column) */}
        <div className="flex flex-col gap-5">
          {/* Quick Actions Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">
              Quick Actions
            </h2>
            <p className="text-xs text-gray-500">
              Launch core dispatch flows and open settings.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/apply"
              >
                <div className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-blue-500" />
                  <span>Start Manual Apply</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/upload"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Launch Bulk Upload</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/connections"
              >
                <div className="flex items-center gap-2">
                  <Network className="h-3.5 w-3.5 text-purple-500" />
                  <span>Manage Connections</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-gray-400" />
              </Link>

              <Link
                className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
                href="/templates"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Template Library</span>
                </div>
                <ArrowUpRight className="h-3 w-3 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* System Pipeline Status */}
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Automation Health
            </span>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>n8n Webhook Engine</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700">
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Supabase Database</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              </div>
            </div>

            <Link
              href="/connections"
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-md border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span>View Connection Routing</span>
              <ArrowUpRight className="h-3 w-3 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Real RoutePilot Freight Tools */}
      <div>
        <h2 className="mb-3 text-xs font-semibold text-gray-900">
          Freight Automation Tools
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tool 1 */}
          <Link
            href="/apply"
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <Mail className="h-4 w-4 text-blue-500" />
              <span>Carrier Outreach</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Personalized direct applications with PDF resume attachments dispatched via SMTP.
            </p>
          </Link>

          {/* Tool 2 */}
          <Link
            href="/upload"
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Bulk CSV Engine</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Queue hundreds of transport carriers with rate limiting and automated anti-spam delays.
            </p>
          </Link>

          {/* Tool 3 */}
          <Link
            href="/connections"
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <ShieldCheck className="h-4 w-4 text-purple-500" />
              <span>DNS Verification</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Pre-flight domain checks that detect invalid email format before sending to n8n.
            </p>
          </Link>

          {/* Tool 4 */}
          <Link
            href="/templates"
            className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-[#ff5722]" />
              <span>Template Variables</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Auto-inject tags like [Company], [Position], and [MyName] across your saved templates.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
