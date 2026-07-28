import type { WatcherStatusResponse } from "../../types/autoIngest";
import { formatDate } from "../../utils/format";
import ResultRow from "../ResultRow";
import SectionPanel from "../SectionPanel";
import LoadingSpinner from "../LoadingSpinner";

type WatcherControlsSectionProps = {
  status: WatcherStatusResponse | null;
  technicalMode: boolean;
  loading: boolean;
  actionPending: boolean;
  error: string | null;
  successMessage: string | null;
  onRefresh: () => void;
  onStart: () => void;
  onStop: () => void;
  onRunOnce: () => void;
};

export default function WatcherControlsSection({
  status,
  technicalMode,
  loading,
  actionPending,
  error,
  successMessage,
  onRefresh,
  onStart,
  onStop,
  onRunOnce,
}: WatcherControlsSectionProps) {
  const busy = loading || actionPending;

  return (
    <SectionPanel
      title="B. Watcher Status + Controls"
      description="Poll Comfy output and run the ingest pipeline automatically."
      actions={
        <>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 hover:border-gray-500 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh Watcher Status"}
          </button>
          {technicalMode && (
            <>
              <button
                type="button"
                onClick={onStart}
                disabled={busy}
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Start Watcher
              </button>
              <button
                type="button"
                onClick={onStop}
                disabled={busy}
                className="rounded-md bg-red-900/80 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-800 disabled:opacity-50"
              >
                Stop Watcher
              </button>
              <button
                type="button"
                onClick={onRunOnce}
                disabled={busy}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {actionPending ? "Running…" : "Run Once"}
              </button>
            </>
          )}
        </>
      }
    >
      {!technicalMode && (
        <p className="mb-3 text-sm text-gray-500">
          Watcher start, stop, and run-once controls are hidden outside technical mode.
        </p>
      )}

      {loading && !status && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <LoadingSpinner className="size-4" label="Loading watcher status…" />
        </div>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mb-3 text-sm text-emerald-300" role="status">
          {successMessage}
        </p>
      )}

      {status && (
        <div className="space-y-5">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <ResultRow label="enabled" value={status.enabled} />
            <ResultRow label="running" value={status.running} />
            <ResultRow label="busy" value={status.busy} />
            <ResultRow
              label="startedAt"
              value={status.startedAt ? formatDate(status.startedAt) : undefined}
            />
            <ResultRow label="pendingFiles.count" value={status.pendingFiles?.count} />
          </dl>

          {status.activeProfile && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Ingest setup used by watcher
              </p>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <ResultRow label="ingest setup" value={status.activeProfile.profileName} />
                <ResultRow label="avatar" value={status.activeProfile.avatar} />
                <ResultRow label="scene" value={status.activeProfile.scene} />
                <ResultRow label="workflow" value={status.activeProfile.workflow} />
                <ResultRow label="model" value={status.activeProfile.model} />
                <ResultRow label="seed" value={status.activeProfile.seed} />
              </dl>
            </div>
          )}

          {status.lastRun && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                lastRun
              </p>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <ResultRow label="status" value={status.lastRun.status} />
                <ResultRow label="reason" value={status.lastRun.reason} />
                <ResultRow label="pipelineExecuted" value={status.lastRun.pipelineExecuted} />
                <ResultRow label="previewCount" value={status.lastRun.previewCount} />
                <ResultRow
                  label="finishedAt"
                  value={
                    status.lastRun.finishedAt
                      ? formatDate(status.lastRun.finishedAt)
                      : undefined
                  }
                />
                <ResultRow label="message" value={status.lastRun.message} />
              </dl>
            </div>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
