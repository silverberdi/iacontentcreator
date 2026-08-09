import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  generatePromptPack,
  queueGenerationJob,
  resolveIdentityPack,
  resolveSceneBrief,
  runComfyJob,
} from "../api/contentCycleApi";
import type { ContentCycleContext } from "../types/contentCycle";
import { humanizeError } from "../utils/contentCycleFlow";
import type {
  ContentCycleData,
  ContentCycleOperation,
} from "./useContentCycleOperations";

type UseContentCycleTechnicalActionsOptions = {
  context: ContentCycleContext;
  jobId: string | null;
  requireContext: () => boolean;
  setOperationError: (message: string | null) => void;
  setOpLoading: (op: ContentCycleOperation, value: boolean) => void;
  appendDebug: (key: string, value: unknown) => void;
  setData: Dispatch<SetStateAction<ContentCycleData>>;
};

export function useContentCycleTechnicalActions({
  context,
  jobId,
  requireContext,
  setOperationError,
  setOpLoading,
  appendDebug,
  setData,
}: UseContentCycleTechnicalActionsOptions) {
  const runTechnical = useCallback(
    async (
      op: ContentCycleOperation,
      action: () => Promise<unknown>,
      debugKey: string,
    ): Promise<boolean> => {
      if (!requireContext()) return false;
      setOperationError(null);
      setOpLoading(op, true);
      try {
        const raw = await action();
        appendDebug(debugKey, raw);
        return true;
      } catch (err) {
        setOperationError(humanizeError(err, "La acción técnica falló."));
        return false;
      } finally {
        setOpLoading(op, false);
      }
    },
    [appendDebug, requireContext, setOperationError, setOpLoading],
  );

  const techResolveBrief = useCallback(
    () =>
      runTechnical("techResolveBrief", async () => {
        const r = await resolveSceneBrief(context);
        setData((prev) => ({ ...prev, sceneBrief: r.parsed }));
        return r.raw;
      }, "resolve-brief"),
    [context, runTechnical, setData],
  );

  const techResolveIdentity = useCallback(
    () =>
      runTechnical("techResolveIdentity", async () => {
        const r = await resolveIdentityPack(context);
        setData((prev) => ({ ...prev, identityPack: r.parsed }));
        return r.raw;
      }, "resolve-pack"),
    [context, runTechnical, setData],
  );

  const techGeneratePrompt = useCallback(
    () =>
      runTechnical("techGeneratePrompt", async () => {
        const r = await generatePromptPack(context);
        setData((prev) => ({ ...prev, promptPack: r.parsed }));
        return r.raw;
      }, "generate-prompt-pack"),
    [context, runTechnical, setData],
  );

  const techQueueJob = useCallback(
    () =>
      runTechnical("techQueueJob", async () => {
        const r = await queueGenerationJob(context);
        setData((prev) => ({
          ...prev,
          jobId: r.parsed.jobId ?? null,
          jobData: r.parsed,
          contentPrepared: Boolean(r.parsed.jobId),
        }));
        return r.raw;
      }, "queue-job"),
    [context, runTechnical, setData],
  );

  const techRunComfy = useCallback(
    () =>
      runTechnical("techRunComfy", async () => {
        if (!jobId) throw new Error("No hay jobId.");
        const r = await runComfyJob(jobId);
        setData((prev) => ({ ...prev, jobData: { ...prev.jobData, ...r.parsed } }));
        return r.raw;
      }, "run-comfy"),
    [jobId, runTechnical, setData],
  );

  return {
    techResolveBrief,
    techResolveIdentity,
    techGeneratePrompt,
    techQueueJob,
    techRunComfy,
  };
}
