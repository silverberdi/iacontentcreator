# Avatares AI — Admin Console Dead-Code Audit 2026-07-14

## Objetivo

Detectar funcionalidades de la consola web que compilan, pero que hoy no cumplen una función clara, están adelantadas al estado operativo real, o quedan como puntos de código muerto.

Base revisada:

- Consola: `apps/asset-review-dashboard/src`
- Workflows exportados: `automation/n8n/workflows/Avatares_AI_workflows_manifest_20260714.json`
- Reality sync: `automation/n8n/docs/audits/reality-sync-2026-07-14.md`

## Resumen

La consola no está rota a nivel compilación. El problema es de alineación: mezcla funciones realmente operativas con funciones futuras, endpoints no conectados, fallback catalogs desactualizados y controles administrativos peligrosos para una operación semi-autónoma.

## Código muerto o sin uso actual

| Punto | Archivo | Estado | Acción recomendada |
|---|---|---|---|
| `useEndpointAction` | `apps/asset-review-dashboard/src/hooks/useEndpointAction.ts` | Hook no referenciado por ningún componente. | Eliminar o usarlo para un panel técnico real. |
| `resolveAsset()` | `apps/asset-review-dashboard/src/api/assetReviewApi.ts` | Cliente API existe, workflow existe, pero ninguna UI lo llama. Comentado como `Future`. | Ocultar hasta definir uso: resolver duplicados, marcar final, o cerrar review. |
| `generatePostBrief()` | `apps/asset-review-dashboard/src/api/contentCycleApi.ts` | Cliente API existe y workflow responde, pero el ciclo usa `generatePromptPack()` y no llama post brief. | Integrarlo al paso de preparación o eliminar del frontend. |
| `upsertIngestProfile()` | `apps/asset-review-dashboard/src/api/ingestProfilesApi.ts` | Función legacy no usada; la UI usa `upsertIngestProfileValidated()`. | Eliminar o marcar explícitamente como legacy. |

## UI que existe, pero hoy es operacionalmente dudosa

| Función UI | Evidencia | Problema | Acción recomendada |
|---|---|---|---|
| `Catalog Init` | `CatalogsPanel` llama `/admin/catalogs/init`. | En una consola diaria, reinicializar catálogos puede duplicar, pisar defaults o confundir estado productivo. | Mover a zona técnica protegida o eliminar de UI normal. |
| `Start/Stop Watcher` | `AutoIngestPanel` expone controles directos. | Es útil para admin, pero peligroso para un usuario de contenido; cambia estado global del runner. | Mantener solo en modo admin/técnico. |
| `Run Once` watcher | Ejecuta `/admin/auto-ingest/watcher-run-once`. | Es mutante y puede procesar archivos pendientes sin confirmación contextual fuerte. | Requiere confirmación y mostrar active profile antes de ejecutar. |
| `Run Full Auto Ingest Pipeline` | Ejecuta `/admin/auto-ingest/run-pipeline`. | Operativo, pero depende del perfil activo global. Puede ingerir contenido equivocado si el perfil activo no coincide. | Mantener, pero bloquear si no se confirma perfil activo. |
| `Create Backup` | `BackupsPanel` crea backup manual. | Funciona como admin tooling, no como flujo de contenido. | Mantener en pestaña Admin/Ops, no en consola editorial principal. |

## Funciones de consola que están adelantadas al backend real

| Área | Estado actual | Problema |
|---|---|---|
| Content Cycle — listados | `/generation/generated/list` y `/publication/drafts/list` existen, pero devolvieron HTTP 500 cuando no hay datos: `No item to return was found`. | La UI espera listas vacías; los workflows deben responder `200` con `[]`. |
| Content Cycle — generación | La UI ofrece flujo preparar -> Comfy -> registrar -> revisar -> draft -> export. | Todavía hay paso manual de pegar `assetId`; no es semi-autónomo real. |
| Content Cycle — post brief | Existe endpoint `/content/generate-post-brief`, pero la UI no lo usa. | Punto de diseño incompleto: idea/caption direction no participa en el ciclo visible. |
| Publication | La etapa final es `manual-export`. | No hay publicación automática; la UI debe nombrarlo como flujo manual-asistido, no autónomo. |

## Catálogos fallback desalineados

Archivo:

```text
apps/asset-review-dashboard/src/data/catalogs.ts
```

Problema: los catálogos hardcodeados funcionan como fallback si falla `/admin/catalogs/options`, pero no representan fielmente el catálogo real.

Ejemplos:

| Tipo | Fallback | Catálogo real observado |
|---|---|---|
| `assetTypes` | `generated`, `select`, `canonical` | `raw-image`, `reference-image`, `selected-image`, `canonical-image`, `post-image`, `story-image` |
| scenes | `portrait`, `fullbody` | El server usa variantes como `portrait-canon`, `fullbody-validation`, `coffee-rain`, etc. |
| avatar naming | frontend fallback usa `diana-duarte` | repo de contexto usa `avatars/didi-duarte` |

Acción recomendada: generar fallback desde seed SQL/catalog export o eliminar fallback operativo y mostrar error bloqueante si catálogos no cargan.

## Workflows activos sin superficie clara en consola

Estos workflows existen y están activos, pero la consola no los usa o no los expone claramente:

| Workflow / endpoint | Estado |
|---|---|
| `/admin/auto-ingest/health` | Workflow activo, no usado por `autoIngestApi.ts`. |
| `/admin/auto-ingest/watcher-config` | Workflow activo, no usado por la UI. |
| `/admin/ingest-profiles/init` | Workflow activo, no usado por la UI. |
| `/admin/backups/prune` | Workflow exportado pero inactive; no usado por UI. |
| `Avatares AI - Admin - Daily Backup` | Workflow inactive, sin webhook. Probablemente cron/manual infra, no consola. |

## Workflows duplicados / legacy

Hay dos workflows con nombre:

```text
Avatares AI - Register Raw Asset Batch - Callable
```

Uno está activo:

```text
Avatares_AI_Register_Raw_Asset_Batch_Callable.json
```

Uno está archivado:

```text
Avatares_AI_Register_Raw_Asset_Batch_Callable_KVev4qMZKHUnXn8j.json
```

Acción recomendada: conservar el archivado solo si se necesita historia; si no, mover a `automation/n8n/workflows/archive/` o documentar como legacy.

## Clasificación recomendada

### Mantener como funcional hoy

- Asset Review: listar, canonical, select, reject, promote.
- Catalog list/upsert/set-status.
- Ingest profiles validated.
- Auto-ingest preview/status/manual run, con mejores confirmaciones.
- Backups health/list/create, como herramienta de operación.

### Arreglar antes de considerar funcional

- `/generation/generated/list`
- `/publication/drafts/list`
- Content Cycle como flujo completo.
- Fallback catalogs.
- Didi/Diana naming.

### Ocultar detrás de modo técnico/admin

- Catalog Init.
- Watcher Start/Stop.
- Watcher Run Once.
- Full Auto Ingest Pipeline.
- Create Backup.

### Eliminar o integrar

- `useEndpointAction`
- `resolveAsset()`
- `generatePostBrief()`
- `upsertIngestProfile()`

## Siguiente paso propuesto

1. Crear un modo `Admin/Ops` o `Technical Mode` real para acciones globales.
2. Quitar de la navegación principal lo que no es flujo editorial.
3. Corregir workflows que fallan con listas vacías.
4. Actualizar fallback catalogs contra el catálogo real.
5. Decidir qué hacer con los clientes API no usados: eliminar o conectar a UI.
