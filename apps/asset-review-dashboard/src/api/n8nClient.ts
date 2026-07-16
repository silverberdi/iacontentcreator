const API_KEY = import.meta.env.VITE_AVATARES_API_KEY;

/** Headers for all n8n webhook calls (includes X-Avatares-Api-Key when configured). */
export function getN8nHeaders(): Record<string, string> {
  const apiKey = API_KEY?.trim();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "X-Avatares-Api-Key": apiKey } : {}),
  };
}

/** @deprecated Use getN8nHeaders() so the API key is resolved at request time. */
export const n8nHeaders: Record<string, string> = getN8nHeaders();

export function isN8nApiKeyConfigured(): boolean {
  return Boolean(API_KEY?.trim());
}

export function isUsingServerWebhookProxy(): boolean {
  return getWebhookBaseUrl().startsWith("/webhook");
}

export function getWebhookBaseUrl(): string {
  const base = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL || "/webhook";
  return base.replace(/\/$/, "");
}

function buildWebhookUrl(path: string): string {
  return `${getWebhookBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatN8nUnauthorizedError(
  status: number,
  data: unknown,
): string | null {
  if (status !== 401) return null;
  if (data && typeof data === "object") {
    const body = data as { ok?: boolean; error?: string };
    if (body.error === "Unauthorized" || body.ok === false) {
      return (
        "Unauthorized (401): missing or invalid X-Avatares-Api-Key. " +
        "Use the authenticated console gateway or set VITE_AVATARES_API_KEY for local direct n8n calls."
      );
    }
  }
  return "Unauthorized (401): webhook authentication failed.";
}

export async function postN8nJson<T>(path: string, body: unknown = {}): Promise<T> {
  const url = buildWebhookUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getN8nHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Failed to reach ${url}: ${message}`);
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Invalid JSON response from ${path} (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const unauthorized = formatN8nUnauthorizedError(response.status, data);
  if (unauthorized) {
    throw new Error(unauthorized);
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : text.slice(0, 200) || response.statusText;
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }

  return data as T;
}

export type N8nRequestResult<T> = {
  status: number;
  httpOk: boolean;
  data: T | null;
  rawText: string;
};

/**
 * POST to a n8n webhook. Always sends X-Avatares-Api-Key via getN8nHeaders().
 * Returns parsed JSON even when HTTP status is not 2xx (for soft API errors).
 */
export async function postN8nRequest<T>(
  path: string,
  body: unknown = {},
): Promise<N8nRequestResult<T>> {
  const url = buildWebhookUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getN8nHeaders(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Failed to reach ${url}: ${message}`);
  }

  const rawText = await response.text();
  let data: T | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      throw new Error(
        `Invalid JSON response from ${path} (${response.status}): ${rawText.slice(0, 200)}`,
      );
    }
  }

  return {
    status: response.status,
    httpOk: response.ok,
    data,
    rawText,
  };
}
