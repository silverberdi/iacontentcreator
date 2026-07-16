# DB Ingest Profiles Hotfix v2

## Qué corrige

Los workflows v1 podían fallar en los nodos Code porque algunos estaban en modo `runOnceForEachItem` usando `$input.first()` o `$input.all()`.

Esta versión corrige:

```text
Get Active Ingest Profile
List Ingest Profiles
Upsert Ingest Profile
Set Active Ingest Profile
```

## Qué hacer

Importa estos workflows v2 y reemplaza los v1:

```text
Avatares_AI_Admin_Init_Ingest_Profiles_v2.json
Avatares_AI_Admin_Get_Active_Ingest_Profile_v2.json
Avatares_AI_Admin_List_Ingest_Profiles_v2.json
Avatares_AI_Admin_Upsert_Ingest_Profile_v2.json
Avatares_AI_Admin_Set_Active_Ingest_Profile_v2.json
```

Luego publica los 5.

## Pruebas

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/init \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'

curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/active \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'

curl -i -X POST http://192.168.0.194:5678/webhook/admin/ingest-profiles/list \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```
