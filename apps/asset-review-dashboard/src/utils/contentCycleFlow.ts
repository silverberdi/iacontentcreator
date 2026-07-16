import type { ContentCycleContext } from "../types/contentCycle";

export type ContentCycleContextInput = ContentCycleContext;

/** Empty context — operator must select avatar, scene and platform explicitly. */
export const EMPTY_CONTENT_CYCLE_CONTEXT: ContentCycleContext = {
  avatar: "",
  scene: "",
  platform: "",
  postIntent: "",
};

/** Dev/test preset — only applied via "Cargar datos de prueba" in technical mode. */
export const CONTENT_CYCLE_TEST_DATA: ContentCycleContext = {
  avatar: "estefania-montealegre",
  scene: "airport",
  platform: "instagram",
  postIntent:
    "Una publicación de viaje, elegante y natural, como si Estefanía estuviera entre ciudades.",
};

export const CONTENT_CYCLE_MISSING_MESSAGE =
  "Selecciona avatar, escena y plataforma para iniciar el ciclo.";

export const CONTEXT_CHANGED_MESSAGE =
  "El contexto cambió. Prepara nuevamente el paquete de generación.";

export function isContentCycleContextComplete(ctx: ContentCycleContext): boolean {
  return Boolean(ctx.avatar.trim() && ctx.scene.trim() && ctx.platform.trim());
}

export type StepperStepId =
  | "preparacion"
  | "generacion"
  | "revision"
  | "borrador"
  | "exportacion";

export type StepStatus = "pending" | "in_progress" | "ready" | "error";

export type StepperState = Record<StepperStepId, StepStatus>;

export const INITIAL_STEPPER: StepperState = {
  preparacion: "pending",
  generacion: "pending",
  revision: "pending",
  borrador: "pending",
  exportacion: "pending",
};

export const STEPPER_LABELS: Record<StepperStepId, string> = {
  preparacion: "Preparación de imagen",
  generacion: "Generación",
  revision: "Revisión",
  borrador: "Borrador",
  exportacion: "Exportación manual",
};

export function stepStatusLabel(status: StepStatus): string {
  switch (status) {
    case "in_progress":
      return "En progreso";
    case "ready":
      return "Listo";
    case "error":
      return "Error";
    default:
      return "Pendiente";
  }
}

export function stepStatusClass(status: StepStatus): string {
  switch (status) {
    case "ready":
      return "border-emerald-600 bg-emerald-950/40 text-emerald-200";
    case "in_progress":
      return "border-blue-600 bg-blue-950/40 text-blue-200";
    case "error":
      return "border-red-600 bg-red-950/40 text-red-200";
    default:
      return "border-gray-600 bg-gray-800/60 text-gray-400";
  }
}

export function formatAllowedMood(value: string | string[] | undefined): string {
  if (!value) return "—";
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

export function buildComfyPositivePrompt(
  promptPack: { positivePrompt?: string },
  postIntent: string,
): string {
  const base = promptPack.positivePrompt ?? "";
  const intent = postIntent.trim();
  if (!intent) return base;
  return `${base}. Editorial intention: ${intent}`;
}

export function buildComfyCopyPack(positivePrompt: string, negativePrompt: string): string {
  const parts: string[] = [];
  if (positivePrompt.trim()) {
    parts.push(`Prompt positivo:\n${positivePrompt.trim()}`);
  }
  if (negativePrompt.trim()) {
    parts.push(`Prompt negativo:\n${negativePrompt.trim()}`);
  }
  return parts.join("\n\n");
}

export function humanCandidateStatus(status: string | undefined): string {
  if (!status) return "Pendiente";
  const normalized = status.toLowerCase();
  if (normalized.includes("approve")) return "Aprobada";
  if (normalized.includes("reject")) return "Rechazada";
  if (normalized.includes("pending") || normalized.includes("review")) return "Pendiente";
  return "Pendiente";
}

export type NextStepInput = {
  contextComplete: boolean;
  contentPrepared: boolean;
  comfyMarkedSent: boolean;
  imageRegistered: boolean;
  approvedGeneratedAssetId: string;
  approvedDraftId: string;
  hasDrafts: boolean;
  hasExport: boolean;
};

export function getNextStepMessage(input: NextStepInput): string {
  if (input.hasExport) {
    return "Publicación lista para uso manual.";
  }
  if (input.approvedDraftId) {
    return "Siguiente paso: prepara el paquete para publicación manual.";
  }
  if (input.hasDrafts && !input.approvedDraftId) {
    return "Siguiente paso: revisa y aprueba el borrador.";
  }
  if (input.approvedGeneratedAssetId && !input.hasDrafts) {
    return "Siguiente paso: crea el borrador de publicación.";
  }
  if (input.imageRegistered && !input.approvedGeneratedAssetId) {
    return "Siguiente paso: revisa y aprueba la imagen.";
  }
  if (input.comfyMarkedSent && !input.imageRegistered) {
    return "Siguiente paso: registra la imagen generada por Auto Ingest.";
  }
  if (input.contentPrepared && !input.comfyMarkedSent) {
    return "Siguiente paso: copia el paquete de generación y crea la imagen en Comfy.";
  }
  return "Selecciona avatar, escena y plataforma. Luego prepara la imagen.";
}

export function humanDraftStatus(status: string | undefined): string {
  if (!status) return "Pendiente";
  const normalized = status.toLowerCase();
  if (normalized.includes("approve")) return "Aprobado";
  if (normalized.includes("reject")) return "Rechazado";
  if (normalized.includes("pending") || normalized.includes("draft")) return "Pendiente";
  return "Pendiente";
}

export const DEFAULT_APPROVE_NOTES = "Approved from dashboard";

export function humanizeError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    const msg = err.message;
    if (msg.includes("Unauthorized")) {
      return "No autorizado. Revisa la API key en la configuración del dashboard.";
    }
    if (msg.includes("Failed to reach")) {
      return "No se pudo conectar con el servidor. Verifica que n8n esté activo.";
    }
    return msg;
  }
  return fallback;
}
