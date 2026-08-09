import type { CharacterCanonSection } from "../../types/characters";

type CanonSectionsPanelProps = {
  visibleCanonSections: CharacterCanonSection[];
  hiddenImportWrapperCount: number;
  onOpenSection: (title: string, body: string) => void;
};

export function CanonSectionsPanel({
  visibleCanonSections,
  hiddenImportWrapperCount,
  onOpenSection,
}: CanonSectionsPanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Canon sections audit
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            Technical traceability by imported topic. Use Document for normal review.
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {visibleCanonSections.length} canon sections
        </span>
      </div>
      {hiddenImportWrapperCount > 0 ? (
        <div className="mt-3 rounded-md border border-blue-900/50 bg-blue-950/20 px-3 py-2 text-xs text-blue-100/80">
          {hiddenImportWrapperCount} source wrapper row
          {hiddenImportWrapperCount === 1 ? "" : "s"} hidden. File names are kept
          only as import traceability, not as canon topics.
        </div>
      ) : null}
      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-overlay text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visibleCanonSections.map((section) => {
              const fullMarkdown =
                typeof section.data.fullMarkdown === "string"
                  ? section.data.fullMarkdown
                  : section.summary;
              return (
                <tr key={section.key} className="bg-surface-raised">
                  <td className="px-3 py-3 font-semibold text-gray-200">
                    {section.label}
                  </td>
                  <td className="px-3 py-3 text-gray-400">{section.status}</td>
                  <td className="px-3 py-3 text-gray-500">
                    {fullMarkdown.length.toLocaleString()} chars
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenSection(section.label, fullMarkdown)}
                      className="rounded-md border border-border bg-surface px-3 py-1 text-xs text-gray-200 hover:text-white"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
