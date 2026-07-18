import type {
  GetCanonicalResponse,
  PromoteCanonicalResponse,
  RejectAssetResponse,
  ReviewCandidatesResponse,
  SelectAssetResponse,
  ApiFilters,
} from "../types/assets";
import {
  formatN8nUnauthorizedError,
  postN8nJson,
  postN8nRequest,
} from "./n8nClient";

function getMinioBaseUrl(): string {
  const base = import.meta.env.VITE_MINIO_BASE_URL;
  if (!base) {
    throw new Error(
      "VITE_MINIO_BASE_URL is not configured. Copy .env.example to .env and set the MinIO base URL.",
    );
  }
  return base.replace(/\/$/, "");
}

export function getConfiguredMinioBaseUrl(): string {
  return getMinioBaseUrl();
}

export async function listReviewCandidates(
  filters: ApiFilters,
): Promise<ReviewCandidatesResponse> {
  return postN8nJson<ReviewCandidatesResponse>("/assets/review-candidates", {
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
  return postN8nJson<GetCanonicalResponse>("/assets/get-canonical", {
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
  return postN8nJson<PromoteCanonicalResponse>("/assets/promote-canonical", {
    assetId,
    reviewNotes,
    baseUrl: getMinioBaseUrl(),
  });
}

function selectAssetEndpointError(status: number, data: unknown, rawText: string): string {
  if (data && typeof data === "object") {
    const body = data as { code?: number; message?: string; hint?: string };
    if (body.code === 404 || body.message?.includes("not registered")) {
      return (
        'Webhook /assets/select is not registered in n8n. Import "Avatares AI - API - Select Asset" ' +
        "from automation/n8n/workflows/, assign Postgres credentials, and activate the workflow."
      );
    }
  }

  if (rawText.includes("Internal Server Error") || rawText.includes("<!DOCTYPE html>")) {
    return (
      `n8n returned HTTP ${status} (HTML error page) for /assets/select. ` +
      "Usually the Select Asset workflow is missing or inactive. " +
      'Import and activate "Avatares AI - API - Select Asset", then retry.'
    );
  }

  return `Invalid or empty response from /assets/select (HTTP ${status}).`;
}

function parseSelectAssetResponse(
  status: number,
  data: SelectAssetResponse | Record<string, unknown> | null,
  rawText: string,
): SelectAssetResponse {
  const unauthorized = formatN8nUnauthorizedError(status, data);
  if (unauthorized) {
    throw new Error(unauthorized);
  }

  if (!data) {
    throw new Error(selectAssetEndpointError(status, null, rawText));
  }

  if ("code" in data && data.code === 404) {
    throw new Error(selectAssetEndpointError(status, data, rawText));
  }

  if ("selected" in data) {
    const response = data as SelectAssetResponse;
    if (response.selected === false && !response.error && !response.reason) {
      return {
        ...response,
        error: "Selection failed",
      };
    }
    return response;
  }

  if (data && typeof data === "object" && "ok" in data && (data as { ok?: boolean }).ok === false) {
    const failure = data as { error?: string; reason?: string; assetId?: string | null };
    return {
      selected: false,
      assetId: failure.assetId ?? null,
      error: failure.error ?? failure.reason ?? "Selection failed",
    };
  }

  throw new Error(selectAssetEndpointError(status, data, rawText));
}

export async function selectAsset(
  assetId: string,
  reviewNotes: string,
): Promise<SelectAssetResponse> {
  const result = await postN8nRequest<SelectAssetResponse>("/assets/select", {
    assetId,
    reviewNotes,
    baseUrl: getMinioBaseUrl(),
  });

  return parseSelectAssetResponse(result.status, result.data, result.rawText);
}

export async function rejectAsset(
  assetId: string,
  reviewNotes: string,
): Promise<RejectAssetResponse> {
  return postN8nJson<RejectAssetResponse>("/assets/reject", {
    assetId,
    reviewNotes,
    baseUrl: getMinioBaseUrl(),
  });
}
