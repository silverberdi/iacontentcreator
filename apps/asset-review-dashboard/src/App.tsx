import { useCallback, useEffect, useMemo, useState } from "react";
import { getCanonical, listReviewCandidates } from "./api/assetReviewApi";
import CanonicalPanel from "./components/CanonicalPanel";
import CandidateGrid from "./components/CandidateGrid";
import AssetPreviewModal from "./components/AssetPreviewModal";
import ConfirmDialog, {
  DEFAULT_PROMOTE_NOTES,
  DEFAULT_REJECT_NOTES,
  DEFAULT_SELECT_NOTES,
} from "./components/ConfirmDialog";
import ApiKeyWarning from "./components/ApiKeyWarning";
import FiltersPanel from "./components/FiltersPanel";
import Header from "./components/Header";
import AutoIngestPanel from "./components/AutoIngestPanel";
import BackupsPanel from "./components/BackupsPanel";
import CatalogsPanel from "./components/CatalogsPanel";
import ContentCyclePanel from "./components/content-cycle/ContentCyclePanel";
import DashboardTabs, { type DashboardTab } from "./components/DashboardTabs";
import PageContainer from "./components/PageContainer";
import PublicationsPanel from "./components/PublicationsPanel";
import OperatorHomePanel from "./components/OperatorHomePanel";
import UserAccessPanel from "./components/UserAccessPanel";
import { logout } from "./api/authApi";
import { defaultFilters } from "./data/catalogs";
import { useCatalogOptions } from "./hooks/useCatalogOptions";
import type { AuthUser } from "./types/auth";
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

type OpsSection = "auto-ingest" | "backups" | "catalogs" | "access";
const DEFAULT_ASSET_TYPE = defaultFilters.assetType;

const BASE_OPS_SECTIONS: { id: OpsSection; label: string }[] = [
  { id: "auto-ingest", label: "Auto Ingest" },
  { id: "backups", label: "Backups" },
  { id: "catalogs", label: "Catalogs" },
];

type AppProps = {
  currentUser: AuthUser;
};

export default function App({ currentUser }: AppProps) {
  const {
    options: catalogOptions,
    loading: catalogOptionsLoading,
    error: catalogOptionsError,
    refresh: refreshCatalogOptions,
  } = useCatalogOptions();

  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [publicationJobToOpen, setPublicationJobToOpen] = useState<string | null>(null);
  const [activeOpsSection, setActiveOpsSection] = useState<OpsSection>("auto-ingest");
  const [technicalMode, setTechnicalMode] = useState(false);
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
  const [operationType, setOperationType] = useState<"promote" | "select" | "reject" | null>(
    null,
  );
  const [operationMessage, setOperationMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedAssetIndex, setSelectedAssetIndex] = useState<number | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalActionType, setModalActionType] = useState<"promote" | "select" | "reject" | null>(
    null,
  );

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
        assetType: DEFAULT_ASSET_TYPE,
      };
    });
  }, [catalogOptions.avatars, catalogOptions.scenes]);

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
  const canUseTechnicalMode = currentUser.technicalMode === true;
  const opsSections = useMemo(
    () =>
      currentUser.canApproveUsers
        ? [...BASE_OPS_SECTIONS, { id: "access" as const, label: "Access" }]
        : BASE_OPS_SECTIONS,
    [currentUser.canApproveUsers],
  );

  useEffect(() => {
    if (!canUseTechnicalMode && technicalMode) {
      setTechnicalMode(false);
    }
  }, [canUseTechnicalMode, technicalMode]);

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
          }
        : null,
    [activeTab, catalogOptions, filters.avatar, filters.scene],
  );

  const headerSubtitle = useMemo(() => {
    switch (activeTab) {
      case "home":
        return "What needs attention next";
      case "review":
        return "Review, promote, and reject generated avatar assets";
      case "publications":
        return "Create and track Estefania influencer publication jobs";
      case "content-cycle":
        return "Flujo guiado de contenido y publicación";
      case "ops":
        return "Operational controls, catalogs, ingest runner, and backups";
      default:
        return undefined;
    }
  }, [activeTab]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    setOperationMessage(null);
    setError(null);
  };

  const handleOpenPublicationJob = (publicationJobId: string) => {
    setPublicationJobToOpen(publicationJobId);
    setActiveTab("publications");
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
    setFilters({ ...next, assetType: DEFAULT_ASSET_TYPE });
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

  const openSelectDialog = (asset: AssetCandidate) => {
    setOperationMessage(null);
    setConfirmAction({ type: "select", asset });
    setReviewNotes(DEFAULT_SELECT_NOTES);
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
      type: "promote" | "select" | "reject",
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

  const handleModalSelect = () => {
    if (!selectedAsset) return;
    void runReviewAction("select", selectedAsset, reviewNotes, { fromModal: true });
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-200">{currentUser.name}</p>
              <p className="truncate font-mono text-xs text-gray-500">{currentUser.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout().then(() => window.location.assign("/"))}
              className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 hover:border-gray-500"
            >
              Sign out
            </button>
          </div>

          <ApiKeyWarning />

          {catalogOptionsError && activeTab !== "ops" && (
            <p className="text-sm text-amber-200/90" role="status">
              Catalog options unavailable ({catalogOptionsError}). Using static fallback lists.
            </p>
          )}

          {activeTab === "home" && (
            <div role="tabpanel">
              <OperatorHomePanel
                catalogOptions={catalogOptions}
                technicalMode={technicalMode}
                onOpenPublicationJob={handleOpenPublicationJob}
              />
            </div>
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
                onSelect={openSelectDialog}
                onReject={openRejectDialog}
                operationPending={operationPending}
              />
            </div>
          )}

          {activeTab === "publications" && (
            <div role="tabpanel">
              <PublicationsPanel
                catalogOptions={catalogOptions}
                catalogOptionsLoading={catalogOptionsLoading}
                initialPublicationJobId={publicationJobToOpen}
                onInitialPublicationJobLoaded={() => setPublicationJobToOpen(null)}
                technicalMode={technicalMode}
              />
            </div>
          )}

          {activeTab === "content-cycle" && (
            <div role="tabpanel">
              <ContentCyclePanel />
            </div>
          )}

          {activeTab === "ops" && (
            <div role="tabpanel" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised p-3">
                <div className="flex flex-wrap gap-1">
                  {opsSections.map((section) => {
                    const isActive = activeOpsSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveOpsSection(section.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? "bg-accent text-white"
                            : "bg-surface-overlay text-gray-300 hover:text-white"
                        }`}
                      >
                        {section.label}
                      </button>
                    );
                  })}
                </div>

                {canUseTechnicalMode ? (
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={technicalMode}
                      onChange={(event) => setTechnicalMode(event.target.checked)}
                      className="size-4 accent-accent"
                    />
                    Technical mode
                  </label>
                ) : (
                  <span className="text-xs text-gray-500">Admin mode</span>
                )}
              </div>

              {!technicalMode && (
                <p className="text-sm text-gray-500">
                  Mutating operations such as watcher start/stop, manual pipeline runs,
                  catalog initialization, and backup creation are hidden until technical
                  mode is enabled.
                </p>
              )}

              {activeOpsSection === "auto-ingest" && (
                <AutoIngestPanel
                  catalogOptions={catalogOptions}
                  technicalMode={technicalMode}
                  catalogOptionsLoading={catalogOptionsLoading}
                  onRefreshAssetReview={() => loadData(apiFilters)}
                  onCatalogOptionsRefresh={() => refreshCatalogOptions()}
                />
              )}

              {activeOpsSection === "backups" && (
                <BackupsPanel technicalMode={technicalMode} />
              )}

              {activeOpsSection === "catalogs" && (
                <CatalogsPanel
                  technicalMode={technicalMode}
                  onCatalogsChanged={() => void refreshCatalogOptions()}
                />
              )}

              {activeOpsSection === "access" && (
                <UserAccessPanel currentUser={currentUser} />
              )}
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
          onSelect={handleModalSelect}
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
