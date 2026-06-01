import { useState } from "react";
import type { AssetCandidate } from "../types/assets";
import { isCanonicalAsset } from "../utils/candidateFilters";
import { formatDate, shortenId, shortenSha256 } from "../utils/format";
import CopyButton from "./CopyButton";
import StatusBadge from "./StatusBadge";

const IMAGE_HEIGHT = "h-40";

type AssetCardProps = {
  asset: AssetCandidate;
  onPromote: (asset: AssetCandidate) => void;
  onReject: (asset: AssetCandidate) => void;
  operationPending: boolean;
};

export default function AssetCard({
  asset,
  onPromote,
  onReject,
  operationPending,
}: AssetCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isCanonical = isCanonicalAsset(asset);

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
          <img
            src={asset.url}
            alt={`Asset ${asset.assetId}`}
            onError={() => setImageFailed(true)}
            className={`${IMAGE_HEIGHT} w-full object-cover`}
          />
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
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-gray-200 transition hover:border-gray-500 hover:text-white"
          >
            Open image
          </a>
          <CopyButton value={asset.url} label="Copy URL" />
          <CopyButton value={asset.assetId} label="Copy assetId" />
          <CopyButton value={asset.objectPath} label="Copy objectPath" />
          <CopyButton value={asset.sha256} label="Copy sha256" />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isCanonical || operationPending}
            onClick={() => onPromote(asset)}
            className="flex-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Promote
          </button>
          <button
            type="button"
            disabled={isCanonical || operationPending}
            onClick={() => onReject(asset)}
            className="flex-1 rounded-md bg-red-900/80 px-2.5 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}
