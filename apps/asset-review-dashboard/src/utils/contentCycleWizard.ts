import type { ContentCycleData } from "../hooks/useContentCycleOperations";
import type { StepperStepId } from "./contentCycleFlow";
import { humanCandidateStatus } from "./contentCycleFlow";

export type ContentCycleActiveStep =
  | "prepare-image"
  | "generate-image"
  | "review-image"
  | "publication-draft"
  | "manual-export";

export const ACTIVE_STEP_ORDER: ContentCycleActiveStep[] = [
  "prepare-image",
  "generate-image",
  "review-image",
  "publication-draft",
  "manual-export",
];

export const ACTIVE_STEP_TO_STEPPER: Record<ContentCycleActiveStep, StepperStepId> = {
  "prepare-image": "preparacion",
  "generate-image": "generacion",
  "review-image": "revision",
  "publication-draft": "borrador",
  "manual-export": "exportacion",
};

export const STEPPER_TO_ACTIVE_STEP: Record<StepperStepId, ContentCycleActiveStep> = {
  preparacion: "prepare-image",
  generacion: "generate-image",
  revision: "review-image",
  borrador: "publication-draft",
  exportacion: "manual-export",
};

export const ACTIVE_STEP_LABELS: Record<ContentCycleActiveStep, string> = {
  "prepare-image": "Preparación",
  "generate-image": "Generación",
  "review-image": "Revisión",
  "publication-draft": "Borrador",
  "manual-export": "Exportación",
};

export const STEP_NAV_BLOCKED_MESSAGE = "Primero completa el paso anterior.";

export type CycleNavigationInput = {
  contentPrepared: boolean;
  comfyMarkedSent: boolean;
  imageRegistered: boolean;
  approvedGeneratedAssetId: string;
  approvedDraftId: string;
};

export function deriveActiveStep(input: CycleNavigationInput): ContentCycleActiveStep {
  if (input.approvedDraftId) return "manual-export";
  if (input.approvedGeneratedAssetId) return "publication-draft";
  if (input.comfyMarkedSent || input.imageRegistered) return "review-image";
  if (input.contentPrepared) return "generate-image";
  return "prepare-image";
}

export function canNavigateToStep(
  target: ContentCycleActiveStep,
  input: CycleNavigationInput,
): boolean {
  switch (target) {
    case "prepare-image":
      return true;
    case "generate-image":
      return input.contentPrepared;
    case "review-image":
      return input.comfyMarkedSent || input.imageRegistered;
    case "publication-draft":
      return Boolean(input.approvedGeneratedAssetId);
    case "manual-export":
      return Boolean(input.approvedDraftId);
    default:
      return false;
  }
}

export function navigationInputFromData(data: ContentCycleData): CycleNavigationInput {
  return {
    contentPrepared: data.contentPrepared,
    comfyMarkedSent: data.comfyMarkedSent,
    imageRegistered: data.imageRegistered,
    approvedGeneratedAssetId: data.approvedGeneratedAssetId,
    approvedDraftId: data.approvedDraftId,
  };
}

export function truncateText(value: string | undefined, max = 48): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "—";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function getPreparationSummary(data: ContentCycleData): {
  status: string;
  visualIntent: string;
  jobStatus: string;
} {
  return {
    status: data.contentPrepared ? "Listo" : "Pendiente",
    visualIntent: truncateText(data.sceneBrief?.visualIntent),
    jobStatus: data.jobId ? "Job creado" : "No creado",
  };
}

export function getGenerationSummary(data: ContentCycleData): {
  status: string;
  registration: string;
} {
  if (data.imageRegistered) {
    return { status: "En progreso", registration: "Imagen registrada" };
  }
  if (data.comfyMarkedSent) {
    return { status: "En progreso", registration: "No registrada" };
  }
  return { status: "Pendiente", registration: "No registrada" };
}

export function getReviewSummary(data: ContentCycleData): string {
  if (data.approvedGeneratedAssetId) return "Imagen aprobada";
  const statuses = data.candidates.map((c) => humanCandidateStatus(c.status));
  if (statuses.includes("Rechazada") && !statuses.includes("Aprobada")) return "Rechazada";
  return "Pendiente";
}

export function getDraftSummary(data: ContentCycleData): string {
  if (data.approvedDraftId) return "Aprobado";
  if (data.drafts.length > 0) return "Borrador creado";
  return "Pendiente";
}

export function getExportSummary(data: ContentCycleData): string {
  return data.exportResult ? "Lista" : "Pendiente";
}

export type StepContinueConfig = {
  showContinue: boolean;
  continueLabel: string;
  nextStep: ContentCycleActiveStep;
};

export function getStepContinueConfig(
  activeStep: ContentCycleActiveStep,
  input: CycleNavigationInput,
): StepContinueConfig | null {
  switch (activeStep) {
    case "prepare-image":
      if (!input.contentPrepared) return null;
      return {
        showContinue: true,
        continueLabel: "Continuar a generación",
        nextStep: "generate-image",
      };
    case "generate-image":
      if (!input.comfyMarkedSent && !input.imageRegistered) return null;
      return {
        showContinue: true,
        continueLabel: "Continuar a revisión",
        nextStep: "review-image",
      };
    case "review-image":
      if (!input.approvedGeneratedAssetId) return null;
      return {
        showContinue: true,
        continueLabel: "Continuar a borrador",
        nextStep: "publication-draft",
      };
    case "publication-draft":
      if (!input.approvedDraftId) return null;
      return {
        showContinue: true,
        continueLabel: "Continuar a publicación manual",
        nextStep: "manual-export",
      };
    default:
      return null;
  }
}
