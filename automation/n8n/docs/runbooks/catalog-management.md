# Avatares AI — Fase 12.8 Catalog Management

## Objetivo

Cerrar la infraestructura de catálogos para que el dashboard pueda:

```text
- Crear personajes / avatares
- Crear escenas
- Crear tipos de asset
- Crear workflows de generación
- Crear modelos de generación
- Activar / desactivar opciones con borrado lógico
- Alimentar los selects del Active Ingest Profile desde DB
```

## Tablas

```text
avatar_catalog
scene_catalog
asset_type_catalog
generation_workflow_catalog
generation_model_catalog
ingest_profiles
```

## Regla clave

No hay borrado físico desde dashboard.

Solo:

```text
is_enabled = true / false
disabled_at
disabled_reason
```

## Workflows nuevos

Importar y publicar:

```text
Avatares_AI_Admin_Catalog_Init_v1.json
Avatares_AI_Admin_Catalog_Options_v1.json
Avatares_AI_Admin_Catalog_List_All_v1.json
Avatares_AI_Admin_Catalog_Upsert_Item_v1.json
Avatares_AI_Admin_Catalog_Set_Status_v1.json
Avatares_AI_Admin_Upsert_Ingest_Profile_Catalog_Validated_v1.json
```

## Endpoints

```text
POST /webhook/admin/catalogs/init
POST /webhook/admin/catalogs/options
POST /webhook/admin/catalogs/list
POST /webhook/admin/catalogs/upsert
POST /webhook/admin/catalogs/set-status
POST /webhook/admin/ingest-profiles/upsert-validated
```

## Inicializar catálogos

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/init \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

## Obtener opciones activas

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/options \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

## Listar todos, incluyendo desactivados

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/list \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

## Crear escena

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/upsert \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "catalog": "scenes",
    "avatar": "estefania-montealegre",
    "scene": "airport",
    "displayName": "Airport",
    "description": "Airport / travel transition scene."
  }'
```

## Crear avatar/personaje

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/upsert \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "catalog": "avatars",
    "avatar": "diana-duarte",
    "avatarShort": "diana",
    "displayName": "Diana Duarte",
    "avatarKind": "soft-gfe",
    "description": "Soft GFE avatar."
  }'
```

## Desactivar escena

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/set-status \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "catalog": "scenes",
    "avatar": "estefania-montealegre",
    "scene": "old-test-scene",
    "isEnabled": false,
    "disabledReason": "Deprecated after visual canon update"
  }'
```

## Reactivar escena

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/set-status \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "catalog": "scenes",
    "avatar": "estefania-montealegre",
    "scene": "old-test-scene",
    "isEnabled": true
  }'
```

## Crear perfil de ingesta validado contra catálogos

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/upsert-validated \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "profileName": "Estefanía / Airport / Raw Image",
    "avatar": "estefania-montealegre",
    "avatarShort": "estefania",
    "scene": "airport",
    "assetType": "raw-image",
    "workflow": "flux-krea-dev",
    "model": "flux-krea-dev",
    "seed": 847362,
    "version": 1,
    "autoPromoteLatest": false,
    "isEnabled": true,
    "setActive": true
  }'
```

## Notas

- `catalogs/options` devuelve solo opciones habilitadas.
- `catalogs/list` devuelve todo, incluyendo desactivados.
- El dashboard debe usar `catalogs/options` para selects operativos.
- El dashboard debe usar `catalogs/list` para administración.
