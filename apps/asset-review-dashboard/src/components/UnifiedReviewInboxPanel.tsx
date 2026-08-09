import { useEffect, useMemo, useState } from "react";
import { listReviewCandidates, rejectAsset } from "../api/assetReviewApi";
import { registerCharacterReference } from "../api/charactersApi";
import {
  generatePublicationImages,
  loadPublicationJobsSummary,
  selectPublicationAsset,
} from "../api/publicationsApi";
import type { CatalogOptionsBundle } from "../types/catalogs";
import type { AssetCandidate } from "../types/assets";
import type {
  PublicationJobSummary,
  PublicationJobsSummary,
  PublicationQualityReview,
} from "../types/publications";
import { optionLabel } from "../utils/catalogNormalize";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";

type UnifiedReviewInboxPanelProps = {
  catalogOptions: CatalogOptionsBundle;
  technicalMode?: boolean;
  onOpenPublicationJob: (publicationJobId: string) => void;
};

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
  return `${Math.floor(hours / 24)}d ago`;
}

function reviewItems(summary: PublicationJobsSummary | null): PublicationJobSummary[] {
  return (summary?.jobs || []).filter((job) => {
    if (job.status === "review-ready") return true;
    if (job.latestAssetId && !job.selectedAssetId) return true;
    return false;
  });
}

function humanizeFlag(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function qualityStatusLabel(status: string | undefined, defective: boolean | null | undefined): string {
  if (status === "pass") return "Looks safe";
  if (status === "blocked" || defective) return "Blocked by QA";
  if (status === "review_required") return "Check carefully";
  return "Not checked yet";
}

function qualityStatusClass(status: string | undefined, defective: boolean | null | undefined): string {
  if (status === "pass") return "border-emerald-800/60 bg-emerald-950/20 text-emerald-200";
  if (status === "blocked" || defective) return "border-red-800/60 bg-red-950/30 text-red-200";
  if (status === "review_required") return "border-amber-800/60 bg-amber-950/20 text-amber-200";
  return "border-border bg-surface-overlay text-gray-300";
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return "Looks good";
  if (score >= 0.6) return "Review";
  return "Needs review";
}

function scoreClass(score: number): string {
  if (score >= 0.8) return "text-emerald-200";
  if (score >= 0.6) return "text-amber-200";
  return "text-red-200";
}

const defaultCriteria = {
  identity: true,
  face: true,
  hands: true,
  feet: true,
  composition: true,
  brandFit: true,
  publishability: true,
};

function buildReview(
  decision: PublicationQualityReview["decision"],
  notes: string,
  reasons: string[] = [],
): PublicationQualityReview {
  return {
    contractVersion: "publication-quality-review-v1",
    decision,
    criteria: defaultCriteria,
    reasons,
    notes: notes.trim() || (decision === "select-for-publication"
      ? "Selected from Review Inbox."
      : "Rejected from Review Inbox."),
    reviewedAt: new Date().toISOString(),
  };
}

export default function UnifiedReviewInboxPanel({
  catalogOptions,
  technicalMode = false,
  onOpenPublicationJob,
}: UnifiedReviewInboxPanelProps) {
  const [summary, setSummary] = useState<PublicationJobsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFilter, setAvatarFilter] = useState("all");
  const [sceneFilter, setSceneFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "selected" | "attention">("all");
  const [qaFilter, setQaFilter] = useState<"all" | "pass" | "review_required" | "blocked" | "not-run">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "publication" | "asset-review">("all");
  const [assetCandidates, setAssetCandidates] = useState<AssetCandidate[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  async function loadInbox() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await loadPublicationJobsSummary({ includePublished: false, limit: 100 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review inbox could not be loaded.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInbox();
  }, []);

  async function loadAssetCandidates() {
    setAssetsLoading(true);
    try {
      const avatars =
        avatarFilter === "all"
          ? catalogOptions.avatars.map((avatar) => avatar.value)
          : [avatarFilter];
      const scenes = catalogOptions.scenes.filter((scene) => {
        if (sceneFilter !== "all" && scene.value !== sceneFilter) return false;
        if (avatarFilter !== "all" && scene.avatar && scene.avatar !== avatarFilter) return false;
        return true;
      });
      const sceneValues = scenes.length
        ? scenes.map((scene) => ({ avatar: scene.avatar || avatars[0], scene: scene.value }))
        : avatars.map((avatar) => ({ avatar, scene: sceneFilter === "all" ? "coffee-rain" : sceneFilter }));
      const requests = sceneValues
        .filter((item) => item.avatar && item.scene)
        .slice(0, 24)
        .map((item) =>
          listReviewCandidates({
            avatar: item.avatar,
            scene: item.scene,
            assetType: "raw-image",
            limit: 12,
          }),
        );
      const responses = await Promise.allSettled(requests);
      const nextCandidates = responses.flatMap((response) =>
        response.status === "fulfilled" ? response.value.candidates : [],
      );
      const unique = Array.from(
        new Map(nextCandidates.map((asset) => [asset.assetId, asset])).values(),
      ).filter((asset) => !asset.isCanonical && asset.status !== "canonical" && asset.status !== "rejected");
      setAssetCandidates(unique);
    } catch {
      setAssetCandidates([]);
    } finally {
      setAssetsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssetCandidates();
  }, [avatarFilter, sceneFilter, catalogOptions.avatars, catalogOptions.scenes]);

  const filteredJobs = useMemo(
    () =>
      (summary?.jobs || []).filter((job) => {
        if (avatarFilter !== "all" && job.avatar !== avatarFilter) return false;
        if (sceneFilter !== "all" && job.scene !== sceneFilter) return false;
        if (sourceFilter === "asset-review") return false;
        if (qaFilter !== "all") {
          const status = job.latestAssetQa?.status || "not-run";
          const isBlocked = status === "blocked" || job.latestAssetDefective === true;
          if (qaFilter === "blocked" && !isBlocked) return false;
          if (qaFilter !== "blocked" && status !== qaFilter) return false;
        }
        if (queueFilter === "attention") return job.status === "failed" || Boolean(job.errorMessage);
        if (queueFilter === "selected") return Boolean(job.selectedAssetId);
        if (queueFilter === "pending") return job.status === "review-ready" || Boolean(job.latestAssetId);
        return true;
      }),
    [avatarFilter, qaFilter, queueFilter, sceneFilter, sourceFilter, summary?.jobs],
  );
  const filteredSummary = summary ? { ...summary, jobs: filteredJobs } : null;
  const items = useMemo(() => reviewItems(filteredSummary), [filteredSummary]);
  const filteredAssetCandidates = useMemo(
    () =>
      assetCandidates.filter((asset) => {
        if (sourceFilter === "publication") return false;
        if (avatarFilter !== "all" && asset.avatar !== avatarFilter) return false;
        if (sceneFilter !== "all" && asset.scene !== sceneFilter) return false;
        if (qaFilter !== "all" && qaFilter !== "not-run") return false;
        if (queueFilter === "selected") return asset.status === "selected";
        if (queueFilter === "attention") return false;
        if (queueFilter === "pending") return asset.status === "raw" || asset.status === "selected";
        return true;
      }),
    [assetCandidates, avatarFilter, qaFilter, queueFilter, sceneFilter, sourceFilter],
  );
  const totalReviewItems = items.length + filteredAssetCandidates.length;
  const blockedOrFailed = filteredJobs.filter((job) => job.status === "failed" || Boolean(job.errorMessage));
  const publicationCandidates = items.filter((job) => job.latestAssetId);
  const selectedButStillReviewReady = items.filter((job) => job.selectedAssetId);
  const sceneOptions = useMemo(() => {
    if (avatarFilter === "all") return catalogOptions.scenes;
    return catalogOptions.scenes.filter((scene) => !scene.avatar || scene.avatar === avatarFilter);
  }, [avatarFilter, catalogOptions.scenes]);

  async function approveForPublication(job: PublicationJobSummary) {
    if (!job.latestAssetId) return;
    setActionPendingId(job.publicationJobId);
    setActionMessage(null);
    try {
      const review = buildReview(
        "select-for-publication",
        reviewNotes[job.publicationJobId] || "Selected for publication from Review Inbox.",
      );
      await selectPublicationAsset({
        publicationJobId: job.publicationJobId,
        assetId: job.latestAssetId,
        reviewNotes: JSON.stringify(review),
      });
      setActionMessage("Image selected for publication.");
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image could not be selected.");
    } finally {
      setActionPendingId(null);
    }
  }

  async function rejectForPublication(job: PublicationJobSummary) {
    if (!job.latestAssetId) return;
    setActionPendingId(job.publicationJobId);
    setActionMessage(null);
    try {
      const review = buildReview(
        "reject-for-publication",
        reviewNotes[job.publicationJobId] || "Needs another try from Review Inbox.",
        ["not-publishable"],
      );
      const result = await rejectAsset(job.latestAssetId, JSON.stringify(review));
      if (!result.rejected) throw new Error(result.reason || "Image could not be rejected.");
      await generatePublicationImages({
        publicationJobId: job.publicationJobId,
        mode: "comfy-cloud-api",
      });
      setActionMessage("Image rejected and another generation was submitted.");
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image could not be rejected.");
    } finally {
      setActionPendingId(null);
    }
  }

  async function rejectAssetCandidate(asset: AssetCandidate) {
    setActionPendingId(asset.assetId);
    setActionMessage(null);
    try {
      const notes =
        reviewNotes[asset.assetId] ||
        "Rejected from Review Inbox: not suitable for canonical/reference use.";
      const result = await rejectAsset(asset.assetId, notes);
      if (!result.rejected) throw new Error(result.reason || "Asset could not be rejected.");
      setActionMessage("Asset rejected for canonical/reference use.");
      await loadAssetCandidates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Asset could not be rejected.");
    } finally {
      setActionPendingId(null);
    }
  }

  async function useAssetAsSceneCanon(asset: AssetCandidate) {
    setActionPendingId(asset.assetId);
    setActionMessage(null);
    try {
      const notes =
        reviewNotes[asset.assetId] ||
        `Approved as ${optionLabel(catalogOptions.avatars, asset.avatar)} / ${optionLabel(catalogOptions.scenes, asset.scene)} scene canon from Asset Review.`;
      const result = await registerCharacterReference({
        avatar: asset.avatar,
        scene: asset.scene,
        classification: "scene-canon",
        objectPathOrUrl: `/minio/${asset.bucket}/${asset.objectPath}`,
        reviewNotes: notes,
      });
      if (result.ok === false || !result.reference) {
        throw new Error(result.message || result.reason || "Scene canon could not be saved.");
      }
      setActionMessage(
        `Saved as scene canon for ${optionLabel(catalogOptions.avatars, asset.avatar)} / ${optionLabel(catalogOptions.scenes, asset.scene)}.`,
      );
      await loadAssetCandidates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scene canon could not be saved.");
    } finally {
      setActionPendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <SectionPanel
        title="Review Inbox"
        description="One queue for images that need a human decision."
        actions={
          <button
            type="button"
            onClick={() => void loadInbox()}
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
        {actionMessage && (
          <div className="mb-4 rounded-md border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {actionMessage}
          </div>
        )}

        <div className="mb-5 grid gap-3 rounded-lg border border-border bg-surface p-3 md:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Character</span>
            <select
              value={avatarFilter}
              onChange={(event) => {
                setAvatarFilter(event.target.value);
                setSceneFilter("all");
              }}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            >
              <option value="all">All characters</option>
              {catalogOptions.avatars.map((avatar) => (
                <option key={avatar.value} value={avatar.value}>
                  {avatar.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Scene</span>
            <select
              value={sceneFilter}
              onChange={(event) => setSceneFilter(event.target.value)}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            >
              <option value="all">All scenes</option>
              {sceneOptions.map((scene) => (
                <option key={`${scene.avatar || "global"}-${scene.value}`} value={scene.value}>
                  {scene.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Queue</span>
            <select
              value={queueFilter}
              onChange={(event) => setQueueFilter(event.target.value as typeof queueFilter)}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            >
              <option value="all">All review work</option>
              <option value="pending">Pending decision</option>
              <option value="selected">Already selected</option>
              <option value="attention">Needs attention</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Quality</span>
            <select
              value={qaFilter}
              onChange={(event) => setQaFilter(event.target.value as typeof qaFilter)}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            >
              <option value="all">All quality states</option>
              <option value="pass">Looks safe</option>
              <option value="review_required">Check carefully</option>
              <option value="blocked">Blocked by QA</option>
              <option value="not-run">Not checked yet</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Source</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
            >
              <option value="all">All sources</option>
              <option value="publication">Publication candidates</option>
              <option value="asset-review">Asset / reference candidates</option>
            </select>
          </label>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Needs review</p>
            <p className="mt-2 text-3xl font-semibold text-gray-100">{totalReviewItems}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Publication candidates</p>
            <p className="mt-2 text-3xl font-semibold text-gray-100">{publicationCandidates.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Already selected</p>
            <p className="mt-2 text-3xl font-semibold text-gray-100">{selectedButStillReviewReady.length}</p>
          </div>
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-300">Needs attention</p>
            <p className="mt-2 text-3xl font-semibold text-gray-100">{blockedOrFailed.length}</p>
          </div>
        </div>

        {(loading && !summary) || assetsLoading ? (
          <div className="flex items-center justify-center rounded-md border border-dashed border-border bg-surface px-4 py-10 text-sm text-gray-500">
            <LoadingSpinner className="mr-2 size-4" label="Loading review inbox..." />
            Loading review inbox...
          </div>
        ) : totalReviewItems ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {items.map((job) => {
              const qaStatus = job.latestAssetQa?.status;
              const qualityFlags = [
                ...(job.latestAssetQa?.flags || []),
                ...(job.latestAssetQa?.defectReasons || []),
                ...(job.latestAssetDefectReasons || []),
              ].filter(Boolean);
              const uniqueQualityFlags = Array.from(new Set(qualityFlags));
              const qualityScores = Object.entries(job.latestAssetQa?.scores || {})
                .filter(([, score]) => typeof score === "number")
                .slice(0, 4);
              const isBlockedByQa = qaStatus === "blocked" || job.latestAssetDefective === true;

              return (
              <article key={job.publicationJobId} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <div className="bg-black/30">
                    {job.thumbnailUrl ? (
                      <a href={job.thumbnailUrl} target="_blank" rel="noreferrer" className="block h-full min-h-56 overflow-hidden">
                        <img
                          src={job.thumbnailUrl}
                          alt={`${optionLabel(catalogOptions.avatars, job.avatar)} ${optionLabel(catalogOptions.scenes, job.scene)}`}
                          className="h-full min-h-56 w-full object-cover transition duration-200 hover:scale-[1.02] hover:brightness-110"
                        />
                      </a>
                    ) : (
                      <div className="flex h-full min-h-56 items-center justify-center border-b border-border text-center text-xs text-gray-500 sm:border-b-0 sm:border-r">
                        Preview unavailable
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-accent">
                          Publication candidate
                        </span>
                        <span className="rounded-full bg-amber-950 px-2.5 py-1 text-xs text-amber-200">
                          Pending decision
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-gray-100">
                        {optionLabel(catalogOptions.scenes, job.scene)}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">{job.objective}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        {optionLabel(catalogOptions.avatars, job.avatar)}
                      </span>
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        {job.format}
                      </span>
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        Updated {formatRelativeTime(job.updatedAt)}
                      </span>
                      {job.latestAssetStatus && (
                        <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                          Asset: {job.latestAssetStatus}
                        </span>
                      )}
                    </div>

                    {job.errorMessage && (
                      <p className="rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                        {job.errorMessage}
                      </p>
                    )}

                    <div className={`rounded-lg border px-3 py-3 text-sm ${qualityStatusClass(qaStatus, job.latestAssetDefective)}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Quality check</p>
                        <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium">
                          {qualityStatusLabel(qaStatus, job.latestAssetDefective)}
                        </span>
                      </div>
                      {uniqueQualityFlags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {uniqueQualityFlags.slice(0, 5).map((flag) => (
                            <span key={flag} className="rounded-full bg-black/20 px-2.5 py-1 text-xs">
                              {humanizeFlag(flag)}
                            </span>
                          ))}
                        </div>
                      )}
                      {qualityScores.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {qualityScores.map(([name, score]) => (
                            <div key={name} className="flex items-center justify-between gap-2 rounded-md bg-black/15 px-2.5 py-1.5 text-xs">
                              <span>{humanizeFlag(name)}</span>
                              <span className={`font-medium ${scoreClass(Number(score))}`}>
                                {scoreLabel(Number(score))} · {Math.round(Number(score) * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {job.latestAssetQa?.notes?.length ? (
                        <p className="mt-3 line-clamp-2 text-xs opacity-85">{job.latestAssetQa.notes[0]}</p>
                      ) : null}
                    </div>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Review note
                      </span>
                      <textarea
                        value={reviewNotes[job.publicationJobId] || ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [job.publicationJobId]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Optional: identity, hands, composition, brand fit..."
                        className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
                      />
                    </label>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void approveForPublication(job)}
                        disabled={!job.latestAssetId || isBlockedByQa || actionPendingId === job.publicationJobId}
                        className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBlockedByQa ? "Blocked by QA" : actionPendingId === job.publicationJobId ? "Saving..." : "Use for publication"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectForPublication(job)}
                        disabled={!job.latestAssetId || actionPendingId === job.publicationJobId}
                        className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs font-medium text-red-100 hover:border-red-600 disabled:opacity-50"
                      >
                        Needs another try
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPublicationJob(job.publicationJobId)}
                        className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white"
                      >
                        Open publication
                      </button>
                    </div>

                    {technicalMode && (
                      <dl className="grid gap-2 border-t border-border pt-3 text-xs text-gray-500">
                        <div>
                          <dt>publicationJobId</dt>
                          <dd className="break-all font-mono text-gray-300">{job.publicationJobId}</dd>
                        </div>
                        {job.latestAssetId && (
                          <div>
                            <dt>latestAssetId</dt>
                            <dd className="break-all font-mono text-gray-300">{job.latestAssetId}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>
                </div>
              </article>
              );
            })}
            {filteredAssetCandidates.map((asset) => (
              <article key={asset.assetId} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                  <div className="bg-black/30">
                    <a href={asset.url} target="_blank" rel="noreferrer" className="block h-full min-h-56 overflow-hidden">
                      <img
                        src={asset.url}
                        alt={`${optionLabel(catalogOptions.avatars, asset.avatar)} ${optionLabel(catalogOptions.scenes, asset.scene)}`}
                        className="h-full min-h-56 w-full object-cover transition duration-200 hover:scale-[1.02] hover:brightness-110"
                      />
                    </a>
                  </div>

                  <div className="flex flex-col gap-4 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-sky-200">
                          Asset / reference candidate
                        </span>
                        <span className="rounded-full bg-surface-overlay px-2.5 py-1 text-xs text-gray-300">
                          {asset.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-gray-100">
                        {optionLabel(catalogOptions.scenes, asset.scene)}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        Decide whether this image should teach future generations how this character looks in this scene.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        {optionLabel(catalogOptions.avatars, asset.avatar)}
                      </span>
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        {asset.assetType}
                      </span>
                      <span className="rounded-full border border-border bg-surface-overlay px-2.5 py-1 text-gray-300">
                        Created {formatRelativeTime(asset.createdAt)}
                      </span>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-overlay px-3 py-3 text-sm text-gray-300">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quality check</p>
                        <span className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium">
                          Not checked yet
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        This asset came from the canonical/reference review queue. QA metadata will appear here when available.
                      </p>
                    </div>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Review note
                      </span>
                      <textarea
                        value={reviewNotes[asset.assetId] || ""}
                        onChange={(event) =>
                          setReviewNotes((current) => ({
                            ...current,
                            [asset.assetId]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Optional: identity drift, hands, composition, not a good reference..."
                        className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
                      />
                    </label>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void useAssetAsSceneCanon(asset)}
                        disabled={actionPendingId === asset.assetId}
                        className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {actionPendingId === asset.assetId ? "Saving..." : "Use as scene canon"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectAssetCandidate(asset)}
                        disabled={actionPendingId === asset.assetId}
                        className="rounded-md border border-red-900 bg-red-950 px-3 py-2 text-xs font-medium text-red-100 hover:border-red-600 disabled:opacity-50"
                      >
                        {actionPendingId === asset.assetId ? "Rejecting..." : "Reject reference"}
                      </button>
                    </div>

                    {technicalMode && (
                      <dl className="grid gap-2 border-t border-border pt-3 text-xs text-gray-500">
                        <div>
                          <dt>assetId</dt>
                          <dd className="break-all font-mono text-gray-300">{asset.assetId}</dd>
                        </div>
                        <div>
                          <dt>objectPath</dt>
                          <dd className="break-all font-mono text-gray-300">{asset.objectPath}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-300">No images need review right now.</p>
            <p className="mt-1">New generated publication candidates will appear here.</p>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
