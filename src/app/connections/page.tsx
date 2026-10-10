"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  MailCheck,
  Network,
  RefreshCw,
  Route,
  Settings2,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { getIntegrationStatus, type IntegrationStatusResponse } from "@/lib/api";
import { workspaceNavigationSections } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function ConnectionsPage() {
  const [integrationLoading, setIntegrationLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] =
    useState<IntegrationStatusResponse | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      setIntegrationLoading(true);
      try {
        const nextStatus = await getIntegrationStatus();
        setIntegrationStatus(nextStatus);
      } finally {
        setIntegrationLoading(false);
      }
    };

    void loadStatus();
  }, []);

  const n8nHealthy =
    integrationStatus?.n8n.configured &&
    integrationStatus.n8n.reachable !== false &&
    integrationStatus.n8n.healthy !== false;
  const supabaseHealthy = integrationStatus?.supabase.configured === true;

  return (
    <div className="page-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Connections & Routing
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Manage your active integrations, verify system health, and review automation pipelines.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              className="editorial-button-secondary h-8 px-3 text-xs"
              onClick={async () => {
                setIntegrationLoading(true);
                try {
                  const nextStatus = await getIntegrationStatus();
                  setIntegrationStatus(nextStatus);
                } finally {
                  setIntegrationLoading(false);
                }
              }}
              type="button"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", integrationLoading && "animate-spin")} />
              Refresh Health
            </button>
            <Link className="editorial-button-primary h-8 px-3 text-xs" href="/templates">
              Templates
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div>
          <h2 className="mb-3 text-xs font-semibold text-gray-900">Connected Apps</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* n8n Card */}
            <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#fff3ef] text-[#ff5722]">
                    <Network className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      n8nHealthy
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    )}
                  >
                    {n8nHealthy ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <TriangleAlert className="h-3 w-3" />
                    )}
                    {n8nHealthy ? "Operational" : "Error"}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">n8n Workflow Engine</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  {integrationLoading
                    ? "Checking reachability..."
                    : integrationStatus?.n8n.message ||
                      "Core automation engine handling routing and email dispatch."}
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[11px] text-gray-400">Webhook Linked</span>
                <span className="text-xs font-medium text-[#ff5722] hover:underline cursor-pointer">
                  Manage Config
                </span>
              </div>
            </div>

            {/* Supabase Card */}
            <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      supabaseHealthy
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    )}
                  >
                    {supabaseHealthy ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <TriangleAlert className="h-3 w-3" />
                    )}
                    {supabaseHealthy ? "Operational" : "Error"}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Supabase Database</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  {integrationLoading
                    ? "Checking configuration..."
                    : integrationStatus?.supabase.message ||
                      "Stores application history, metrics, and user preferences."}
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[11px] text-gray-400">Env Validated</span>
                <span className="text-xs font-medium text-[#ff5722] hover:underline cursor-pointer">
                  View Tables
                </span>
              </div>
            </div>

            {/* Email Validation Card */}
            <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <MailCheck className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Operational
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Format & DNS Validation</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  {integrationStatus?.emailValidation.message ||
                    "Pre-flight checks to stop bad addresses before they reach the SMTP node."}
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[11px] text-gray-400">Active Route</span>
                <span className="text-xs font-medium text-[#ff5722] hover:underline cursor-pointer">
                  Settings
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline & Routing */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Pipeline */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                <Webhook className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Automation Pipeline</h2>
                <p className="text-xs text-gray-500">Data flow mapping from the client to the outbound email.</p>
              </div>
            </div>

            <div className="relative pl-5">
              <div className="absolute bottom-0 left-[7px] top-2 w-px bg-gray-200"></div>

              <div className="relative mb-6">
                <div className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff5722]"></div>
                <p className="text-[11px] font-semibold text-[#ff5722]">Step 1 • Trigger</p>
                <div className="mt-1.5 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-xs font-semibold text-gray-900">Webhook Request</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Receives the initial payload containing candidate data and template parameters.
                  </p>
                </div>
              </div>

              <div className="relative mb-6">
                <div className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff5722]"></div>
                <p className="text-[11px] font-semibold text-[#ff5722]">Step 2 • Internal Logging</p>
                <div className="mt-1.5 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-xs font-semibold text-gray-900">Google Sheets / DB Sync</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Logs the application row for backup tracking outside the immediate app ecosystem.
                  </p>
                </div>
              </div>

              <div className="relative mb-6">
                <div className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff5722]"></div>
                <p className="text-[11px] font-semibold text-[#ff5722]">Step 3 • Data Formatting</p>
                <div className="mt-1.5 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-xs font-semibold text-gray-900">Edit Fields & Base64 Converter</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Structures the email body and converts the candidate CV into an attachment.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#ff5722]"></div>
                <p className="text-[11px] font-semibold text-[#ff5722]">Step 4 • Dispatch</p>
                <div className="mt-1.5 rounded-md border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-xs font-semibold text-gray-900">Gmail / SMTP Node</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Delivers the personalized message with the CV attached to the target recipient.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Policy & Links */}
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                  <Settings2 className="h-4 w-4" />
                </div>
                <h2 className="text-xs font-semibold text-gray-900">Validation Policy</h2>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                DNS validation confirms that the target domain exposes mail infrastructure.
              </p>
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2.5 font-mono text-[11px] text-gray-700">
                <span className="font-semibold text-[#ff5722]">POST</span> /api/validate-email<br />
                &#123; &quot;email&quot;: &quot;carrier@fleet.com&quot; &#125;
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                  <Route className="h-4 w-4" />
                </div>
                <h2 className="text-xs font-semibold text-gray-900">Quick Routes</h2>
              </div>

              <div className="space-y-1">
                {workspaceNavigationSections.map((section) => (
                  <div key={section.label}>
                    {section.items.map((item) => (
                      <Link
                        className="flex items-center justify-between rounded-md p-2 text-xs text-gray-700 transition hover:bg-gray-50"
                        href={item.href}
                        key={item.href}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className="h-3.5 w-3.5 text-gray-400" />
                          <span>{item.name}</span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
