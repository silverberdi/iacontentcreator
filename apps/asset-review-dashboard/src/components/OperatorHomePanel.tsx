import { useEffect, useMemo, useState } from "react";
import { loadPublicationJobsSummary } from "../api/publicationsApi";
import type { CatalogOptionsBundle } from "../types/catalogs";
import type {
  PublicationJobStatus,
  PublicationJobSummary,
  PublicationJobsSummary,
} from "../types/publications";
import { optionLabel } from "../utils/catalogNormalize";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";

type OperatorHomePanelProps = {
  catalogOptions: CatalogOptionsBundle;
  technicalMode?: boolean;
  onCreatePublication: () => void;
  onOpenPublicationJob: (publicationJobId: string) => void;
};

type QueueTone = "normal" | "warning" | "success";

const STATUS_LABELS: Record<string, string> = {
  draft: "Needs direction",
  "brief-ready": "Direction ready",
  "prompt-ready": "Ready to create image",
  generating: "Creating image",
  "review-ready": "Needs image review",
  "assets-ready": "Image selected",
  "copy-ready": "Caption ready",
  "ready-to-publish": "Ready to publish",
  published: "Published",
  failed: "Needs attention",
};

const QUEUE_LABELS: Record<string, { label: string; description: string; tone: QueueTone }> = {
  failed: {
    label: "Needs attention",
    description: "A job failed or got stuck and needs review.",
    tone: "warning",
  },
  "ready-to-publish": {
    label: "Ready to publish",
    description: "Image and copy are prepared for manual publishing.",
    tone: "success",
  },
  "copy-ready": {
    label: "Needs publishing pack",
    description: "Caption exists; export the final publishing package.",
    tone: "normal",
  },
  "assets-ready": {
    label: "Needs caption",
    description: "An image was selected and copy can be generated.",
    tone: "normal",
  },
  "review-ready": {
    label: "Needs image review",
    description: "Generated images are waiting for human judgment.",
    tone: "warning",
  },
  generating: {
    label: "Creating image",
    description: "The system is waiting for image output.",
    tone: "normal",
  },
  "prompt-ready": {
    label: "Ready to create image",
    description: "Creative direction is ready for image generation.",
    tone: "normal",
  },
  "brief-ready": {
    label: "Needs image direction",
    description: "Brief exists; create image instructions next.",
    tone: "normal",
  },
  draft: {
    label: "Needs creative direction",
    description: "Start by creating the publication direction.",
    tone: "normal",
  },
};

function statusLabel(status: PublicationJobStatus | undefined): string {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] || String(status);
}

function queueMeta(status: PublicationJobStatus | undefined) {
  if (!status) return { label: "Unknown", description: "Review this item.", tone: "normal" as const };
  return QUEUE_LABELS[status] || {
    label: statusLabel(status),
    description: "Open this item and continue from the recommended action.",
    tone: "normal" as const,
  };
}

function formatRelativeTime(value: string | undefined): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatLabel(format: string | undefined): string {
  switch (format) {
    case "feed-post":
      return "Feed post";
    case "story":
      return "Story";
    case "reel":
      return "Reel";
    case "carousel":
      return "Carousel";
    default:
      return format || "Image post";
  }
}

function countJobs(summary: PublicationJobsSummary | null, statuses: string[]): number {
  if (!summary) return 0;
  return statuses.reduce((total, status) => total + Number(summary.counts?.[status] || 0), 0);
}

function newestJob(jobs: PublicationJobSummary[]): PublicationJobSummary | null {
  return [...jobs].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  })[0] || null;
}

export default function OperatorHomePanel({
  catalogOptions,
  technicalMode = false,
  onCreatePublication,
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
        includePublished: true,
        limit: 80,
      });
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Studio dashboard");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  const jobs = summary?.jobs ?? [];
  const activeJobs = jobs.filter((job) => job.status !== "published");
  const attentionJobs = jobs.filter((job) => job.status === "failed" || Boolean(job.errorMessage));
  const reviewJobs = jobs.filter((job) => job.status === "review-ready");
  const publishReadyJobs = jobs.filter((job) => job.status === "ready-to-publish");
  const recentPublishedJobs = jobs.filter((job) => job.status === "published").slice(0, 4);
  const primaryJob = attentionJobs[0] || reviewJobs[0] || publishReadyJobs[0] || activeJobs[0] || null;
  const latestJob = newestJob(jobs);

  const characterCards = useMemo(() => {
    const grouped = new Map<string, PublicationJobSummary[]>();
    for (const job of jobs) {
      grouped.set(job.avatar, [...(grouped.get(job.avatar) || []), job]);
    }
    return [...grouped.entries()].map(([avatar, avatarJobs]) => {
      const latest = newestJob(avatarJobs);
      return {
        avatar,
        label: optionLabel(catalogOptions.avatars, avatar),
        active: avatarJobs.filter((job) => job.status !== "published").length,
        review: avatarJobs.filter((job) => job.status === "review-ready").length,
        publishReady: avatarJobs.filter((job) => job.status === "ready-to-publish").length,
        attention: avatarJobs.filter((job) => job.status === "failed" || Boolean(job.errorMessage)).length,
        latest,
      };
    });
  }, [catalogOptions.avatars, jobs]);

  const queueCards = [
    {
      label: "Active productions",
      value: activeJobs.length,
      description: "Publication jobs still moving through the Studio.",
      tone: "normal" as const,
    },
    {
      label: "Needs review",
      value: reviewJobs.length,
      description: "Images waiting for a human decision.",
      tone: reviewJobs.length ? "warning" as const : "normal" as const,
    },
    {
      label: "Ready to publish",
      value: publishReadyJobs.length,
      description: "Final packages waiting for manual posting.",
      tone: publishReadyJobs.length ? "success" as const : "normal" as const,
    },
    {
      label: "Needs attention",
      value: attentionJobs.length,
      description: "Failures or stuck work that should be inspected.",
      tone: attentionJobs.length ? "warning" as const : "normal" as const,
    },
  ];

  return (
    <div className="space-y-5">
      <SectionPanel
        title="Studio Dashboard"
        description="Character activity, pending work, and the safest next action."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreatePublication}
              className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Create publication
            </button>
            <button
              type="button"
              onClick={() => void loadSummary()}
              disabled={loading}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && !summary ? (
          <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-surface px-4 py-10 text-sm text-gray-500">
            <LoadingSpinner className="mr-2 size-4" label="Loading dashboard..." />
            Loading Studio activity...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface-overlay to-surface">
                <div className="grid gap-0 md:grid-cols-[1fr_220px]">
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-accent">
                        Recommended next action
                      </span>
                      {primaryJob && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            primaryJob.status === "failed"
                              ? "bg-red-950 text-red-200"
                              : primaryJob.status === "review-ready"
                                ? "bg-amber-950 text-amber-200"
                                : primaryJob.status === "ready-to-publish"
                                  ? "bg-emerald-950 text-emerald-200"
                                  : "bg-surface text-gray-300"
                          }`}
                        >
                          {statusLabel(primaryJob.status)}
                        </span>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        {primaryJob ? "Publication task" : "Studio"}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-gray-100">
                        {primaryJob?.nextAction.label || "No active action"}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                        {primaryJob?.nextAction.description ||
                          "All visible Studio work is complete. Create a new publication when ready."}
                      </p>
                    </div>

                    {primaryJob ? (
                      <>
                        <div className="mt-5 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            {optionLabel(catalogOptions.avatars, primaryJob.avatar)}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            {optionLabel(catalogOptions.scenes, primaryJob.scene)}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            Instagram
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            {formatLabel(primaryJob.format)}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            Created {formatRelativeTime(primaryJob.createdAt)}
                          </span>
                          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-gray-300">
                            Normal priority
                          </span>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenPublicationJob(primaryJob.publicationJobId)}
                            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                          >
                            Open task
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPublicationJob(primaryJob.publicationJobId)}
                            className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-500 hover:text-white"
                          >
                            View publication
                          </button>
                          <span className="text-xs text-gray-500">
                            Updated {formatRelativeTime(primaryJob.updatedAt)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={onCreatePublication}
                        className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                      >
                        Create first publication
                      </button>
                    )}
                  </div>

                  <div className="flex min-h-48 items-center justify-center border-t border-border bg-black/20 p-4 md:border-l md:border-t-0">
                    {primaryJob?.thumbnailUrl ? (
                      <a
                        href={primaryJob.thumbnailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group block aspect-[4/5] w-full max-w-40 overflow-hidden rounded-lg border border-border bg-black/40"
                      >
                        <img
                          src={primaryJob.thumbnailUrl}
                          alt={`${optionLabel(catalogOptions.avatars, primaryJob.avatar)} ${optionLabel(catalogOptions.scenes, primaryJob.scene)}`}
                          className="size-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:brightness-110"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-[4/5] w-full max-w-40 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface text-center">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Preview
                        </span>
                        <span className="mt-2 px-3 text-xs text-gray-600">
                          Appears after the first generated image.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {queueCards.map((card) => (
                  <div
                    key={card.label}
                    className={`rounded-xl border p-4 ${
                      card.tone === "warning"
                        ? "border-amber-800/60 bg-amber-950/25"
                        : card.tone === "success"
                          ? "border-emerald-800/50 bg-emerald-950/25"
                          : "border-border bg-surface"
                    }`}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-100">{card.value}</p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">{card.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-100">Characters</h3>
                    <p className="mt-1 text-xs text-gray-500">Activity by character.</p>
                  </div>
                  <span className="rounded-full bg-surface-overlay px-2 py-1 text-xs text-gray-400">
                    {characterCards.length} active
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {characterCards.length ? (
                    characterCards.map((card) => (
                      <div key={card.avatar} className="rounded-lg border border-border bg-surface-overlay p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-100">{card.label}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              Latest: {card.latest ? statusLabel(card.latest.status) : "No activity"}
                            </p>
                          </div>
                          {card.latest && (
                            <button
                              type="button"
                              onClick={() => onOpenPublicationJob(card.latest!.publicationJobId)}
                              className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-gray-300 hover:border-gray-500 hover:text-white"
                            >
                              Open
                            </button>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="rounded-md bg-surface px-2 py-1.5">
                            <p className="font-semibold text-gray-100">{card.active}</p>
                            <p className="text-gray-500">active</p>
                          </div>
                          <div className="rounded-md bg-surface px-2 py-1.5">
                            <p className="font-semibold text-amber-200">{card.review}</p>
                            <p className="text-gray-500">review</p>
                          </div>
                          <div className="rounded-md bg-surface px-2 py-1.5">
                            <p className="font-semibold text-emerald-200">{card.publishReady}</p>
                            <p className="text-gray-500">publish</p>
                          </div>
                          <div className="rounded-md bg-surface px-2 py-1.5">
                            <p className="font-semibold text-red-200">{card.attention}</p>
                            <p className="text-gray-500">issues</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
                      No character activity yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-100">Production queue</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Grouped by what the operator should do next.
                    </p>
                  </div>
                  {latestJob && (
                    <span className="text-xs text-gray-500">
                      Updated {formatRelativeTime(latestJob.updatedAt)}
                    </span>
                  )}
                </div>

                {summary?.groups.length ? (
                  <div className="mt-4 space-y-3">
                    {summary.groups.map((group) => {
                      const meta = queueMeta(group.status);
                      return (
                        <div key={group.status} className="rounded-lg border border-border bg-surface-overlay">
                          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
                            <div>
                              <h4 className="text-sm font-medium text-gray-100">{meta.label}</h4>
                              <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                meta.tone === "warning"
                                  ? "bg-amber-950 text-amber-200"
                                  : meta.tone === "success"
                                    ? "bg-emerald-950 text-emerald-200"
                                    : "bg-surface text-gray-300"
                              }`}
                            >
                              {group.count}
                            </span>
                          </div>
                          <div className="divide-y divide-border">
                            {group.jobs.slice(0, 4).map((job) => (
                              <div key={job.publicationJobId} className="grid gap-3 px-3 py-3 lg:grid-cols-[1fr_auto]">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-gray-100">
                                      {optionLabel(catalogOptions.avatars, job.avatar)}
                                    </p>
                                    <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-gray-400">
                                      {optionLabel(catalogOptions.scenes, job.scene)}
                                    </span>
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
                                    Open task
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-gray-500">
                    No active Studio work. Create a publication to begin.
                  </div>
                )}
              </div>
            </div>

            {(recentPublishedJobs.length > 0 || technicalMode) && (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-sm font-medium text-gray-100">Recent outcomes</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Latest completed or visible Studio activity.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-surface-overlay p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Published</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-100">
                        {countJobs(summary, ["published"])}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-overlay p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Selected</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-100">
                        {countJobs(summary, ["assets-ready", "copy-ready", "ready-to-publish"])}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-overlay p-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500">In progress</p>
                      <p className="mt-2 text-2xl font-semibold text-gray-100">
                        {countJobs(summary, ["draft", "brief-ready", "prompt-ready", "generating"])}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-4">
                  <h3 className="text-sm font-medium text-gray-100">Recently published</h3>
                  <div className="mt-4 space-y-2">
                    {recentPublishedJobs.length ? (
                      recentPublishedJobs.map((job) => (
                        <button
                          key={job.publicationJobId}
                          type="button"
                          onClick={() => onOpenPublicationJob(job.publicationJobId)}
                          className="block w-full rounded-md border border-border bg-surface-overlay px-3 py-2 text-left text-sm text-gray-300 hover:border-gray-500 hover:text-white"
                        >
                          {optionLabel(catalogOptions.avatars, job.avatar)} ·{" "}
                          {optionLabel(catalogOptions.scenes, job.scene)}
                          <span className="ml-2 text-xs text-gray-500">
                            {formatRelativeTime(job.updatedAt)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-gray-500">
                        No published items in the loaded window.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
