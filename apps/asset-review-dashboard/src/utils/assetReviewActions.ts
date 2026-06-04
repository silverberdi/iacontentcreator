import { promoteCanonical, rejectAsset } from "../api/assetReviewApi";
import type { AssetCandidate } from "../types/assets";

export type ReviewActionType = "promote" | "reject";

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
