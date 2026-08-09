type CanonImportPanelProps = {
  canonImportName: string;
  canonImportText: string;
  canonImporting: boolean;
  setCanonImportName: (value: string) => void;
  setCanonImportText: (value: string) => void;
  onLoadFiles: (files: FileList | null) => void;
  onPreviewImport: () => void;
  onSaveImport: () => void;
};

export function CanonImportPanel({
  canonImportName,
  canonImportText,
  canonImporting,
  setCanonImportName,
  setCanonImportText,
  onLoadFiles,
  onPreviewImport,
  onSaveImport,
}: CanonImportPanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Import existing canon
          </h4>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Bring Markdown you already wrote into the database as a proposed import.
            This does not approve it; it only makes it reviewable here.
          </p>
        </div>
        <label className="cursor-pointer rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white">
          Select .md files
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            multiple
            className="hidden"
            onChange={(event) => onLoadFiles(event.target.files)}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm text-gray-400">
        Import label
        <input
          value={canonImportName}
          onChange={(event) => setCanonImportName(event.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100"
          placeholder="Andres canon pack v1, Diana private canon notes..."
        />
      </label>
      <label className="mt-3 block text-sm text-gray-400">
        Markdown content
        <textarea
          value={canonImportText}
          onChange={(event) => setCanonImportText(event.target.value)}
          className="mt-1 min-h-36 w-full rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100"
          placeholder="Paste one or many Markdown documents here. Headings become review sections."
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreviewImport}
          className="rounded-md border border-border bg-surface-overlay px-4 py-2 text-sm text-gray-200 hover:text-white"
        >
          Preview import
        </button>
        <button
          type="button"
          onClick={onSaveImport}
          disabled={canonImporting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {canonImporting ? "Saving..." : "Save as proposed import"}
        </button>
      </div>
    </div>
  );
}
