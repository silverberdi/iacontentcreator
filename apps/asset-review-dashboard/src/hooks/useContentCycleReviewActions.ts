import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  approveGeneratedAsset as apiApproveGeneratedAsset,
  approvePublicationDraft as apiApprovePublicationDraft,
  createPublicationDraft as apiCreatePublicationDraft,
  listGeneratedCandidates,
  listPublicationDrafts,
  manualExportDraft,
  rejectGeneratedAsset as apiRejectGeneratedAsset,
} from "../api/contentCycleApi";
import type { ContentCycleContext } from "../types/contentCycle";
import {
  DEFAULT_APPROVE_NOTES,
  humanizeError,
  type StepperStepId,
  type StepStatus,
} from "../utils/contentCycleFlow";
import type {
  ContentCycleData,
  ContentCycleOperation,
} from "./useContentCycleOperations";

type UseContentCycleReviewActionsOptions = {
  context: ContentCycleContext;
  data: ContentCycleData;
  requireContext: () => boolean;
  setOperationError: (message: string | null) => void;
  setOpLoading: (op: ContentCycleOperation, value: boolean) => void;
  setStep: (step: StepperStepId, status: StepStatus) => void;
  appendDebug: (key: string, value: unknown) => void;
  setData: Dispatch<SetStateAction<ContentCycleData>>;
};

export function useContentCycleReviewActions({
  context,
  data,
  requireContext,
  setOperationError,
  setOpLoading,
  setStep,
  appendDebug,
  setData,
}: UseContentCycleReviewActionsOptions) {
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
  }, [appendDebug, context, requireContext, setData, setOpLoading, setOperationError, setStep]);

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
  }, [appendDebug, context, requireContext, setData, setOpLoading, setOperationError, setStep]);

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
    [appendDebug, loadGeneratedCandidates, requireContext, setData, setOpLoading, setOperationError, setStep],
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
    [appendDebug, loadGeneratedCandidates, requireContext, setOpLoading, setOperationError, setStep],
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
    context.postIntent,
    data.approvedGeneratedAssetId,
    loadPublicationDrafts,
    requireContext,
    setOpLoading,
    setOperationError,
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
    [appendDebug, loadPublicationDrafts, requireContext, setData, setOpLoading, setOperationError, setStep],
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
  }, [
    appendDebug,
    data.approvedDraftId,
    requireContext,
    setData,
    setOpLoading,
    setOperationError,
    setStep,
  ]);

  return {
    loadGeneratedCandidates,
    loadPublicationDrafts,
    approveGeneratedAsset,
    rejectGeneratedAsset,
    createPublicationDraft,
    approvePublicationDraft,
    manualExport,
  };
}
