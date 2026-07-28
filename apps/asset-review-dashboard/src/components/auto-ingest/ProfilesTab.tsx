import { useMemo, useState } from "react";
import type { CatalogOptionsBundle } from "../../types/catalogs";
import type { IngestProfile, IngestProfileDraft } from "../../types/ingestProfiles";
import { PROFILE_DELETE_BLOCKED_MESSAGE } from "../../types/ingestProfiles";
import { WORKFLOW_CATALOG, MODEL_CATALOG } from "../../data/catalogTerminology";
import { formatDate } from "../../utils/format";
import { isRowActive } from "../../utils/ingestProfileForm";
import { scenesForAvatar } from "../../utils/catalogNormalize";
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  paginateArray,
  totalPages,
} from "../../utils/tableUi";
import CatalogSelect from "../CatalogSelect";
import SectionPanel from "../SectionPanel";
import TableFilterBar from "../TableFilterBar";
import LoadingSpinner from "../LoadingSpinner";

type ProfilesTabProps = {
  activeProfile: IngestProfile | null;
  profiles: IngestProfile[];
  draft: IngestProfileDraft;
  catalogOptions: CatalogOptionsBundle;
  catalogOptionsLoading?: boolean;
  selectedProfileId: string;
  isCreatingNew: boolean;
  isEditorOpen: boolean;
  loading: boolean;
  profilesLoading?: boolean;
  profilesLoadSucceeded?: boolean;
  saving: boolean;
  settingActiveProfileId: string | null;
  profilesError: string | null;
  activeProfileError: string | null;
  validationErrors: string | null;
  successMessage: string | null;
  profileHasAssets: Record<string, boolean>;
  deletePending: boolean;
  onRefresh: () => void;
  onEditProfile: (profile: IngestProfile) => void;
  onDraftChange: (field: keyof IngestProfileDraft, value: string | boolean) => void;
  onAvatarChange: (avatar: string) => void;
  onSetActive: (profile: IngestProfile) => void;
  onDelete: (profile: IngestProfile) => void;
  onUpsert: () => void;
  onNewProfile: () => void;
  onClearForm: () => void;
};

const inputClass =
  "rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent";

const actionButtonClass =
  "rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-gray-200 hover:border-gray-500 disabled:opacity-50";

export default function ProfilesTab({
  activeProfile,
  profiles,
  draft,
  catalogOptions,
  catalogOptionsLoading = false,
  selectedProfileId,
  isCreatingNew,
  isEditorOpen,
  loading,
  profilesLoading = false,
  profilesLoadSucceeded = false,
  saving,
  settingActiveProfileId,
  profilesError,
  activeProfileError,
  validationErrors,
  successMessage,
  profileHasAssets,
  deletePending,
  onRefresh,
  onEditProfile,
  onDraftChange,
  onAvatarChange,
  onSetActive,
  onDelete,
  onUpsert,
  onNewProfile,
  onClearForm,
}: ProfilesTabProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState<"all" | "yes" | "no">("all");
  const [enabledFilter, setEnabledFilter] = useState<"all" | "yes" | "no">("all");

  const busy = loading || saving || settingActiveProfileId !== null || deletePending;
  const sceneOptions = useMemo(
    () => scenesForAvatar(catalogOptions.scenes, draft.avatar),
    [catalogOptions.scenes, draft.avatar],
  );

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const rowActive = isRowActive(profile, activeProfile);
      if (activeFilter === "yes" && !rowActive) return false;
      if (activeFilter === "no" && rowActive) return false;
      const enabled = profile.isEnabled !== false;
      if (enabledFilter === "yes" && !enabled) return false;
      if (enabledFilter === "no" && enabled) return false;
      return matchesSearch(
        [
          profile.profileName,
          profile.avatar,
          profile.scene,
          profile.workflow,
          profile.model,
          rowActive ? "active yes" : "no",
          enabled ? "enabled yes" : "disabled no",
        ],
        search,
      );
    });
  }, [activeFilter, activeProfile, enabledFilter, profiles, search]);

  const pageCount = totalPages(filteredProfiles.length, pageSize);
  const safePage = Math.min(page, pageCount);
  const pagedProfiles = paginateArray(filteredProfiles, safePage, pageSize);

  const showEditor = isEditorOpen;
  const editorModeLabel = isCreatingNew
    ? "Creating new ingest setup"
    : selectedProfileId
      ? "Editing existing ingest setup"
      : "New ingest setup";

  const showEmptyProfiles =
    profilesLoadSucceeded && !profilesLoading && profiles.length === 0;

  const statusAlerts = (
    <>
      {profilesError && (
        <p className="text-sm text-red-300" role="alert">
          {profilesError}
        </p>
      )}
      {validationErrors && (
        <p className="text-sm text-amber-200" role="alert">
          Validation: {validationErrors}
        </p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-300" role="status">
          {successMessage}
        </p>
      )}
    </>
  );

  const editorForm = (
    <>
      <div className="mb-4 rounded-md border border-blue-800/50 bg-blue-950/25 px-3 py-2 text-sm text-blue-100">
        This controls how generated files are imported and classified. It does not decide
        which references are used to create new images.
      </div>
      {catalogOptionsLoading && (
        <p className="mb-3 text-xs text-gray-500">Loading catalog options…</p>
      )}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm lg:col-span-2 xl:col-span-3">
          <span className="text-gray-400">ingest setup name (auto-generated)</span>
          <input
            value={draft.profileName}
            readOnly
            className={`${inputClass} opacity-80`}
            disabled={busy}
          />
        </label>
        <CatalogSelect
          label="avatar"
          value={draft.avatar}
          options={catalogOptions.avatars}
          onChange={onAvatarChange}
          disabled={busy}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">avatarShort</span>
          <input
            value={draft.avatarShort}
            readOnly
            className={`${inputClass} opacity-80`}
            disabled={busy}
          />
        </label>
        <CatalogSelect
          label="scene"
          value={draft.scene}
          options={sceneOptions}
          onChange={(scene) => onDraftChange("scene", scene)}
          disabled={busy}
        />
        <CatalogSelect
          label={WORKFLOW_CATALOG.fieldLabel}
          tooltip={WORKFLOW_CATALOG.fieldHint}
          value={draft.workflow}
          options={catalogOptions.workflows}
          onChange={(workflow) => onDraftChange("workflow", workflow)}
          disabled={busy}
        />
        <CatalogSelect
          label={MODEL_CATALOG.fieldLabel}
          tooltip={MODEL_CATALOG.fieldHint}
          value={draft.model}
          options={catalogOptions.models}
          onChange={(model) => onDraftChange("model", model)}
          disabled={busy}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">seed</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.seed}
            onChange={(e) => onDraftChange("seed", e.target.value)}
            className={inputClass}
            disabled={busy}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">version</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.version}
            onChange={(e) => onDraftChange("version", e.target.value)}
            className={inputClass}
            disabled={busy}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.autoPromoteLatest}
            onChange={(e) => onDraftChange("autoPromoteLatest", e.target.checked)}
            disabled={busy}
            className="size-4 rounded border-border text-accent"
          />
          <span className="text-gray-300">autoPromoteLatest</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isEnabled}
            onChange={(e) => onDraftChange("isEnabled", e.target.checked)}
            disabled={busy}
            className="size-4 rounded border-border text-accent"
          />
          <span className="text-gray-300">Available for ingest</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.setActive}
            onChange={(e) => onDraftChange("setActive", e.target.checked)}
            disabled={busy}
            className="size-4 rounded border-border text-accent"
          />
          <span className="text-gray-300">Use for next watcher ingest after save</span>
        </label>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {statusAlerts}

      <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
          Used by watcher
        </p>
        {activeProfileError && !profilesError && (
          <p className="mt-1 text-sm text-amber-200/90">{activeProfileError}</p>
        )}
        {activeProfile ? (
          <p className="mt-1 text-sm text-gray-200">
            <span className="font-medium text-white">{activeProfile.profileName}</span>
            <span className="text-gray-400">
              {" "}
              · {activeProfile.avatar} / {activeProfile.scene}
            </span>
            {activeProfile.updatedAt && (
              <span className="text-gray-500"> · updated {formatDate(activeProfile.updatedAt)}</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-400">No ingest setup is selected for the watcher.</p>
        )}
      </div>

      <SectionPanel
        title="Ingest Profiles"
        description="These setups classify files found by ingest. They are not character identity profiles and do not create images."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onNewProfile} disabled={busy} className={actionButtonClass}>
              New ingest setup
            </button>
            <button type="button" onClick={onRefresh} disabled={busy} className={actionButtonClass}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      >
        {profilesLoading && profiles.length === 0 && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
            <LoadingSpinner className="size-4" label="Loading profiles…" />
            <span>Loading profiles…</span>
          </div>
        )}

        {showEmptyProfiles && !isCreatingNew && (
          <p className="mb-4 text-sm text-gray-400">
            No ingest profiles found. Use <strong className="text-gray-200">New ingest setup</strong>{" "}
            above to create one.
          </p>
        )}

        {profiles.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as typeof activeFilter);
                  setPage(1);
                }}
                className="rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-gray-200"
              >
                <option value="all">Watcher use: all</option>
                <option value="yes">Used by watcher: yes</option>
                <option value="no">Used by watcher: no</option>
              </select>
              <select
                value={enabledFilter}
                onChange={(e) => {
                  setEnabledFilter(e.target.value as typeof enabledFilter);
                  setPage(1);
                }}
                className="rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-gray-200"
              >
                <option value="all">Available: all</option>
                <option value="yes">Available: yes</option>
                <option value="no">Available: no</option>
              </select>
            </div>
            <TableFilterBar
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              searchPlaceholder="Search ingest setup, avatar, scene, workflow, model…"
              page={safePage}
              pageSize={pageSize}
              totalItems={filteredProfiles.length}
              totalPages={pageCount}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              disabled={busy}
            />
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ingest setup</th>
                    <th className="px-3 py-2 font-medium">Avatar</th>
                    <th className="px-3 py-2 font-medium">Scene</th>
                    <th className="px-3 py-2 font-medium">Workflow</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="px-3 py-2 font-medium">Used by watcher</th>
                    <th className="px-3 py-2 font-medium">Available</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pagedProfiles.map((profile) => {
                    const rowActive = isRowActive(profile, activeProfile);
                    const isSelected =
                      Boolean(selectedProfileId && profile.profileId === selectedProfileId) &&
                      !isCreatingNew;
                    const rowKey = profile.profileId ?? profile.profileName;
                    const settingThisActive =
                      profile.profileId !== undefined &&
                      settingActiveProfileId === profile.profileId;
                    const canSetActive = Boolean(profile.profileId) && !rowActive;
                    const hasAssets =
                      profile.profileId !== undefined &&
                      profileHasAssets[profile.profileId] === true;

                    return (
                      <tr
                        key={rowKey}
                        className={
                          rowActive
                            ? "bg-emerald-950/30"
                            : isSelected
                              ? "bg-surface-overlay/40"
                              : undefined
                        }
                      >
                        <td className="px-3 py-2 font-medium text-gray-100">
                          {profile.profileName}
                          {rowActive && (
                            <span className="ml-2 rounded bg-emerald-800/50 px-1.5 py-0.5 text-[10px] uppercase text-emerald-200">
                              watcher
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-300">{profile.avatar || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{profile.scene || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{profile.workflow || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{profile.model || "—"}</td>
                        <td className="px-3 py-2 text-gray-300">{rowActive ? "yes" : "no"}</td>
                        <td className="px-3 py-2 text-gray-300">
                          {profile.isEnabled === false ? "no" : "yes"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                          {profile.updatedAt ? formatDate(profile.updatedAt) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditProfile(profile)}
                              disabled={busy}
                              className={actionButtonClass}
                            >
                              {isSelected ? "Editing" : "Edit setup"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSetActive(profile)}
                              disabled={busy || !canSetActive}
                              className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              {settingThisActive ? "Setting…" : "Use for next ingest"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(profile)}
                              disabled={busy || !profile.profileId}
                              className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-200 hover:border-red-700 disabled:opacity-50"
                              title={hasAssets ? PROFILE_DELETE_BLOCKED_MESSAGE : undefined}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredProfiles.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No ingest setups match the current filters.</p>
            )}
          </>
        )}
      </SectionPanel>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-xl border border-border bg-surface-raised shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Ingest setup editor</h3>
                <p className="mt-1 text-sm text-gray-500">{editorModeLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClearForm}
                  disabled={busy}
                  className={actionButtonClass}
                >
                  {isCreatingNew ? "Cancel" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={onUpsert}
                  disabled={busy || !draft.avatar || !draft.scene || !draft.assetType}
                  className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save ingest setup"}
                </button>
              </div>
            </div>
            <div className="p-5">{editorForm}</div>
          </div>
        </div>
      )}
    </div>
  );
}
