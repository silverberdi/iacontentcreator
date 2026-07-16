import ActionButton from "./ActionButton";

type StepNavigationFooterProps = {
  continueLabel?: string;
  onContinue?: () => void;
  showFlowComplete?: boolean;
};

export default function StepNavigationFooter({
  continueLabel,
  onContinue,
  showFlowComplete,
}: StepNavigationFooterProps) {
  if (!continueLabel && !showFlowComplete) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border-muted pt-5">
      {continueLabel && onContinue && (
        <ActionButton variant="primary" onClick={onContinue} className="px-4 py-2 text-sm">
          {continueLabel}
        </ActionButton>
      )}
      {showFlowComplete && (
        <p className="text-sm font-medium text-emerald-200" role="status">Flujo listo</p>
      )}
    </div>
  );
}
