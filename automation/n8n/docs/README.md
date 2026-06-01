# Avatares AI — n8n Automation

## Estructura recomendada

```text
automation/
└── n8n/
    ├── docs/
    │   ├── asset-pipeline-orchestrator.md
    │   ├── batch-manifest-contract.md
    │   ├── asset-catalog-validation.md
    │   ├── asset-review-api.md
    │   └── review-notes-api-pending.md
    ├── workflows/
    │   ├── Avatares_AI_Asset_Pipeline_Orchestrator_manifest_catalog_validation_v1.json
    │   ├── Avatares_AI_Register_Raw_Asset_Batch_Callable_manifest_v1.json
    │   ├── Avatares_AI_Promote_Canonical_Asset_Callable_v3.json
    │   ├── Avatares_AI_Get_Canonical_Asset_Callable_v3.json
    │   ├── Avatares_AI_API_List_Review_Candidates_v1.json
    │   ├── Avatares_AI_API_Get_Canonical_Asset_v1.json
    │   ├── Avatares_AI_API_Promote_Canonical_Asset_v1.json
    │   └── Avatares_AI_API_Reject_Asset_v1.json
    └── sql/
        ├── 001_asset_catalogs.sql
        └── 002_seed_asset_catalogs.sql
```

## Pipeline principal

```text
Avatares AI - Asset Pipeline Orchestrator - Manifest Catalog Validation
```

Responsabilidades:

```text
leer batch.json
validar batch contra catálogos
registrar assets
subir a MinIO
mover archivos procesados
opcionalmente promover canonical
consultar canonical
devolver resultado limpio
```

## APIs de curación

Workflows publicados:

```text
Avatares AI - API - List Review Candidates
Avatares AI - API - Get Canonical Asset
Avatares AI - API - Promote Canonical Asset
Avatares AI - API - Reject Asset
```

Endpoints:

```text
POST /webhook/assets/review-candidates
POST /webhook/assets/get-canonical
POST /webhook/assets/promote-canonical
POST /webhook/assets/reject
```

## Decisiones vigentes

```text
Canonical físico en MinIO: NO
Canonical lógico en PostgreSQL: SÍ
batch.json como contrato estable de entrada: SÍ
Catálogos PostgreSQL para validación: SÍ
Endpoints n8n para curación: SÍ
```

## Próximo bloque recomendado

```text
Viewer / Dashboard mínimo
```

Objetivo:

```text
ver candidatos
abrir imágenes
promover canonical
rechazar descartados
consultar canonical vigente
```
