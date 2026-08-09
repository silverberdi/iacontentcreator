# Wave 02: Pre-Video Consolidation

## Objective

Reduce UX and technical debt before introducing video generation. Video must not be added while the product still has competing operator paths, unclear canonical-reference ownership, and large untested UI modules.

## Official Operator Model

- Home: shows the safest next action and operational summary.
- Publications: official path to create, generate, review, copy, and mark a publication.
- Asset Review: official place to decide what to do with generated images.
- Characters: official place to define character truth, visual readiness, identity canon, and scene canon coverage.
- Ops / Admin: technical controls, catalogs, ingest, backups, access, and advanced maintenance.

## Retired / Experimental Paths

- Content Lab is retired from primary navigation.
- Its code may remain temporarily for reference, but it must not compete with Publications as an operator workflow.
- Any useful ideas from Content Lab must be migrated into Publications or Characters before the code is deleted.

## Debt Slices

### US-052: Remove Duplicate Publication Path

As an operator, I only want one official way to generate and prepare publications, so I do not have to choose between Publications and Content Lab.

Acceptance criteria:
- Content Lab is not visible in dashboard navigation.
- Publications remains the official generation/publication path.
- Content Lab code is marked as retired or isolated for later deletion.
- No production workflow depends on Content Lab as the primary operator path.

### US-053: Character Visual Readiness UX

As an operator, I want to understand whether a character is visually ready, so I know what is missing before generating content.

Acceptance criteria:
- Characters shows identity canon status.
- Characters shows scene canon coverage per shared scene.
- Operator labels hide internal terms where possible.
- Advanced reference registration remains available but does not dominate the page.

### US-054: Split Large Frontend Panels

As a maintainer, I want large panels split into focused components, so future changes are safer.

Acceptance criteria:
- CharactersPanel is split into smaller feature components.
- PublicationsPanel is split into smaller stage components.
- Shared display helpers move into dedicated utilities.
- Build remains green after each extraction.

### US-055: Extract n8n Business Logic

As a maintainer, I want n8n workflows to reference versioned scripts, so business logic is reviewable and testable.

Acceptance criteria:
- Critical query builders live in `automation/n8n/workflows/scripts`.
- Workflow JSON embeds only small orchestration glue where practical.
- Generated workflow JSON can be refreshed from source scripts.
- Diff noise is reduced for future workflow changes.

### US-056: Define Asset/Reference State Contracts

As a maintainer, I want a clear asset state model, so generated assets, publication selections, identity canon, scene canon, and rejected evidence do not conflict.

Acceptance criteria:
- State combinations are documented.
- UI actions map to explicit state transitions.
- Prompt-pack reference selection documents precedence.
- Tests cover the key transitions.

### US-057: Safe Deploy Script

As an operator-maintainer, I want a repeatable deploy process, so releases include backup, build, workflow import, restart, and smoke checks.

Acceptance criteria:
- One script performs pre-deploy backup.
- Dashboard build/deploy is automated.
- n8n workflow import/publish is automated.
- Post-deploy smoke checks verify health and core endpoints.

