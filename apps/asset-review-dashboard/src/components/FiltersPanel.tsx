import { useMemo } from "react";
import { statusFilters } from "../data/catalogs";
import type { CatalogOptionsBundle } from "../types/catalogs";
import type { ReviewFilters } from "../types/assets";
import { ensureFilterValue, scenesForAvatar } from "../utils/catalogNormalize";
import CatalogSelect from "./CatalogSelect";
import LoadingSpinner from "./LoadingSpinner";

type FiltersPanelProps = {
  filters: ReviewFilters;
  catalogOptions: CatalogOptionsBundle;
  catalogOptionsLoading?: boolean;
  loading: boolean;
  onChange: (filters: ReviewFilters) => void;
  onRefresh: () => void;
};

const controlClass =
  "rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent";

export default function FiltersPanel({
  filters,
  catalogOptions,
  catalogOptionsLoading = false,
  loading,
  onChange,
  onRefresh,
}: FiltersPanelProps) {
  const sceneOptions = useMemo(
    () => scenesForAvatar(catalogOptions.scenes, filters.avatar),
    [catalogOptions.scenes, filters.avatar],
  );

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Filters
        {catalogOptionsLoading && (
          <span className="ml-2 font-normal normal-case text-gray-500">(loading catalogs…)</span>
        )}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 xl:items-end">
        <CatalogSelect
          label="Avatar"
          value={filters.avatar}
          options={catalogOptions.avatars}
          onChange={(avatar) => {
            const avatarScenes = scenesForAvatar(catalogOptions.scenes, avatar);
            onChange({
              ...filters,
              avatar,
              scene: ensureFilterValue(filters.scene, avatarScenes, avatarScenes[0]?.value ?? filters.scene),
            });
          }}
          disabled={loading}
          className="min-w-0"
        />

        <CatalogSelect
          label="Scene"
          value={filters.scene}
          options={sceneOptions}
          onChange={(scene) => onChange({ ...filters, scene })}
          disabled={loading}
          className="min-w-0"
        />

        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Status</span>
          <select
            value={filters.statusFilter}
            onChange={(e) =>
              onChange({
                ...filters,
                statusFilter: e.target.value as ReviewFilters["statusFilter"],
              })
            }
            className={controlClass}
          >
            {statusFilters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Limit</span>
          <input
            type="number"
            min={1}
            max={200}
            value={filters.limit}
            onChange={(e) =>
              onChange({
                ...filters,
                limit: Math.max(1, Math.min(200, Number(e.target.value) || 1)),
              })
            }
            className={controlClass}
          />
        </label>

        <label className="flex min-h-[42px] items-center gap-2 text-sm xl:pb-2">
          <input
            type="checkbox"
            checked={filters.showCanonicalInCandidates}
            onChange={(e) =>
              onChange({ ...filters, showCanonicalInCandidates: e.target.checked })
            }
            className="size-4 shrink-0 rounded border-border bg-surface-overlay text-accent focus:ring-accent"
          />
          <span className="leading-tight text-gray-300">Show canonical in candidates</span>
        </label>

        <div className="flex min-w-0 items-end xl:justify-end">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto xl:whitespace-nowrap"
          >
            {loading ? (
              <LoadingSpinner className="size-4" label="Refreshing…" />
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
