export interface ApplicationData {
  company: string;
  email: string;
  position: string;
  message?: string;
  templateId?: string;
  [key: string]: unknown;
}

export interface N8nResponse {
  success: boolean;
  error?: string;
  details?: string;
  [key: string]: unknown;
}

export interface EmailPreflightResult {
  valid: boolean;
  code: string;
  message: string;
  domain?: string;
  mxCount?: number;
}

export interface IntegrationStatusResponse {
  checkedAt: string;
  n8n: {
    configured: boolean;
    reachable: boolean | null;
    healthy: boolean | null;
    mode: "missing" | "host-check" | "health-endpoint";
    message: string;
    checkedAt: string;
    url?: string;
  };
  supabase: {
    configured: boolean;
    message: string;
  };
  emailValidation: {
    mode: string;
    message: string;
  };
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null) {
    return value as UnknownRecord;
  }

  return {};
}

export function parseN8nResponse(responseBody: unknown): N8nResponse {
  if (typeof responseBody === "string") {
    const originalText = responseBody;
    try {
      responseBody = JSON.parse(responseBody);
    } catch {
      const lower = originalText.toLowerCase();
      if (lower.includes("error") || lower.includes("fail") || lower.includes("problem")) {
        return { success: false, error: originalText };
      }
      return { success: true };
    }
  }

  if (Array.isArray(responseBody)) {
    responseBody = responseBody[0] ?? {};
  }

  const responseRecord = asRecord(responseBody);
  const responseError =
    typeof responseRecord.error === "string"
      ? responseRecord.error
      : typeof responseRecord.Error === "string"
        ? responseRecord.Error
        : undefined;
  const responseMessage =
    typeof responseRecord.message === "string" ? responseRecord.message : undefined;
  const responseDetails =
    typeof responseRecord.details === "string" ? responseRecord.details : undefined;
  const responseDescription =
    typeof responseRecord.description === "string"
      ? responseRecord.description
      : undefined;

  if (responseError) {
    return {
      success: false,
      error: responseError,
      details: responseMessage || responseDetails || responseDescription || undefined,
    };
  }

  if (responseRecord.success === false) {
    return {
      success: false,
      error: responseMessage || responseError || "The n8n workflow failed.",
      details: responseDetails || undefined,
    };
  }

  if (
    typeof responseRecord.executionError === "string" ||
    responseRecord.status === "error" ||
    responseRecord.status === "failed"
  ) {
    return {
      success: false,
      error:
        (typeof responseRecord.executionError === "string"
          ? responseRecord.executionError
          : responseMessage) || "n8n execution error",
      details:
        typeof responseRecord.nodeName === "string"
          ? `Node: ${responseRecord.nodeName}`
          : undefined,
    };
  }

  const responseStr = JSON.stringify(responseRecord).toLowerCase();
  if (
    responseStr.includes('"error"') ||
    (responseStr.includes("authorization") && responseStr.includes("invalid")) ||
    responseStr.includes("problem in node")
  ) {
    const errorMsg = extractNestedError(responseRecord);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }
  }

  return { success: true, ...responseRecord };
}

function extractNestedError(obj: unknown, depth = 0): string | null {
  if (depth > 5 || !obj || typeof obj !== "object") {
    return null;
  }

  const record = asRecord(obj);

  for (const key of ["error", "Error", "message", "errorMessage", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      const found = extractNestedError(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export async function validateEmailBeforeSend(
  email: string,
): Promise<EmailPreflightResult> {
  const response = await fetch("/api/validate-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error("Unable to validate the email right now.");
  }

  return (await response.json()) as EmailPreflightResult;
}

export async function getIntegrationStatus(): Promise<IntegrationStatusResponse> {
  const response = await fetch("/api/integrations/status", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load integration status.");
  }

  return (await response.json()) as IntegrationStatusResponse;
}

export async function sendApplication(
  data: ApplicationData,
  retries = 2,
): Promise<N8nResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch("/api/send-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          retryCount: attempt,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        const errorMsg =
          errorData?.error || `HTTP ${response.status}: Failed to send application`;
        throw new Error(errorMsg);
      }

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: unknown;
      };

      if (payload.success === false) {
        throw new Error(payload.error || "Workflow error reported by backend");
      }

      const bodyData =
        typeof payload.data === "object" && payload.data !== null ? payload.data : {};

      return {
        success: true,
        ...bodyData,
      };
    } catch (error: unknown) {
      lastError =
        error instanceof Error ? error : new Error("Unknown request failure");

      if (attempt < retries) {
        console.warn(
          `[MailPilot] Retry ${attempt + 1}/${retries} for ${data.email}: ${lastError.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("The request failed after all retries.");
}
