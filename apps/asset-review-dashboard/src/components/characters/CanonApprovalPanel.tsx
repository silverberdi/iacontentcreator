import type { CharacterCanonRecord } from "../../types/characters";

type CanonApprovalPanelProps = {
  saving: boolean;
  canons: CharacterCanonRecord[];
  visibleCanonRecord: CharacterCanonRecord | null;
  visibleCanonMarkdown: string;
  onBuildProposal: () => void;
  onApproveCanon: () => void;
  onOpenDocument: (title: string, body: string) => void;
};

export function CanonApprovalPanel({
  saving,
  canons,
  visibleCanonRecord,
  visibleCanonMarkdown,
  onBuildProposal,
  onApproveCanon,
  onOpenDocument,
}: CanonApprovalPanelProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBuildProposal}
          className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white"
        >
          Update proposal from notes
        </button>
        <button
          type="button"
          onClick={onApproveCanon}
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Approve as official canon"}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Updating the proposal is safe and does not save. Approval makes this canon the
        official generation source for the character.
      </p>

      {visibleCanonRecord && (
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                Approval document
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                Approve only after this unified document reads like the character truth.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenDocument(
                  visibleCanonRecord.status === "approved"
                    ? "Approved canon rendering"
                    : "Imported canon rendering",
                  visibleCanonMarkdown,
                )
              }
              className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
            >
              Open larger
            </button>
          </div>
          {visibleCanonMarkdown ? (
            <pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-gray-200">
              {visibleCanonMarkdown}
            </pre>
          ) : (
            <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
              There is no readable canon document yet. Build or import canon before approval.
            </div>
          )}
          {visibleCanonRecord.canonJson.providerTrace ? (
            <div className="mt-3 rounded-md border border-border bg-surface-raised p-3 text-xs text-gray-400">
              <p className="font-semibold uppercase tracking-wide text-gray-300">
                AI provider trace
              </p>
              <p className="mt-1">
                {visibleCanonRecord.canonJson.providerTrace.task} ·{" "}
                {visibleCanonRecord.canonJson.providerTrace.provider} ·{" "}
                {visibleCanonRecord.canonJson.providerTrace.model}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {canons.length > 0 && (
        <div className="rounded-md border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Canon versions
          </h4>
          <div className="mt-3 grid gap-2">
            {canons.map((canon) => (
              <div
                key={canon.id ?? `${canon.avatar}-${canon.canonVersion}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm"
              >
                <span className="text-gray-200">
                  v{canon.canonVersion} · {canon.status}
                </span>
                <span className="text-xs text-gray-500">
                  {canon.updatedAt ?? canon.createdAt ?? ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
