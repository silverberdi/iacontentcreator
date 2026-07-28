# Operator Studio Information Architecture

Date: 2026-07-26  
Status: Proposed  
Owner: Avatares AI Console  
Related story: US-040  

## Objective

Reorganize the Avatares AI console around characters, work queues, and clear operator decisions so the system can scale from Estefania to multiple AI characters without requiring non-technical operators to understand jobs, n8n, Comfy, prompt packs, ingest, metadata, or internal IDs.

This is not a visual refresh. It is a product information architecture change.

## Product Diagnosis

The current console is valuable but structurally accumulative. It reflects the order in which capabilities were built:

- `Home` shows active publication jobs.
- `Asset Review` reviews generated assets and canonical candidates.
- `Publications` creates and operates an end-to-end publication workflow.
- `Content Cycle` remains as a technical/legacy guided flow.
- `Ops / Admin` mixes ingest, backups, catalogs, and access.

This creates three product problems:

- Similar operator decisions appear in multiple places.
- Standard mode still exposes implementation concepts.
- The home view behaves like a job queue, not a multi-character activity dashboard.

The biggest overlap is between `Asset Review` and publication image review. Both ask the operator to judge whether an image is usable, but they expose different mental models and action names.

## Design Principle

The standard console should answer:

- What is happening with my characters?
- What needs my attention?
- What is safe to do next?
- What is ready to publish?
- What failed, in human language?

Technical mode should answer:

- Which job, workflow, provider, payload, ID, or event caused this?
- What can an engineer/operator retry or inspect?
- What low-level state was stored?

## Top-Level Navigation

### Studio

Studio is the non-technical operating area for content production.

Pages:

- `Dashboard`
- `Characters`
- `Production`
- `Review`
- `Publish`

### Ops / Admin

Ops/Admin is the system maintenance area.

Pages:

- `Ops Dashboard`
- `Ingest`
- `Catalogs`
- `Backups`
- `Access`
- `Technical Debug`

## Studio Pages

### Dashboard

Purpose: understand activity across all characters in less than one minute.

Primary content:

- Character activity cards.
- Active productions.
- Images awaiting review.
- Content ready to publish.
- QA blocks and failures.
- Recent wins and recent problems.
- One primary call to action: create a new publication.

Suggested KPIs:

- Active characters.
- Active publication jobs.
- Images awaiting review.
- QA-blocked images.
- Publish-ready items.
- Published items in the selected period.
- Acceptance rate.
- Regeneration rate.
- Average attempts per accepted image.

Required data:

- Publication job summary grouped by avatar and operator state.
- Latest generated asset and QA status per job.
- Selected/publish-ready asset counts.
- Published record count by time window.
- Recent failures and stuck jobs.

### Characters

Purpose: manage each AI character as a product entity, not as a filter.

Primary content:

- Character overview card.
- Identity/canonical state.
- Active scenes.
- Latest good images.
- Recent rejected or QA-blocked patterns.
- Publication activity.
- Character-level actions.

Character page sections:

- `Overview`: name, role, platform, business profile, content pillars.
- `Identity`: canonical images and identity references.
- `Scenes`: available scenes and scene health.
- `Activity`: active and recent publication jobs.
- `Quality`: acceptance rate, common flags, QA failures.
- `Actions`: create publication, review assets, inspect technical profile if allowed.

### Production

Purpose: operate publication/content jobs by state.

Groups:

- `Preparing`: job exists but brief/prompt direction is not ready.
- `Generating`: image generation is running or waiting on provider output.
- `Needs Review`: image exists and requires human decision.
- `Copy Ready`: image selected and caption/copy can be created.
- `Ready To Publish`: package is ready for manual publication.
- `Published`: publication recorded.
- `Needs Attention`: failed, stuck, or blocked.

Each row should show:

- Character.
- Scene.
- Preview image if available.
- Human status.
- Recommended next action.
- Last updated time.
- One primary button.

Standard mode should not show:

- publication job UUID.
- generation job UUID.
- raw provider status.
- prompt JSON.
- metadata.

### Review

Purpose: provide one review inbox for image decisions.

This page should absorb standard-mode use cases from both `Asset Review` and publication image review.

Queues:

- `Publication candidates`: images generated for a publication job.
- `Canonical candidates`: images that may become identity/reference material.
- `Needs human check`: QA review-required images.
- `Blocked`: QA-blocked images requiring rejection or regeneration.

Core decisions:

- Approve for publication.
- Reject and request another attempt.
- Reject as not canonical quality.
- Promote to canonical, technical/admin permission only.
- Add human feedback.

Standard review labels:

- `Looks good`.
- `Use for this publication`.
- `Needs another try`.
- `Not good enough for identity reference`.
- `Make this a reference`, advanced permission.

The review form should preserve structured feedback:

- identity.
- face.
- hands.
- feet.
- composition.
- brand fit.
- publishability.
- notes.

### Publish

Purpose: finish manual publishing without exposing production internals.

Content:

- Approved image preview.
- Final caption.
- Hashtags.
- Publishing notes.
- Copy buttons.
- Platform/account fields.
- Published URL.
- Mark published action.

This page should feel like a final checklist, not a technical export.

## Ops / Admin Pages

### Ops Dashboard

Purpose: detect operational problems quickly.

Content:

- ai-gateway health.
- n8n health.
- Comfy Cloud configured status.
- DeepSeek configured status.
- ingest watcher status.
- recent failed jobs.
- stuck generating jobs.
- last backup freshness.
- recent provider errors.

### Ingest

Purpose: manage ingest profiles and watcher behavior.

Contains current Auto Ingest capabilities:

- active profile.
- profile management.
- watcher controls.
- manual pipeline runs.
- last-run preview.

### Catalogs

Purpose: configure avatars, scenes, asset types, workflows, and models.

This remains admin-only and should not appear as a normal operator task.

### Backups

Purpose: create and inspect operational backups.

Standard admin view:

- latest backup.
- backup freshness.
- create backup.

Technical view:

- paths.
- raw metadata.
- restore notes.

### Access

Purpose: manage users and permissions.

### Technical Debug

Purpose: centralize technical internals currently scattered across pages.

Contains:

- raw job IDs.
- raw asset IDs.
- timeline events.
- prompt pack JSON.
- provider metadata.
- workflow diagnostics.
- retry/debug actions.

## Human State Labels

### Publication Job States

| Internal State | Standard Label | Operator Meaning |
|---|---|---|
| `draft` | Needs creative direction | Create or regenerate the brief. |
| `brief-ready` | Direction ready | The creative direction exists. |
| `prompt-ready` | Ready to create image | Image instructions are ready. |
| `generating` | Creating image | The system is waiting for image output. |
| `review-ready` | Needs image review | A generated image is ready for decision. |
| `assets-ready` | Image selected | A publication image has been chosen. |
| `copy-ready` | Caption ready | Copy exists and can be packaged. |
| `ready-to-publish` | Ready to publish | Image and copy are ready for manual publishing. |
| `published` | Published | The final URL has been recorded. |
| `failed` | Needs attention | Something failed and needs retry or operator review. |

### QA States

| Internal State | Standard Label | Operator Meaning |
|---|---|---|
| `pass` | Looks safe | No obvious visual issue was detected. |
| `review_required` | Check carefully | The image may be usable but needs human judgment. |
| `blocked` | Do not use | The image should not be selected normally. |
| `not-run` | Not checked yet | QA has not evaluated this image. |

### Generation States

| Internal State | Standard Label | Operator Meaning |
|---|---|---|
| `running` | Creating image | Provider work is still in progress. |
| `completed` | Image ready | Output was received and registered. |
| `failed` | Image creation failed | Retry or inspect issue. |
| `blocked` | Rejected by quality check | Output exists but should not be used normally. |

### Review Decisions

| Internal Action | Standard Label |
|---|---|
| `select-for-publication` | Use for this publication |
| `reject-for-publication` | Needs another try |
| `reject-as-canonical` | Not good enough for identity reference |
| `promote-canonical` | Make this a reference |

## Standard Mode Hidden Concepts

Hide by default:

- n8n.
- Comfy Cloud internals.
- MinIO.
- Postgres.
- raw UUIDs.
- prompt pack JSON.
- raw metadata.
- provider payloads.
- workflow names.
- ingest terminology.
- timeline event types.
- raw QA contract names.
- remediation policy names.

Allowed in standard mode when translated:

- image is being created.
- image is ready.
- image needs review.
- image should not be used.
- system tried again automatically.
- prior human feedback influenced the next attempt.
- a failure needs attention.

## Migration Map

| Current Area | Future Destination |
|---|---|
| `Home` / `OperatorHomePanel` | `Studio > Dashboard`, with richer cross-character metrics. |
| `PublicationsPanel` create/load job | `Studio > Production` and simplified publication workspace. |
| `PublicationsPanel` review section | `Studio > Review`. |
| `PublicationsPanel` copy/export/published record | `Studio > Publish`. |
| `Asset Review` standard mode | `Studio > Review`. |
| `Asset Review` canonical promotion | `Studio > Review` with advanced permission or `Technical Debug`. |
| `Content Cycle` | Legacy technical/debug until removed. |
| `AutoIngestPanel` | `Ops/Admin > Ingest`. |
| `CatalogsPanel` | `Ops/Admin > Catalogs`. |
| `BackupsPanel` | `Ops/Admin > Backups`. |
| `UserAccessPanel` | `Ops/Admin > Access`. |
| technical details across pages | `Ops/Admin > Technical Debug`. |

## Primary Operator Workflows

### Create Publication

1. Select character.
2. Select scene or objective.
3. Start publication.
4. System prepares direction and image instructions.
5. Operator reviews generated image.
6. Operator approves or requests another try.
7. System prepares caption and publishing pack.
8. Operator publishes manually and records URL.

### Review Images

1. Open review inbox.
2. Inspect image and QA guidance.
3. Choose use/reject/reference action.
4. Add optional human feedback.
5. System routes feedback into future prompts.

### Monitor Activity

1. Open dashboard.
2. Identify character/job needing attention.
3. Open the task.
4. Take the primary recommended action.

### Resolve Operational Issue

1. Open Ops Dashboard.
2. Identify failing subsystem or stuck job.
3. Open relevant Ops page or Technical Debug.
4. Retry, inspect, or escalate.

## Follow-Up Stories

### US-041 — Character Activity Dashboard

Build the first Studio dashboard with cross-character activity, active jobs, review queue, QA blocks, publish-ready content, and recent outcomes.

### US-042 — Unified Review Inbox

Create a single standard-mode review inbox for publication candidates and asset/canonical decisions.

### US-043 — Simplified Publication Workspace

Replace the standard-mode publication workspace with a next-action assistant that hides prompt JSON, IDs, provider details, and internal timelines.

### US-044 — Ops/Admin Dashboard

Create a system operations dashboard with service health, recent failures, stuck jobs, ingest status, backup freshness, and debug entry points.

## Validation Against Estefania Flow

The proposed IA supports the current Estefania flow:

- Create a publication from Studio Dashboard or Character page.
- Track it in Production.
- Review generated images in Review.
- Publish final pack in Publish.
- Diagnose Comfy/n8n/QA issues in Ops/Admin.

No backend workflow change is required to begin migration. The first implementation can reuse existing publication summary, list jobs, timeline, review, QA, and publish APIs.

## Implementation Guidance

Do not rewrite the working console in one step.

Recommended migration:

1. Keep existing `PublicationsPanel` and `Asset Review` operational.
2. Add new Studio navigation and dashboard using existing APIs.
3. Add unified review inbox behind the new IA.
4. Move standard publication operations into the simplified workspace.
5. Move raw debug content into Technical Debug.
6. Retire or hide legacy pages only after equivalent Studio paths are usable.
