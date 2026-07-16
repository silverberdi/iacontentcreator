# Avatares AI — Select Asset API

## Fase

9.5 — Asset Review / Curación

## Objetivo

Marcar manualmente uno o más assets como `selected` (reserva / shortlist) sin promoverlos a canonical.

Permite separar explícitamente:

- **canonical** → el asset oficial del grupo (`avatar:scene:assetType`)
- **selected** → candidatos guardados como buenos, pero no oficiales

## Workflow

```text
Avatares AI - API - Select Asset
```

Workflow callable reutilizable (opcional):

```text
Avatares AI - Select Asset - Callable
```

## Endpoint

```text
POST /webhook/assets/select
```

## Payload

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Strong face match; backup for coffee-rain",
  "baseUrl": "http://192.168.0.194:9000"
}
```

`baseUrl` y `reviewNotes` son opcionales.

## Respuesta esperada

```json
{
  "selected": true,
  "assetId": "...",
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "url": "http://192.168.0.194:9000/...",
  "status": "selected",
  "reviewNotes": "Strong face match; backup for coffee-rain"
}
```

## Reglas

1. Solo marca assets que **no** son canonical (`is_canonical = false` y `status <> canonical`).
2. Permite marcar assets en `raw` o `rejected`.
3. Permite **varios** assets `selected` en el mismo `canonical_group`.
4. No cambia el canonical vigente.
5. No mueve archivos en MinIO; solo actualiza PostgreSQL.

## Errores

Si el asset no existe o ya es canonical:

```json
{
  "selected": false,
  "assetId": "...",
  "reason": "Asset not found, already canonical, or selection failed"
}
```

## Flujo recomendado en el dashboard

```text
1. Filtrar avatar + scene + assetType
2. Select → marcar backups / shortlist (puede ser más de una imagen)
3. Promote → elegir UNA como canonical
4. Reject → descartar el resto
5. Get Canonical → confirmar la oficial
```

## Diagnóstico rápido

Si el dashboard muestra error en `/assets/select` y **no aparece ninguna ejecución** en n8n, casi seguro el webhook **no está registrado** (workflow no importado o inactivo).

Prueba directa (con tu API key):

```bash
source apps/asset-review-dashboard/.env   # o ~/local-ai-stack/.env

curl -i -X POST http://192.168.0.194:5678/webhook/assets/select \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $VITE_AVATARES_API_KEY" \
  -d '{"assetId":"PASTE_ASSET_ID","reviewNotes":"test"}'
```

| Respuesta | Significado |
| --- | --- |
| `404` + `"not registered"` | Falta importar/activar el workflow |
| `200` + `"selected": true` | OK |
| `200` + `"selected": false` | Asset no encontrado, ya canonical, etc. |
| `500` HTML | Proxy/gateway roto o workflow crasheando antes de responder |

Compara con reject (debe responder JSON `200`):

```bash
curl -i -X POST http://192.168.0.194:5678/webhook/assets/reject \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: $VITE_AVATARES_API_KEY" \
  -d '{"assetId":"PASTE_ASSET_ID","reviewNotes":"test"}'
```

## Importar en n8n

1. En n8n → **Workflows** → **Import from file**
2. Importa:
   - `automation/n8n/workflows/Avatares_AI_API_Select_Asset.json`
3. Abre el workflow → nodo **Select Asset** (Postgres) → asigna la **misma credencial Postgres** que `API - Reject Asset` / `API - Promote Canonical Asset`.
4. **Activa** el workflow (toggle verde arriba a la derecha). Sin activar, n8n responde `404 not registered`.
5. Repite el `curl` de arriba; debe pasar de `404` a `200`.
6. En n8n → **Executions** solo verás historial **después** de que el webhook esté registrado y reciba tráfico.
7. Probar con curl completo:

```bash
curl -X POST http://192.168.0.194:5678/webhook/assets/select \
  -H "Content-Type: application/json" \
  -H "X-Avatares-Api-Key: YOUR_KEY" \
  -d '{
    "assetId": "PASTE_ASSET_ID",
    "reviewNotes": "Marked as selected during review"
  }'
```
