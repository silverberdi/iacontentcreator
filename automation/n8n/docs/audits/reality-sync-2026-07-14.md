# Avatares AI — Reality Sync 2026-07-14

## Objetivo

Sincronizar la realidad operativa entre:

- la consola web en `apps/asset-review-dashboard`;
- los workflows n8n activos en `http://192.168.0.194:5678`;
- los exports versionados en `automation/n8n/workflows`;
- los snapshots históricos que existían en `infra/snapshoots` antes de la depuración.

## Resumen ejecutivo

Estado actual: **MVP manual-asistido con servicios vivos; workflows n8n exportados al repo el 2026-07-14 vía SSH**.

La consola compila y varios endpoints del servidor n8n responden correctamente. La API administrativa de n8n está disponible, pero requiere `X-N8N-API-KEY`; la clave local de webhooks `X-Avatares-Api-Key` no sirve para listar/exportar workflows. La exportación se completó usando SSH al host `192.168.0.194` como `silverman` y ejecutando `n8n export:workflow --all` dentro del contenedor `local-ai-stack-n8n-1`.

## Evidencia de servidor

Base probada:

```text
http://192.168.0.194:5678
```

Resultado:

```text
GET / -> HTTP 200
GET /api/v1/workflows -> HTTP 401, X-N8N-API-KEY required
GET /api/v1/workflows with X-Avatares-Api-Key -> HTTP 401, unauthorized
```

Conclusión: n8n está vivo. La exportación por API administrativa sigue requiriendo una API key de n8n, pero la vía SSH/Docker funcionó.

## Inventario versionado

Export bruto descargado durante la sincronización inicial:

```text
automation/n8n/workflows/avatares-ai-workflows-20260714.raw.json
```

Nota: este archivo fue removido después de generar los workflows individuales y el manifiesto. Los archivos canónicos versionados viven en `automation/n8n/workflows/`.

Manifiesto generado:

```text
automation/n8n/workflows/Avatares_AI_workflows_manifest_20260714.json
```

Resumen de exportación:

```text
Workflows totales exportados desde n8n: 56
Workflows con prefijo "Avatares AI": 51
Workflows Avatares AI activos: 48
Workflows Avatares AI archivados: 1
Workflows Avatares AI con webhooks: 45
```

Snapshots históricos disponibles en ese momento:

```text
infra/snapshoots/20260526-175854/n8n/Avatares AI - API - Select Asset.json
infra/snapshoots/20260526-175854/n8n/Avatares AI - Asset Pipeline Orchestrator.json
infra/snapshoots/20260526-175854/n8n/Avatares AI - Get Canonical Asset - Callable.json
infra/snapshoots/20260526-175854/n8n/Avatares AI - Promote Canonical Asset - Callable.json
infra/snapshoots/20260526-175854/n8n/Avatares AI - Register Raw Asset Batch - Callable.json
infra/snapshoots/20260526-175854/n8n/Avatares AI - Select Asset - Callable.json
```

Nota: `infra/snapshoots` fue removido del repo durante la depuración posterior porque duplicaba exports ya normalizados y contenía evidencia operativa histórica, no fuente viva del proyecto.

La documentación esperaba más workflows en `automation/n8n/workflows`. Después de esta sincronización, los workflows activos del servidor ya fueron copiados al repo como archivos individuales.

## Endpoints de lectura/resolución probados

Estos probes usaron payloads mínimos y evitaron acciones destructivas o mutantes.

| Endpoint | HTTP | Estado observado |
|---|---:|---|
| `/assets/review-candidates` | 200 | Activo. Devuelve `count: 0` para `estefania-montealegre / coffee-rain / raw-image`. |
| `/assets/get-canonical` | 200 | Activo. Devuelve `found: false` para el mismo grupo. |
| `/admin/catalogs/options` | 200 | Activo. Devuelve avatares, escenas, assetTypes, workflows y models. |
| `/admin/catalogs/list` | 200 | Activo. Devuelve catálogos completos. |
| `/admin/ingest-profiles/active` | 200 | Activo. Hay perfil activo para Estefanía. |
| `/admin/ingest-profiles/list` | 200 | Activo. Devuelve `count: 11`. |
| `/admin/auto-ingest/preview` | 200 | Activo. Devuelve `count: 0`, `comfyOutputDir: /comfy-output`. |
| `/admin/auto-ingest/watcher-status` | 200 | Activo. Watcher `enabled: true`, `running: true`. |
| `/admin/backups/health` | 200 | Activo. Servicio `avatares-ai-backup-runner` responde OK. |
| `/admin/backups/list` | 200 | Activo. Devuelve `count: 8`. |
| `/scenes/resolve-brief` | 200 | Activo. Resuelve `Coffee Rain`. |
| `/identity/resolve-pack` | 200 | Activo. Resuelve identidad de Estefanía. |
| `/content/generate-post-brief` | 200 | Activo. Genera idea/caption direction. |
| `/content/generate-prompt-pack` | 200 | Activo. Genera prompt pack. |
| `/generation/generated/list` | 500 | Registrado, pero falla sin datos: `No item to return was found`. |
| `/publication/drafts/list` | 500 | Registrado, pero falla sin datos: `No item to return was found`. |

## Endpoints esperados por la consola pero no probados

No se probaron porque pueden modificar estado en el servidor, incluso con IDs falsos.

| Endpoint | Motivo |
|---|---|
| `/assets/promote-canonical` | Promueve canonical. |
| `/assets/select` | Cambia estado de asset. |
| `/assets/reject` | Cambia estado de asset. |
| `/assets/resolve` | Marcado como futuro en frontend. |
| `/admin/catalogs/init` | Inicializa/puede modificar catálogos. |
| `/admin/catalogs/upsert` | Modifica catálogos. |
| `/admin/catalogs/set-status` | Habilita/deshabilita catálogos. |
| `/admin/ingest-profiles/upsert` | Modifica perfiles. |
| `/admin/ingest-profiles/upsert-validated` | Modifica perfiles. |
| `/admin/ingest-profiles/set-active` | Cambia perfil activo. |
| `/admin/ingest-profiles/delete` | Elimina perfil. |
| `/admin/auto-ingest/run-pipeline` | Ejecuta pipeline. |
| `/admin/auto-ingest/watcher-start` | Cambia estado del watcher. |
| `/admin/auto-ingest/watcher-stop` | Cambia estado del watcher. |
| `/admin/auto-ingest/watcher-run-once` | Ejecuta watcher. |
| `/admin/backups/create` | Crea backup. |
| `/generation/jobs/queue` | Crea job. |
| `/generation/jobs/run-comfy` | Ejecuta/envía job a Comfy. |
| `/generation/generated/register` | Registra asset generado. |
| `/generation/generated/approve` | Aprueba imagen. |
| `/generation/generated/reject` | Rechaza imagen. |
| `/content/create-publication-draft` | Crea borrador. |
| `/publication/drafts/approve` | Aprueba borrador. |
| `/publish/manual-export` | Prepara export de publicación. |

## Catálogos observados

El servidor n8n/DB contiene al menos estos avatares activos:

| Avatar | Valor en catálogo | Tipo |
|---|---|---|
| Estefanía Montealegre | `estefania-montealegre` | `influencer` |
| Andrés Ferrer | `andres-ferrer` | `bfe` |
| Diana Duarte | `diana-duarte` | `soft-gfe` |
| Donovan J. Scott | `donovan-j-scott` | `technical-authority` |

Brecha detectada: el repo tiene `avatars/didi-duarte`, mientras el catálogo activo usa `diana-duarte`. Esto debe normalizarse antes de escalar automatización multi-avatar.

## Brechas principales

1. **Export n8n ya traído, pendiente de curaduría.** Hay 51 workflows `Avatares AI` exportados, pero falta validar cuáles son canónicos, duplicados o legacy.
2. **Exportación por API sigue bloqueada por falta de `X-N8N-API-KEY`.** La API administrativa existe, pero no acepta la API key de webhooks.
3. **List endpoints del ciclo de contenido fallan en vacío.** `/generation/generated/list` y `/publication/drafts/list` deberían devolver listas vacías con HTTP 200 cuando no hay registros.
4. **Documentación y repo no coinciden.** `automation/n8n/docs/README.md` lista workflows esperados que no existen en la carpeta real.
5. **Diana/Didi está desalineado.** El catálogo productivo y el árbol `avatars/` usan nombres distintos.
6. **La semi-autonomía todavía depende de pasos manuales.** Comfy, registro de asset, aprobación de imagen, draft y publicación siguen siendo un flujo guiado/humano.

## Cómo repetir la exportación de workflows

Opción A: con API administrativa n8n.

```bash
export N8N_API_KEY=...
curl -sS \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "http://192.168.0.194:5678/api/v1/workflows"
```

Opción B: desde el host donde corre Docker.

```bash
docker exec local-ai-stack-n8n-1 n8n export:workflow \
  --all \
  --output=/tmp/avatares-ai-workflows.json

docker cp \
  local-ai-stack-n8n-1:/tmp/avatares-ai-workflows.json \
  automation/n8n/workflows/avatares-ai-workflows-raw.json
```

Después de exportar, separar cada workflow `Avatares AI ...` en un archivo individual bajo:

```text
automation/n8n/workflows/
```

Convención recomendada:

```text
Avatares_AI_<Nombre_Normalizado>_v<version>.json
```

## Siguiente paso recomendado

1. Crear una matriz `endpoint -> workflow -> archivo -> estado` desde `Avatares_AI_workflows_manifest_20260714.json`.
2. Revisar duplicados/legacy: hay dos workflows llamados `Avatares AI - Register Raw Asset Batch - Callable`, uno archivado.
3. Corregir los workflows que devuelven 500 en listados vacíos.
4. Normalizar `didi-duarte` vs `diana-duarte`.
5. Repetir probes mutantes en un entorno controlado o con una bandera `dryRun`.
6. Decidir si se conserva el raw completo o solo los archivos individuales curados.
