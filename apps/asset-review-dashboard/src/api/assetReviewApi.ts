import type {
  GetCanonicalResponse,
  PromoteCanonicalResponse,
  RejectAssetResponse,
  ReviewCandidatesResponse,
  ApiFilters,
} from "../types/assets";
import { postN8nJson } from "./n8nClient";

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
