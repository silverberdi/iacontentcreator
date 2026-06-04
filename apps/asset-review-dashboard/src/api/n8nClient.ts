const API_KEY = import.meta.env.VITE_AVATARES_API_KEY;

export const n8nHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  ...(API_KEY?.trim() ? { "X-Avatares-Api-Key": API_KEY.trim() } : {}),
};

export function isN8nApiKeyConfigured(): boolean {
  return Boolean(API_KEY?.trim());
}

export function getWebhookBaseUrl(): string {
  const base = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error(
      "VITE_N8N_WEBHOOK_BASE_URL is not configured. Copy .env.example to .env and set the n8n webhook base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

export async function postN8nJson<T>(path: string, body: unknown = {}): Promise<T> {
  const url = `${getWebhookBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: n8nHeaders,
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
};

/** POST that returns parsed JSON even when HTTP status is not 2xx (for soft API errors). */
export async function postN8nRequest<T>(
  path: string,
  body: unknown = {},
): Promise<N8nRequestResult<T>> {
  const url = `${getWebhookBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: n8nHeaders,
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Failed to reach ${url}: ${message}`);
  }

  const text = await response.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      if (!response.ok) {
        throw new Error(
          `Invalid JSON response from ${path} (${response.status}): ${text.slice(0, 200)}`,
        );
      }
      throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 200)}`);
    }
  }

  return {
    status: response.status,
    httpOk: response.ok,
    data,
  };
}
