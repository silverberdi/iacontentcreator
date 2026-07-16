import type { ContentCycleOperation } from "../../hooks/useContentCycleOperations";
import ActionButton from "./ActionButton";
import TechnicalJsonDebug from "./TechnicalJsonDebug";

type TechnicalActionsPanelProps = {
  showTechnical: boolean;
  operationsEnabled: boolean;
  debugLog: Record<string, unknown>;
  isLoading: (op: ContentCycleOperation) => boolean;
  onResolveBrief: () => void;
  onResolveIdentity: () => void;
  onGeneratePrompt: () => void;
  onQueueJob: () => void;
  onRunComfy: () => void;
};

export default function TechnicalActionsPanel({
  showTechnical,
  operationsEnabled,
  debugLog,
  isLoading,
  onResolveBrief,
  onResolveIdentity,
  onGeneratePrompt,
  onQueueJob,
  onRunComfy,
}: TechnicalActionsPanelProps) {
  if (!showTechnical) return null;

  return (
    <details className="rounded-lg border border-border bg-surface-raised p-4">
      <summary className="cursor-pointer select-none text-sm font-medium text-gray-300">
        Acciones técnicas
      </summary>

      <p className="mt-3 mb-3 text-xs text-gray-500">
        Ejecuta endpoints individuales para depuración. No necesario en operación normal.
      </p>

      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={!operationsEnabled || isLoading("techResolveBrief")} onClick={onResolveBrief}>
          {isLoading("techResolveBrief") ? "…" : "POST /scenes/resolve-brief"}
        </ActionButton>
        <ActionButton disabled={!operationsEnabled || isLoading("techResolveIdentity")} onClick={onResolveIdentity}>
          {isLoading("techResolveIdentity") ? "…" : "POST /identity/resolve-pack"}
        </ActionButton>
        <ActionButton disabled={!operationsEnabled || isLoading("techGeneratePrompt")} onClick={onGeneratePrompt}>
          {isLoading("techGeneratePrompt") ? "…" : "POST /content/generate-prompt-pack"}
        </ActionButton>
        <ActionButton disabled={!operationsEnabled || isLoading("techQueueJob")} onClick={onQueueJob}>
          {isLoading("techQueueJob") ? "…" : "POST /generation/jobs/queue"}
        </ActionButton>
        <ActionButton disabled={!operationsEnabled || isLoading("techRunComfy")} onClick={onRunComfy}>
          {isLoading("techRunComfy") ? "…" : "POST /generation/jobs/run-comfy"}
        </ActionButton>
      </div>

      <div className="mt-4 space-y-2">
        {Object.entries(debugLog).map(([key, value]) => (
          <TechnicalJsonDebug
            key={key}
            showTechnical
            payload={value}
            label={`${key} JSON`}
          />
        ))}
      </div>
    </details>
  );
}
