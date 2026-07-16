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
POST /comfy/download-output
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
COMFY_CLOUD_ENABLE_FACE_DETAILER=false
```

Do not publish this service to the LAN or internet. It should only be reachable on the internal Docker network.

## Comfy Cloud

`POST /comfy/publication-submit` patches the Estefania Comfy Cloud API workflow from a publication prompt pack and submits it using the configured Comfy Cloud credentials.

Set `dryRun: true` in the request body to return the patched workflow without calling Comfy Cloud.

`POST /comfy/download-output` downloads an output image from a validated `https://cloud.comfy.org/api/view` URL and returns base64 image data plus metadata for n8n ingest. It keeps the Comfy Cloud API key inside the gateway.

The older `SILVERMAN_COMFYUI_*` variable names are still accepted as compatibility aliases, but new deployments should use `COMFY_CLOUD_*`.

`COMFY_CLOUD_ENABLE_FACE_DETAILER` is disabled by default because some Comfy Cloud environments do not provide the `sam_hq_vit_l.pth` model required by the exported `FaceDetailer` branch.
