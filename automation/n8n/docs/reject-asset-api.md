# Avatares AI — Reject Asset API

## Fase

9.4 — Asset Review / Curación

## Workflow

```text
Avatares AI - API - Reject Asset
```

## Endpoint

```text
POST /webhook/assets/reject
```

## Payload

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Rejected during manual review",
  "baseUrl": "http://192.168.0.194:9000"
}
```

`baseUrl` es opcional. Si no se envía, usa:

```text
http://192.168.0.194:9000
```

## Respuesta esperada

```json
{
  "rejected": true,
  "assetId": "...",
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "url": "http://192.168.0.194:9000/...",
  "status": "rejected",
  "reviewNotes": "Rejected during manual review"
}
```

## Regla de seguridad

El endpoint NO rechaza assets con estado `canonical`.

Si intentas rechazar un asset canónico, responderá:

```json
{
  "rejected": false,
  "reason": "Asset not found, already canonical, or rejection failed"
}
```

Para rechazar un canonical, primero promueve otro asset como canonical. Luego rechaza el anterior si queda como `selected`.

## Flujo de curación mínimo

```text
POST /assets/review-candidates
→ revisar URLs
→ POST /assets/promote-canonical
→ POST /assets/reject para los descartados
→ POST /assets/get-canonical
```
