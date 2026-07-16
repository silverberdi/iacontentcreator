import type { StepperState } from "../../utils/contentCycleFlow";
import { STEPPER_LABELS, stepStatusClass, stepStatusLabel } from "../../utils/contentCycleFlow";
import {
  ACTIVE_STEP_TO_STEPPER,
  type ContentCycleActiveStep,
} from "../../utils/contentCycleWizard";

const STEP_ORDER: ContentCycleActiveStep[] = [
  "prepare-image",
  "generate-image",
  "review-image",
  "publication-draft",
  "manual-export",
];

type FlowStepperProps = {
  stepper: StepperState;
  activeStep: ContentCycleActiveStep;
  canNavigateToStep: (step: ContentCycleActiveStep) => boolean;
  onStepSelect: (step: ContentCycleActiveStep) => void;
};

export default function FlowStepper({
  stepper,
  activeStep,
  canNavigateToStep,
  onStepSelect,
}: FlowStepperProps) {
  return (
    <nav aria-label="Progreso del ciclo de contenido">
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
        {STEP_ORDER.map((stepId) => {
          const stepperId = ACTIVE_STEP_TO_STEPPER[stepId];
          const status = stepper[stepperId];
          const isActive = activeStep === stepId;
          const navigable = canNavigateToStep(stepId);

          return (
            <li key={stepId} className="min-w-0">
              <button
                type="button"
                disabled={!navigable}
                onClick={() => navigable && onStepSelect(stepId)}
                aria-current={isActive ? "step" : undefined}
                className={`flex w-full flex-col rounded-md border px-2 py-1.5 text-left transition ${
                  isActive
                    ? "border-accent bg-accent/15 ring-1 ring-accent/30"
                    : stepStatusClass(status)
                } ${navigable ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed opacity-55"}`}
              >
                <span className="truncate text-[10px] font-medium leading-tight sm:text-[11px]">
                  {STEPPER_LABELS[stepperId]}
                </span>
                <span className="mt-0.5 truncate text-[9px] leading-tight opacity-80 sm:text-[10px]">
                  {stepStatusLabel(status)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
