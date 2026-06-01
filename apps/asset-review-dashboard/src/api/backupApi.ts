import type {
  BackupHealthResponse,
  BackupListResponse,
  CreateBackupResponse,
} from "../types/backups";

function getWebhookBaseUrl(): string {
  const base = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error(
      "VITE_N8N_WEBHOOK_BASE_URL is not configured. Copy .env.example to .env and set the n8n webhook base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const url = `${getWebhookBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

export async function checkBackupHealth(): Promise<BackupHealthResponse> {
  return postJson<BackupHealthResponse>("/admin/backups/health", {});
}

export async function listBackups(): Promise<BackupListResponse> {
  return postJson<BackupListResponse>("/admin/backups/list", {});
}

export async function createBackup(): Promise<CreateBackupResponse> {
  return postJson<CreateBackupResponse>("/admin/backups/create", {
    requestedBy: "dashboard",
  });
}
