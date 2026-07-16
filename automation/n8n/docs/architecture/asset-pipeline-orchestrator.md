# Avatares AI — Asset Pipeline Orchestrator

## Estado

Pipeline base validado para registro, deduplicación, promoción lógica de canonical y consulta de URL canonical.

## Workflows

### 1. Avatares AI - Asset Pipeline Orchestrator

Workflow principal. Orquesta el registro batch, la promoción automática del último asset registrado y la consulta del asset canonical.

Flujo:

```text
Set Orchestrator Params
→ Execute Register Raw Asset Batch
→ Select Asset To Promote
→ Has asset to promote?
   ├─ true  → Execute Promote Canonical Asset
   │          → Prepare Get Canonical Params
   │          → Execute Get Canonical Asset
   │          → Return Orchestrator Result
   └─ false → Return Registered Only
```

### 2. Avatares AI - Register Raw Asset Batch - Callable

Registra assets desde una carpeta local de entrada.

Responsabilidades:

- Leer múltiples archivos PNG desde `inputDir`.
- Calcular `sha256` por archivo.
- Detectar duplicados contra PostgreSQL.
- Detectar duplicados internos dentro del mismo batch.
- Subir assets nuevos a MinIO.
- Insertar assets nuevos en PostgreSQL.
- Mover archivos procesados a `processedDir`.
- Mover duplicados a `duplicatesDir`.

### 3. Avatares AI - Promote Canonical Asset - Callable

Recibe un `assetId` y promueve ese asset como canonical lógico.

Responsabilidades:

- Buscar el asset seleccionado.
- Desmarcar el canonical anterior del mismo `canonicalGroup`.
- Marcar el asset seleccionado como canonical.
- Devolver la URL del canonical promovido.

### 4. Avatares AI - Get Canonical Asset - Callable

Consulta el canonical actual.

Entrada esperada:

```json
{
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "baseUrl": "http://192.168.0.194:9000"
}
```

Salida esperada:

```json
{
  "found": true,
  "assetId": "...",
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
  "bucket": "iacontentcreator-assets",
  "objectPath": "avatars/...",
  "mimeType": "image/png",
  "status": "canonical",
  "sha256": "...",
  "canonicalGroup": "estefania-montealegre:coffee-rain:raw-image"
}
```

## Parámetros del orquestador

Nodo: `Set Orchestrator Params`

| Campo | Uso |
|---|---|
| `inputDir` | Carpeta local desde donde se leen los PNG. |
| `processedDir` | Carpeta local donde se mueven archivos procesados correctamente. |
| `duplicatesDir` | Carpeta local donde se mueven duplicados. |
| `failedDir` | Carpeta reservada para fallos. |
| `baseUrl` | URL base de MinIO. |
| `avatar` | Identificador del personaje. |
| `avatarShort` | Alias corto usado en nombres/tags. |
| `scene` | Escena del asset. |
| `assetType` | Tipo de asset, por ejemplo `raw-image`. |
| `workflow` | Workflow/modelo de generación usado como metadata. |
| `model` | Modelo usado como metadata. |
| `seed` | Seed usada como metadata. |
| `version` | Versión lógica del asset. |
| `autoPromoteLatest` | Si está en `true`, promueve automáticamente el último asset registrado. |

## Carpetas locales

```text
/home/node/.n8n-files/
├── inbox
├── processed
├── duplicates
├── failed
└── snapshots
```

## Estructura MinIO

Bucket:

```text
iacontentcreator-assets
```

Ruta usada por el pipeline:

```text
avatars/{avatar}/{assetType}/{fileName}
```

Ejemplo:

```text
avatars/estefania-montealegre/raw-image/estefania-raw-image-coffee-rain-20260531T054556-3Z.png
```

## PostgreSQL

Tabla principal:

```text
canonical_asset_registry
```

Campos funcionales principales:

| Campo | Uso |
|---|---|
| `asset_id` | ID único del asset. |
| `sha256` | Hash del archivo para deduplicación. |
| `avatar` | Personaje asociado. |
| `scene` | Escena asociada. |
| `asset_type` | Tipo de asset. |
| `bucket` | Bucket MinIO. |
| `object_path` | Ruta del objeto en MinIO. |
| `status` | Estado lógico: `raw`, `selected`, `canonical`, etc. |
| `is_canonical` | Marca booleana del canonical vigente. |
| `canonical_group` | Grupo lógico: `{avatar}:{scene}:{assetType}`. |
| `metadata` | Metadata completa del asset. |

## Output final del orquestador v2

```json
{
  "status": "completed",
  "registeredCount": 2,
  "duplicatesCount": 1,
  "processedCount": 2,
  "promotedAssetId": "...",
  "canonicalUrl": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
  "canonical": {
    "assetId": "...",
    "avatar": "estefania-montealegre",
    "scene": "coffee-rain",
    "assetType": "raw-image",
    "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
    "bucket": "iacontentcreator-assets",
    "objectPath": "avatars/...",
    "mimeType": "image/png",
    "status": "canonical",
    "sha256": "...",
    "canonicalGroup": "estefania-montealegre:coffee-rain:raw-image",
    "createdAt": "..."
  },
  "registered": [],
  "duplicates": []
}
```

## Regla actual para canonical

El canonical es **lógico en PostgreSQL**.

No se copia todavía el archivo físico a:

```text
avatars/{avatar}/canon/
```

Decisión actual:

```text
Canonical = is_canonical = true en PostgreSQL
Archivo físico = permanece en avatars/{avatar}/raw-image/
```

Esta decisión se mantiene para el MVP porque `Get Canonical Asset` ya resuelve la URL vigente desde PostgreSQL.

## Reglas de cierre del pipeline

Después de ejecutar correctamente el orquestador:

```text
inbox      → debe quedar vacío
processed  → debe contener archivos nuevos registrados
duplicates → debe contener duplicados exactos
PostgreSQL → debe tener solo assets nuevos
MinIO      → debe tener solo assets nuevos
```

## Próxima fase sugerida

Después del cierre del pipeline base:

1. Añadir soporte para más `assetType` (`selects`, `generated`, `exports`).
2. Añadir revisión manual o automática de selects.
3. Crear workflow para promover manualmente desde una UI o lista de candidatos.
4. Decidir si `canon/` será copia física cuando haya necesidad de URL estable o CDN.
