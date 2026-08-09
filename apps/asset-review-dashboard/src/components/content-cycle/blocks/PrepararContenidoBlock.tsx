import CopyButton from "../../CopyButton";
import LoadingSpinner from "../../LoadingSpinner";
import SectionPanel from "../../SectionPanel";
import {
  buildComfyCopyPack,
  buildComfyPositivePrompt,
  formatAllowedMood,
} from "../../../utils/contentCycleFlow";
import type { PromptPackData, SceneBriefData } from "../../../types/contentCycle";
import ActionButton from "../ActionButton";
import ComfyPromptDetails from "../ComfyPromptDetails";

type PrepararContenidoBlockProps = {
  contentPrepared: boolean;
  sceneBrief: SceneBriefData | null;
  postIntent: string;
  positivePrompt: string;
  negativePrompt: string;
  referenceImages: string[];
  characterSceneDirective?: PromptPackData["characterSceneDirective"];
  jobId: string | null;
  showTechnical: boolean;
  loading: boolean;
  operationsEnabled: boolean;
  onPrepare: () => void;
};

export default function PrepararContenidoBlock({
  contentPrepared,
  sceneBrief,
  postIntent,
  positivePrompt,
  negativePrompt,
  referenceImages,
  characterSceneDirective,
  jobId,
  showTechnical,
  loading,
  operationsEnabled,
  onPrepare,
}: PrepararContenidoBlockProps) {
  const trimmedIntent = postIntent.trim();
  const comfyPositivePrompt = buildComfyPositivePrompt({ positivePrompt }, postIntent);
  const comfyPack = buildComfyCopyPack(comfyPositivePrompt, negativePrompt);

  return (
    <SectionPanel title="1. Preparar la imagen">
      <ActionButton
        variant="primary"
        disabled={loading || !operationsEnabled}
        onClick={onPrepare}
        className="px-5 py-2.5 text-sm"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="size-4" label="Preparando paquete…" />
            {contentPrepared ? "Repreparando paquete…" : "Preparando paquete…"}
          </span>
        ) : contentPrepared ? (
          "Repreparar paquete"
        ) : (
          "Preparar paquete de generación"
        )}
      </ActionButton>

      {contentPrepared && (
        <p className="mt-2 text-xs text-gray-500">Esto creará un nuevo job de generación.</p>
      )}

      {contentPrepared && (
        <div className="mt-5 rounded-lg border border-emerald-800/40 bg-emerald-950/25 p-4">
          <p className="mb-4 text-sm font-medium text-emerald-200">Paquete de generación listo</p>

          <dl className="grid gap-4 sm:grid-cols-2">
            {trimmedIntent && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500">Intención del post</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-100">{trimmedIntent}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Dirección visual</dt>
              <dd className="mt-1 text-sm text-gray-100">{sceneBrief?.visualIntent ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Tono</dt>
              <dd className="mt-1 text-sm text-gray-100">
                {formatAllowedMood(sceneBrief?.allowedMood)}
              </dd>
            </div>
            {referenceImages.length > 0 && (
              <div>
                <dt className="text-xs text-gray-500">Imágenes de referencia</dt>
                <dd className="mt-1 text-sm text-gray-100">{referenceImages.length}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Estado</dt>
              <dd className="mt-1 text-sm text-emerald-200">Job creado</dd>
            </div>
          </dl>

          {characterSceneDirective && (
            <div className="mt-4 rounded-md border border-blue-900/60 bg-blue-950/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
                  Canon aplicado a la escena
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    characterSceneDirective.canonUsed
                      ? "bg-emerald-950/70 text-emerald-200"
                      : "bg-amber-950/70 text-amber-200"
                  }`}
                >
                  {characterSceneDirective.canonUsed ? "Canon usado" : "Sin canon aprobado"}
                </span>
              </div>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {characterSceneDirective.identityLock && (
                  <div>
                    <dt className="text-xs text-blue-100/60">Identidad</dt>
                    <dd className="mt-1 text-sm text-blue-50">{characterSceneDirective.identityLock}</dd>
                  </div>
                )}
                {characterSceneDirective.emotionalMagnetism && (
                  <div>
                    <dt className="text-xs text-blue-100/60">Magnetismo</dt>
                    <dd className="mt-1 text-sm text-blue-50">
                      {characterSceneDirective.emotionalMagnetism}
                    </dd>
                  </div>
                )}
                {characterSceneDirective.sceneBehavior && (
                  <div>
                    <dt className="text-xs text-blue-100/60">Cómo habita la escena</dt>
                    <dd className="mt-1 text-sm text-blue-50">
                      {characterSceneDirective.sceneBehavior}
                    </dd>
                  </div>
                )}
                {characterSceneDirective.bodyRealism && (
                  <div>
                    <dt className="text-xs text-blue-100/60">Realismo corporal</dt>
                    <dd className="mt-1 text-sm text-blue-50">
                      {characterSceneDirective.bodyRealism}
                    </dd>
                  </div>
                )}
              </dl>
              {Array.isArray(characterSceneDirective.mustAvoid) &&
                characterSceneDirective.mustAvoid.length > 0 && (
                  <p className="mt-3 text-xs text-blue-100/70">
                    Evitar: {characterSceneDirective.mustAvoid.join(", ")}
                  </p>
                )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {comfyPack && (
              <CopyButton value={comfyPack} label="Copiar paquete para Comfy" className="text-sm" />
            )}
          </div>

          <div className="mt-3">
            <ComfyPromptDetails
              summaryLabel="Ver prompt completo"
              positivePrompt={comfyPositivePrompt}
              negativePrompt={negativePrompt}
              referenceImages={referenceImages}
            />
          </div>

          {showTechnical && jobId && (
            <p className="mt-3 font-mono text-xs text-gray-500">jobId: {jobId}</p>
          )}
        </div>
      )}

      {!contentPrepared && (
        <p className="mt-4 text-sm text-gray-500">
          Configura avatar, escena y plataforma arriba y pulsa el botón para preparar el paquete.
        </p>
      )}
    </SectionPanel>
  );
}
