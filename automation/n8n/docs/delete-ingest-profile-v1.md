# Avatares AI — Delete Ingest Profile v1

## Endpoint

```text
POST /admin/ingest-profiles/delete
```

## Qué hace

Elimina físicamente un `ingest_profile` solo si no tiene assets asociados.

La asociación usada es:

```text
ingest_profiles.avatar     = canonical_asset_registry.avatar
ingest_profiles.scene      = canonical_asset_registry.scene
ingest_profiles.asset_type = canonical_asset_registry.asset_type
```

## Respuestas esperadas

Perfil eliminado:

```json
{
  "ok": true,
  "error": null,
  "asset_count": 0,
  "profile": {...},
  "deleted_profile": {...}
}
```

Perfil bloqueado por assets:

```json
{
  "ok": false,
  "error": "This profile cannot be deleted because assets already exist for it.",
  "asset_count": 3,
  "profile": {...},
  "deleted_profile": null
}
```

## Instalación

1. Importar:
   `Avatares_AI_Admin_Delete_Ingest_Profile_v1.json`

2. Publicar el workflow.

3. Debe quedar disponible:
   `/webhook/admin/ingest-profiles/delete`

## Prueba

```bash
source ~/local-ai-stack/.env

curl -s -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/delete \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "profileId": "PROFILE_ID_HERE",
    "profile_id": "PROFILE_ID_HERE"
  }' | jq
```

## Nota

Este workflow no elimina imágenes ni registros de `canonical_asset_registry`.
Solo elimina perfiles de ingestión sin assets asociados.
