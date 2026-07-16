# Avatares AI — Auto Ingest Pipeline v1

## Purpose

This workflow joins two already validated pieces:

```text
Auto Ingest Run
→ Asset Pipeline Orchestrator
```

New endpoint:

```text
POST /webhook/admin/auto-ingest/run-pipeline
```

## Flow

```text
Webhook
→ Call auto-ingest-runner /ingest/run
→ If movedCount > 0
→ Execute Workflow: Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation
→ Return result
```

If no files are found, the orchestrator is not executed.

## Important n8n step after import

Open node:

```text
Execute Asset Pipeline Orchestrator
```

Select this target workflow:

```text
Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation
```

Save and Publish.

Reason: n8n stores Execute Workflow targets using internal workflow IDs. The imported JSON includes a placeholder ID because the real ID is environment-specific.

## Test

Put one or more images in:

```text
/home/silverman/compartido_mac/comfy-output
```

Run:

```bash
source ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/admin/auto-ingest/run-pipeline \
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

Expected:

```json
{
  "ok": true,
  "status": "pipeline-executed",
  "pipelineExecuted": true
}
```

Then refresh dashboard candidates.
