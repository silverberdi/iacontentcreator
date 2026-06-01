import type {
  GetCanonicalResponse,
  PromoteCanonicalResponse,
  RejectAssetResponse,
  ReviewCandidatesResponse,
  ApiFilters,
} from "../types/assets";

function getWebhookBaseUrl(): string {
  const base = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL;
  if (!base) {
    throw new Error(
      "VITE_N8N_WEBHOOK_BASE_URL is not configured. Copy .env.example to .env and set the n8n webhook base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

function getMinioBaseUrl(): string {
  const base = import.meta.env.VITE_MINIO_BASE_URL;
  if (!base) {
    throw new Error(
      "VITE_MINIO_BASE_URL is not configured. Copy .env.example to .env and set the MinIO base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
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

export function getConfiguredMinioBaseUrl(): string {
  return getMinioBaseUrl();
}

export async function listReviewCandidates(
  filters: ApiFilters,
): Promise<ReviewCandidatesResponse> {
  return postJson<ReviewCandidatesResponse>("/assets/review-candidates", {
    avatar: filters.avatar,
    scene: filters.scene,
    assetType: filters.assetType,
    baseUrl: getMinioBaseUrl(),
    limit: filters.limit,
    includeCanonical: true,
  });
}

export async function getCanonical(
  filters: Pick<ApiFilters, "avatar" | "scene" | "assetType">,
): Promise<GetCanonicalResponse> {
  return postJson<GetCanonicalResponse>("/assets/get-canonical", {
    avatar: filters.avatar,
    scene: filters.scene,
    assetType: filters.assetType,
    baseUrl: getMinioBaseUrl(),
  });
}

export async function promoteCanonical(
  assetId: string,
  reviewNotes: string,
): Promise<PromoteCanonicalResponse> {
  return postJson<PromoteCanonicalResponse>("/assets/promote-canonical", {
    assetId,
    reviewNotes,
    baseUrl: getMinioBaseUrl(),
  });
}

export async function rejectAsset(
  assetId: string,
  reviewNotes: string,
): Promise<RejectAssetResponse> {
  return postJson<RejectAssetResponse>("/assets/reject", {
    assetId,
    reviewNotes,
    baseUrl: getMinioBaseUrl(),
  });
}
