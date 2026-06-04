# Avatares AI — Set Active Ingest Profile Clean v2

## Qué corrige

Este workflow reemplaza completamente:

```text
POST /admin/ingest-profiles/set-active
```

Corrige:

```text
duplicate key value violates unique constraint "uq_ingest_profiles_single_active"
```

y evita:

```text
A 'json' property isn't an object
```

porque no usa `Code` nodes.

## Diseño

Workflow mínimo:

```text
Webhook
→ Postgres
```

El SQL hace tres pasos separados:

```text
1. Desactiva el perfil activo actual.
2. Activa el perfil solicitado.
3. Devuelve siempre una fila JSON.
```

Esto evita que PostgreSQL vea dos perfiles activos al mismo tiempo.

## Instalación

1. Importa:

```text
Avatares_AI_Admin_Set_Active_Ingest_Profile_Clean_v2.json
```

2. Despublica/elimina el workflow viejo con este path:

```text
/admin/ingest-profiles/set-active
```

3. Publica este workflow.

Debe quedar **solo un workflow publicado** con ese path.

## Prueba Coffee Rain

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/set-active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "profileId": "3f4fd408-35a9-416a-a9c7-e283a07ce86f",
    "profile_id": "3f4fd408-35a9-416a-a9c7-e283a07ce86f"
  }'
```

## Prueba Airport

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/set-active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "profileId": "6db291de-7396-4502-b6b2-e9425f70a690",
    "profile_id": "6db291de-7396-4502-b6b2-e9425f70a690"
  }'
```

## Validación

```bash
curl -s -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}' | jq
```
