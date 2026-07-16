# Catalog Init Hotfix v2

Importa este workflow y reemplaza/desactiva el anterior:

```text
Avatares_AI_Admin_Catalog_Init_v2_Hotfix.json
```

Publica solo uno con este path:

```text
/admin/catalogs/init
```

Prueba:

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/catalogs/init \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```
