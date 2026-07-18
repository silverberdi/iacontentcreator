# AI Gateway

Internal service for AI provider calls used by n8n workflows.

## Purpose

`ai-gateway` keeps provider secrets outside n8n workflow code and gives the project a single integration point for DeepSeek now, and future providers later.

Expected internal flow:

```text
console -> n8n -> ai-gateway -> DeepSeek / future providers
```

## Endpoints

```text
GET /health
POST /publication-brief
POST /publication-copy-pack
POST /comfy/publication-submit
POST /comfy/publication-status
POST /comfy/download-output
POST /comfy/prepare-reference
POST /publication-image-qa
```

`POST /publication-brief` expects publication job context and returns:

```json
{
  "ok": true,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "brief": {
    "visualIntent": "...",
    "captionAngle": "...",
    "emotionalTone": "...",
    "avoidRules": ["..."],
    "suggestedFormat": "feed-post"
  }
}
```

`POST /publication-copy-pack` expects publication job, selected asset, brief, and prompt-pack context and returns:

```json
{
  "ok": true,
  "provider": "deepseek",
  "model": "deepseek-chat",
  "copyPack": {
    "primaryCaption": "...",
    "captionAlternatives": ["..."],
    "hashtags": ["#..."],
    "storyText": ["..."],
    "ctaOptions": ["..."],
    "publishingNotes": "..."
  }
}
```

## Environment

```env
PORT=8095
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
COMFY_CLOUD_API_KEY=...
COMFY_CLOUD_BASE_URL=https://cloud.comfy.org
COMFY_CLOUD_API_PREFIX=/api
COMFY_CLOUD_AUTH_HEADER_NAME=X-API-Key
COMFY_CLOUD_SUBMIT_PATH=/prompt
COMFY_CLOUD_UPLOAD_PATH=/upload/image
COMFY_CLOUD_ENABLE_FACE_DETAILER=false
VISUAL_QA_API_KEY=...
VISUAL_QA_BASE_URL=https://api.openai-compatible-provider.example/v1
VISUAL_QA_MODEL=...
```

Do not publish this service to the LAN or internet. It should only be reachable on the internal Docker network.

## Comfy Cloud

`POST /comfy/publication-submit` patches the Estefania Comfy Cloud API workflow from a publication prompt pack and submits it using the configured Comfy Cloud credentials.

Set `dryRun: true` in the request body to return the patched workflow without calling Comfy Cloud.

`POST /comfy/publication-status` checks Comfy Cloud history for a submitted `promptId` or `providerResponse.prompt_id`. It returns `running`, `completed`, or `error` plus output metadata. Completed image outputs include a gateway-built `https://cloud.comfy.org/api/view` URL for downstream ingest.

Reference images use an explicit handoff contract:

```json
{
  "contractVersion": "comfy-reference-image-v1",
  "assetId": "...",
  "minioBucket": "iacontentcreator-assets",
  "minioObjectPath": "avatars/...",
  "publicUrl": "/minio/iacontentcreator-assets/avatars/...",
  "comfyInputName": null,
  "comfyLoadable": false
}
```

Only `comfyInputName` is valid for Comfy `LoadImage`. MinIO object paths and public URLs are kept as source metadata and identity guidance, but they are not written into `LoadImage`. If no `comfyInputName` is present, the gateway leaves the workflow template's default `LoadImage` input unchanged. Preparing MinIO assets as Comfy inputs belongs to the asset sync step.

`POST /comfy/download-output` downloads an output image from a validated `https://cloud.comfy.org/api/view` URL and returns base64 image data plus metadata for n8n ingest. It keeps the Comfy Cloud API key inside the gateway.

`POST /comfy/prepare-reference` receives a base64 image from n8n, uploads it to Comfy Cloud input storage through `COMFY_CLOUD_UPLOAD_PATH`, and returns the `comfyInputName` that can be used in the workflow `LoadImage` node.

`POST /publication-image-qa` scores a generated image for identity, face, hands, feet, composition, and publishability. If `VISUAL_QA_*` is not configured, it returns an explicit `heuristic-pre-visual` QA result so the console can still flag risk without pretending pixel-level review happened.

The older `SILVERMAN_COMFYUI_*` variable names are still accepted as compatibility aliases, but new deployments should use `COMFY_CLOUD_*`.

`COMFY_CLOUD_ENABLE_FACE_DETAILER` is disabled by default because some Comfy Cloud environments do not provide the `sam_hq_vit_l.pth` model required by the exported `FaceDetailer` branch.
