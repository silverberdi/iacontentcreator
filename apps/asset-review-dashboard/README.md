# Avatares AI — Asset Review Dashboard

Operational frontend for reviewing generated avatar image assets stored through the n8n + PostgreSQL + MinIO pipeline.

This app calls n8n webhook endpoints directly. There is no backend in this package.

## Purpose

Use this dashboard to:

- Filter assets by avatar, scene, and asset type
- List review candidates from the canonical asset registry
- Preview images served from MinIO
- Inspect metadata (status, SHA256, assetId, review notes, createdAt)
- Mark candidates as selected (shortlist / backup)
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

For local development, use `VITE_N8N_WEBHOOK_BASE_URL=http://localhost:5173/webhook` so Vite proxies requests to n8n (avoids browser CORS). Spell the path **`webhook`** exactly — a typo like `webhcok` will fail. After any `.env` change, stop and restart `npm run dev`.

## Environment variables

| Variable | Description |
| --- | --- |
| `VITE_N8N_WEBHOOK_BASE_URL` | Base URL for n8n webhooks (e.g. `http://192.168.0.194:5678/webhook`) |
| `VITE_MINIO_BASE_URL` | MinIO public base URL used in API payloads (e.g. `http://192.168.0.194:9000`) |
| `VITE_AVATARES_API_KEY` | API key sent as `X-Avatares-Api-Key` on all n8n webhook requests (required when the n8n gateway is enabled) |

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

All requests are `POST` with `Content-Type: application/json` and `X-Avatares-Api-Key` (from `VITE_AVATARES_API_KEY`). Paths are appended to `VITE_N8N_WEBHOOK_BASE_URL`. Image previews load directly from MinIO URLs and do not use this header.

| Endpoint | Purpose |
| --- | --- |
| `/assets/review-candidates` | List candidates for avatar + scene + assetType |
| `/assets/get-canonical` | Get current canonical asset for the group |
| `/assets/promote-canonical` | Promote an assetId to canonical |
| `/assets/select` | Mark an assetId as selected (shortlist) |
| `/assets/reject` | Reject a non-canonical asset |
| `/admin/catalogs/options` | Active catalog options for selects |
| `/admin/catalogs/list` | All catalog rows (including disabled) |
| `/admin/catalogs/upsert` | Create or update a catalog item |
| `/admin/catalogs/set-status` | Enable or disable a catalog item |
| `/admin/ingest-profiles/upsert-validated` | Save ingest profile with catalog validation |
| `/admin/ingest-profiles/delete` | Delete ingest profile when no assets exist for avatar/scene/assetType |

See `automation/n8n/docs/api-contracts/asset-review-api.md` and `automation/n8n/docs/runbooks/catalog-management.md` in the repo for full API documentation.

## Known assumptions

- n8n workflows are published and reachable from the machine running the browser.
- MinIO object URLs returned by the API are directly loadable in the browser (no auth on read).
- Filter and ingest profile selects load from `POST /admin/catalogs/options` (static fallback if the API is unavailable).
- Catalog administration uses `POST /admin/catalogs/list`, `upsert`, and `set-status` (logical enable/disable only).
- Ingest profiles are saved via `POST /admin/ingest-profiles/upsert-validated` against DB catalogs.
- Canonical promotion is logical in PostgreSQL; files are not copied to a separate `canon/` path.
- Rejecting a canonical asset is blocked by the API; promote another asset first, then reject the former canonical.
- No authentication is implemented yet; endpoints are assumed to be on a trusted network.
- CORS must allow the dashboard origin if n8n is on a different host/port than the Vite dev server.

## Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS
