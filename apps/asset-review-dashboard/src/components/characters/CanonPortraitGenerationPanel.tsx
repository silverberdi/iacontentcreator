import type {
  CharacterCanonPortraitJob,
  CharacterCanonPortraitPromptPack,
} from "../../types/characters";

type OperatorMessage = {
  type: "success" | "error";
  text: string;
} | null;

type CanonPortraitGenerationPanelProps = {
  canonJob: CharacterCanonPortraitJob | null;
  canonPromptPack: CharacterCanonPortraitPromptPack | null;
  canonInstructions: string[];
  canonMessage: OperatorMessage;
  canonSaving: boolean;
  canonRunning: boolean;
  canonIngesting: boolean;
  canonOutputUrl: string;
  setCanonOutputUrl: (value: string) => void;
  onQueueCanonPortrait: () => void;
  onRunCanonPortrait: () => void;
  onIngestCanonPortrait: () => void;
};

export function CanonPortraitGenerationPanel({
  canonJob,
  canonPromptPack,
  canonInstructions,
  canonMessage,
  canonSaving,
  canonRunning,
  canonIngesting,
  canonOutputUrl,
  setCanonOutputUrl,
  onQueueCanonPortrait,
  onRunCanonPortrait,
  onIngestCanonPortrait,
}: CanonPortraitGenerationPanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Canon portrait generation
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Create the first identity portrait job from this character definition. Good
            outputs should be registered below as `identity-candidate`, then promoted to
            `identity-canon` when the operator recognizes the character.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onQueueCanonPortrait}
            disabled={canonSaving}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {canonSaving ? "Queueing..." : "Generate canon portrait job"}
          </button>
          <button
            type="button"
            onClick={onRunCanonPortrait}
            disabled={!canonJob?.jobId || canonRunning}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-200 disabled:opacity-40"
          >
            {canonRunning ? "Running..." : "Run job"}
          </button>
        </div>
      </div>

      {canonMessage && (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            canonMessage.type === "success"
              ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-200"
              : "border-red-800/60 bg-red-950/40 text-red-200"
          }`}
          role="status"
        >
          {canonMessage.text}
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Scene
          </p>
          <p className="mt-1 text-sm text-gray-200">portrait-canon</p>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Job status
          </p>
          <p className="mt-1 text-sm text-gray-200">{canonJob?.status ?? "Not queued"}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Expected result
          </p>
          <p className="mt-1 text-sm text-gray-200">identity-candidate</p>
        </div>
      </div>

      {canonJob?.jobId && (
        <p className="mt-3 break-all font-mono text-xs text-gray-500">
          generationJobId: {canonJob.jobId}
        </p>
      )}

      {canonPromptPack && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Positive prompt
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
              {canonPromptPack.positivePrompt}
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-raised p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Negative prompt
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
              {canonPromptPack.negativePrompt}
            </p>
          </div>
        </div>
      )}

      {canonInstructions.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-900/60 bg-amber-950/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Next manual step
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/80">
            {canonInstructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="text-sm text-gray-400">
          Comfy output URL
          <input
            value={canonOutputUrl}
            onChange={(event) => setCanonOutputUrl(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-gray-100"
            placeholder="Paste the Comfy output image URL after generation"
          />
        </label>
        <button
          type="button"
          onClick={onIngestCanonPortrait}
          disabled={!canonJob?.jobId || canonIngesting}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {canonIngesting ? "Ingesting..." : "Ingest as identity-candidate"}
        </button>
      </div>
    </div>
  );
}
