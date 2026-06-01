# Avatares AI — Backup Admin Workflows v3

## Corrección v3

Los workflows v3 corrigen el error genérico:

```text
{"message":"Error in workflow"}
```

Causa probable: `fetch()` no está disponible o no está habilitado en el runtime del Code node de n8n.

## Cambios

- No usan `Respond to Webhook`.
- El Webhook responde con `lastNode`.
- No usan `fetch()`.
- Usan `this.helpers.httpRequest(...)`, que es el helper nativo de n8n.
- Los errores se devuelven como JSON en vez de romper el workflow.

## Workflows

Importar:

```text
Avatares_AI_Admin_Backup_Health_v3.json
Avatares_AI_Admin_Create_Backup_v3.json
Avatares_AI_Admin_List_Backups_v3.json
```

## Importante

Antes de publicar v3, elimina o desactiva las versiones anteriores de backup:

```text
Avatares AI - Admin - Backup Health
Avatares AI - Admin - Create Backup
Avatares AI - Admin - List Backups
```

Si n8n no permite duplicar paths, importa v3 con los anteriores desactivados o eliminados.

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

## Resultado esperado health

```json
{
  "ok": true,
  "status": "ok",
  "service": "avatares-ai-backup-runner",
  "backupRoot": "/backups/avatares-ai",
  "postgresHost": "postgres",
  "minioEndpoint": "http://minio:9000",
  "minioBucket": "iacontentcreator-assets"
}
```
