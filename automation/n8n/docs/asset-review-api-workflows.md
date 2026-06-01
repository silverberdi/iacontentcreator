# Avatares AI — Asset Review API Workflows

## Fase

9 — Asset Review / Curación

## Objetivo

Exponer endpoints HTTP internos en n8n para revisar, promover y consultar assets canónicos sin entrar a DBeaver ni ejecutar workflows manuales.

## Workflows incluidos

```text
Avatares AI - API - List Review Candidates
Avatares AI - API - Promote Canonical Asset
Avatares AI - API - Get Canonical Asset
```

## Endpoints

Base local:

```text
http://192.168.0.194:5678/webhook
```

### 1. List Review Candidates

```text
POST /assets/review-candidates
```

Payload:

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

Respuesta:

```json
{
  "status": "ok",
  "count": 2,
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "candidates": []
}
```

### 2. Promote Canonical Asset

```text
POST /assets/promote-canonical
```

Payload:

```json
{
  "assetId": "PASTE_ASSET_ID",
  "reviewNotes": "Selected during manual review",
  "baseUrl": "http://192.168.0.194:9000"
}
```

Respuesta:

```json
{
  "promoted": true,
  "assetId": "...",
  "url": "http://192.168.0.194:9000/...",
  "status": "canonical"
}
```

### 3. Get Canonical Asset

```text
POST /assets/get-canonical
```

Payload:

```json
{
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "baseUrl": "http://192.168.0.194:9000"
}
```

Respuesta:

```json
{
  "found": true,
  "assetId": "...",
  "url": "http://192.168.0.194:9000/...",
  "status": "canonical"
}
```

## Nota operativa

Para usar las URLs `/webhook/...`, los workflows deben estar activos en n8n.

Para pruebas dentro del editor, n8n también puede exponer URLs `/webhook-test/...`.

## Decisión de canonical

El estado canonical sigue siendo lógico en PostgreSQL:

```text
status = canonical
is_canonical = true
canonical_group = avatar:scene:assetType
```

No se copia físicamente a `canon/` en esta fase.
