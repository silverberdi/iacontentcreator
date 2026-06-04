import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  initCatalogs,
  listCatalogs,
  setCatalogStatus,
  upsertCatalogItem,
} from "../api/catalogsApi";
import type {
  AssetTypeCatalogItem,
  AvatarCatalogItem,
  CatalogKind,
  CatalogListBundle,
  CatalogUpsertPayload,
  ModelCatalogItem,
  SceneCatalogItem,
  WorkflowCatalogItem,
} from "../types/catalogs";
import { WORKFLOW_CATALOG, MODEL_CATALOG } from "../data/catalogTerminology";
import { CATALOG_KINDS, DEFAULT_DISABLE_REASON, DEFAULT_SCENE_AVATAR } from "../types/catalogs";
import { formatDate } from "../utils/format";
import {
  normalizeCatalogList,
  sceneAvatarPersisted,
  sceneRowKey,
} from "../utils/catalogNormalize";
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  paginateArray,
  totalPages,
} from "../utils/tableUi";
import LoadingSpinner from "./LoadingSpinner";
import SectionPanel from "./SectionPanel";
import TableFilterBar from "./TableFilterBar";

const inputClass =
  "rounded-md border border-border bg-surface-overlay px-3 py-2 text-sm text-gray-100 outline-none focus:border-accent disabled:opacity-50";

const actionBtn =
  "rounded-md border border-border bg-surface-overlay px-2 py-1 text-xs text-gray-200 hover:border-gray-500 disabled:opacity-50";

type DisableTarget = {
  catalog: CatalogKind;
  slug: string;
  displayName: string;
  /** Required for scene_catalog composite key */
  avatar?: string;
};

const emptyDrafts = (): Record<CatalogKind, Record<string, string>> => ({
  avatars: { avatar: "", avatarShort: "", avatarKind: "", displayName: "", description: "" },
  scenes: { avatar: DEFAULT_SCENE_AVATAR, scene: "", displayName: "", description: "" },
  assetTypes: { assetType: "", displayName: "", description: "" },
  workflows: { workflow: "", displayName: "", description: "" },
  models: { model: "", provider: "", displayName: "", description: "" },
});

function itemEnabled(item: { isEnabled?: boolean }): boolean {
  return item.isEnabled !== false;
}

type CatalogsPanelProps = {
  onCatalogsChanged?: () => void;
};

export default function CatalogsPanel({ onCatalogsChanged }: CatalogsPanelProps) {
  const [activeKind, setActiveKind] = useState<CatalogKind>("avatars");
  const [list, setList] = useState<CatalogListBundle>({
    avatars: [],
    scenes: [],
    assetTypes: [],
    workflows: [],
    models: [],
  });
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusPending, setStatusPending] = useState<string | null>(null);
  const [initPending, setInitPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [disableTarget, setDisableTarget] = useState<DisableTarget | null>(null);
  const [disableReason, setDisableReason] = useState(DEFAULT_DISABLE_REASON);
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_PAGE_SIZE);
  const disableDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setTableSearch("");
    setTablePage(1);
  }, [activeKind]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listCatalogs();
      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Failed to list catalogs");
      }
      setList(normalizeCatalogList(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list catalogs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const dialog = disableDialogRef.current;
    if (!dialog) return;
    if (disableTarget) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [disableTarget]);

  const resetDraft = (kind: CatalogKind) => {
    setDrafts((prev) => ({ ...prev, [kind]: emptyDrafts()[kind] }));
    setEditingKey(null);
  };

  const handleNewItem = () => {
    resetDraft(activeKind);
    setSuccess(null);
  };

  const handleEditAvatar = (item: AvatarCatalogItem) => {
    setEditingKey(item.avatar);
    setDrafts((prev) => ({
      ...prev,
      avatars: {
        avatar: item.avatar,
        avatarShort: item.avatarShort ?? "",
        avatarKind: item.avatarKind ?? "",
        displayName: item.displayName ?? "",
        description: item.description ?? "",
      },
    }));
  };

  const handleEditScene = (item: SceneCatalogItem) => {
    setEditingKey(sceneRowKey(item));
    setDrafts((prev) => ({
      ...prev,
      scenes: {
        avatar: sceneAvatarPersisted(item) ?? "",
        scene: item.scene,
        displayName: item.displayName ?? "",
        description: item.description ?? "",
      },
    }));
  };

  const handleEditAssetType = (item: AssetTypeCatalogItem) => {
    setEditingKey(item.assetType);
    setDrafts((prev) => ({
      ...prev,
      assetTypes: {
        assetType: item.assetType,
        displayName: item.displayName ?? "",
        description: item.description ?? "",
      },
    }));
  };

  const handleEditWorkflow = (item: WorkflowCatalogItem) => {
    setEditingKey(item.workflow);
    setDrafts((prev) => ({
      ...prev,
      workflows: {
        workflow: item.workflow,
        displayName: item.displayName ?? "",
        description: item.description ?? "",
      },
    }));
  };

  const handleEditModel = (item: ModelCatalogItem) => {
    setEditingKey(item.model);
    setDrafts((prev) => ({
      ...prev,
      models: {
        model: item.model,
        provider: item.provider ?? "",
        displayName: item.displayName ?? "",
        description: item.description ?? "",
      },
    }));
  };

  const handleInit = async () => {
    setInitPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await initCatalogs();
      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Catalog init failed");
      }
      setSuccess("Catalogs initialized.");
      await loadList();
      onCatalogsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Catalog init failed");
    } finally {
      setInitPending(false);
    }
  };

  const handleUpsert = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    let payload: CatalogUpsertPayload;

    try {
      switch (activeKind) {
        case "avatars": {
          const d = drafts.avatars;
          if (!d.avatar.trim()) throw new Error("Avatar slug is required");
          payload = {
            catalog: "avatars",
            avatar: d.avatar.trim(),
            avatarShort: d.avatarShort.trim() || undefined,
            avatarKind: d.avatarKind.trim() || undefined,
            displayName: d.displayName.trim() || undefined,
            description: d.description.trim() || undefined,
          };
          break;
        }
        case "scenes": {
          const d = drafts.scenes;
          if (!d.avatar.trim()) throw new Error("Avatar is required");
          if (!d.scene.trim()) throw new Error("Scene slug is required");
          if (!d.displayName.trim()) throw new Error("displayName is required");
          payload = {
            catalog: "scenes",
            catalogType: "scenes",
            avatar: d.avatar.trim(),
            scene: d.scene.trim(),
            displayName: d.displayName.trim(),
            description: d.description.trim() || undefined,
            isEnabled: true,
          };
          break;
        }
        case "assetTypes": {
          const d = drafts.assetTypes;
          if (!d.assetType.trim()) throw new Error("Asset type slug is required");
          payload = {
            catalog: "assetTypes",
            assetType: d.assetType.trim(),
            displayName: d.displayName.trim() || undefined,
            description: d.description.trim() || undefined,
          };
          break;
        }
        case "workflows": {
          const d = drafts.workflows;
          if (!d.workflow.trim()) throw new Error("Workflow slug is required");
          payload = {
            catalog: "workflows",
            workflow: d.workflow.trim(),
            displayName: d.displayName.trim() || undefined,
            description: d.description.trim() || undefined,
          };
          break;
        }
        case "models": {
          const d = drafts.models;
          if (!d.model.trim()) throw new Error("Model slug is required");
          payload = {
            catalog: "models",
            model: d.model.trim(),
            provider: d.provider.trim() || undefined,
            displayName: d.displayName.trim() || undefined,
            description: d.description.trim() || undefined,
          };
          break;
        }
      }

      const result = await upsertCatalogItem(payload);
      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Failed to save catalog item");
      }

      const slug =
        activeKind === "avatars"
          ? drafts.avatars.avatar
          : activeKind === "scenes"
            ? drafts.scenes.scene
            : activeKind === "assetTypes"
              ? drafts.assetTypes.assetType
              : activeKind === "workflows"
                ? drafts.workflows.workflow
                : drafts.models.model;

      setSuccess(`Saved ${activeKind} item "${slug}".`);
      if (activeKind === "scenes" && payload.catalog === "scenes") {
        setEditingKey(`${payload.avatar}:${payload.scene}`);
      } else {
        setEditingKey(slug);
      }

      await loadList();
      onCatalogsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save catalog item");
    } finally {
      setSaving(false);
    }
  };

  const handleSetEnabled = async (
    catalog: CatalogKind,
    slug: string,
    isEnabled: boolean,
    sceneAvatar?: string,
  ) => {
    setStatusPending(`${catalog}:${slug}`);
    setError(null);
    setSuccess(null);

    const payload: Parameters<typeof setCatalogStatus>[0] = {
      catalog,
      isEnabled,
      ...(catalog === "avatars" && { avatar: slug }),
      ...(catalog === "scenes" && {
        scene: slug,
        avatar: sceneAvatar?.trim() || DEFAULT_SCENE_AVATAR,
      }),
      ...(catalog === "assetTypes" && { assetType: slug }),
      ...(catalog === "workflows" && { workflow: slug }),
      ...(catalog === "models" && { model: slug }),
    };

    if (!isEnabled) {
      payload.disabledReason = DEFAULT_DISABLE_REASON;
    }

    try {
      const result = await setCatalogStatus(payload);
      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Failed to update status");
      }
      setSuccess(`${isEnabled ? "Enabled" : "Disabled"} ${catalog} "${slug}".`);
      await loadList();
      onCatalogsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusPending(null);
    }
  };

  const handleConfirmDisable = async () => {
    if (!disableTarget) return;

    setStatusPending(`${disableTarget.catalog}:${disableTarget.slug}`);
    setError(null);
    setSuccess(null);

    try {
      const result = await setCatalogStatus({
        catalog: disableTarget.catalog,
        isEnabled: false,
        disabledReason: disableReason.trim() || DEFAULT_DISABLE_REASON,
        ...(disableTarget.catalog === "avatars" && { avatar: disableTarget.slug }),
        ...(disableTarget.catalog === "scenes" && {
          scene: disableTarget.slug,
          avatar: disableTarget.avatar ?? DEFAULT_SCENE_AVATAR,
        }),
        ...(disableTarget.catalog === "assetTypes" && { assetType: disableTarget.slug }),
        ...(disableTarget.catalog === "workflows" && { workflow: disableTarget.slug }),
        ...(disableTarget.catalog === "models" && { model: disableTarget.slug }),
      });

      if (result.ok === false) {
        throw new Error(result.message ?? result.reason ?? "Failed to disable item");
      }

      setSuccess(`Disabled ${disableTarget.catalog} "${disableTarget.displayName}".`);
      setDisableTarget(null);
      setDisableReason(DEFAULT_DISABLE_REASON);
      await loadList();
      onCatalogsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable item");
    } finally {
      setStatusPending(null);
    }
  };

  const updateDraftField = (kind: CatalogKind, field: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [kind]: { ...prev[kind], [field]: value },
    }));
    setSuccess(null);
  };

  const busy = loading || saving || initPending || statusPending !== null;

  const itemsForKind =
    activeKind === "avatars"
      ? list.avatars
      : activeKind === "scenes"
        ? list.scenes
        : activeKind === "assetTypes"
          ? list.assetTypes
          : activeKind === "workflows"
            ? list.workflows
            : list.models;

  const filteredItems = useMemo(() => {
    const q = tableSearch;
    return itemsForKind.filter((item) => {
      const enabled = itemEnabled(item);
      const base = [item.displayName, item.description, enabled ? "enabled yes" : "disabled no"];
      if (activeKind === "avatars" && "avatar" in item) {
        const row = item as AvatarCatalogItem;
        return matchesSearch([row.avatar, row.avatarShort, row.avatarKind, ...base], q);
      }
      if (activeKind === "scenes" && "scene" in item) {
        const row = item as SceneCatalogItem;
        return matchesSearch([row.scene, sceneAvatarPersisted(row), row.avatar, ...base], q);
      }
      if (activeKind === "assetTypes" && "assetType" in item) {
        return matchesSearch([(item as AssetTypeCatalogItem).assetType, ...base], q);
      }
      if (activeKind === "workflows" && "workflow" in item) {
        return matchesSearch([(item as WorkflowCatalogItem).workflow, ...base], q);
      }
      if (activeKind === "models" && "model" in item) {
        const row = item as ModelCatalogItem;
        return matchesSearch([row.model, row.provider, ...base], q);
      }
      return matchesSearch(base, q);
    });
  }, [activeKind, itemsForKind, tableSearch]);

  const tablePageCount = totalPages(filteredItems.length, tablePageSize);
  const safeTablePage = Math.min(tablePage, tablePageCount);
  const pagedItems = paginateArray(filteredItems, safeTablePage, tablePageSize);
  const scenesMissingAvatar = list.scenes.filter((s) => !sceneAvatarPersisted(s)).length;

  const renderTable = () => {
    if (activeKind === "avatars") {
      return (
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-2">Avatar</th>
              <th className="px-3 py-2">Short</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Display</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(pagedItems as AvatarCatalogItem[]).map((item) => {
              const pending = statusPending === `avatars:${item.avatar}`;
              return (
                <tr
                  key={item.avatar}
                  className={!itemEnabled(item) ? "opacity-60" : editingKey === item.avatar ? "bg-surface-overlay/40" : undefined}
                >
                  <td className="px-3 py-2 font-mono text-gray-100">{item.avatar}</td>
                  <td className="px-3 py-2 text-gray-300">{item.avatarShort ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-300">{item.avatarKind ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-300">{item.displayName ?? "—"}</td>
                  <td className="px-3 py-2">{itemEnabled(item) ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-gray-400">{item.updatedAt ? formatDate(item.updatedAt) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className={actionBtn} disabled={busy} onClick={() => handleEditAvatar(item)}>Edit</button>
                      {itemEnabled(item) ? (
                        <button type="button" className={actionBtn} disabled={busy} onClick={() => setDisableTarget({ catalog: "avatars", slug: item.avatar, displayName: item.displayName ?? item.avatar })}>Disable</button>
                      ) : (
                        <button type="button" className={actionBtn} disabled={busy || pending} onClick={() => void handleSetEnabled("avatars", item.avatar, true)}>Enable</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (activeKind === "scenes") {
      return (
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-2">Avatar</th>
              <th className="px-3 py-2">Scene</th>
              <th className="px-3 py-2">Display</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(pagedItems as SceneCatalogItem[]).map((item) => {
              const persistedAvatar = sceneAvatarPersisted(item);
              const rowKey = sceneRowKey(item);
              const pending = statusPending === `scenes:${item.scene}`;
              const statusAvatar = persistedAvatar ?? undefined;
              return (
                <tr
                  key={rowKey}
                  className={
                    !itemEnabled(item)
                      ? "opacity-60"
                      : editingKey === rowKey
                        ? "bg-surface-overlay/40"
                        : undefined
                  }
                >
                  <td className="px-3 py-2 font-mono">
                    {persistedAvatar ? (
                      <span className="text-gray-200">{persistedAvatar}</span>
                    ) : (
                      <span
                        className="text-amber-300"
                        title="API response has no avatar for this scene"
                      >
                        — missing
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono">{item.scene}</td>
                  <td className="px-3 py-2">{item.displayName ?? "—"}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-gray-400">
                    {item.description ?? "—"}
                  </td>
                  <td className="px-3 py-2">{itemEnabled(item) ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-gray-400">
                    {item.updatedAt ? formatDate(item.updatedAt) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className={actionBtn}
                        disabled={busy}
                        onClick={() => handleEditScene(item)}
                      >
                        Edit
                      </button>
                      {itemEnabled(item) ? (
                        <button
                          type="button"
                          className={actionBtn}
                          disabled={busy || !statusAvatar}
                          title={statusAvatar ? undefined : "Cannot disable without avatar in API row"}
                          onClick={() =>
                            statusAvatar &&
                            setDisableTarget({
                              catalog: "scenes",
                              slug: item.scene,
                              avatar: statusAvatar,
                              displayName: item.displayName ?? item.scene,
                            })
                          }
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={actionBtn}
                          disabled={busy || pending || !statusAvatar}
                          title={statusAvatar ? undefined : "Cannot enable without avatar in API row"}
                          onClick={() =>
                            statusAvatar &&
                            void handleSetEnabled("scenes", item.scene, true, statusAvatar)
                          }
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (activeKind === "assetTypes") {
      return (
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-2">Asset type</th>
              <th className="px-3 py-2">Display</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(pagedItems as AssetTypeCatalogItem[]).map((item) => {
              const pending = statusPending === `assetTypes:${item.assetType}`;
              return (
                <tr key={item.assetType} className={!itemEnabled(item) ? "opacity-60" : editingKey === item.assetType ? "bg-surface-overlay/40" : undefined}>
                  <td className="px-3 py-2 font-mono">{item.assetType}</td>
                  <td className="px-3 py-2">{item.displayName ?? "—"}</td>
                  <td className="px-3 py-2">{itemEnabled(item) ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-gray-400">{item.updatedAt ? formatDate(item.updatedAt) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className={actionBtn} disabled={busy} onClick={() => handleEditAssetType(item)}>Edit</button>
                      {itemEnabled(item) ? (
                        <button type="button" className={actionBtn} disabled={busy} onClick={() => setDisableTarget({ catalog: "assetTypes", slug: item.assetType, displayName: item.displayName ?? item.assetType })}>Disable</button>
                      ) : (
                        <button type="button" className={actionBtn} disabled={busy || pending} onClick={() => void handleSetEnabled("assetTypes", item.assetType, true)}>Enable</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (activeKind === "workflows") {
      return (
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-3 py-2">Workflow</th>
              <th className="px-3 py-2">Display</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(pagedItems as WorkflowCatalogItem[]).map((item) => {
              const pending = statusPending === `workflows:${item.workflow}`;
              return (
                <tr key={item.workflow} className={!itemEnabled(item) ? "opacity-60" : editingKey === item.workflow ? "bg-surface-overlay/40" : undefined}>
                  <td className="px-3 py-2 font-mono">{item.workflow}</td>
                  <td className="px-3 py-2">{item.displayName ?? "—"}</td>
                  <td className="px-3 py-2">{itemEnabled(item) ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-gray-400">{item.updatedAt ? formatDate(item.updatedAt) : "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className={actionBtn} disabled={busy} onClick={() => handleEditWorkflow(item)}>Edit</button>
                      {itemEnabled(item) ? (
                        <button type="button" className={actionBtn} disabled={busy} onClick={() => setDisableTarget({ catalog: "workflows", slug: item.workflow, displayName: item.displayName ?? item.workflow })}>Disable</button>
                      ) : (
                        <button type="button" className={actionBtn} disabled={busy || pending} onClick={() => void handleSetEnabled("workflows", item.workflow, true)}>Enable</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    return (
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-surface-overlay/60 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-3 py-2">Model</th>
            <th className="px-3 py-2">Provider</th>
            <th className="px-3 py-2">Display</th>
            <th className="px-3 py-2">Enabled</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(pagedItems as ModelCatalogItem[]).map((item) => {
            const pending = statusPending === `models:${item.model}`;
            return (
              <tr key={item.model} className={!itemEnabled(item) ? "opacity-60" : editingKey === item.model ? "bg-surface-overlay/40" : undefined}>
                <td className="px-3 py-2 font-mono">{item.model}</td>
                <td className="px-3 py-2">{item.provider ?? "—"}</td>
                <td className="px-3 py-2">{item.displayName ?? "—"}</td>
                <td className="px-3 py-2">{itemEnabled(item) ? "yes" : "no"}</td>
                <td className="px-3 py-2 text-gray-400">{item.updatedAt ? formatDate(item.updatedAt) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" className={actionBtn} disabled={busy} onClick={() => handleEditModel(item)}>Edit</button>
                    {itemEnabled(item) ? (
                      <button type="button" className={actionBtn} disabled={busy} onClick={() => setDisableTarget({ catalog: "models", slug: item.model, displayName: item.displayName ?? item.model })}>Disable</button>
                    ) : (
                      <button type="button" className={actionBtn} disabled={busy || pending} onClick={() => void handleSetEnabled("models", item.model, true)}>Enable</button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderForm = () => {
    if (activeKind === "avatars") {
      const d = drafts.avatars;
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">avatar (slug)</span><input className={inputClass} value={d.avatar} disabled={busy || Boolean(editingKey)} onChange={(e) => updateDraftField("avatars", "avatar", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">avatarShort</span><input className={inputClass} value={d.avatarShort} disabled={busy} onChange={(e) => updateDraftField("avatars", "avatarShort", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">avatarKind</span><input className={inputClass} value={d.avatarKind} disabled={busy} onChange={(e) => updateDraftField("avatars", "avatarKind", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">displayName</span><input className={inputClass} value={d.displayName} disabled={busy} onChange={(e) => updateDraftField("avatars", "displayName", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="text-gray-400">description</span><input className={inputClass} value={d.description} disabled={busy} onChange={(e) => updateDraftField("avatars", "description", e.target.value)} /></label>
        </div>
      );
    }
    if (activeKind === "scenes") {
      const d = drafts.scenes;
      const lockSceneAvatar = Boolean(editingKey && d.avatar.trim());
      const avatarSelectOptions = (() => {
        const options = list.avatars.map((a) => ({
          value: a.avatar,
          label: a.displayName ? `${a.displayName} (${a.avatar})` : a.avatar,
        }));
        if (d.avatar && !options.some((o) => o.value === d.avatar)) {
          options.unshift({ value: d.avatar, label: d.avatar });
        }
        return options;
      })();

      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">
              avatar <span className="text-red-400">*</span>
            </span>
            <select
              className={inputClass}
              value={d.avatar}
              required
              disabled={busy || lockSceneAvatar}
              onChange={(e) => updateDraftField("scenes", "avatar", e.target.value)}
            >
              <option value="">— Select avatar —</option>
              {avatarSelectOptions.length === 0 && (
                <option value={DEFAULT_SCENE_AVATAR}>{DEFAULT_SCENE_AVATAR}</option>
              )}
              {avatarSelectOptions.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">scene (slug)</span><input className={inputClass} value={d.scene} disabled={busy || Boolean(editingKey)} onChange={(e) => updateDraftField("scenes", "scene", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">displayName</span><input className={inputClass} value={d.displayName} disabled={busy} onChange={(e) => updateDraftField("scenes", "displayName", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="text-gray-400">description</span><input className={inputClass} value={d.description} disabled={busy} onChange={(e) => updateDraftField("scenes", "description", e.target.value)} /></label>
        </div>
      );
    }
    if (activeKind === "assetTypes") {
      const d = drafts.assetTypes;
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">assetType (slug)</span><input className={inputClass} value={d.assetType} disabled={busy || Boolean(editingKey)} onChange={(e) => updateDraftField("assetTypes", "assetType", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm"><span className="text-gray-400">displayName</span><input className={inputClass} value={d.displayName} disabled={busy} onChange={(e) => updateDraftField("assetTypes", "displayName", e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2"><span className="text-gray-400">description</span><input className={inputClass} value={d.description} disabled={busy} onChange={(e) => updateDraftField("assetTypes", "description", e.target.value)} /></label>
        </div>
      );
    }
    if (activeKind === "workflows") {
      const d = drafts.workflows;
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">{WORKFLOW_CATALOG.slugLabel}</span>
            <input className={inputClass} value={d.workflow} disabled={busy || Boolean(editingKey)} onChange={(e) => updateDraftField("workflows", "workflow", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-400">displayName</span>
            <input className={inputClass} value={d.displayName} placeholder={WORKFLOW_CATALOG.displayNamePlaceholder} disabled={busy} onChange={(e) => updateDraftField("workflows", "displayName", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-gray-400">description</span>
            <span className="text-xs text-gray-500">{WORKFLOW_CATALOG.descriptionPlaceholder}</span>
            <input className={inputClass} value={d.description} disabled={busy} onChange={(e) => updateDraftField("workflows", "description", e.target.value)} />
          </label>
        </div>
      );
    }
    const d = drafts.models;
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">{MODEL_CATALOG.slugLabel}</span>
          <input className={inputClass} value={d.model} disabled={busy || Boolean(editingKey)} onChange={(e) => updateDraftField("models", "model", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">provider</span>
          <span className="text-xs text-gray-500">{MODEL_CATALOG.providerHint}</span>
          <input className={inputClass} value={d.provider} disabled={busy} onChange={(e) => updateDraftField("models", "provider", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">displayName</span>
          <input className={inputClass} value={d.displayName} placeholder={MODEL_CATALOG.displayNamePlaceholder} disabled={busy} onChange={(e) => updateDraftField("models", "displayName", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-gray-400">description</span>
          <span className="text-xs text-gray-500">{MODEL_CATALOG.descriptionPlaceholder}</span>
          <input className={inputClass} value={d.description} disabled={busy} onChange={(e) => updateDraftField("models", "description", e.target.value)} />
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionPanel
        title="Catalog management"
        description="Create and enable/disable avatars, scenes, asset types, workflows, and models. No physical delete."
        actions={
          <>
            <button type="button" onClick={() => void loadList()} disabled={busy} className={actionBtn}>
              {loading ? "Refreshing…" : "Refresh all"}
            </button>
            <button type="button" onClick={() => void handleInit()} disabled={busy} className={actionBtn}>
              {initPending ? "Initializing…" : "Initialize catalogs"}
            </button>
          </>
        }
      >
        {error && <p className="mb-3 text-sm text-red-300" role="alert">{error}</p>}
        {success && <p className="mb-3 text-sm text-emerald-300" role="status">{success}</p>}

        <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
          {CATALOG_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              onClick={() => {
                setActiveKind(kind.id);
                resetDraft(kind.id);
                setSuccess(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                activeKind === kind.id
                  ? "bg-accent text-white"
                  : "border border-border text-gray-300 hover:border-gray-500"
              }`}
            >
              {kind.label}
            </button>
          ))}
        </div>

        <p className="mb-4 text-sm text-gray-400">
          {CATALOG_KINDS.find((kind) => kind.id === activeKind)?.description}
        </p>

        {activeKind === "scenes" && list.scenes.length > 0 && scenesMissingAvatar === list.scenes.length && (
          <p className="mb-3 rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            The catalog list API returned scenes without an <code className="text-xs">avatar</code>{" "}
            field. The dashboard cannot display or send avatar until the list response includes it
            (e.g. <code className="text-xs">avatar: &quot;estefania-montealegre&quot;</code> per row).
          </p>
        )}
        {activeKind === "scenes" &&
          scenesMissingAvatar > 0 &&
          scenesMissingAvatar < list.scenes.length && (
            <p className="mb-3 rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              {scenesMissingAvatar} scene(s) are missing <code className="text-xs">avatar</code> in the
              API response. Edit each row, select avatar, and save. SQL backfill:{" "}
              <code className="text-xs">
                UPDATE scene_catalog SET avatar = &apos;estefania-montealegre&apos; WHERE avatar IS NULL;
              </code>
            </p>
          )}

        {itemsForKind.length > 0 && (
          <TableFilterBar
            search={tableSearch}
            onSearchChange={(v) => {
              setTableSearch(v);
              setTablePage(1);
            }}
            searchPlaceholder={`Search ${activeKind}…`}
            page={safeTablePage}
            pageSize={tablePageSize}
            totalItems={filteredItems.length}
            totalPages={tablePageCount}
            onPageChange={setTablePage}
            onPageSizeChange={(size) => {
              setTablePageSize(size);
              setTablePage(1);
            }}
            disabled={busy}
          />
        )}

        {loading && itemsForKind.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <LoadingSpinner className="size-4" label="Loading catalogs…" />
            <span>Loading {activeKind}…</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">{renderTable()}</div>
        )}

        {!loading && itemsForKind.length === 0 && (
          <p className="mt-3 text-sm text-gray-400">No items in this catalog yet.</p>
        )}
        {!loading && itemsForKind.length > 0 && filteredItems.length === 0 && (
          <p className="mt-3 text-sm text-gray-500">No items match the current search.</p>
        )}
      </SectionPanel>

      <SectionPanel
        title={editingKey ? `Edit ${activeKind} item` : `New ${activeKind} item`}
        description="Upsert saves to the database. Slug fields are locked while editing."
        actions={
          <button type="button" onClick={handleNewItem} disabled={busy} className={actionBtn}>
            Clear form
          </button>
        }
      >
        {renderForm()}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleUpsert()}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : editingKey ? "Update item" : "Create item"}
          </button>
        </div>
      </SectionPanel>

      <dialog
        ref={disableDialogRef}
        className="w-full max-w-md rounded-lg border border-border bg-surface-raised p-0 text-gray-100 shadow-xl backdrop:bg-black/60"
        onClose={() => setDisableTarget(null)}
      >
        <form
          method="dialog"
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleConfirmDisable();
          }}
        >
          <h3 className="text-sm font-medium text-white">Disable catalog item</h3>
          <p className="mt-2 text-sm text-gray-400">
            {disableTarget
              ? `Disable "${disableTarget.displayName}"? This is a logical disable only.`
              : ""}
          </p>
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-gray-400">disabledReason</span>
            <input
              className={inputClass}
              value={disableReason}
              onChange={(e) => setDisableReason(e.target.value)}
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className={actionBtn}
              onClick={() => {
                setDisableTarget(null);
                disableDialogRef.current?.close();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={statusPending !== null}
              className="rounded-md bg-red-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Disable
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
