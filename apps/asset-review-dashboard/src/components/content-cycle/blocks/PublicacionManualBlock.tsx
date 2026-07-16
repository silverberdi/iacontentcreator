import { formatHashtags } from "../../../api/contentCycleApi";
import type { ManualExportResult } from "../../../types/contentCycle";
import LoadingSpinner from "../../LoadingSpinner";
import SectionPanel from "../../SectionPanel";
import CopyButton from "../../CopyButton";
import ActionButton from "../ActionButton";

type PublicacionManualBlockProps = {
  hasApprovedDraft: boolean;
  exportResult: ManualExportResult | null;
  showTechnical: boolean;
  loading: boolean;
  operationsEnabled: boolean;
  onExport: () => void;
};

export default function PublicacionManualBlock({
  hasApprovedDraft,
  exportResult,
  showTechnical,
  loading,
  operationsEnabled,
  onExport,
}: PublicacionManualBlockProps) {
  const caption = exportResult?.caption ?? "";
  const hashtags = formatHashtags(exportResult?.hashtags);
  const copyValue = [caption, hashtags].filter(Boolean).join("\n\n");

  return (
    <SectionPanel
      title="5. Publicación manual"
      description="Obtén el paquete final para publicar manualmente en la plataforma."
    >
      {!hasApprovedDraft && (
        <p className="mb-4 text-sm text-amber-200/90">
          Aprueba un borrador en el paso anterior para preparar la publicación manual.
        </p>
      )}

      <ActionButton
        variant="primary"
        disabled={loading || !hasApprovedDraft || !operationsEnabled}
        onClick={onExport}
        className="px-4 py-2 text-sm"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner className="size-4" label="Preparando…" />
            Preparando…
          </span>
        ) : (
          "Preparar publicación manual"
        )}
      </ActionButton>

      {exportResult && (
        <div className="mt-6 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-5">
          <p className="mb-1 text-base font-medium text-emerald-100">
            Paquete listo para publicación manual
          </p>
          <p className="mb-4 text-sm text-emerald-200/80">
            Copia el texto, abre la imagen y sigue las instrucciones en Instagram u otra plataforma.
          </p>

          {exportResult.imageUrl && (
            <a
              href={exportResult.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-4 block overflow-hidden rounded-md border border-border-muted"
            >
              <img
                src={exportResult.imageUrl}
                alt="Imagen para publicar"
                className="max-h-80 w-full bg-black/20 object-contain"
              />
            </a>
          )}

          <div className="mb-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-400">Caption</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-100">{caption || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">Hashtags</p>
              <p className="mt-1 text-sm text-gray-100">{hashtags || "—"}</p>
            </div>
            {exportResult.manualInstructions && (
              <div>
                <p className="text-xs font-medium text-gray-400">Instrucciones manuales</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-200">
                  {exportResult.manualInstructions}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {exportResult.imageUrl && (
              <a
                href={exportResult.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-sm text-gray-200 hover:border-gray-500"
              >
                Abrir imagen
              </a>
            )}
            {copyValue && (
              <CopyButton value={copyValue} label="Copiar caption + hashtags" className="text-sm" />
            )}
          </div>

          {showTechnical && exportResult.imageUrl && (
            <p className="mt-3 break-all font-mono text-xs text-gray-500">{exportResult.imageUrl}</p>
          )}
        </div>
      )}
    </SectionPanel>
  );
}
