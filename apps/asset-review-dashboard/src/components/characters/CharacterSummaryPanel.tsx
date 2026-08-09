import { joinList } from "../../domain/characterOnboardingModel";
import type { CharacterOnboardingSavePayload } from "../../types/characters";

type ReadinessItem = {
  label: string;
  ok: boolean;
};

type CharacterSummaryPanelProps = {
  draft: CharacterOnboardingSavePayload;
  currentReadiness: ReadinessItem[];
  saving: boolean;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
};

export function CharacterSummaryPanel({
  draft,
  currentReadiness,
  saving,
  onNotesChange,
  onSave,
}: CharacterSummaryPanelProps) {
  return (
    <>
      <div className="rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
              Operational snapshot
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              This is what the platform can currently use. If something feels wrong, refine it
              in Canon instead of editing duplicate forms.
            </p>
          </div>
          <span className="rounded-full border border-blue-900/70 bg-blue-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Canon-led
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Content pillars
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {joinList(draft.contentPillars) || "Pending in Canon"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Caption tone
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {joinList(draft.captionTone) || "Pending in Canon"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Brand fit
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {joinList(draft.brandFit) || "Pending in Canon"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Publishing limits
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {joinList(draft.publishingLimits) || "Pending in Canon"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Review triggers
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {joinList(draft.reviewTriggers) || "Pending in Canon"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Starter scenes
            </p>
            <p className="mt-2 text-sm text-gray-200">
              {draft.scenes.length
                ? draft.scenes.map((scene) => scene.displayName || scene.scene).join(", ")
                : "Pending in Canon"}
            </p>
          </div>
        </div>
      </div>

      <label className="mt-4 block text-sm text-gray-400">
        Notes
        <textarea
          value={draft.notes ?? ""}
          onChange={(event) => onNotesChange(event.target.value)}
          className="mt-1 min-h-16 w-full rounded-md border border-border bg-surface px-3 py-2 text-gray-100"
          placeholder="Operator notes, pending decisions, caveats."
        />
      </label>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {currentReadiness.map((item) => (
            <div
              key={item.label}
              className={`rounded-md border px-3 py-2 text-sm ${
                item.ok
                  ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-200"
                  : "border-border bg-surface text-gray-400"
              }`}
            >
              <span className="font-semibold">{item.ok ? "Ready" : "Missing"}</span>
              <p className="mt-1 text-xs">{item.label}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save character"}
        </button>
      </div>
    </>
  );
}
