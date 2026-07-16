import CopyButton from "../../CopyButton";
import LoadingSpinner from "../../LoadingSpinner";
import SectionPanel from "../../SectionPanel";
import { buildComfyCopyPack, buildComfyPositivePrompt } from "../../../utils/contentCycleFlow";
import ActionButton from "../ActionButton";
import ComfyPromptDetails from "../ComfyPromptDetails";

type GenerarImagenBlockProps = {
  positivePrompt: string;
  negativePrompt: string;
  postIntent: string;
  referenceImages: string[];
  manualAssetId: string;
  comfyMarkedSent: boolean;
  showTechnical: boolean;
  loadingComfy: boolean;
  loadingRegister: boolean;
  operationsEnabled: boolean;
  onManualAssetIdChange: (value: string) => void;
  onMarkComfySent: () => void;
  onRegister: () => void;
};

export default function GenerarImagenBlock({
  positivePrompt,
  negativePrompt,
  postIntent,
  referenceImages,
  manualAssetId,
  comfyMarkedSent,
  showTechnical,
  loadingComfy,
  loadingRegister,
  operationsEnabled,
  onManualAssetIdChange,
  onMarkComfySent,
  onRegister,
}: GenerarImagenBlockProps) {
  const comfyPositivePrompt = buildComfyPositivePrompt({ positivePrompt }, postIntent);
  const comfyPack = buildComfyCopyPack(comfyPositivePrompt, negativePrompt);
  const registerDisabled =
    loadingRegister ||
    !operationsEnabled ||
    !comfyMarkedSent ||
    !manualAssetId.trim();

  return (
    <SectionPanel
      title="2. Generar imagen"
      description="Copia el paquete de generación y úsalo en Comfy / Comfy Cloud. Cuando la imagen quede registrada por Auto Ingest, registra aquí la imagen nueva."
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h4 className="text-sm font-medium text-gray-200">Crear imagen en Comfy</h4>
          <p className="mt-1 text-sm text-gray-400">Usa el paquete generado para crear la imagen.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {comfyPack && (
              <CopyButton value={comfyPack} label="Copiar paquete para Comfy" className="text-sm" />
            )}
          </div>

          <div className="mt-3">
            <ComfyPromptDetails
              summaryLabel="Ver prompt"
              positivePrompt={comfyPositivePrompt}
              negativePrompt={negativePrompt}
              referenceImages={referenceImages}
            />
          </div>

          <ActionButton
            variant="primary"
            disabled={loadingComfy || !operationsEnabled}
            onClick={onMarkComfySent}
            className="mt-4 px-4 py-2 text-sm"
          >
            {loadingComfy ? "Marcando…" : "Marcar como enviado a Comfy"}
          </ActionButton>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h4 className="text-sm font-medium text-gray-200">Registrar imagen generada</h4>

          <label className="mt-3 block max-w-xl text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-400">
              ID de la imagen generada
            </span>
            <input
              type="text"
              value={manualAssetId}
              onChange={(event) => onManualAssetIdChange(event.target.value)}
              placeholder="Pega aquí el ID de la imagen registrada"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-100"
            />
            <span className="mt-1.5 block text-xs text-gray-500">
              Lo encuentras en Auto Ingest o Asset Review después de que la imagen haya sido
              registrada.
            </span>
          </label>

          <details className="mt-3 rounded-md border border-border-muted bg-surface text-sm">
            <summary className="cursor-pointer select-none px-3 py-2 text-gray-400 hover:text-gray-200">
              ¿Dónde encuentro este ID?
            </summary>
            <p className="border-t border-border-muted px-3 py-3 text-xs text-gray-400">
              Después de generar la imagen, abre Auto Ingest o Asset Review, busca la imagen nueva y
              copia su ID. Luego vuelve a esta pantalla y pégalo aquí.
            </p>
          </details>

          <ActionButton
            disabled={registerDisabled}
            onClick={onRegister}
            className="mt-4 px-4 py-2 text-sm"
          >
            {loadingRegister ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner className="size-4" label="Registrando…" />
                Registrando…
              </span>
            ) : (
              "Registrar imagen generada"
            )}
          </ActionButton>

          {registerDisabled && !loadingRegister && (
            <p className="mt-2 text-xs text-gray-500">
              Disponible después de marcar el job como enviado y pegar el ID de la imagen.
            </p>
          )}

          {showTechnical && manualAssetId && (
            <p className="mt-2 font-mono text-xs text-gray-500">assetId: {manualAssetId}</p>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}
