# Avatares AI — Batch Manifest Input

## Estado

El orquestador lee `batch.json` desde `inbox` y usa ese archivo como contrato de entrada del lote.

## Ubicación esperada

```text
/home/node/.n8n-files/inbox/batch.json
/home/node/.n8n-files/inbox/*.png
```

## Ejemplo

```json
{
  "avatar": "estefania-montealegre",
  "avatarShort": "estefania",
  "scene": "coffee-rain",
  "assetType": "raw-image",
  "workflow": "flux-krea-dev",
  "model": "flux-krea-dev",
  "seed": 847362,
  "version": 1,
  "autoPromoteLatest": true
}
```

## Flujo

```text
Asset Pipeline Orchestrator - Manifest
→ Read batch.json
→ Parse Batch Manifest
→ Register Raw Asset Batch - Callable
→ Promote Canonical Asset - Callable
→ Get Canonical Asset - Callable
→ Move batch.json to processed
```

## Reglas

- `batch.json` no se procesa como asset.
- Solo los PNG del `inbox` se registran.
- Assets nuevos van a `processed`.
- Duplicados exactos van a `duplicates`.
- El `batch.json` va a `processed` al final del orquestador.
- `canon/` sigue siendo lógico en PostgreSQL por ahora.
