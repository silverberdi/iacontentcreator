import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCanonical,
  listReviewCandidates,
  promoteCanonical,
  rejectAsset,
} from "./api/assetReviewApi";
import CanonicalPanel from "./components/CanonicalPanel";
import CandidateGrid from "./components/CandidateGrid";
import ConfirmDialog, {
  DEFAULT_PROMOTE_NOTES,
  DEFAULT_REJECT_NOTES,
} from "./components/ConfirmDialog";
import ApiKeyWarning from "./components/ApiKeyWarning";
import FiltersPanel from "./components/FiltersPanel";
import Header from "./components/Header";
import BackupsPanel from "./components/BackupsPanel";
import { defaultFilters } from "./data/catalogs";
import type {
  AssetCandidate,
  CanonicalAsset,
  ConfirmAction,
  ApiFilters,
  ReviewFilters,
} from "./types/assets";
import { filterCandidates } from "./utils/candidateFilters";

export default function App() {
  const [filters, setFilters] = useState<ReviewFilters>({ ...defaultFilters });
  const [candidates, setCandidates] = useState<AssetCandidate[]>([]);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  const [canonical, setCanonical] = useState<CanonicalAsset | null>(null);
  const [canonicalReason, setCanonicalReason] = useState<string | undefined>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [operationPending, setOperationPending] = useState(false);
  const [operationType, setOperationType] = useState<"promote" | "reject" | null>(null);
  const [operationMessage, setOperationMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const apiFilters: ApiFilters = useMemo(
    () => ({
      avatar: filters.avatar,
      scene: filters.scene,
      assetType: filters.assetType,
      limit: filters.limit,
    }),
    [filters.avatar, filters.scene, filters.assetType, filters.limit],
  );

  const filteredCandidates = useMemo(
    () =>
      filterCandidates(candidates, {
        showCanonicalInCandidates: filters.showCanonicalInCandidates,
        statusFilter: filters.statusFilter,
      }),
    [candidates, filters.showCanonicalInCandidates, filters.statusFilter],
  );

  const loadData = useCallback(async (activeFilters: ApiFilters) => {
    setLoading(true);
    setError(null);

    try {
      const [candidatesResult, canonicalResult] = await Promise.all([
        listReviewCandidates(activeFilters),
        getCanonical(activeFilters),
      ]);

      setCandidates(candidatesResult.candidates);
      setCandidateCount(candidatesResult.count);

      if (canonicalResult.found) {
        setCanonical(canonicalResult);
        setCanonicalReason(undefined);
      } else {
        setCanonical(null);
        setCanonicalReason(canonicalResult.reason);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      setCandidates([]);
      setCandidateCount(null);
      setCanonical(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(apiFilters);
  }, [apiFilters, loadData]);

  const handleRefresh = () => {
    setOperationMessage(null);
    void loadData(apiFilters);
  };

  const handleFiltersChange = (next: ReviewFilters) => {
    setOperationMessage(null);
    setFilters(next);
  };

  const openPromoteDialog = (asset: AssetCandidate) => {
    setOperationMessage(null);
    setConfirmAction({ type: "promote", asset });
    setReviewNotes(DEFAULT_PROMOTE_NOTES);
  };

  const openRejectDialog = (asset: AssetCandidate) => {
    setOperationMessage(null);
    setConfirmAction({ type: "reject", asset });
    setReviewNotes(DEFAULT_REJECT_NOTES);
  };

  const closeDialog = () => {
    if (operationPending) return;
    setConfirmAction(null);
    setOperationType(null);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;

    setOperationPending(true);
    setOperationType(confirmAction.type);
    setOperationMessage(null);

    const { asset, type } = confirmAction;

    try {
      if (type === "promote") {
        const result = await promoteCanonical(asset.assetId, reviewNotes.trim());
        if (!result.promoted) {
          throw new Error(result.reason ?? "Promotion failed");
        }
        setOperationMessage({
          type: "success",
          text: `Asset ${asset.assetId.slice(0, 8)}… promoted as canonical.`,
        });
      } else {
        const result = await rejectAsset(asset.assetId, reviewNotes.trim());
        if (!result.rejected) {
          throw new Error(result.reason ?? "Rejection failed");
        }
        setOperationMessage({
          type: "success",
          text: `Asset ${asset.assetId.slice(0, 8)}… rejected.`,
        });
      }

      setConfirmAction(null);
      await loadData(apiFilters);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setOperationMessage({ type: "error", text: message });
    } finally {
      setOperationPending(false);
      setOperationType(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header
        avatar={filters.avatar}
        scene={filters.scene}
        assetType={filters.assetType}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <ApiKeyWarning />

        <FiltersPanel
          filters={filters}
          loading={loading}
          onChange={handleFiltersChange}
          onRefresh={handleRefresh}
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
          candidates={filteredCandidates}
          totalCount={candidateCount}
          loading={loading && !error}
          statusFilter={filters.statusFilter}
          showCanonicalInCandidates={filters.showCanonicalInCandidates}
          onPromote={openPromoteDialog}
          onReject={openRejectDialog}
          operationPending={operationPending}
        />

        <BackupsPanel />
      </main>

      <ConfirmDialog
        action={confirmAction}
        reviewNotes={reviewNotes}
        pending={operationPending}
        operationType={operationType}
        onReviewNotesChange={setReviewNotes}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
