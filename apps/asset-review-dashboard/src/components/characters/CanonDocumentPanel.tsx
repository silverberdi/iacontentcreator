type CanonDocumentPanelProps = {
  visibleCanonMarkdown: string;
  onGoToApproval: () => void;
  onOpenDocument: () => void;
};

export function CanonDocumentPanel({
  visibleCanonMarkdown,
  onGoToApproval,
  onOpenDocument,
}: CanonDocumentPanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Unified canon document
          </h4>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Read this as the production truth for the character. Sections remain
            available only for audit and import traceability.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGoToApproval}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"
          >
            Go to approval
          </button>
          <button
            type="button"
            onClick={onOpenDocument}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 hover:text-white"
          >
            Open larger
          </button>
        </div>
      </div>
      {visibleCanonMarkdown ? (
        <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-raised p-4 text-sm leading-6 text-gray-200">
          {visibleCanonMarkdown}
        </pre>
      ) : (
        <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          No unified canon document is available yet. Import notes or use the
          conversation to build the first canon proposal.
        </div>
      )}
    </div>
  );
}
