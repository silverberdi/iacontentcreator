import { useEffect, useRef } from "react";
import type { AssetCandidate } from "../types/assets";
import { canSelectAsset, isCanonicalAsset, isSelectedAsset } from "../utils/candidateFilters";
import { formatDate } from "../utils/format";
import CopyButton from "./CopyButton";
import LoadingSpinner from "./LoadingSpinner";
import StatusBadge from "./StatusBadge";

type AssetPreviewModalProps = {
  isOpen: boolean;
  assets: AssetCandidate[];
  selectedAsset: AssetCandidate;
  selectedAssetIndex: number;
  reviewNotes: string;
  actionLoading: boolean;
  actionType: "promote" | "select" | "reject" | null;
  error: string | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onPromote: () => void;
  onSelect: () => void;
  onReject: () => void;
  onReviewNotesChange: (notes: string) => void;
};

export default function AssetPreviewModal({
  isOpen,
  assets,
  selectedAsset,
  selectedAssetIndex,
  reviewNotes,
  actionLoading,
  actionType,
  error,
  onClose,
  onNavigate,
  onPromote,
  onSelect,
  onReject,
  onReviewNotesChange,
}: AssetPreviewModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const asset = selectedAsset;

  const canGoPrev = selectedAssetIndex > 0;
  const canGoNext = selectedAssetIndex < assets.length - 1;
  const isCanonical = isCanonicalAsset(asset);
  const isSelected = isSelectedAsset(asset);
  const canSelect = canSelectAsset(asset);
  const busy = actionLoading;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
        return;
      }
      if (busy) return;
      if (event.key === "ArrowLeft" && canGoPrev) {
        event.preventDefault();
        onNavigate(selectedAssetIndex - 1);
      }
      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        onNavigate(selectedAssetIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, canGoNext, canGoPrev, isOpen, onClose, onNavigate, selectedAssetIndex]);

  if (!isOpen || !asset) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        if (!busy) onClose();
      }}
      className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] border-0 bg-black/85 p-0 text-gray-100 backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-raised px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-gray-500">Asset preview</p>
            <p className="truncate font-mono text-sm text-gray-200">
              {asset.assetId}
              {assets.length > 1 && (
                <span className="ml-2 text-gray-500">
                  {selectedAssetIndex + 1} / {assets.length}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-gray-300 hover:border-gray-500 hover:text-white disabled:opacity-50"
            aria-label="Close preview"
          >
            Close
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/50 p-4">
            {canGoPrev && (
              <button
                type="button"
                onClick={() => onNavigate(selectedAssetIndex - 1)}
                disabled={busy}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface-raised/90 px-3 py-2 text-sm text-gray-200 hover:border-gray-500 disabled:opacity-50 sm:left-4"
                aria-label="Previous image"
              >
                ← Prev
              </button>
            )}

            <img
              src={asset.url}
              alt={`Full preview ${asset.assetId}`}
              className="max-h-[80vh] max-w-[90vw] object-contain"
            />

            {canGoNext && (
              <button
                type="button"
                onClick={() => onNavigate(selectedAssetIndex + 1)}
                disabled={busy}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface-raised/90 px-3 py-2 text-sm text-gray-200 hover:border-gray-500 disabled:opacity-50 sm:right-4"
                aria-label="Next image"
              >
                Next →
              </button>
            )}
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-surface-raised p-4 lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={asset.status} />
              {isCanonical && (
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  Canonical
                </span>
              )}
            </div>

            <dl className="space-y-2.5 text-xs">
              <MetadataRow label="assetId" value={asset.assetId} mono />
              <MetadataRow label="avatar" value={asset.avatar} />
              <MetadataRow label="scene" value={asset.scene} />
              <MetadataRow label="status" value={asset.status} />
              <MetadataRow label="isCanonical" value={isCanonical ? "yes" : "no"} />
              <MetadataRow label="sha256" value={asset.sha256} mono />
              <MetadataRow label="objectPath" value={asset.objectPath} mono />
              <MetadataRow label="createdAt" value={formatDate(asset.createdAt)} />
              <div>
                <dt className="text-gray-500">reviewNotes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-gray-300">
                  {asset.reviewNotes ?? (
                    <span className="italic text-gray-500">No review notes</span>
                  )}
                </dd>
              </div>
            </dl>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-gray-400">Notes for promote / select / reject</span>
              <textarea
                value={reviewNotes}
                onChange={(e) => onReviewNotesChange(e.target.value)}
                disabled={busy}
                rows={3}
                className="resize-y rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:opacity-60"
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              <CopyButton value={asset.url} label="Copy URL" />
              <CopyButton value={asset.objectPath} label="Copy objectPath" />
              <CopyButton value={asset.assetId} label="Copy assetId" />
              <CopyButton value={asset.sha256} label="Copy sha256" />
            </div>

            {error && (
              <p className="rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">
                {error}
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 border-t border-border-muted pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Review Actions
              </p>
              {isSelected && (
                <p className="text-xs text-blue-200/90">This asset is already marked as selected.</p>
              )}
              <button
                type="button"
                disabled={isCanonical || busy}
                onClick={onPromote}
                className="flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLoading && actionType === "promote" ? (
                  <LoadingSpinner className="size-4" label="Promoting…" />
                ) : (
                  "Promote to canonical"
                )}
              </button>
              <button
                type="button"
                disabled={!canSelect || busy}
                onClick={onSelect}
                className="flex items-center justify-center gap-2 rounded-md bg-blue-800 px-3 py-2 text-sm font-medium text-blue-50 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLoading && actionType === "select" ? (
                  <LoadingSpinner className="size-4" label="Selecting…" />
                ) : (
                  "Mark as selected"
                )}
              </button>
              <button
                type="button"
                disabled={isCanonical || busy}
                onClick={onReject}
                className="flex items-center justify-center gap-2 rounded-md bg-red-900/80 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {actionLoading && actionType === "reject" ? (
                  <LoadingSpinner className="size-4" label="Rejecting…" />
                ) : (
                  "Reject"
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </dialog>
  );
}

function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd
        className={`mt-0.5 break-words ${mono ? "font-mono text-gray-200" : "text-gray-300"}`}
      >
        {value}
      </dd>
    </div>
  );
}
