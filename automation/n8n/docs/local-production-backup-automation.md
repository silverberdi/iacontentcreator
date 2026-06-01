# Avatares AI — Backup Automation

## Fase 10.5

Backup automático diario + retención.

## Cambios

- `backup-runner` agrega `POST /backups/prune`.
- `listBackups` ignora carpetas sin `manifest.json` y `status.json`.
- Workflow `Avatares AI - Admin - Daily Backup` crea backup diario y conserva los últimos 14.
- Workflow `Avatares AI - Admin - Prune Backups` permite probar retención por API.

## Instalación

Reemplazar `infra/backup-runner` y reconstruir:

```bash
cd ~/local-ai-stack
docker compose up -d --build backup-runner
```

Importar:

```text
Avatares_AI_Admin_Prune_Backups_v1.json
Avatares_AI_Admin_Daily_Backup_v1.json
```

## Pruebas

Prune directo:

```bash
docker exec local-ai-stack-backup-runner-1 wget -qO- \
  --header='Content-Type: application/json' \
  --post-data='{"keepLast":14,"dryRun":true}' \
  http://localhost:8080/backups/prune
```

Prune por n8n:

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/backups/prune \
  -H "Content-Type: application/json" \
  -d '{"keepLast":14,"dryRun":true}'
```

Daily Backup trae `Manual Trigger` para probar sin esperar a las 2 AM.
