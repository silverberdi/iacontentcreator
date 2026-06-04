import type { AutoIngestPreviewResponse, RunPipelineResponse } from "../../types/autoIngest";
import ResultRow from "../ResultRow";
import SectionPanel from "../SectionPanel";
import LoadingSpinner from "../LoadingSpinner";

type PreviewLastRunSectionProps = {
  preview: AutoIngestPreviewResponse | null;
  pipelineResult: RunPipelineResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  onRefreshPreview: () => void;
  debugPayload?: unknown;
};

function formatOptionalCount(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

export default function PreviewLastRunSection({
  preview,
  pipelineResult,
  previewLoading,
  previewError,
  onRefreshPreview,
  debugPayload,
}: PreviewLastRunSectionProps) {
  const pendingFiles = preview?.files ?? preview?.pendingFiles;

  return (
    <SectionPanel
      title="D. Preview / Last Run"
      description="Pending files preview and the most recent manual or watcher pipeline result."
      actions={
        <button
          type="button"
          onClick={onRefreshPreview}
          disabled={previewLoading}
          className="rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-xs text-gray-200 hover:border-gray-500 disabled:opacity-50"
        >
          {previewLoading ? "Loading…" : "Refresh preview"}
        </button>
      }
    >
      {previewLoading && !preview && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <LoadingSpinner className="size-4" label="Loading preview…" />
        </div>
      )}

      {previewError && (
        <p className="mb-4 text-sm text-red-300" role="alert">
          {previewError}
        </p>
      )}

      {preview && (
        <div className="mb-5 rounded-md border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
            Pending files preview
          </p>
          <dl className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {preview.status !== undefined && <ResultRow label="status" value={preview.status} />}
            {preview.message !== undefined && (
              <ResultRow label="message" value={String(preview.message)} />
            )}
            {preview.pendingCount !== undefined && (
              <ResultRow label="pendingCount" value={preview.pendingCount} />
            )}
            {preview.movedCount !== undefined && (
              <ResultRow label="movedCount" value={preview.movedCount} />
            )}
          </dl>

          {Array.isArray(pendingFiles) && pendingFiles.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-gray-400">
              {pendingFiles.map((file, index) => (
                <li key={index} className="truncate">
                  {typeof file === "string"
                    ? file
                    : typeof file === "object" && file && "name" in file
                      ? String((file as { name: unknown }).name)
                      : JSON.stringify(file)}
                </li>
              ))}
            </ul>
          )}

          {Array.isArray(pendingFiles) && pendingFiles.length === 0 && (
            <p className="text-sm text-gray-500">No pending files in preview.</p>
          )}
        </div>
      )}

      {pipelineResult && (
        <div className="rounded-md border border-emerald-800/40 bg-emerald-950/30 p-4">
          <p className="mb-3 text-sm font-medium text-emerald-200">Last pipeline result</p>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <ResultRow label="status" value={pipelineResult.status} />
            <ResultRow label="pipelineExecuted" value={pipelineResult.pipelineExecuted} />
            <ResultRow label="movedCount" value={pipelineResult.movedCount} />
            <ResultRow
              label="registeredCount"
              value={formatOptionalCount(pipelineResult.registeredCount)}
            />
            <ResultRow
              label="duplicatesCount"
              value={formatOptionalCount(pipelineResult.duplicatesCount)}
            />
            {pipelineResult.message !== undefined && (
              <div className="sm:col-span-2 xl:col-span-5">
                <ResultRow label="message" value={pipelineResult.message} />
              </div>
            )}
          </dl>
        </div>
      )}

      {!previewLoading && !preview && !pipelineResult && !previewError && (
        <p className="text-sm text-gray-500">No preview or pipeline result yet.</p>
      )}

      {debugPayload !== undefined && (
        <details className="mt-4 rounded-md border border-border-muted bg-surface text-xs text-gray-500">
          <summary className="cursor-pointer select-none px-3 py-2 text-gray-400 hover:text-gray-300">
            Debug payload (advanced)
          </summary>
          <pre className="overflow-x-auto border-t border-border-muted px-3 py-2 font-mono text-gray-500">
            {JSON.stringify(debugPayload, null, 2)}
          </pre>
        </details>
      )}
    </SectionPanel>
  );
}
