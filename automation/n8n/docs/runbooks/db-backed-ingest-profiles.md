# Avatares AI — DB-backed Ingest Profiles

## Fase

12.7 — El payload de ingest deja de estar hardcodeado y pasa a PostgreSQL.

## Decisión

La metadata que define qué significan las imágenes descargadas de Comfy Cloud se guarda en DB:

```text
ingest_profiles
```

El watcher usa el perfil activo para procesar:

```text
avatar
avatarShort
scene
assetType
workflow
model
seed
version
autoPromoteLatest
```

## Instalación

### 1. Reemplazar auto-ingest-runner

```bash
cd ~/local-ai-stack
docker compose up -d --build auto-ingest-runner
```

El servicio debe incluir:

```env
USE_DB_ACTIVE_PROFILE=true
N8N_WEBHOOK_BASE_URL=http://n8n:5678/webhook
AVATARES_API_KEY=${AVATARES_API_KEY}
```

### 2. Importar workflows n8n

Importar y publicar:

```text
Avatares_AI_Admin_Init_Ingest_Profiles_v1.json
Avatares_AI_Admin_Get_Active_Ingest_Profile_v1.json
Avatares_AI_Admin_List_Ingest_Profiles_v1.json
Avatares_AI_Admin_Upsert_Ingest_Profile_v1.json
Avatares_AI_Admin_Set_Active_Ingest_Profile_v1.json
```

### 3. Inicializar tabla

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/init \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

### 4. Consultar perfil activo

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

## Endpoints

```text
POST /webhook/admin/ingest-profiles/init
POST /webhook/admin/ingest-profiles/active
POST /webhook/admin/ingest-profiles/list
POST /webhook/admin/ingest-profiles/upsert
POST /webhook/admin/ingest-profiles/set-active
POST /webhook/admin/ingest-profiles/delete
```

See [ingest-profiles-delete.md](./ingest-profiles-delete.md) for delete rules and SQL.

## Crear o actualizar perfil y activarlo

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/upsert \
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
    "setActive": true
  }'
```

## Activar perfil existente

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/set-active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "avatar": "estefania-montealegre",
    "scene": "coffee-rain",
    "assetType": "raw-image"
  }'
```

## Nota importante

El perfil puede existir en `ingest_profiles`, pero el pipeline seguirá validando contra:

```text
avatar_catalog
scene_catalog
asset_type_catalog
generation_catalog
```

Si agregas un perfil para `airport`, también debe existir esa escena activa en `scene_catalog`.
