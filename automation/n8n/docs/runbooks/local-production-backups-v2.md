# Avatares AI — Local Production Backups v2

## Corrección

Los workflows v2 ya no usan `Respond to Webhook`.

Patrón usado:

```text
Webhook responseMode = lastNode
Webhook → Code
```

Esto evita:

```text
Unused Respond to Webhook node found in the workflow
```

y evita respuestas HTTP 200 sin body.

## Importar

Importa y publica:

```text
Avatares_AI_Admin_Backup_Health_v2.json
Avatares_AI_Admin_Create_Backup_v2.json
Avatares_AI_Admin_List_Backups_v2.json
```

Antes de publicar, elimina o desactiva los workflows v1 anteriores para evitar paths duplicados.

## Endpoints

```text
POST /webhook/admin/backups/health
POST /webhook/admin/backups/create
POST /webhook/admin/backups/list
```

## Pruebas

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/health \
  -H "Content-Type: application/json" \
  -d '{}'
```

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/create \
  -H "Content-Type: application/json" \
  -d '{"requestedBy":"n8n-api-test"}'
```
