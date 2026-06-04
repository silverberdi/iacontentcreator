import { useCallback, useEffect, useMemo, useState } from "react";
import { getCanonical, listReviewCandidates } from "./api/assetReviewApi";
import CanonicalPanel from "./components/CanonicalPanel";
import CandidateGrid from "./components/CandidateGrid";
import AssetPreviewModal from "./components/AssetPreviewModal";
import ConfirmDialog, {
  DEFAULT_PROMOTE_NOTES,
  DEFAULT_REJECT_NOTES,
} from "./components/ConfirmDialog";
import ApiKeyWarning from "./components/ApiKeyWarning";
import FiltersPanel from "./components/FiltersPanel";
import Header from "./components/Header";
import AutoIngestPanel from "./components/AutoIngestPanel";
import BackupsPanel from "./components/BackupsPanel";
import CatalogsPanel from "./components/CatalogsPanel";
import DashboardTabs, { type DashboardTab } from "./components/DashboardTabs";
import PageContainer from "./components/PageContainer";
import { defaultFilters } from "./data/catalogs";
import { useCatalogOptions } from "./hooks/useCatalogOptions";
import type {
  AssetCandidate,
  CanonicalAsset,
  ConfirmAction,
  ApiFilters,
  ReviewFilters,
} from "./types/assets";
import { ensureFilterValue, optionLabel, scenesForAvatar } from "./utils/catalogNormalize";
import {
  executeReviewAction,
  resolvePreviewIndexAfterAction,
} from "./utils/assetReviewActions";
import { filterCandidates } from "./utils/candidateFilters";

export default function App() {
  const {
    options: catalogOptions,
    loading: catalogOptionsLoading,
    error: catalogOptionsError,
    refresh: refreshCatalogOptions,
  } = useCatalogOptions();

  const [activeTab, setActiveTab] = useState<DashboardTab>("review");
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
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalActionType, setModalActionType] = useState<"promote" | "reject" | null>(null);

  useEffect(() => {
    setFilters((prev) => {
      const avatar = ensureFilterValue(
        prev.avatar,
        catalogOptions.avatars,
        defaultFilters.avatar,
      );
      const avatarScenes = scenesForAvatar(catalogOptions.scenes, avatar);
      return {
        ...prev,
        avatar,
        scene: ensureFilterValue(
          prev.scene,
          avatarScenes,
          avatarScenes[0]?.value ?? defaultFilters.scene,
        ),
        assetType: ensureFilterValue(
          prev.assetType,
          catalogOptions.assetTypes,
          defaultFilters.assetType,
        ),
      };
    });
  }, [catalogOptions.avatars, catalogOptions.scenes, catalogOptions.assetTypes]);

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

  const isImageModalOpen = selectedAssetIndex !== null;
  const selectedAsset =
    selectedAssetIndex !== null ? (filteredCandidates[selectedAssetIndex] ?? null) : null;

  useEffect(() => {
    if (selectedAssetIndex === null) return;
    if (selectedAssetIndex >= filteredCandidates.length) {
      if (filteredCandidates.length === 0) {
        setSelectedAssetIndex(null);
      } else {
        setSelectedAssetIndex(filteredCandidates.length - 1);
      }
    } else if (!filteredCandidates[selectedAssetIndex]) {
      setSelectedAssetIndex(null);
    }
  }, [filteredCandidates, selectedAssetIndex]);

  const reviewFilterPills = useMemo(
    () =>
      activeTab === "review"
        ? {
            avatarLabel: optionLabel(catalogOptions.avatars, filters.avatar),
            sceneLabel: optionLabel(catalogOptions.scenes, filters.scene),
            assetTypeLabel: optionLabel(catalogOptions.assetTypes, filters.assetType),
          }
        : null,
    [activeTab, catalogOptions, filters.avatar, filters.assetType, filters.scene],
  );

  const headerSubtitle = useMemo(() => {
    switch (activeTab) {
      case "review":
        return "Review, promote, and reject generated avatar assets";
      case "auto-ingest":
        return "Manage ingest profiles, watcher, and pipeline runs";
      case "backups":
        return "Backup and restore operations";
      case "catalogs":
        return "Manage avatars, scenes, asset types, workflows, and models";
      default:
        return undefined;
    }
  }, [activeTab]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setOperationMessage(null);
    setError(null);
  };

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
    setSelectedAssetIndex(null);
    setModalError(null);
    setFilters(next);
  };

  const openImageModal = (asset: AssetCandidate) => {
    const index = filteredCandidates.findIndex((c) => c.assetId === asset.assetId);
    if (index < 0) return;
    setModalError(null);
    setSelectedAssetIndex(index);
    setReviewNotes(
      asset.reviewNotes?.trim() ? asset.reviewNotes : DEFAULT_PROMOTE_NOTES,
    );
  };

  const closeImageModal = () => {
    if (operationPending || modalActionLoading) return;
    setSelectedAssetIndex(null);
    setModalError(null);
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

  const refreshAfterReviewAction = useCallback(
    async (successMessage: string, keepModalOpen: boolean, previousIndex: number | null) => {
      const [candidatesResult, canonicalResult] = await Promise.all([
        listReviewCandidates(apiFilters),
        getCanonical(apiFilters),
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

      const nextFiltered = filterCandidates(candidatesResult.candidates, {
        showCanonicalInCandidates: filters.showCanonicalInCandidates,
        statusFilter: filters.statusFilter,
      });

      if (keepModalOpen && previousIndex !== null) {
        const nextIndex = resolvePreviewIndexAfterAction(previousIndex, nextFiltered);
        setSelectedAssetIndex(nextIndex);
        if (nextIndex !== null && nextFiltered[nextIndex]) {
          setReviewNotes(
            nextFiltered[nextIndex].reviewNotes?.trim()
              ? nextFiltered[nextIndex].reviewNotes!
              : DEFAULT_PROMOTE_NOTES,
          );
        }
      } else {
        setSelectedAssetIndex(null);
      }

      setOperationMessage({ type: "success", text: successMessage });
    },
    [apiFilters, filters.showCanonicalInCandidates, filters.statusFilter],
  );

  const runReviewAction = useCallback(
    async (
      type: "promote" | "reject",
      asset: AssetCandidate,
      notes: string,
      options: { fromModal: boolean },
    ) => {
      const previousIndex =
        options.fromModal && selectedAssetIndex !== null ? selectedAssetIndex : null;

      if (options.fromModal) {
        setModalActionLoading(true);
        setModalActionType(type);
        setModalError(null);
      } else {
        setOperationPending(true);
        setOperationType(type);
        setOperationMessage(null);
      }

      try {
        const result = await executeReviewAction(type, asset, notes);
        if (!result.ok) {
          throw new Error(result.message);
        }

        if (options.fromModal) {
          setModalError(null);
          await refreshAfterReviewAction(result.message, true, previousIndex);
        } else {
          setConfirmAction(null);
          await refreshAfterReviewAction(result.message, false, null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Operation failed";
        if (options.fromModal) {
          setModalError(message);
        } else {
          setOperationMessage({ type: "error", text: message });
        }
      } finally {
        if (options.fromModal) {
          setModalActionLoading(false);
          setModalActionType(null);
        } else {
          setOperationPending(false);
          setOperationType(null);
        }
      }
    },
    [refreshAfterReviewAction, selectedAssetIndex],
  );

  const handleConfirm = async () => {
    if (!confirmAction) return;
    await runReviewAction(confirmAction.type, confirmAction.asset, reviewNotes, {
      fromModal: false,
    });
  };

  const handleModalPromote = () => {
    if (!selectedAsset) return;
    void runReviewAction("promote", selectedAsset, reviewNotes, { fromModal: true });
  };

  const handleModalReject = () => {
    if (!selectedAsset) return;
    void runReviewAction("reject", selectedAsset, reviewNotes, { fromModal: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header subtitle={headerSubtitle} filterPills={reviewFilterPills} />

      <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <main>
        <PageContainer className="space-y-6 py-6">
          <ApiKeyWarning />

          {catalogOptionsError && activeTab !== "catalogs" && (
            <p className="text-sm text-amber-200/90" role="status">
              Catalog options unavailable ({catalogOptionsError}). Using static fallback lists.
            </p>
          )}

          {activeTab === "review" && (
            <div role="tabpanel" className="space-y-6">
              <FiltersPanel
                filters={filters}
                catalogOptions={catalogOptions}
                catalogOptionsLoading={catalogOptionsLoading}
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
                onImageClick={openImageModal}
                onPromote={openPromoteDialog}
                onReject={openRejectDialog}
                operationPending={operationPending}
              />
            </div>
          )}

          {activeTab === "auto-ingest" && (
            <div role="tabpanel">
              <AutoIngestPanel
                catalogOptions={catalogOptions}
                catalogOptionsLoading={catalogOptionsLoading}
                onRefreshAssetReview={() => loadData(apiFilters)}
                onCatalogOptionsRefresh={() => refreshCatalogOptions()}
              />
            </div>
          )}

          {activeTab === "backups" && (
            <div role="tabpanel">
              <BackupsPanel />
            </div>
          )}

          {activeTab === "catalogs" && (
            <div role="tabpanel">
              <CatalogsPanel onCatalogsChanged={() => void refreshCatalogOptions()} />
            </div>
          )}
        </PageContainer>
      </main>

      {isImageModalOpen && selectedAsset && selectedAssetIndex !== null && (
        <AssetPreviewModal
          isOpen={isImageModalOpen}
          assets={filteredCandidates}
          selectedAsset={selectedAsset}
          selectedAssetIndex={selectedAssetIndex}
          reviewNotes={reviewNotes}
          actionLoading={modalActionLoading}
          actionType={modalActionType}
          error={modalError}
          onClose={closeImageModal}
          onNavigate={(index) => {
            setModalError(null);
            setSelectedAssetIndex(index);
            const next = filteredCandidates[index];
            if (next) {
              setReviewNotes(
                next.reviewNotes?.trim() ? next.reviewNotes : DEFAULT_PROMOTE_NOTES,
              );
            }
          }}
          onPromote={handleModalPromote}
          onReject={handleModalReject}
          onReviewNotesChange={(notes) => {
            setReviewNotes(notes);
            setModalError(null);
          }}
        />
      )}

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
