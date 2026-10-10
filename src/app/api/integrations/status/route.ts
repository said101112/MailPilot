import { NextResponse } from "next/server";

export const runtime = "nodejs";

type IntegrationStatus = {
  configured: boolean;
  reachable: boolean | null;
  healthy: boolean | null;
  mode: "missing" | "host-check" | "health-endpoint";
  message: string;
  checkedAt: string;
  url?: string;
};

async function checkUrl(url: string, method: "GET" | "HEAD") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getN8nStatus(): Promise<IntegrationStatus> {
  const checkedAt = new Date().toISOString();
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL?.trim();
  const healthcheckUrl = process.env.N8N_HEALTHCHECK_URL?.trim();

  if (!webhookUrl) {
    return {
      configured: false,
      reachable: false,
      healthy: false,
      mode: "missing",
      message: "N8N_WEBHOOK_URL is missing.",
      checkedAt,
    };
  }

  if (healthcheckUrl) {
    try {
      const response = await checkUrl(healthcheckUrl, "GET");
      return {
        configured: true,
        reachable: response.ok,
        healthy: response.ok,
        mode: "health-endpoint",
        message: response.ok
          ? `Health endpoint responded with ${response.status}.`
          : `Health endpoint responded with ${response.status} ${response.statusText}.`,
        checkedAt,
        url: healthcheckUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Health endpoint check failed.";
      return {
        configured: true,
        reachable: false,
        healthy: false,
        mode: "health-endpoint",
        message,
        checkedAt,
        url: healthcheckUrl,
      };
    }
  }

  try {
    const origin = new URL(webhookUrl).origin;
    const response = await checkUrl(origin, "GET");
    return {
      configured: true,
      reachable: response.ok,
      healthy: null,
      mode: "host-check",
      message: response.ok
        ? "Webhook host is reachable. Add N8N_HEALTHCHECK_URL for strict health monitoring."
        : `Webhook host responded with ${response.status} ${response.statusText}.`,
      checkedAt,
      url: origin,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook host check failed.";
    return {
      configured: true,
      reachable: false,
      healthy: null,
      mode: "host-check",
      message,
      checkedAt,
    };
  }
}

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );

  const n8n = await getN8nStatus();

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    n8n,
    supabase: {
      configured: supabaseConfigured,
      message: supabaseConfigured
        ? "Supabase environment variables are configured."
        : "Supabase environment variables are missing.",
    },
    emailValidation: {
      mode: "format-plus-dns",
      message:
        "The app validates email format on the client and verifies domain mail routing before send.",
    },
  });
}
