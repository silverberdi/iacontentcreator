import { useCallback, useState } from "react";
import type {
  ContentCycleContext,
  GeneratedCandidate,
  GenerationJobData,
  IdentityPackData,
  ManualExportResult,
  PromptPackData,
  PublicationDraft,
  SceneBriefData,
} from "../types/contentCycle";
import {
  CONTENT_CYCLE_MISSING_MESSAGE,
  INITIAL_STEPPER,
  isContentCycleContextComplete,
  type StepperState,
  type StepperStepId,
  type StepStatus,
} from "../utils/contentCycleFlow";
import { useContentCycleGenerationActions } from "./useContentCycleGenerationActions";
import { useContentCycleReviewActions } from "./useContentCycleReviewActions";
import { useContentCycleTechnicalActions } from "./useContentCycleTechnicalActions";

export type ContentCycleOperation =
  | "prepareContent"
  | "markComfySent"
  | "registerAsset"
  | "loadCandidates"
  | "approveImage"
  | "rejectImage"
  | "createDraft"
  | "loadDrafts"
  | "approveDraft"
  | "manualExport"
  | "techResolveBrief"
  | "techResolveIdentity"
  | "techGeneratePrompt"
  | "techQueueJob"
  | "techRunComfy";

export type ContentCycleData = {
  sceneBrief: SceneBriefData | null;
  identityPack: IdentityPackData | null;
  promptPack: PromptPackData | null;
  jobId: string | null;
  jobData: GenerationJobData | null;
  manualAssetId: string;
  approvedGeneratedAssetId: string;
  approvedDraftId: string;
  candidates: GeneratedCandidate[];
  drafts: PublicationDraft[];
  exportResult: ManualExportResult | null;
  contentPrepared: boolean;
  imageRegistered: boolean;
  comfyMarkedSent: boolean;
  stepper: StepperState;
  debugLog: Record<string, unknown>;
};

export function createInitialCycleData(): ContentCycleData {
  return {
    sceneBrief: null,
    identityPack: null,
    promptPack: null,
    jobId: null,
    jobData: null,
    manualAssetId: "",
    approvedGeneratedAssetId: "",
    approvedDraftId: "",
    candidates: [],
    drafts: [],
    exportResult: null,
    contentPrepared: false,
    imageRegistered: false,
    comfyMarkedSent: false,
    stepper: { ...INITIAL_STEPPER },
    debugLog: {},
  };
}

export function hasDerivedCycleState(data: ContentCycleData): boolean {
  return (
    data.contentPrepared ||
    data.imageRegistered ||
    data.comfyMarkedSent ||
    data.jobId !== null ||
    data.jobData !== null ||
    data.manualAssetId.trim() !== "" ||
    data.approvedGeneratedAssetId.trim() !== "" ||
    data.approvedDraftId.trim() !== "" ||
    data.candidates.length > 0 ||
    data.drafts.length > 0 ||
    data.exportResult !== null ||
    Object.keys(data.debugLog).length > 0
  );
}

function mergePromptDisplay(
  sceneBrief: SceneBriefData | null,
  promptPack: PromptPackData | null,
): {
  positivePrompt: string;
  negativePrompt: string;
  referenceImages: string[];
  characterSceneDirective: PromptPackData["characterSceneDirective"] | undefined;
} {
  return {
    positivePrompt: promptPack?.positivePrompt ?? sceneBrief?.positivePrompt ?? "",
    negativePrompt: promptPack?.negativePrompt ?? sceneBrief?.negativePrompt ?? "",
    referenceImages: promptPack?.referenceImages ?? sceneBrief?.referenceImages ?? [],
    characterSceneDirective: promptPack?.characterSceneDirective,
  };
}

export function useContentCycleOperations(context: ContentCycleContext) {
  const [data, setData] = useState<ContentCycleData>(() => createInitialCycleData());
  const [loading, setLoading] = useState<Partial<Record<ContentCycleOperation, boolean>>>({});
  const [operationError, setOperationError] = useState<string | null>(null);

  const setOpLoading = useCallback((op: ContentCycleOperation, value: boolean) => {
    setLoading((prev) => ({ ...prev, [op]: value }));
  }, []);

  const setStep = useCallback((step: StepperStepId, status: StepStatus) => {
    setData((prev) => ({
      ...prev,
      stepper: { ...prev.stepper, [step]: status },
    }));
  }, []);

  const appendDebug = useCallback((key: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      debugLog: { ...prev.debugLog, [key]: value },
    }));
  }, []);

  const isLoading = useCallback(
    (op: ContentCycleOperation) => Boolean(loading[op]),
    [loading],
  );

  const requireContext = useCallback((): boolean => {
    if (isContentCycleContextComplete(context)) return true;
    setOperationError(CONTENT_CYCLE_MISSING_MESSAGE);
    return false;
  }, [context]);

  const promptDisplay = mergePromptDisplay(data.sceneBrief, data.promptPack);
  const technicalActions = useContentCycleTechnicalActions({
    context,
    jobId: data.jobId,
    requireContext,
    setOperationError,
    setOpLoading,
    appendDebug,
    setData,
  });
  const generationActions = useContentCycleGenerationActions({
    context,
    data,
    requireContext,
    setOperationError,
    setOpLoading,
    setStep,
    appendDebug,
    setData,
  });
  const reviewActions = useContentCycleReviewActions({
    context,
    data,
    requireContext,
    setOperationError,
    setOpLoading,
    setStep,
    appendDebug,
    setData,
  });

  const setManualAssetId = useCallback((value: string) => {
    setData((prev) => ({ ...prev, manualAssetId: value }));
  }, []);

  const resetDerivedCycleState = useCallback(() => {
    setData(createInitialCycleData());
    setOperationError(null);
    setLoading({});
  }, []);

  return {
    data,
    promptDisplay,
    operationError,
    setOperationError,
    isLoading,
    setManualAssetId,
    resetDerivedCycleState,
    ...generationActions,
    ...reviewActions,
    ...technicalActions,
  };
}
