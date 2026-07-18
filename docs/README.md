# Project Documentation Map

This directory is the entry point for cross-project documentation.

## Product

Use `docs/product/` for business intent, product scope, avatar business lines, and current delivery status.

- `docs/product/business-intent.md`
- `docs/product/avatar-taxonomy.md`
- `docs/product/avatar-profile-contract.md`
- `docs/product/avatar-profile-readiness.md`
- `docs/product/publication-quality-review.md`
- `docs/product/mvp-portfolio.md`
- `docs/product/wave-1-status.md`

## Planning

Use `planning/backlog/` for product backlog, user stories, acceptance criteria, and implementation waves.

- `planning/backlog/WAVE-01-estefania-publications.md`

## Operations

Use `docs/operations/` for operator-facing procedures.

- `docs/operations/runbooks/`
- `docs/operations/runbooks/wave-1-estefania-publication.md`
- `docs/operations/deployment/`
- `docs/operations/troubleshooting/`

## Architecture

Use `docs/architecture/` for system design, stack decisions, storage, service boundaries, and integration architecture.

Service-local architecture docs may also live beside the service when that is more useful:

- `infra/ai-gateway/README.md`
- `apps/asset-review-dashboard/README.md`

## Automation

Use `automation/n8n/` for n8n workflow exports and n8n-specific documentation.

- `automation/n8n/workflows/`
- `automation/n8n/docs/api-contracts/`
- `automation/n8n/docs/runbooks/`
- `automation/n8n/docs/hotfixes/`
- `automation/n8n/docs/audits/`
- `automation/n8n/docs/architecture/`

## Avatars

Use `avatars/` for character canon, visual identity, content systems, datasets, and production assets.

Avatar internals are not fully migrated yet, but new operational profile work should follow:

- `docs/product/avatar-profile-contract.md`
- `docs/product/avatar-profile-readiness.md`

Existing deep canon can remain in specialized Markdown files. The profile contract is the common operational entry point.

## Research

Use `docs/research/` for provider notes, model exploration, and raw technical research that is not yet product or operational documentation.

- `docs/research/deepseek.md`
- `docs/research/gemini.md`
- `docs/research/chatgpt.md`
- `docs/research/claude.md`

## Placement Rules

- Product intent, business scope, or market logic goes in `docs/product/`.
- Operator instructions go in `docs/operations/`.
- System design goes in `docs/architecture/`.
- n8n workflow-specific docs go in `automation/n8n/docs/`.
- Backlog and user stories go in `planning/backlog/`.
- Raw provider/model notes go in `docs/research/`.
- Avatar canon stays under `avatars/`.
- Historical or one-time technical fixes should be marked as hotfixes or audits, not mixed with active runbooks.
