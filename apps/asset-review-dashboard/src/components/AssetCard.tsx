import { useState } from "react";
import type { AssetCandidate } from "../types/assets";
import { canSelectAsset, isCanonicalAsset, isSelectedAsset } from "../utils/candidateFilters";
import { formatDate, shortenId, shortenSha256 } from "../utils/format";
import CopyButton from "./CopyButton";
import StatusBadge from "./StatusBadge";

const IMAGE_HEIGHT = "h-40";

type AssetCardProps = {
  asset: AssetCandidate;
  onImageClick: (asset: AssetCandidate) => void;
  onPromote: (asset: AssetCandidate) => void;
  onSelect: (asset: AssetCandidate) => void;
  onReject: (asset: AssetCandidate) => void;
  operationPending: boolean;
};

export default function AssetCard({
  asset,
  onImageClick,
  onPromote,
  onSelect,
  onReject,
  operationPending,
}: AssetCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isCanonical = isCanonicalAsset(asset);
  const isSelected = isSelectedAsset(asset);
  const canSelect = canSelectAsset(asset);

  const openPreview = () => {
    if (!imageFailed) onImageClick(asset);
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative border-b border-border-muted bg-black/30">
        {imageFailed ? (
          <div
            className={`flex ${IMAGE_HEIGHT} flex-col items-center justify-center border-b border-border-muted p-3 text-center`}
          >
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Image unavailable
            </span>
            <p className="mt-2 line-clamp-3 break-all font-mono text-xs text-gray-400">
              {asset.objectPath}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPreview}
            className={`group relative block w-full ${IMAGE_HEIGHT} cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
            aria-label="View full image"
          >
            <img
              src={asset.url}
              alt={`Asset ${asset.assetId}`}
              onError={() => setImageFailed(true)}
              className={`${IMAGE_HEIGHT} w-full object-cover transition duration-200 group-hover:scale-[1.02] group-hover:brightness-110`}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
              <span className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                View full image
              </span>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={asset.status} />
          {isCanonical && (
            <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300">
              Canonical
            </span>
          )}
          {isSelected && (
            <span className="rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-200">
              Selected
            </span>
          )}
        </div>

        <dl className="space-y-1.5 text-xs">
          <div>
            <dt className="text-gray-500">assetId</dt>
            <dd className="mt-0.5 font-mono text-gray-200">{shortenId(asset.assetId)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">sha256</dt>
            <dd className="mt-0.5 font-mono text-gray-200">{shortenSha256(asset.sha256)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">createdAt</dt>
            <dd className="mt-0.5 text-gray-300">{formatDate(asset.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">reviewNotes</dt>
            <dd className="mt-0.5 line-clamp-2 text-gray-300">
              {asset.reviewNotes ?? (
                <span className="italic text-gray-500">No review notes</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">objectPath</dt>
            <dd className="mt-0.5 line-clamp-2 break-all font-mono text-gray-400">
              {asset.objectPath}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border-muted pt-2.5">
          <CopyButton value={asset.url} label="Copy URL" />
          <CopyButton value={asset.assetId} label="Copy assetId" />
          <CopyButton value={asset.objectPath} label="Copy objectPath" />
          <CopyButton value={asset.sha256} label="Copy sha256" />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={isCanonical || operationPending}
            onClick={() => onPromote(asset)}
            className="rounded-md bg-emerald-700 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Promote
          </button>
          <button
            type="button"
            disabled={!canSelect || operationPending}
            onClick={() => onSelect(asset)}
            className="rounded-md bg-blue-800 px-2 py-1.5 text-xs font-medium text-blue-50 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            title={isSelected ? "Already selected" : undefined}
          >
            Select
          </button>
          <button
            type="button"
            disabled={isCanonical || operationPending}
            onClick={() => onReject(asset)}
            className="rounded-md bg-red-900/80 px-2 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}
