# Avatares AI — n8n Documentation

This directory contains documentation specific to n8n workflows and n8n-operated automation.

## Structure

```text
automation/n8n/docs/
  api-contracts/
  architecture/
  audits/
  hotfixes/
  runbooks/
```

## API Contracts

Use `api-contracts/` for webhook contracts, request/response shapes, and API behavior exposed by n8n.

Examples:

- `api-contracts/asset-review-api.md`
- `api-contracts/select-asset-api.md`
- `api-contracts/batch-manifest-contract.md`

## Architecture

Use `architecture/` for workflow architecture and pipeline design.

Examples:

- `architecture/asset-pipeline-orchestrator.md`
- `architecture/asset-catalog-validation.md`

## Audits

Use `audits/` for one-time system inspections and reality-sync reports.

Examples:

- `audits/reality-sync-2026-07-14.md`
- `audits/admin-console-dead-code-audit-2026-07-14.md`

## Hotfixes

Use `hotfixes/` for narrowly scoped fixes, patches, and historical repair notes.

These are not active runbooks unless explicitly promoted.

## Runbooks

Use `runbooks/` for active operational instructions.

Examples:

- `runbooks/auto-ingest.md`
- `runbooks/auto-ingest-watcher.md`
- `runbooks/local-production-backups.md`

## Workflows

Workflow JSON exports live in:

```text
automation/n8n/workflows/
```

The repository should contain exported workflows required to operate the project. Server-only workflows are considered configuration drift.

## Placement Rules

- If it describes an endpoint, put it in `api-contracts/`.
- If it describes how a workflow is designed, put it in `architecture/`.
- If it tells an operator what to do repeatedly, put it in `runbooks/`.
- If it documents a one-time investigation, put it in `audits/`.
- If it documents a repair or historical patch, put it in `hotfixes/`.
