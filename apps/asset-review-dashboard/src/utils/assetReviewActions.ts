import { promoteCanonical, rejectAsset, selectAsset } from "../api/assetReviewApi";
import type { AssetCandidate, ReviewActionType } from "../types/assets";

export type { ReviewActionType };

export type ReviewActionResult = {
  ok: boolean;
  message: string;
};

export async function executeReviewAction(
  type: ReviewActionType,
  asset: AssetCandidate,
  reviewNotes: string,
): Promise<ReviewActionResult> {
  if (type === "promote") {
    const result = await promoteCanonical(asset.assetId, reviewNotes.trim());
    if (!result.promoted) {
      return { ok: false, message: result.reason ?? "Promotion failed" };
    }
    return {
      ok: true,
      message: `Asset ${asset.assetId.slice(0, 8)}… promoted as canonical.`,
    };
  }

  if (type === "select") {
    const result = await selectAsset(asset.assetId, reviewNotes.trim());
    if (!result.selected) {
      return {
        ok: false,
        message: result.error ?? result.reason ?? "Selection failed",
      };
    }
    return {
      ok: true,
      message: `Asset ${asset.assetId.slice(0, 8)}… marked as selected.`,
    };
  }

  const result = await rejectAsset(asset.assetId, reviewNotes.trim());
  if (!result.rejected) {
    return { ok: false, message: result.reason ?? "Rejection failed" };
  }
  return {
    ok: true,
    message: `Asset ${asset.assetId.slice(0, 8)}… rejected.`,
  };
}

/** After list refresh, stay on the next candidate (same index) or close when none remain. */
export function resolvePreviewIndexAfterAction(
  previousIndex: number,
  nextCandidates: AssetCandidate[],
): number | null {
  if (nextCandidates.length === 0) return null;
  if (previousIndex >= nextCandidates.length) return null;
  return previousIndex;
}
