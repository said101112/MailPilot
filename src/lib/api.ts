export interface ApplicationData {
  company: string;
  email: string;
  position: string;
  message?: string;
  templateId?: string;
  [key: string]: any;
}

export interface N8nResponse {
  success: boolean;
  error?: string;
  details?: string;
  [key: string]: any;
}

/**
 * Parses and validates the n8n webhook response.
 * n8n can return HTTP 200 even when internal nodes fail,
 * so we inspect the response body for error indicators.
 */
function parseN8nResponse(responseBody: any): N8nResponse {
  // If response is a string, try to parse as JSON
  if (typeof responseBody === 'string') {
    try {
      responseBody = JSON.parse(responseBody);
    } catch {
      // If it's a plain string error message
      const lower = responseBody.toLowerCase();
      if (lower.includes('error') || lower.includes('fail') || lower.includes('problem')) {
        return { success: false, error: responseBody };
      }
      return { success: true };
    }
  }

  // Handle array response (n8n sometimes returns arrays)
  if (Array.isArray(responseBody)) {
    responseBody = responseBody[0] || {};
  }

  // Check for explicit error indicators in the response
  if (responseBody.error || responseBody.Error) {
    return {
      success: false,
      error: responseBody.error || responseBody.Error,
      details: responseBody.message || responseBody.details || responseBody.description || undefined,
    };
  }

  // Check if n8n returned an explicit success: false
  if (responseBody.success === false) {
    return {
      success: false,
      error: responseBody.message || responseBody.error || "Le workflow n8n a échoué",
      details: responseBody.details || undefined,
    };
  }

  // Check for n8n execution error patterns
  if (responseBody.executionError || responseBody.status === 'error' || responseBody.status === 'failed') {
    return {
      success: false,
      error: responseBody.executionError || responseBody.message || "Erreur d'exécution n8n",
      details: responseBody.nodeName ? `Noeud: ${responseBody.nodeName}` : undefined,
    };
  }

  // Check for common error patterns in response values
  const responseStr = JSON.stringify(responseBody).toLowerCase();
  if (
    responseStr.includes('"error"') ||
    responseStr.includes('authorization') && responseStr.includes('invalid') ||
    responseStr.includes('problem in node')
  ) {
    // Extract meaningful error from nested response
    const errorMsg = extractNestedError(responseBody);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }
  }

  return { success: true, ...responseBody };
}

/**
 * Recursively searches for error messages in nested n8n response objects
 */
function extractNestedError(obj: any, depth = 0): string | null {
  if (depth > 5 || !obj || typeof obj !== 'object') return null;

  // Check common error fields
  for (const key of ['error', 'Error', 'message', 'errorMessage', 'description']) {
    if (typeof obj[key] === 'string' && obj[key].length > 0) {
      return obj[key];
    }
  }

  // Recurse into object values
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const found = extractNestedError(value, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export async function sendApplication(data: ApplicationData, retries = 2): Promise<N8nResponse> {
  const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("NEXT_PUBLIC_N8N_WEBHOOK_URL is not defined");
  }

  let lastError: any;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: "truck-app-frontend",
          retryCount: i,
        }),
      });

      // Handle HTTP-level errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }

      // Parse response body
      let responseBody: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        const text = await response.text();
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
      }

      // Validate the n8n workflow result
      const result = parseN8nResponse(responseBody);

      if (!result.success) {
        const errorMsg = result.details
          ? `${result.error} — ${result.details}`
          : result.error || "Erreur workflow n8n";
        throw new Error(errorMsg);
      }

      return result;
    } catch (error: any) {
      lastError = error;
      if (i < retries) {
        console.warn(`[n8n] Retry ${i + 1}/${retries} for ${data.email}: ${error.message}`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }

  throw lastError;
}
