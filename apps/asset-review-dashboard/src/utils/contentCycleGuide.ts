import type { ContentCycleContext } from "../types/contentCycle";
import type { ContentCycleData } from "../hooks/useContentCycleOperations";
import { isContentCycleContextComplete } from "./contentCycleFlow";
import type { ContentCycleActiveStep } from "./contentCycleWizard";

export type GuideCheckItem = {
  label: string;
  done: boolean;
  optional?: boolean;
};

export type StepGuideContent = {
  title: string;
  description: string;
  checklist: GuideCheckItem[];
  statusLabel: string;
  statusDone: boolean;
};

type GuideInput = {
  activeStep: ContentCycleActiveStep;
  context: ContentCycleContext;
  data: ContentCycleData;
};

export function getCurrentStepGuide(input: GuideInput): StepGuideContent {
  const { activeStep, context, data } = input;
  const contextComplete = isContentCycleContextComplete(context);

  switch (activeStep) {
    case "prepare-image":
      return {
        title: "Preparar imagen",
        description: "Selecciona el contexto y prepara el paquete de generación.",
        checklist: [
          { label: "Avatar seleccionado", done: Boolean(context.avatar.trim()) },
          { label: "Escena seleccionada", done: Boolean(context.scene.trim()) },
          { label: "Plataforma seleccionada", done: Boolean(context.platform.trim()) },
          {
            label: "Intención opcional",
            done: Boolean(context.postIntent.trim()),
            optional: true,
          },
        ],
        statusLabel: data.contentPrepared ? "Paquete listo" : "Pendiente",
        statusDone: data.contentPrepared,
      };

    case "generate-image": {
      let statusLabel = "Pendiente";
      let statusDone = false;
      if (data.imageRegistered) {
        statusLabel = "Imagen registrada, continúa a revisión";
        statusDone = true;
      } else if (data.comfyMarkedSent) {
        statusLabel = "Esperando imagen registrada";
      } else if (data.jobId || data.contentPrepared) {
        statusLabel = "Falta marcar como enviado a Comfy";
      }

      return {
        title: "Generar imagen",
        description:
          "Copia el paquete, genera la imagen en Comfy y registra la imagen creada por Auto Ingest.",
        checklist: [
          { label: "Paquete copiado o disponible", done: data.contentPrepared },
          { label: "Job creado", done: Boolean(data.jobId) },
          { label: "Enviado a Comfy", done: data.comfyMarkedSent },
          { label: "Imagen registrada", done: data.imageRegistered },
        ],
        statusLabel,
        statusDone,
      };
    }

    case "review-image":
      return {
        title: "Revisar imagen",
        description: "Revisa las imágenes generadas y aprueba una para crear el borrador.",
        checklist: [
          { label: "Imágenes listadas", done: data.candidates.length > 0 },
          {
            label: "Imagen aprobada",
            done: Boolean(data.approvedGeneratedAssetId),
          },
        ],
        statusLabel: data.approvedGeneratedAssetId ? "Imagen aprobada" : "Pendiente",
        statusDone: Boolean(data.approvedGeneratedAssetId),
      };

    case "publication-draft":
      return {
        title: "Preparar publicación",
        description: "Crea y aprueba el borrador de publicación.",
        checklist: [
          {
            label: "Imagen aprobada",
            done: Boolean(data.approvedGeneratedAssetId),
          },
          { label: "Borrador creado", done: data.drafts.length > 0 },
          { label: "Borrador aprobado", done: Boolean(data.approvedDraftId) },
        ],
        statusLabel: data.approvedDraftId ? "Borrador aprobado" : "Pendiente",
        statusDone: Boolean(data.approvedDraftId),
      };

    case "manual-export":
      return {
        title: "Publicación manual",
        description: "Prepara el paquete final para copiarlo y publicarlo manualmente.",
        checklist: [
          { label: "Borrador aprobado", done: Boolean(data.approvedDraftId) },
          { label: "Paquete manual listo", done: data.exportResult !== null },
        ],
        statusLabel: data.exportResult ? "Paquete listo" : "Pendiente",
        statusDone: data.exportResult !== null,
      };

    default:
      return {
        title: "Content Cycle",
        description: "Completa la configuración para comenzar.",
        checklist: [
          { label: "Contexto completo", done: contextComplete },
        ],
        statusLabel: "Pendiente",
        statusDone: false,
      };
  }
}
