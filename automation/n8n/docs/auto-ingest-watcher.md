# Avatares AI — Auto Ingest Watcher

## Fase

12.6 — Watcher controlado para Comfy Cloud downloads.

## Objetivo

Procesar automáticamente imágenes nuevas en:

```text
/home/silverman/compartido_mac/comfy-output
```

sin tener que presionar manualmente `Run Full Auto Ingest Pipeline`.

## Config

Archivo:

```text
/home/silverman/compartido_mac/config/auto-ingest-watcher.json
```

Ejemplo:

```json
{
  "enabled": false,
  "pollIntervalSeconds": 30,
  "cooldownSeconds": 10,
  "endpoint": "/admin/auto-ingest/run-pipeline",
  "profile": {
    "avatar": "estefania-montealegre",
    "avatarShort": "estefania",
    "scene": "coffee-rain",
    "assetType": "raw-image",
    "workflow": "flux-krea-dev",
    "model": "flux-krea-dev",
    "seed": 847362,
    "version": 1,
    "autoPromoteLatest": false
  }
}
```

## Estado

Archivo:

```text
/home/silverman/compartido_mac/config/auto-ingest-watcher-state.json
```

Guarda último run y últimos 50 runs.

## Endpoints internos del runner

```text
GET  /watcher/status
POST /watcher/start
POST /watcher/stop
POST /watcher/run-once
POST /watcher/config
```

## Endpoints n8n

Importar y publicar:

```text
Avatares_AI_Admin_Auto_Ingest_Watcher_Status_v1.json
Avatares_AI_Admin_Auto_Ingest_Watcher_Start_v1.json
Avatares_AI_Admin_Auto_Ingest_Watcher_Stop_v1.json
Avatares_AI_Admin_Auto_Ingest_Watcher_Run_Once_v1.json
Avatares_AI_Admin_Auto_Ingest_Watcher_Config_v1.json
```

Endpoints protegidos por gateway:

```text
POST /webhook/admin/auto-ingest/watcher-status
POST /webhook/admin/auto-ingest/watcher-start
POST /webhook/admin/auto-ingest/watcher-stop
POST /webhook/admin/auto-ingest/watcher-run-once
POST /webhook/admin/auto-ingest/watcher-config
```

## Instalación

Reemplazar:

```text
~/local-ai-stack/infra/auto-ingest-runner
```

Reconstruir:

```bash
cd ~/local-ai-stack
docker compose up -d --build auto-ingest-runner
```

## Pruebas

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/watcher-status \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

Run once:

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/watcher-run-once \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

Start watcher:

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/watcher-start \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

Stop watcher:

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/watcher-stop \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

## Reglas

```text
No procesa si no hay imágenes.
No ejecuta doble run si ya hay uno en curso.
Espera estabilidad del archivo.
Usa el endpoint run-pipeline ya validado.
Guarda historial.
```
