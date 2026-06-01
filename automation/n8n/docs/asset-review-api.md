# Avatares AI — Asset Review API

## Estado

Validado.

Endpoints probados:

```text
POST /webhook/assets/review-candidates
POST /webhook/assets/get-canonical
POST /webhook/assets/promote-canonical
POST /webhook/assets/reject
```

## Objetivo

Permitir revisar, promover y rechazar assets desde endpoints HTTP internos de n8n, sin depender de DBeaver ni de ejecución manual nodo por nodo.

Flujo mínimo de curación:

```text
List Review Candidates
→ revisar URLs
→ Promote Canonical
→ Reject descartados
→ Get Canonical
```

## Base URL

```text
http://192.168.0.194:5678/webhook
```

MinIO:

```text
http://192.168.0.194:9000
```

## Workflows publicados

```text
Avatares AI - API - List Review Candidates
Avatares AI - API - Get Canonical Asset
Avatares AI - API - Promote Canonical Asset
Avatares AI - API - Reject Asset
```

## Modelo de canonical

Por ahora el canonical es lógico en PostgreSQL.

No se copia físicamente a:

```text
avatars/{avatar}/canon/
```

El archivo canónico sigue apuntando a su objeto real, normalmente en:

```text
avatars/{avatar}/raw-image/{fileName}
```

Campos principales:

```text
status = canonical
is_canonical = true
canonical_group = avatar:scene:assetType
```

---

## 1. List Review Candidates

### Endpoint

```text
POST /webhook/assets/review-candidates
```

### Payload

```json
{
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "baseUrl": "http://192.168.0.194:9000",
  "limit": 50,
  "includeCanonical": true
}
```

Campos opcionales:

```text
baseUrl
limit
includeCanonical
```

### cURL

```bash
curl -X POST http://192.168.0.194:5678/webhook/assets/review-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "avatar": "estefania-montealegre",
    "scene": "coffee-rain",
    "assetType": "raw-image"
  }'
```

### Respuesta esperada

```json
{
  "status": "ok",
  "count": 2,
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "candidates": [
    {
      "assetId": "...",
      "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
      "status": "raw",
      "isCanonical": false,
      "sha256": "...",
      "canonicalGroup": "estefania-montealegre:coffee-rain:raw-image",
      "reviewNotes": null,
      "createdAt": "2026-05-31T..."
    }
  ]
}
```

---

## 2. Get Canonical Asset

### Endpoint

```text
POST /webhook/assets/get-canonical
```

### Payload

```json
{
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "baseUrl": "http://192.168.0.194:9000"
}
```

### cURL

```bash
curl -X POST http://192.168.0.194:5678/webhook/assets/get-canonical \
  -H "Content-Type: application/json" \
  -d '{
    "avatar": "estefania-montealegre",
    "scene": "coffee-rain",
    "assetType": "raw-image"
  }'
```

### Respuesta con canonical encontrado

```json
{
  "found": true,
  "assetId": "...",
  "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
  "status": "canonical",
  "reviewNotes": "Selected via Asset Review API"
}
```

### Respuesta sin canonical

```json
{
  "found": false,
  "reason": "No canonical asset found"
}
```

---

## 3. Promote Canonical Asset

### Endpoint

```text
POST /webhook/assets/promote-canonical
```

### Payload

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Selected via Asset Review API",
  "baseUrl": "http://192.168.0.194:9000"
}
```

### cURL

```bash
curl -X POST http://192.168.0.194:5678/webhook/assets/promote-canonical \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "PASTE_ASSET_ID",
    "reviewNotes": "Selected via Asset Review API"
  }'
```

### Respuesta esperada

```json
{
  "promoted": true,
  "assetId": "...",
  "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
  "status": "canonical",
  "reviewNotes": "Selected via Asset Review API"
}
```

---

## 4. Reject Asset

### Endpoint

```text
POST /webhook/assets/reject
```

### Payload

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Rejected during manual review",
  "baseUrl": "http://192.168.0.194:9000"
}
```

### cURL

```bash
curl -X POST http://192.168.0.194:5678/webhook/assets/reject \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "PASTE_NON_CANONICAL_ASSET_ID",
    "reviewNotes": "Rejected during manual review"
  }'
```

### Respuesta esperada

```json
{
  "rejected": true,
  "assetId": "...",
  "url": "http://192.168.0.194:9000/iacontentcreator-assets/avatars/...",
  "status": "rejected",
  "reviewNotes": "Rejected during manual review"
}
```

### Regla de seguridad

El endpoint no rechaza assets con estado `canonical`.

Si se intenta rechazar el canonical vigente:

```json
{
  "rejected": false,
  "assetId": "...",
  "reason": "Asset not found, already canonical, or rejection failed"
}
```

Para rechazar un asset que hoy es canonical:

```text
1. Promover otro asset del mismo grupo.
2. Confirmar que el asset anterior ya no es canonical.
3. Rechazar el asset anterior.
```

---

## Flujo operativo recomendado

### Curación manual después de registrar assets

1. Ejecutar pipeline con:

```json
{
  "autoPromoteLatest": false
}
```

2. Listar candidatos:

```text
POST /assets/review-candidates
```

3. Abrir URLs y elegir el mejor asset.
4. Promover candidato.
5. Rechazar descartados.
6. Confirmar canonical.

### Pipeline automático con revisión posterior

1. Ejecutar pipeline con:

```json
{
  "autoPromoteLatest": true
}
```

2. Revisar candidatos.
3. Si el canonical automático no es el mejor, promover otro.
4. Rechazar descartados.

## SQL útil de validación

```sql
SELECT
  asset_id,
  avatar,
  scene,
  asset_type,
  status,
  is_canonical,
  canonical_group,
  review_notes,
  object_path,
  created_at
FROM canonical_asset_registry
WHERE avatar = 'estefania-montealegre'
  AND scene = 'coffee-rain'
  AND asset_type = 'raw-image'
ORDER BY created_at DESC;
```

Canonical único por grupo:

```sql
SELECT
  canonical_group,
  COUNT(*) FILTER (WHERE is_canonical = true) AS canonical_count
FROM canonical_asset_registry
GROUP BY canonical_group
ORDER BY canonical_group;
```

## Pendientes no críticos

```text
actualizar review notes sin cambiar status
viewer/dashboard mínimo
autenticación o restricción de endpoints
```
