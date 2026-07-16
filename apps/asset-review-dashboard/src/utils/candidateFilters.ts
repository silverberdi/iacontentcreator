import type { AssetCandidate, ReviewFilters } from "../types/assets";

export function isCanonicalAsset(asset: AssetCandidate): boolean {
  return asset.isCanonical || asset.status.toLowerCase() === "canonical";
}

export function isSelectedAsset(asset: AssetCandidate): boolean {
  return !isCanonicalAsset(asset) && asset.status.toLowerCase() === "selected";
}

export function canSelectAsset(asset: AssetCandidate): boolean {
  if (isCanonicalAsset(asset)) return false;
  const status = asset.status.toLowerCase();
  return status === "raw" || status === "rejected";
}

export function filterCandidates(
  candidates: AssetCandidate[],
  filters: Pick<ReviewFilters, "showCanonicalInCandidates" | "statusFilter">,
): AssetCandidate[] {
  return candidates.filter((asset) => {
    const canonical = isCanonicalAsset(asset);

    if (!filters.showCanonicalInCandidates && canonical) {
      return false;
    }

    if (
      filters.statusFilter !== "all" &&
      asset.status.toLowerCase() !== filters.statusFilter
    ) {
      return false;
    }

    return true;
  });
}
