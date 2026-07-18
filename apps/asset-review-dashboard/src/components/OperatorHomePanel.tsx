import { useEffect, useMemo, useState } from "react";
import { loadPublicationJobsSummary } from "../api/publicationsApi";
import { defaultFilters } from "../data/catalogs";
import type { CatalogOptionsBundle } from "../types/catalogs";
import type { PublicationJobsSummary } from "../types/publications";
import { optionLabel } from "../utils/catalogNormalize";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";

type OperatorHomePanelProps = {
  catalogOptions: CatalogOptionsBundle;
  technicalMode?: boolean;
  onOpenPublicationJob: (publicationJobId: string) => void;
};

export default function OperatorHomePanel({
  catalogOptions,
  technicalMode = false,
  onOpenPublicationJob,
}: OperatorHomePanelProps) {
  const [summary, setSummary] = useState<PublicationJobsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const result = await loadPublicationJobsSummary({
        avatar: defaultFilters.avatar,
        includePublished: false,
        limit: 30,
      });
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operator home");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const activeCount = summary?.jobs.length ?? 0;
  const primaryJob = useMemo(() => summary?.jobs[0] ?? null, [summary]);

  return (
    <div className="space-y-5">
      <SectionPanel
        title="Operator Home"
        description="Active publication jobs and the next action required."
        actions={
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={loading}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      >
        {error && (
          <div className="mb-4 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && !summary ? (
          <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-surface px-4 py-10 text-sm text-gray-500">
            <LoadingSpinner className="mr-2 size-4" label="Loading jobs..." />
            Loading publication queue...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-md border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active jobs</p>
              <p className="mt-2 text-3xl font-semibold text-gray-100">{activeCount}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Top priority</p>
              <p className="mt-2 text-sm font-medium text-gray-100">
                {primaryJob?.nextAction.label || "No active action"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-400">
                {primaryJob?.nextAction.description || "All visible publication jobs are complete."}
              </p>
            </div>

            <div className="rounded-md border border-border bg-surface p-4">
              {summary?.groups.length ? (
                <div className="space-y-4">
                  {summary.groups.map((group) => (
                    <div key={group.status} className="rounded-md border border-border bg-surface-overlay">
                      <div className="flex items-center justify-between border-b border-border px-3 py-2">
                        <h3 className="text-sm font-medium text-gray-100">{group.status}</h3>
                        <span className="text-xs text-gray-500">{group.count} job{group.count === 1 ? "" : "s"}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {group.jobs.map((job) => (
                          <div key={job.publicationJobId} className="grid gap-3 px-3 py-3 lg:grid-cols-[1fr_auto]">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-gray-100">
                                  {optionLabel(catalogOptions.scenes, job.scene)}
                                </p>
                                <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-gray-400">
                                  {job.format}
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-gray-400">{job.objective}</p>
                              <p className="mt-2 text-sm text-emerald-200">
                                {job.nextAction.label}
                                <span className="text-gray-500"> · {job.nextAction.description}</span>
                              </p>
                              {job.errorMessage && (
                                <p className="mt-2 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                                  {job.errorMessage}
                                </p>
                              )}
                              {technicalMode && (
                                <dl className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                                  <div>
                                    <dt>publicationJobId</dt>
                                    <dd className="break-all font-mono text-gray-300">{job.publicationJobId}</dd>
                                  </div>
                                  <div>
                                    <dt>updatedAt</dt>
                                    <dd className="font-mono text-gray-300">{job.updatedAt}</dd>
                                  </div>
                                  {job.generationJobId && (
                                    <div>
                                      <dt>generationJobId</dt>
                                      <dd className="break-all font-mono text-gray-300">{job.generationJobId}</dd>
                                    </div>
                                  )}
                                  {job.selectedAssetId && (
                                    <div>
                                      <dt>selectedAssetId</dt>
                                      <dd className="break-all font-mono text-gray-300">{job.selectedAssetId}</dd>
                                    </div>
                                  )}
                                </dl>
                              )}
                            </div>
                            <div className="flex items-start lg:justify-end">
                              <button
                                type="button"
                                onClick={() => onOpenPublicationJob(job.publicationJobId)}
                                className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-gray-500">
                  No active publication jobs.
                </div>
              )}
            </div>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
