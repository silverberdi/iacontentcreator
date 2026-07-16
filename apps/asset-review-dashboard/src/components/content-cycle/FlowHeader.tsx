import { useMemo } from "react";
import type { ContentCycleContext } from "../../types/contentCycle";
import type { CatalogOptionsBundle, CatalogSelectOption } from "../../types/catalogs";
import { contentCyclePlatforms } from "../../data/contentCyclePlatforms";
import { scenesForAvatar } from "../../utils/catalogNormalize";
import { truncateText } from "../../utils/contentCycleWizard";
import ActionButton from "./ActionButton";
import RequiredCatalogSelect from "./RequiredCatalogSelect";

type FlowHeaderProps = {
  context: ContentCycleContext;
  catalogOptions: CatalogOptionsBundle;
  catalogOptionsLoading: boolean;
  expanded: boolean;
  contentPrepared: boolean;
  onContextChange: (next: ContentCycleContext) => void;
  onEditConfig: () => void;
  onCollapseConfig?: () => void;
  showTechnical: boolean;
  onShowTechnicalChange: (value: boolean) => void;
  onLoadTestData: () => void;
};

function resolveLabel(options: CatalogSelectOption[], value: string): string {
  if (!value.trim()) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function FlowHeader({
  context,
  catalogOptions,
  catalogOptionsLoading,
  expanded,
  contentPrepared,
  onContextChange,
  onEditConfig,
  onCollapseConfig,
  showTechnical,
  onShowTechnicalChange,
  onLoadTestData,
}: FlowHeaderProps) {
  const sceneOptions = useMemo(
    () => (context.avatar ? scenesForAvatar(catalogOptions.scenes, context.avatar) : []),
    [catalogOptions.scenes, context.avatar],
  );

  const avatarLabel = resolveLabel(catalogOptions.avatars, context.avatar);
  const sceneLabel = resolveLabel(sceneOptions, context.scene);
  const platformLabel = resolveLabel(contentCyclePlatforms, context.platform);
  const intentLine = context.postIntent.trim();

  const handleAvatarChange = (avatar: string) => {
    const nextScenes = avatar ? scenesForAvatar(catalogOptions.scenes, avatar) : [];
    const sceneStillValid = nextScenes.some((s) => s.value === context.scene);
    onContextChange({
      ...context,
      avatar,
      scene: sceneStillValid ? context.scene : "",
    });
  };

  if (!expanded) {
    return (
      <section
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2"
        aria-label="Configuración del ciclo"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-200">
            {avatarLabel} · {sceneLabel} · {platformLabel}
          </p>
          {intentLine && (
            <p className="truncate text-xs text-gray-500">
              Intención: {truncateText(intentLine, 72)}
            </p>
          )}
          {showTechnical && (
            <p className="truncate font-mono text-[10px] text-gray-600">
              {context.avatar || "—"} · {context.scene || "—"} · {context.platform || "—"}
            </p>
          )}
        </div>
        <ActionButton onClick={onEditConfig} className="shrink-0 text-xs">
          Editar configuración
        </ActionButton>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-white">Configuración del ciclo</h2>
        <div className="flex flex-wrap items-center gap-2">
          {contentPrepared && onCollapseConfig && (
            <ActionButton onClick={onCollapseConfig} className="text-xs">
              Contraer
            </ActionButton>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={showTechnical}
              onChange={(event) => onShowTechnicalChange(event.target.checked)}
              className="size-3.5 rounded border-border bg-surface accent-accent"
            />
            Modo técnico
          </label>
          {showTechnical && (
            <ActionButton onClick={onLoadTestData} className="text-xs">
              Datos de prueba
            </ActionButton>
          )}
        </div>
      </div>

      {catalogOptionsLoading && (
        <p className="mb-2 text-xs text-gray-500">Cargando catálogos…</p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <RequiredCatalogSelect
          label="Avatar"
          value={context.avatar}
          options={catalogOptions.avatars}
          placeholder="Selecciona un avatar"
          onChange={handleAvatarChange}
          disabled={catalogOptionsLoading}
        />
        <RequiredCatalogSelect
          label="Escena"
          value={context.scene}
          options={sceneOptions}
          placeholder="Selecciona una escena"
          onChange={(scene) => onContextChange({ ...context, scene })}
          disabled={catalogOptionsLoading || !context.avatar}
        />
        <RequiredCatalogSelect
          label="Plataforma"
          value={context.platform}
          options={contentCyclePlatforms}
          placeholder="Selecciona plataforma"
          onChange={(platform) => onContextChange({ ...context, platform })}
        />
      </div>

      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-xs font-medium text-gray-400">Intención del post</span>
        <textarea
          value={context.postIntent}
          onChange={(event) => onContextChange({ ...context, postIntent: event.target.value })}
          placeholder="Ej: tomando cafecito en la mañana"
          rows={2}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent"
        />
      </label>
    </section>
  );
}
