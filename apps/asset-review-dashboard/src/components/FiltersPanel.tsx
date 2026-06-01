import { assetTypes, avatars, scenes, statusFilters } from "../data/catalogs";
import type { ReviewFilters } from "../types/assets";
import LoadingSpinner from "./LoadingSpinner";

type FiltersPanelProps = {
  filters: ReviewFilters;
  loading: boolean;
  onChange: (filters: ReviewFilters) => void;
  onRefresh: () => void;
};

export default function FiltersPanel({
  filters,
  loading,
  onChange,
  onRefresh,
}: FiltersPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-400">
        Filters
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Avatar</span>
          <select
            value={filters.avatar}
            onChange={(e) => onChange({ ...filters, avatar: e.target.value })}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent"
          >
            {avatars.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Scene</span>
          <select
            value={filters.scene}
            onChange={(e) => onChange({ ...filters, scene: e.target.value })}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent"
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Asset type</span>
          <select
            value={filters.assetType}
            onChange={(e) => onChange({ ...filters, assetType: e.target.value })}
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent"
          >
            {assetTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-400">Status</span>
          <select
            value={filters.statusFilter}
            onChange={(e) =>
              onChange({
                ...filters,
                statusFilter: e.target.value as ReviewFilters["statusFilter"],
              })
            }
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent"
          >
            {statusFilters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
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
            className="rounded-md border border-border bg-surface-overlay px-3 py-2 text-gray-100 outline-none focus:border-accent"
          />
        </label>

        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={filters.showCanonicalInCandidates}
            onChange={(e) =>
              onChange({ ...filters, showCanonicalInCandidates: e.target.checked })
            }
            className="size-4 rounded border-border bg-surface-overlay text-accent focus:ring-accent"
          />
          <span className="text-gray-300">Show canonical in candidates</span>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
