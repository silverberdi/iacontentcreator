# Avatares AI — Phase 12 Auto Ingest v1

## Scope

v1 moves Comfy Cloud downloaded images from:

```text
/home/silverman/compartido_mac/comfy-output
```

to:

```text
/home/silverman/compartido_mac/inbox
```

and writes:

```text
/home/silverman/compartido_mac/inbox/batch.json
```

Then the existing workflow must be executed:

```text
Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation
```

The next iteration will wire that automatically.

## Install

Copy `infra/auto-ingest-runner` into `~/local-ai-stack/infra/auto-ingest-runner`.

Add the service snippet to `compose.yaml`.

Start:

```bash
cd ~/local-ai-stack
docker compose up -d --build auto-ingest-runner
```

## Import n8n workflows

```text
Avatares_AI_Admin_Auto_Ingest_Health_v1.json
Avatares_AI_Admin_Auto_Ingest_Preview_v1.json
Avatares_AI_Admin_Auto_Ingest_Run_v1.json
```

Publish them.

## Test

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/health \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/preview \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{}'
```

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/run \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $AVATARES_API_KEY" \
  -d '{
    "avatar": "estefania-montealegre",
    "avatarShort": "estefania",
    "scene": "coffee-rain",
    "assetType": "raw-image",
    "workflow": "flux-krea-dev",
    "model": "flux-krea-dev",
    "seed": 847362,
    "version": 1,
    "autoPromoteLatest": false
  }'
```
