import type { AssetCandidate, StatusFilter } from "../types/assets";
import AssetCard from "./AssetCard";
import LoadingSpinner from "./LoadingSpinner";

type CandidateGridProps = {
  candidates: AssetCandidate[];
  totalCount: number | null;
  loading: boolean;
  statusFilter: StatusFilter;
  showCanonicalInCandidates: boolean;
  onPromote: (asset: AssetCandidate) => void;
  onReject: (asset: AssetCandidate) => void;
  operationPending: boolean;
};

export default function CandidateGrid({
  candidates,
  totalCount,
  loading,
  statusFilter,
  showCanonicalInCandidates,
  onPromote,
  onReject,
  operationPending,
}: CandidateGridProps) {
  const countLabel =
    totalCount !== null && candidates.length !== totalCount
      ? `${candidates.length} shown · ${totalCount} total`
      : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`;

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
          Review Candidates
        </h2>
        {!loading && totalCount !== null && (
          <span className="text-sm text-gray-500">{countLabel}</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
          <LoadingSpinner className="size-5" label="Loading candidates…" />
        </div>
      )}

      {!loading && candidates.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-surface py-12 text-center">
          <p className="text-sm font-medium text-gray-300">No candidates found</p>
          <p className="mt-1 text-sm text-gray-500">
            {!showCanonicalInCandidates && statusFilter === "canonical"
              ? "Enable “Show canonical in candidates” to view canonical assets in the grid."
              : "Try different filters or refresh after new assets are registered."}
          </p>
        </div>
      )}

      {!loading && candidates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((asset) => (
            <AssetCard
              key={asset.assetId}
              asset={asset}
              onPromote={onPromote}
              onReject={onReject}
              operationPending={operationPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}
