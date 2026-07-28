import { useCallback, useEffect, useMemo, useState } from "react";
import { getAutoIngestPreview, getWatcherStatus } from "../api/autoIngestApi";
import { checkBackupHealth, listBackups } from "../api/backupApi";
import { getAiGatewayHealth } from "../api/opsApi";
import { loadPublicationJobsSummary } from "../api/publicationsApi";
import type { AutoIngestPreviewResponse, WatcherStatusResponse } from "../types/autoIngest";
import type { BackupHealthResponse, BackupListResponse } from "../types/backups";
import type { AiGatewayHealthResponse } from "../types/ops";
import type { PublicationJobSummary, PublicationJobsSummary } from "../types/publications";

type OpsDestination = "auto-ingest" | "backups" | "catalogs" | "access";

type OpsDashboardPanelProps = {
  technicalMode: boolean;
  onOpenSection: (section: OpsDestination) => void;
};

type ServiceTone = "healthy" | "warning" | "danger" | "unknown";

function readError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function statusClasses(tone: ServiceTone): string {
  if (tone === "healthy") return "border-emerald-800/60 bg-emerald-950/25 text-emerald-200";
  if (tone === "warning") return "border-amber-800/60 bg-amber-950/25 text-amber-200";
  if (tone === "danger") return "border-red-800/60 bg-red-950/25 text-red-200";
  return "border-border bg-surface text-gray-300";
}

function humanDate(value?: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function ageLabel(value?: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "Unknown";
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function countStatuses(summary: PublicationJobsSummary | null, statuses: string[]): number {
  if (!summary) return 0;
  return statuses.reduce((total, status) => total + Number(summary.counts?.[status] || 0), 0);
}

function recentJobs(summary: PublicationJobsSummary | null, statuses: string[]): PublicationJobSummary[] {
  if (!summary?.jobs?.length) return [];
  const wanted = new Set(statuses);
  return summary.jobs.filter((job) => wanted.has(String(job.status))).slice(0, 5);
}

function ServiceCard({
  label,
  tone,
  status,
  detail,
}: {
  label: string;
  tone: ServiceTone;
  status: string;
  detail: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${statusClasses(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{status}</p>
      <p className="mt-2 text-sm opacity-80">{detail}</p>
    </div>
  );
}

function ActionLink({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-surface p-4 text-left transition hover:border-accent/70 hover:bg-surface-overlay"
    >
      <p className="text-sm font-semibold text-gray-100">{label}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </button>
  );
}

export default function OpsDashboardPanel({
  technicalMode,
  onOpenSection,
}: OpsDashboardPanelProps) {
  const [summary, setSummary] = useState<PublicationJobsSummary | null>(null);
  const [watcher, setWatcher] = useState<WatcherStatusResponse | null>(null);
  const [preview, setPreview] = useState<AutoIngestPreviewResponse | null>(null);
  const [backupHealth, setBackupHealth] = useState<BackupHealthResponse | null>(null);
  const [backupList, setBackupList] = useState<BackupListResponse | null>(null);
  const [aiGatewayHealth, setAiGatewayHealth] = useState<AiGatewayHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      loadPublicationJobsSummary({ includePublished: true, limit: 40 }),
      getWatcherStatus(),
      getAutoIngestPreview(),
      checkBackupHealth(),
      listBackups(),
      getAiGatewayHealth(),
    ]);

    const [summaryResult, watcherResult, previewResult, backupHealthResult, backupListResult, aiGatewayHealthResult] = results;
    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    if (watcherResult.status === "fulfilled") setWatcher(watcherResult.value);
    if (previewResult.status === "fulfilled") setPreview(previewResult.value);
    if (backupHealthResult.status === "fulfilled") setBackupHealth(backupHealthResult.value);
    if (backupListResult.status === "fulfilled") setBackupList(backupListResult.value);
    if (aiGatewayHealthResult.status === "fulfilled") setAiGatewayHealth(aiGatewayHealthResult.value);

    const failures = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => readError(result.reason, "Unknown status check failure"));
    setError(failures.length ? failures.join(" | ") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const failedCount = countStatuses(summary, ["failed"]);
  const stuckCount = countStatuses(summary, ["generating"]);
  const reviewCount = countStatuses(summary, ["review-ready"]);
  const readyCount = countStatuses(summary, ["ready-to-publish"]);
  const failedJobs = useMemo(() => recentJobs(summary, ["failed"]), [summary]);
  const stuckJobs = useMemo(() => recentJobs(summary, ["generating"]), [summary]);
  const latestBackup = backupList?.backups?.[0] ?? null;
  const backupTone: ServiceTone = backupHealth?.ok === false ? "danger" : latestBackup?.success === false ? "warning" : backupHealth?.ok ? "healthy" : "unknown";
  const ingestPending = Number(preview?.pendingCount ?? preview?.movedCount ?? 0) || 0;
  const deepseek = aiGatewayHealth?.providers?.deepseek;
  const comfyCloud = aiGatewayHealth?.providers?.comfyCloud;
  const visualQa = aiGatewayHealth?.providers?.visualQa;
  const aiGatewayTone: ServiceTone = aiGatewayHealth?.ok ? "healthy" : aiGatewayHealth ? "danger" : "unknown";
  const providerTone: ServiceTone =
    !aiGatewayHealth
      ? "unknown"
      : deepseek?.configured && comfyCloud?.configured && visualQa?.configured
        ? "healthy"
        : deepseek?.configured || comfyCloud?.configured || visualQa?.configured
          ? "warning"
          : "danger";

  return (
    <section className="space-y-5 rounded-lg border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">Ops dashboard</p>
          <p className="mt-1 text-sm text-gray-500">
            System health, stuck work, ingest state, and backup freshness in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm font-medium text-gray-200 hover:border-gray-500 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh ops"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Some checks could not be loaded: {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ServiceCard
          label="ai-gateway"
          tone={aiGatewayTone}
          status={aiGatewayHealth?.ok ? "Online" : aiGatewayHealth ? "Down" : "Unknown"}
          detail={aiGatewayHealth?.ok ? "Health endpoint is responding through the console gateway." : aiGatewayHealth?.error || "Health check not loaded yet."}
        />
        <ServiceCard
          label="n8n"
          tone={summary || watcher || backupHealth ? "healthy" : "unknown"}
          status={summary || watcher || backupHealth ? "Responding" : "Unknown"}
          detail="Webhook APIs are responding when dashboard checks load."
        />
        <ServiceCard
          label="AI providers"
          tone={providerTone}
          status={providerTone === "healthy" ? "Configured" : providerTone === "warning" ? "Partial" : providerTone === "danger" ? "Missing" : "Unknown"}
          detail={`DeepSeek: ${deepseek?.configured ? deepseek.model || "configured" : "missing"} · Comfy: ${comfyCloud?.configured ? "configured" : "missing"} · Visual QA: ${visualQa?.configured ? visualQa.provider || "configured" : "missing"}`}
        />
        <ServiceCard
          label="Backups"
          tone={backupTone}
          status={latestBackup ? ageLabel(latestBackup.finishedAt || latestBackup.createdAt) : backupHealth?.status || "Unknown"}
          detail={latestBackup ? `Latest backup ${latestBackup.success ? "succeeded" : "needs review"}.` : backupHealth?.message || "No backup list loaded."}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Recent failures</p>
          <p className="mt-2 text-3xl font-semibold text-gray-100">{failedCount}</p>
          <p className="mt-1 text-sm text-gray-500">Publication jobs that need inspection.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Long-running work</p>
          <p className="mt-2 text-3xl font-semibold text-gray-100">{stuckCount}</p>
          <p className="mt-1 text-sm text-gray-500">Jobs currently in image generation.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Needs review</p>
          <p className="mt-2 text-3xl font-semibold text-gray-100">{reviewCount}</p>
          <p className="mt-1 text-sm text-gray-500">Images waiting for a human decision.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ready to publish</p>
          <p className="mt-2 text-3xl font-semibold text-gray-100">{readyCount}</p>
          <p className="mt-1 text-sm text-gray-500">Final packages waiting for posting.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">Ingest watcher</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">State</p>
              <p className="mt-1 text-sm text-gray-100">{watcher?.running ? "Running" : watcher?.enabled ? "Enabled, stopped" : "Stopped"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending files</p>
              <p className="mt-1 text-sm text-gray-100">{watcher?.pendingFiles?.count ?? ingestPending}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Last run</p>
              <p className="mt-1 text-sm text-gray-100">{humanDate(watcher?.lastRun?.finishedAt)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Ingest setup used by watcher: {watcher?.activeProfile?.profileName || watcher?.activeProfile?.avatar || "Not loaded"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">Work needing attention</p>
          <div className="mt-3 grid gap-3">
            {[...failedJobs, ...stuckJobs].slice(0, 5).map((job) => (
              <div key={job.publicationJobId} className="rounded-md bg-surface-overlay px-3 py-2">
                <p className="text-sm font-medium text-gray-100">{job.status}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {job.avatar} / {job.scene} · updated {ageLabel(job.updatedAt)}
                </p>
              </div>
            ))}
            {failedJobs.length === 0 && stuckJobs.length === 0 && (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-gray-500">
                No failed or long-running jobs in the current summary.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActionLink label="Ingest" description="Review watcher state, pending files, and ingest controls." onClick={() => onOpenSection("auto-ingest")} />
        <ActionLink label="Catalogs" description="Manage avatars, scenes, and operational catalog options." onClick={() => onOpenSection("catalogs")} />
        <ActionLink label="Backups" description="Check backup history and freshness." onClick={() => onOpenSection("backups")} />
        <ActionLink label="Access" description="Review user access when available." onClick={() => onOpenSection("access")} />
      </div>

      {technicalMode && (
        <details className="rounded-lg border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-200">Raw ops diagnostics</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs text-gray-300">
            {JSON.stringify({ summary, watcher, preview, backupHealth, backupList, aiGatewayHealth }, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
