# Avatares AI — Asset Review Dashboard

Operational frontend for reviewing generated avatar image assets stored through the n8n + PostgreSQL + MinIO pipeline.

This app calls n8n webhook endpoints directly. There is no backend in this package.

## Purpose

Use this dashboard to:

- Filter assets by avatar, scene, and asset type
- List review candidates from the canonical asset registry
- Preview images served from MinIO
- Inspect metadata (status, SHA256, assetId, review notes, createdAt)
- Promote a candidate as the canonical asset for its group
- Reject unwanted candidates
- Refresh data after each operation

## Setup

```bash
cd apps/asset-review-dashboard
npm install
cp .env.example .env
```

Edit `.env` if your n8n or MinIO hosts differ from the defaults.

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_N8N_WEBHOOK_BASE_URL` | Base URL for n8n webhooks (e.g. `http://192.168.0.194:5678/webhook`) |
| `VITE_MINIO_BASE_URL` | MinIO public base URL used in API payloads (e.g. `http://192.168.0.194:9000`) |

Vite exposes only variables prefixed with `VITE_`.

## How to run

Development:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

The dev server runs on port `5173` by default.

## Available endpoints

All requests are `POST` with `Content-Type: application/json`. Paths are appended to `VITE_N8N_WEBHOOK_BASE_URL`.

| Endpoint | Purpose |
| --- | --- |
| `/assets/review-candidates` | List candidates for avatar + scene + assetType |
| `/assets/get-canonical` | Get current canonical asset for the group |
| `/assets/promote-canonical` | Promote an assetId to canonical |
| `/assets/reject` | Reject a non-canonical asset |

See `infra/snapshoots/20260526-175854/n8n/docs/asset-review-api.md` in the repo for full API documentation.

## Known assumptions

- n8n workflows are published and reachable from the machine running the browser.
- MinIO object URLs returned by the API are directly loadable in the browser (no auth on read).
- Avatar, scene, and asset type catalogs are static in the frontend for now.
- Canonical promotion is logical in PostgreSQL; files are not copied to a separate `canon/` path.
- Rejecting a canonical asset is blocked by the API; promote another asset first, then reject the former canonical.
- No authentication is implemented yet; endpoints are assumed to be on a trusted network.
- CORS must allow the dashboard origin if n8n is on a different host/port than the Vite dev server.

## Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS
