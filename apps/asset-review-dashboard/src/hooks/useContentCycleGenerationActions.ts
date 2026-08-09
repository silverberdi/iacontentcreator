import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  generatePromptPack,
  queueGenerationJob,
  registerGeneratedAsset as apiRegisterGeneratedAsset,
  resolveIdentityPack,
  resolveSceneBrief,
  runComfyJob,
} from "../api/contentCycleApi";
import type { ContentCycleContext } from "../types/contentCycle";
import {
  humanizeError,
  INITIAL_STEPPER,
  type StepperStepId,
  type StepStatus,
} from "../utils/contentCycleFlow";
import type {
  ContentCycleData,
  ContentCycleOperation,
} from "./useContentCycleOperations";

type UseContentCycleGenerationActionsOptions = {
  context: ContentCycleContext;
  data: ContentCycleData;
  requireContext: () => boolean;
  setOperationError: (message: string | null) => void;
  setOpLoading: (op: ContentCycleOperation, value: boolean) => void;
  setStep: (step: StepperStepId, status: StepStatus) => void;
  appendDebug: (key: string, value: unknown) => void;
  setData: Dispatch<SetStateAction<ContentCycleData>>;
};

export function useContentCycleGenerationActions({
  context,
  data,
  requireContext,
  setOperationError,
  setOpLoading,
  setStep,
  appendDebug,
  setData,
}: UseContentCycleGenerationActionsOptions) {
  const prepareContentCycle = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    setOpLoading("prepareContent", true);
    setStep("preparacion", "in_progress");

    try {
      const briefResult = await resolveSceneBrief(context);
      appendDebug("resolve-brief", briefResult.raw);

      const identityResult = await resolveIdentityPack(context);
      appendDebug("resolve-pack", identityResult.raw);

      const promptResult = await generatePromptPack(context);
      appendDebug("generate-prompt-pack", promptResult.raw);

      const jobResult = await queueGenerationJob(context);
      appendDebug("queue-job", jobResult.raw);

      const jobId = jobResult.parsed.jobId ?? null;
      if (!jobId) {
        throw new Error("El job se creó pero no devolvió un identificador.");
      }

      setData((prev) => ({
        ...prev,
        sceneBrief: briefResult.parsed,
        identityPack: identityResult.parsed,
        promptPack: promptResult.parsed,
        jobId,
        jobData: jobResult.parsed,
        contentPrepared: true,
        comfyMarkedSent: false,
        imageRegistered: false,
        manualAssetId: "",
        candidates: [],
        drafts: [],
        approvedGeneratedAssetId: "",
        approvedDraftId: "",
        exportResult: null,
        stepper: {
          ...INITIAL_STEPPER,
          preparacion: "ready",
          generacion: "pending",
        },
      }));

      return true;
    } catch (err) {
      const message = humanizeError(err, "No se pudo preparar el contenido. Intenta de nuevo.");
      setOperationError(message);
      setStep("preparacion", "error");
      return false;
    } finally {
      setOpLoading("prepareContent", false);
    }
  }, [appendDebug, context, requireContext, setData, setOpLoading, setOperationError, setStep]);

  const markJobSentToComfy = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    if (!data.jobId) {
      setOperationError("Primero prepara el contenido para obtener un job.");
      return false;
    }

    setOpLoading("markComfySent", true);
    setStep("generacion", "in_progress");

    try {
      const result = await runComfyJob(data.jobId);
      appendDebug("run-comfy", result.raw);

      setData((prev) => ({
        ...prev,
        jobData: {
          ...prev.jobData,
          ...result.parsed,
          promptPack: prev.promptPack ?? result.parsed.promptPack,
        },
        comfyMarkedSent: true,
      }));

      return true;
    } catch (err) {
      setOperationError(
        humanizeError(err, "No se pudo marcar el job como enviado a Comfy."),
      );
      setStep("generacion", "error");
      return false;
    } finally {
      setOpLoading("markComfySent", false);
    }
  }, [appendDebug, data.jobId, requireContext, setData, setOpLoading, setOperationError, setStep]);

  const registerGeneratedAsset = useCallback(async (): Promise<boolean> => {
    if (!requireContext()) return false;
    setOperationError(null);
    if (!data.jobId) {
      setOperationError("Primero prepara el contenido.");
      return false;
    }
    if (!data.manualAssetId.trim()) {
      setOperationError("Pega el ID de la imagen registrada.");
      return false;
    }

    setOpLoading("registerAsset", true);

    try {
      const result = await apiRegisterGeneratedAsset(data.jobId, data.manualAssetId.trim());
      appendDebug("register-generated", result.raw);

      setData((prev) => ({
        ...prev,
        imageRegistered: true,
        stepper: {
          ...prev.stepper,
          generacion: "ready",
          revision: "pending",
        },
      }));

      return true;
    } catch (err) {
      setOperationError(
        humanizeError(err, "No se pudo registrar la imagen generada."),
      );
      setStep("generacion", "error");
      return false;
    } finally {
      setOpLoading("registerAsset", false);
    }
  }, [
    appendDebug,
    data.jobId,
    data.manualAssetId,
    requireContext,
    setData,
    setOpLoading,
    setOperationError,
    setStep,
  ]);

  return {
    prepareContentCycle,
    markJobSentToComfy,
    registerGeneratedAsset,
  };
}
