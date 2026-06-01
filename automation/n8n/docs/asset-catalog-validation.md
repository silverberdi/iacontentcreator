# Avatares AI — Asset Catalogs & Batch Manifest Validation

## Purpose

This iteration adds database-backed validation before the asset pipeline processes a batch.

The orchestrator now validates `batch.json` against PostgreSQL catalogs before calling the raw asset registration workflow.

## New catalog tables

```text
avatar_catalog
scene_catalog
asset_type_catalog
generation_catalog
```

## Validation rules

The orchestrator checks:

```text
avatar exists and is active
scene exists for that avatar and is active
assetType exists and is active
workflow/model pair exists and is active
avatarShort matches the catalog value
inputDir exists
inputDir contains at least one image file
```

Allowed image extensions:

```text
.png
.jpg
.jpeg
.webp
```

## SQL files

Run in this order:

```text
001_asset_catalogs.sql
002_seed_asset_catalogs.sql
```

## Updated workflow

Import:

```text
Avatares_AI_Asset_Pipeline_Orchestrator_manifest_catalog_validation_v1.json
```

After import, relink these `Execute Workflow` nodes if n8n loses references:

```text
Execute Register Raw Asset Batch
Execute Promote Canonical Asset
Execute Get Canonical Asset
```

## batch.json example

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

## Expected failure behavior

If the manifest is invalid, the orchestrator stops before registering assets.

Examples:

```text
Unknown or inactive avatar: ...
Unknown or inactive scene for avatar: ...
Unknown or inactive assetType: ...
Unknown or inactive workflow/model: ...
avatarShort mismatch...
No image files found in inputDir...
```

## Canonical storage decision

Canonical status remains logical in PostgreSQL for now.

No physical copy is created under `canon/` during this phase.
