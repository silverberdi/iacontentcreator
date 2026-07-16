import { useState } from "react";
import type { CanonicalAsset } from "../types/assets";
import { formatDate, shortenId, shortenSha256 } from "../utils/format";
import CopyButton from "./CopyButton";
import LoadingSpinner from "./LoadingSpinner";
import StatusBadge from "./StatusBadge";

type ImagePreviewProps = {
  url: string;
  objectPath: string;
  alt: string;
  className?: string;
};

function ImagePreview({ url, objectPath, alt, className = "" }: ImagePreviewProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface p-4 text-center ${className}`}
      >
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Image unavailable
        </span>
        <p className="mt-2 break-all font-mono text-xs text-gray-400">{objectPath}</p>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={`aspect-square w-full rounded-md border border-border bg-black/40 object-cover ${className}`}
    />
  );
}

type CanonicalPanelProps = {
  canonical: CanonicalAsset | null;
  reason?: string;
  loading: boolean;
};

export default function CanonicalPanel({ canonical, reason, loading }: CanonicalPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Current Canonical
      </h2>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
          <LoadingSpinner className="size-5" label="Loading canonical asset…" />
        </div>
      )}

      {!loading && !canonical && (
        <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium text-gray-300">No canonical asset</p>
          <p className="mt-1 text-sm text-gray-500">
            {reason ?? "No canonical asset found for this avatar and scene."}
          </p>
        </div>
      )}

      {!loading && canonical && (
        <div className="grid gap-4 sm:grid-cols-[160px_1fr] lg:grid-cols-[200px_1fr]">
          <ImagePreview
            url={canonical.url}
            objectPath={canonical.objectPath}
            alt={`Canonical ${canonical.assetId}`}
            className="max-w-[200px]"
          />
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={canonical.status} />
              <span className="rounded-full bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                Canonical
              </span>
            </div>

            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">assetId</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-mono text-xs text-gray-200">
                  {shortenId(canonical.assetId)}
                  <CopyButton value={canonical.assetId} label="Copy assetId" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">sha256</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-mono text-xs text-gray-200">
                  {shortenSha256(canonical.sha256)}
                  <CopyButton value={canonical.sha256} label="Copy sha256" />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">createdAt</dt>
                <dd className="mt-0.5 text-gray-200">{formatDate(canonical.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">objectPath</dt>
                <dd className="mt-0.5 break-all font-mono text-xs text-gray-400">
                  {canonical.objectPath}
                </dd>
              </div>
            </dl>

            <div>
              <dt className="text-xs text-gray-500">reviewNotes</dt>
              <dd className="mt-0.5 text-gray-300">
                {canonical.reviewNotes ?? (
                  <span className="text-gray-500 italic">No review notes</span>
                )}
              </dd>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={canonical.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 transition hover:border-gray-500 hover:text-white"
              >
                Open image
              </a>
              <CopyButton value={canonical.url} label="Copy URL" />
              <CopyButton value={canonical.objectPath} label="Copy objectPath" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
