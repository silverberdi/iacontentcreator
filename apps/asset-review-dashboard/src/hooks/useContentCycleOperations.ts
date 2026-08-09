import { useCallback, useState } from "react";
import {
  approveGeneratedAsset as apiApproveGeneratedAsset,
  approvePublicationDraft as apiApprovePublicationDraft,
  createPublicationDraft as apiCreatePublicationDraft,
  listGeneratedCandidates,
  listPublicationDrafts,
  manualExportDraft,
  rejectGeneratedAsset as apiRejectGeneratedAsset,
} from "../api/contentCycleApi";
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
  DEFAULT_APPROVE_NOTES,
  humanizeError,
  INITIAL_STEPPER,
  isContentCycleContextComplete,
  type StepperState,
  type StepperStepId,
  type StepStatus,
} from "../utils/contentCycleFlow";
import { useContentCycleGenerationActions } from "./useContentCycleGenerationActions";
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

  const loadGeneratedCandidates = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    setOpLoading("loadCandidates", true);
    setStep("revision", "in_progress");

    try {
      const result = await listGeneratedCandidates(context);
      appendDebug("generated-list", result.raw);

      setData((prev) => ({
        ...prev,
        candidates: result.parsed,
      }));

      return true;
    } catch (err) {
      setOperationError(
        humanizeError(err, "No se pudieron cargar las imágenes para revisión."),
      );
      setStep("revision", "error");
      return false;
    } finally {
      setOpLoading("loadCandidates", false);
    }
  }, [appendDebug, context, requireContext, setOpLoading, setStep]);

  const loadPublicationDrafts = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    setOpLoading("loadDrafts", true);

    try {
      const result = await listPublicationDrafts(context);
      appendDebug("drafts-list", result.raw);

      setData((prev) => ({
        ...prev,
        drafts: result.parsed,
      }));

      return true;
    } catch (err) {
      setOperationError(humanizeError(err, "No se pudieron cargar los borradores."));
      setStep("borrador", "error");
      return false;
    } finally {
      setOpLoading("loadDrafts", false);
    }
  }, [appendDebug, context, requireContext, setOpLoading, setStep]);

  const approveGeneratedAsset = useCallback(
    async (generatedAssetId: string, reviewNotes: string): Promise<boolean> => {
      if (!requireContext()) return false;
      setOperationError(null);
      setOpLoading("approveImage", true);

      try {
        const raw = await apiApproveGeneratedAsset(
          generatedAssetId,
          reviewNotes.trim() || DEFAULT_APPROVE_NOTES,
        );
        appendDebug("approve-generated", raw);

        setData((prev) => ({
          ...prev,
          approvedGeneratedAssetId: generatedAssetId,
          stepper: {
            ...prev.stepper,
            revision: "ready",
            borrador: "pending",
          },
        }));

        await loadGeneratedCandidates();
        return true;
      } catch (err) {
        setOperationError(humanizeError(err, "No se pudo aprobar la imagen."));
        setStep("revision", "error");
        return false;
      } finally {
        setOpLoading("approveImage", false);
      }
    },
    [appendDebug, loadGeneratedCandidates, requireContext, setOpLoading, setStep],
  );

  const rejectGeneratedAsset = useCallback(
    async (generatedAssetId: string, reviewNotes: string): Promise<boolean> => {
      if (!requireContext()) return false;
      setOperationError(null);
      setOpLoading("rejectImage", true);

      try {
        const raw = await apiRejectGeneratedAsset(
          generatedAssetId,
          reviewNotes.trim() || "Rejected from dashboard",
        );
        appendDebug("reject-generated", raw);
        await loadGeneratedCandidates();
        return true;
      } catch (err) {
        setOperationError(humanizeError(err, "No se pudo rechazar la imagen."));
        setStep("revision", "error");
        return false;
      } finally {
        setOpLoading("rejectImage", false);
      }
    },
    [appendDebug, loadGeneratedCandidates, requireContext, setOpLoading, setStep],
  );

  const createPublicationDraft = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    if (!data.approvedGeneratedAssetId.trim()) {
      setOperationError("Primero aprueba una imagen en el paso de revisión.");
      return false;
    }

    setOpLoading("createDraft", true);
    setStep("borrador", "in_progress");

    try {
      const raw = await apiCreatePublicationDraft(data.approvedGeneratedAssetId.trim(), {
        platform: context.platform,
        postIntent: context.postIntent,
      });
      appendDebug("create-draft", raw);
      await loadPublicationDrafts();
      return true;
    } catch (err) {
      setOperationError(humanizeError(err, "No se pudo crear el borrador."));
      setStep("borrador", "error");
      return false;
    } finally {
      setOpLoading("createDraft", false);
    }
  }, [
    appendDebug,
    context.platform,
    data.approvedGeneratedAssetId,
    loadPublicationDrafts,
    requireContext,
    setOpLoading,
    setStep,
  ]);

  const approvePublicationDraft = useCallback(
    async (draftId: string): Promise<boolean> => {
      if (!requireContext()) return false;
      setOperationError(null);
      setOpLoading("approveDraft", true);

      try {
        const raw = await apiApprovePublicationDraft(draftId);
        appendDebug("approve-draft", raw);

        setData((prev) => ({
          ...prev,
          approvedDraftId: draftId,
          stepper: {
            ...prev.stepper,
            borrador: "ready",
            exportacion: "pending",
          },
        }));

        await loadPublicationDrafts();
        return true;
      } catch (err) {
        setOperationError(humanizeError(err, "No se pudo aprobar el borrador."));
        setStep("borrador", "error");
        return false;
      } finally {
        setOpLoading("approveDraft", false);
      }
    },
    [appendDebug, loadPublicationDrafts, requireContext, setOpLoading, setStep],
  );

  const manualExport = useCallback(async (draftIdOverride?: string): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    const draftId = (draftIdOverride ?? data.approvedDraftId).trim();
    if (!draftId) {
      setOperationError("Primero aprueba un borrador.");
      return false;
    }

    setOpLoading("manualExport", true);
    setStep("exportacion", "in_progress");

    try {
      const result = await manualExportDraft(draftId);
      appendDebug("manual-export", result.raw);

      setData((prev) => ({
        ...prev,
        approvedDraftId: draftId,
        exportResult: result.parsed,
        stepper: { ...prev.stepper, exportacion: "ready" },
      }));

      return true;
    } catch (err) {
      setOperationError(
        humanizeError(err, "No se pudo preparar el paquete de publicación manual."),
      );
      setStep("exportacion", "error");
      return false;
    } finally {
      setOpLoading("manualExport", false);
    }
  }, [appendDebug, data.approvedDraftId, requireContext, setOpLoading, setStep]);

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
    loadGeneratedCandidates,
    approveGeneratedAsset,
    rejectGeneratedAsset,
    createPublicationDraft,
    loadPublicationDrafts,
    approvePublicationDraft,
    manualExport,
    ...technicalActions,
  };
}
