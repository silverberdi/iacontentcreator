import type { AssetCandidate, CanonicalAsset, ReviewFilters } from "../types/assets";
import type { CatalogOptionsBundle } from "../types/catalogs";
import CandidateGrid from "./CandidateGrid";
import CanonicalPanel from "./CanonicalPanel";
import FiltersPanel from "./FiltersPanel";

type OperationMessage = {
  type: "success" | "error";
  text: string;
} | null;

type TechnicalAssetReviewPanelProps = {
  filters: ReviewFilters;
  catalogOptions: CatalogOptionsBundle;
  catalogOptionsLoading: boolean;
  loading: boolean;
  error: string | null;
  operationMessage: OperationMessage;
  canonical: CanonicalAsset | null;
  canonicalReason: string | undefined;
  candidates: AssetCandidate[];
  candidateCount: number | null;
  operationPending: boolean;
  onFiltersChange: (next: ReviewFilters) => void;
  onRefresh: () => void;
  onImageClick: (asset: AssetCandidate) => void;
  onPromote: (asset: AssetCandidate) => void;
  onSelect: (asset: AssetCandidate) => void;
  onReject: (asset: AssetCandidate) => void;
};

export default function TechnicalAssetReviewPanel({
  filters,
  catalogOptions,
  catalogOptionsLoading,
  loading,
  error,
  operationMessage,
  canonical,
  canonicalReason,
  candidates,
  candidateCount,
  operationPending,
  onFiltersChange,
  onRefresh,
  onImageClick,
  onPromote,
  onSelect,
  onReject,
}: TechnicalAssetReviewPanelProps) {
  return (
    <>
      <FiltersPanel
        filters={filters}
        catalogOptions={catalogOptions}
        catalogOptionsLoading={catalogOptionsLoading}
        loading={loading}
        onChange={onFiltersChange}
        onRefresh={onRefresh}
      />

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          <p className="font-medium">Error loading data</p>
          <p className="mt-1 text-red-300/90">{error}</p>
        </div>
      )}

      {operationMessage && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            operationMessage.type === "success"
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
        >
          {operationMessage.text}
        </div>
      )}

      <CanonicalPanel
        canonical={canonical}
        reason={canonicalReason}
        loading={loading && !error}
      />

      <CandidateGrid
        candidates={candidates}
        totalCount={candidateCount}
        loading={loading && !error}
        statusFilter={filters.statusFilter}
        showCanonicalInCandidates={filters.showCanonicalInCandidates}
        onImageClick={onImageClick}
        onPromote={onPromote}
        onSelect={onSelect}
        onReject={onReject}
        operationPending={operationPending}
      />
    </>
  );
}
