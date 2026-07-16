# Catalog Init Hotfix v3

Corrige:

```text
column "is_enabled" does not exist
```

Causa:

La tabla `ingest_profiles` ya existía, pero no tenía la columna `is_enabled`.

## Qué hacer

Importa este workflow:

```text
Avatares_AI_Admin_Catalog_Init_v3_Hotfix.json
```

Desactiva o elimina los anteriores con el mismo path:

```text
/admin/catalogs/init
```

Debe quedar publicado solo el v3.

## Prueba

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/init \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```
