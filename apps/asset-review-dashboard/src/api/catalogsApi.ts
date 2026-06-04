import { postN8nJson } from "./n8nClient";
import type {
  CatalogInitResponse,
  CatalogListResponse,
  CatalogOptionsResponse,
  CatalogSetStatusPayload,
  CatalogSetStatusResponse,
  CatalogUpsertPayload,
  CatalogUpsertResponse,
} from "../types/catalogs";

export async function initCatalogs(): Promise<CatalogInitResponse> {
  return postN8nJson<CatalogInitResponse>("/admin/catalogs/init", {});
}

export async function getCatalogOptions(): Promise<CatalogOptionsResponse> {
  return postN8nJson<CatalogOptionsResponse>("/admin/catalogs/options", {});
}

export async function listCatalogs(): Promise<CatalogListResponse> {
  return postN8nJson<CatalogListResponse>("/admin/catalogs/list", {});
}

export async function upsertCatalogItem(
  payload: CatalogUpsertPayload,
): Promise<CatalogUpsertResponse> {
  const body =
    payload.catalog === "scenes"
      ? {
          catalogType: payload.catalogType,
          catalog: payload.catalog,
          avatar: payload.avatar,
          scene: payload.scene,
          displayName: payload.displayName,
          ...(payload.description ? { description: payload.description } : {}),
          isEnabled: payload.isEnabled,
        }
      : payload;
  return postN8nJson<CatalogUpsertResponse>("/admin/catalogs/upsert", body);
}

export async function setCatalogStatus(
  payload: CatalogSetStatusPayload,
): Promise<CatalogSetStatusResponse> {
  return postN8nJson<CatalogSetStatusResponse>("/admin/catalogs/set-status", payload);
}
