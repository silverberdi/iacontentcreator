# Wave 1 — Estefanía Publications MVP

## Objective

Finish the technical foundation required to operate Estefanía Montealegre as the project's first AI influencer.

Wave 1 should allow an operator to create a publication package for Estefanía from the console, using the existing stack:

```text
console -> n8n -> ai-gateway -> DeepSeek/AI providers -> Comfy Cloud -> MinIO/Postgres -> Asset Review -> Publishing Pack
```

## Business Scope

Avatar:

```text
Estefanía Montealegre
```

Business profile:

```text
influencer-brand
```

Wave 1 does not include:

- Didi / GFE monetization.
- Fansly workflows.
- Authority avatars.
- Fully automated publishing to social platforms.
- Voice generation.

## Completion Definition

Wave 1 is done when:

- [x] An operator can create an Estefanía publication job from the console.
- [x] The system can generate or receive visual candidates for that job.
- [x] Assets are registered in MinIO/Postgres and visible in Asset Review.
- [x] The operator can approve/reject/select assets.
- [x] The system can generate a caption/copy package aligned with Estefanía.
- [ ] The final package can be exported for manual publishing.
- [x] The publication job has a clear status history.
- [x] A non-technical operator can understand what to do next.

---

## US-001 — Create Publication Job

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to create a publication job for Estefanía from the console, so that I can start producing content without touching n8n or technical tools.

### Acceptance Criteria

- [x] The console has a Publications area or equivalent flow.
- [x] The operator can select Estefanía as the avatar.
- [x] The operator can select a scene from the active scene catalog.
- [x] The operator can select a publication format, at minimum `feed-post` and `story`.
- [x] The operator can enter a simple content objective.
- [x] The system creates a persisted publication job.
- [x] The job starts in `draft` or `brief-ready` status.
- [x] The job has a unique ID and timestamps.

### Technical Tasks

- [x] Define `publication_jobs` table.
- [x] Define job statuses.
- [x] Create n8n endpoint `POST /publications/jobs/create`.
- [x] Add frontend screen/form.
- [x] Add API client in console.
- [x] Persist avatar, scene, format, objective, businessProfile, and status.

### Dependencies

- Active catalog data for Estefanía and scenes.
- Google-authenticated console access.

### Notes

- `assetType` should remain internal and default to `raw-image`.

---

## US-002A — Create Internal AI Gateway Service

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As the system owner, I want AI provider calls to go through an internal gateway service, so that n8n workflows do not directly handle provider secrets and future providers can be added cleanly.

### Acceptance Criteria

- [x] A new internal service `ai-gateway` exists in the local stack.
- [x] The service is reachable only inside Docker networks, not publicly exposed.
- [x] The service reads `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` from server environment.
- [x] The service exposes a health endpoint.
- [x] The service exposes `POST /publication-brief`.
- [x] n8n can call the service without receiving the DeepSeek API key.
- [x] Provider errors are returned as structured JSON.
- [x] The service is documented in repo deployment notes or env examples.

### Technical Tasks

- [x] Create `infra/ai-gateway` service.
- [x] Add Dockerfile/package/runtime for the gateway.
- [x] Add `ai-gateway` to server `compose.yaml`.
- [x] Add env references for `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL`.
- [x] Implement `GET /health`.
- [x] Implement provider client for DeepSeek chat completions.
- [x] Implement JSON response validation for publication brief shape.
- [x] Add minimal request/response logging without leaking secrets.

### Dependencies

- DeepSeek API key available in server `.env`.
- Internal Docker networking between n8n and `ai-gateway`.

### Notes

- Do not set `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` as the default solution.
- n8n should orchestrate; the gateway should own provider credentials.
- This service becomes the future integration point for Gemini, Groq, OpenRouter, local models, and voice providers.

---

## US-002B — Connect Publication Brief Workflow To AI Gateway

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want the publication brief workflow to use the internal AI gateway, so that I can generate Estefanía briefs from the console without exposing AI provider secrets to n8n workflows.

### Acceptance Criteria

- [x] The operator can request a brief from a publication job.
- [x] n8n sends avatar, scene, format, objective, businessProfile, and Estefanía rules/context to `ai-gateway`.
- [x] `ai-gateway` calls DeepSeek and returns a structured brief.
- [x] The generated brief includes visual intent, caption angle, emotional tone, avoid rules, and suggested format.
- [x] The brief is stored in `publication_jobs.brief`.
- [x] The publication job status changes to `brief-ready`.
- [x] Provider or validation errors are stored or returned visibly to the console.
- [x] The operator can regenerate or edit the brief.

### Technical Tasks

- [x] Replace direct DeepSeek logic in `Avatares AI - Publications - Generate Brief` with an internal HTTP call to `http://ai-gateway:PORT/publication-brief`.
- [x] Pass job context and scene/avatar context from Postgres to the gateway.
- [x] Preserve manual edited-brief save path.
- [x] Save gateway response JSON into `publication_jobs.brief`.
- [x] Keep `POST /publications/jobs/generate-brief` as the console-facing n8n endpoint.
- [x] Test with a real DeepSeek call.
- [x] Test validation failure behavior.

### Dependencies

- US-002A.
- US-001.
- Estefanía business intent and content canon.

### Notes

- This replaces the current blocked direct-DeepSeek implementation.
- n8n should not require direct access to `DEEPSEEK_API_KEY`.

---

## US-002C — Add AI Gateway Provider Observability

Status: Done
Priority: P1
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As the system owner, I want basic visibility into AI provider calls, so that I can understand failures, latency, model usage, and cost-sensitive behavior before the system becomes more autonomous.

### Acceptance Criteria

- [ ] Each gateway request has a request ID.
- [ ] Provider, model, task type, latency, success/failure, and error category are logged.
- [ ] Secrets and full API keys are never logged.
- [ ] The gateway can return a concise diagnostic object to n8n.
- [ ] Basic metrics are visible through logs or a lightweight endpoint.

### Technical Tasks

- [ ] Add request ID middleware.
- [ ] Add structured logging.
- [ ] Add provider error normalization.
- [ ] Add `GET /providers/status` or equivalent lightweight diagnostics.
- [ ] Document known error categories and operator actions.

### Dependencies

- US-002A.

### Notes

- This is not full monitoring yet; it is the minimum needed to debug AI calls without SSH archaeology.

---

## US-005A — Reopen Existing Publication Jobs

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to reopen an existing Estefanía publication job from the console, so that I can continue a previous workflow without creating duplicate jobs or manually reconstructing state.

### Acceptance Criteria

- [x] The console can load a publication job by `publicationJobId`.
- [x] The console can show a short list of recent publication jobs.
- [x] Loading a job restores its status, brief, prompt pack, and latest generation job when present.
- [x] Loading a job enables the existing ingest flow for a previous Comfy output URL.
- [x] The operator can distinguish between creating a new job and continuing an existing job.
- [x] The n8n endpoint does not expose provider secrets.
- [x] The endpoint returns structured errors for missing or invalid job IDs.

### Technical Tasks

- [x] Create n8n endpoint `POST /publications/jobs/list`.
- [x] Query `publication_jobs` with latest related `generation_jobs` and latest generated asset metadata.
- [x] Add frontend API client and types.
- [x] Add UI to load by ID and load recent jobs.
- [x] Populate current console state from loaded job.
- [x] Deploy workflow and console.
- [x] Validate using a real previous publication job.

### Dependencies

- US-001.
- US-004.
- US-005 ingest path.

### Notes

- This story closes the operational gap found after US-005: a previous job can be ingested, but the console could not yet reopen it.

---

## US-006 — Select Publication Asset

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to select the final asset for an Estefanía publication job, so that the system knows which generated image belongs to the publication package.

### Acceptance Criteria

- [x] The operator can select an asset for the loaded `publicationJobId`.
- [x] The selected asset is marked as `selected` in the asset registry.
- [x] The publication job stores `selectedAssetId`, `selectedAssetObjectPath`, and selection timestamp.
- [x] The publication job status changes to `assets-ready`.
- [x] The selected asset can be loaded again when reopening the job.
- [x] The endpoint validates that the asset belongs to the same avatar/scene as the job.
- [x] The UI shows the selected asset state clearly.

### Technical Tasks

- [x] Create n8n endpoint `POST /publications/jobs/select-asset`.
- [x] Update `canonical_asset_registry` selection status.
- [x] Update `publication_jobs.metadata` with selected asset info.
- [x] Update publication status to `assets-ready`.
- [x] Extend list/load endpoint to return selected asset info.
- [x] Add frontend API client/types.
- [x] Add Publications UI action for selecting the latest ingested asset.
- [x] Deploy and validate against a real Estefanía job.

### Dependencies

- US-005.
- US-005A.

### Notes

- This is publication-level selection. It should not replace global canonical promotion.

---

## US-007 — Generate Caption / Copy Pack

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to generate a caption and copy package for the selected Estefanía publication asset, so that the post can be prepared for manual publishing.

### Acceptance Criteria

- [x] The operator can generate a copy pack only after an asset is selected.
- [x] The copy pack includes primary caption, caption alternatives, hashtags, story text, publishing notes, and CTA options.
- [x] The copy is aligned with Estefanía's influencer-brand intent.
- [x] The copy avoids generic self-help, forced spanglish, overproduced influencer language, and luxury obsession.
- [x] The result is persisted in `publication_jobs.publishing_pack`.
- [x] The publication job status changes to `copy-ready`.
- [x] The operator can regenerate or manually edit/save the copy pack.

### Technical Tasks

- [x] Add `POST /publication-copy-pack` to `ai-gateway`.
- [x] Create n8n endpoint `POST /publications/jobs/generate-copy-pack`.
- [x] Load publication job, selected asset, brief, and prompt pack context.
- [x] Call `ai-gateway` through internal Docker networking.
- [x] Persist normalized copy pack and provider metadata.
- [x] Add frontend API client/types.
- [x] Add Publications UI section for generate/regenerate/save copy pack.
- [x] Deploy and validate with the Wave 1 Estefanía job.

### Dependencies

- US-006.

### Notes

- This is still manual-publishing oriented. Direct social posting belongs to a later story.

---

## US-002 — Generate Publication Brief With DeepSeek

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want the system to generate a structured publication brief, so that each content job has clear creative direction before images are generated.

### Acceptance Criteria

- [x] The operator can request a brief from a publication job.
- [x] DeepSeek receives avatar, scene, format, objective, and Estefanía rules through `ai-gateway`.
- [x] The generated brief includes visual intent, caption angle, emotional tone, avoid rules, and suggested format.
- [x] The brief is stored in the publication job.
- [x] The operator can regenerate or edit the brief.

### Technical Tasks

- [x] Create prompt template for Estefanía publication brief.
- [x] Route DeepSeek calls through internal `ai-gateway`.
- [x] Create n8n endpoint `POST /publications/jobs/generate-brief`.
- [x] Store brief JSON in Postgres.
- [x] Show brief in console.
- [x] Add regenerate action.

### Dependencies

- US-002A.
- US-002B.
- Estefanía business intent and content canon.

### Notes

- This is the first place where the business profile should shape output.
- Direct n8n env access was rejected as too broad. The correct implementation path is `console -> n8n -> ai-gateway -> DeepSeek`.

---

## US-003 — Generate Prompt Pack For Comfy Cloud

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want the system to create a Comfy-ready prompt pack from the publication brief, so that image generation is aligned with Estefanía's visual identity.

### Acceptance Criteria

- [x] Prompt pack is generated from the approved/editable brief.
- [x] Prompt pack includes positive prompt, negative prompt, identity reminders, scene details, and visual avoid rules.
- [x] Prompt pack references approved canonical images when available.
- [x] Prompt pack is stored on the publication job.
- [x] Operator can review and regenerate the prompt pack.

### Technical Tasks

- [x] Adapt existing `/content/generate-prompt-pack` workflow for publication jobs.
- [x] Ensure prompt pack uses `/minio` public proxy URLs where needed.
- [x] Store prompt pack JSON in Postgres.
- [x] Add prompt pack panel in console.

### Dependencies

- US-002.
- Existing canonical assets for Estefanía scenes.

### Notes

- Existing n8n prompt-pack workflow can be reused but should be job-aware.

---

## US-004 — Submit Generation Job To Comfy Cloud

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to launch image generation from the console, so that I do not need to operate Comfy Cloud manually.

### Acceptance Criteria

- [x] Operator can click `Generate images`.
- [x] The system submits a generation job using the prompt pack.
- [x] The publication job status changes to `generating`.
- [x] The job stores generation job/run identifiers.
- [x] Errors are captured and visible in the console.

### Technical Tasks

- [x] Define initial Comfy handoff contract.
- [x] Store generation handoff metadata without exposing provider credentials.
- [x] Create n8n endpoint `POST /publications/jobs/generate-images`.
- [x] Add job status update handling.
- [x] Add error logging.

### Dependencies

- US-003.

### Notes

- Current implementation creates a `generation_jobs` row, marks it `running`, links it from `publication_jobs.metadata`, and returns manual Comfy Cloud / ComfyUI instructions.
- Direct Comfy Cloud API submission is implemented through `ai-gateway` using `COMFY_CLOUD_*` environment variables. Polling/output ingest remains part of US-005.
- Comfy Cloud API workflow received for Estefania and versioned at `avatars/estefania-montealegre/04-production/comfyui/workflows/comfy-cloud-api/estefania-montealegre-api.json`.

---

## US-005 — Ingest Generated Outputs Into MinIO/Postgres

Status: Done
Priority: P0
Epic: EPIC-03 Asset Review
Wave: Wave 1

### User Story

As an operator, I want generated images to appear automatically in Asset Review, so that I can review them without moving files manually.

### Acceptance Criteria

- [x] Generated outputs are stored in MinIO.
- [x] Assets are registered in `canonical_asset_registry`.
- [x] Assets are linked to the publication job.
- [x] Assets appear in Asset Review under the correct avatar and scene.
- [x] Duplicate assets are not registered twice.

### Technical Tasks

- [x] Patch the Estefania Comfy Cloud API workflow from `publication_jobs.prompt_pack`.
- [x] Submit or receive generated output metadata from Comfy Cloud.
- [x] Extend auto-ingest runner or create publication ingest runner.
- [x] Add `publicationJobId` metadata to registered assets.
- [x] Update n8n registration workflow if needed.
- [x] Add job asset relation metadata.
- [x] Validate duplicate handling.

### Dependencies

- US-004 or manual Comfy output location.
- Existing MinIO/Postgres infrastructure.

### Notes

- Reuse current auto-ingest as much as possible, but avoid hiding publication context.
- The first concrete Comfy API contract is `avatars/estefania-montealegre/04-production/comfyui/workflows/comfy-cloud-api/estefania-montealegre-api.json`.
- The source Comfy export keeps `SaveImage` connected to the decoded image (`112:8`), while `PreviewImage` shows the `FaceDetailer` output (`112:122`). `ai-gateway` disables the `FaceDetailer` branch by default because this Comfy Cloud environment rejected `sam_hq_vit_l.pth` during validation.

---

## US-008 — Export Publishing Pack

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to export a publishing pack, so that I can manually publish the approved content on social platforms.

### Acceptance Criteria

- [x] Export includes approved image URL or downloadable asset.
- [x] Export includes final caption.
- [x] Export includes hashtags.
- [x] Export includes platform notes and metadata.
- [x] Job status changes to `ready-to-publish`.
- [x] Export is stored and can be reopened later.

### Technical Tasks

- [x] Define `publishing_pack` JSON structure.
- [x] Create endpoint `POST /publications/jobs/export-pack`.
- [x] Store export result in Postgres.
- [x] Add export panel in console.
- [x] Add copy-to-clipboard actions.

### Dependencies

- US-006.
- US-007.

### Notes

- Wave 1 is manual publish/export, not auto-posting.
- Implemented as publication-job export metadata stored in `publication_jobs.metadata.publishingExport`.

---

## US-009 — Mark Publication As Published

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want to mark a publication as published, so that the system records what content was actually used.

### Acceptance Criteria

- [x] Operator can mark a job as published.
- [x] Operator can enter platform and published URL.
- [x] System stores publish timestamp.
- [x] Job status changes to `published`.
- [x] Published jobs remain searchable.

### Technical Tasks

- [x] Add status transition to `published`.
- [x] Add published URL/platform fields.
- [x] Add endpoint `POST /publications/jobs/mark-published`.
- [x] Add UI form.

### Dependencies

- US-008.

### Notes

- Manual publishing is acceptable for Wave 1.
- Implemented as publication-job metadata stored in `publication_jobs.metadata.publishedRecord`.

---

## US-010 — Publication Job Timeline

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want to see the timeline of a publication job, so that I understand what happened and what the next step is.

### Acceptance Criteria

- [x] Each important event is recorded.
- [x] Console shows job status and timeline.
- [x] Errors are visible in human-readable form.
- [x] Operator can identify the next required action.

### Technical Tasks

- [x] Create `publication_job_events` table.
- [x] Add event writes in n8n workflows.
- [x] Add event list endpoint.
- [x] Add timeline component.

### Dependencies

- US-001.

### Notes

- This is the bridge from technical workflow to operator trust.
- Implemented with a timeline endpoint that creates `publication_job_events` and reconstructs key events from the current `publication_jobs` status/metadata, so existing Wave 1 jobs have an operational timeline immediately.

---

## US-011 — Estefanía Business Profile Configuration

Status: Done
Priority: P0
Epic: EPIC-02 Character Profiles
Wave: Wave 1

### User Story

As the system, I need a structured Estefanía business profile, so that prompts and captions follow the influencer-brand strategy.

### Acceptance Criteria

- [x] Estefanía has `businessProfile: influencer-brand`.
- [x] Profile includes brand fit, commercial tone, avoid rules, content pillars, caption style, and visual constraints.
- [x] Profile is stored in a machine-usable format.
- [x] n8n can read the profile.
- [x] Console can display the profile summary.

### Technical Tasks

- [x] Define human-readable avatar profile contract.
- [x] Create JSON schema for character/business profile.
- [x] Create Estefanía profile JSON from existing docs.
- [x] Store profile in repo.
- [x] Add profile load endpoint or n8n workflow.
- [x] Use profile in brief/copy generation.

### Dependencies

- `docs/product/business-intent.md`.
- Estefanía canon documents.

### Notes

- This story can start with repo JSON before moving to Postgres.
- Implemented with `docs/product/avatar-profile.schema.json`, `avatars/estefania-montealegre/profile.json`, an ai-gateway profile loader, n8n profile load webhook, and a console profile summary in the Publications tab.

---

## US-012 — Operator Home / Next Action View

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want a simple home screen that tells me what to do next, so that I can operate the system without knowing its internals.

### Acceptance Criteria

- [x] Home screen shows active publication jobs.
- [x] Jobs are grouped by status.
- [x] Each job shows the next action.
- [x] Operator can jump directly to the required step.
- [x] Technical details are hidden unless technical mode is enabled.

### Technical Tasks

- [x] Add dashboard/home route or tab.
- [x] Create job summary endpoint.
- [x] Add next-action mapping by status.
- [x] Add UI cards/table for job queue.

### Dependencies

- US-001.
- US-010 recommended.

### Notes

- This is important for making the system operable by someone other than the builder.
- Implemented as the console `Home` tab backed by `POST /publications/jobs/summary`, grouped by status with next-action labels and direct jump into the publication job.

---

## US-013 — Publication Job Error Handling And Retry

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want clear errors and retry actions, so that failures do not require SSH or manual n8n debugging.

### Acceptance Criteria

- [x] Failed jobs show a clear error message.
- [x] Operator can retry failed brief/copy/generation steps.
- [x] Retry creates a new event.
- [x] Technical error details are available only in technical mode.

### Technical Tasks

- [x] Define retryable statuses.
- [x] Store error type, message, and raw details.
- [x] Add retry endpoints.
- [x] Add retry buttons in console.

### Dependencies

- US-010.

### Notes

- This can be incremental per step.
- Implemented error recording with `POST /publications/jobs/record-error` and retry preparation with `POST /publications/jobs/retry`. Console retry is enabled for brief, prompt pack, image generation, and copy generation.

---

## US-014 — Validate Existing Asset Review Against Publication Flow

Status: Done
Priority: P0
Epic: EPIC-03 Asset Review
Wave: Wave 1

### User Story

As the product owner, I want to validate the existing Asset Review behavior against the publication workflow, so that we know what can be reused and what must change.

### Acceptance Criteria

- [x] Select asset works end-to-end.
- [x] Promote canonical works end-to-end.
- [x] Reject asset works end-to-end.
- [x] MinIO image URLs work from public/mobile access.
- [x] Actions update Postgres as expected.
- [x] Any mismatch is captured as follow-up US.

### Technical Tasks

- [x] Test actions in deployed console.
- [x] Verify DB state after each action.
- [x] Verify UI refresh behavior.
- [x] Document issues as backlog items.

### Dependencies

- Existing deployed console.

### Notes

- This should be done before heavy publication-job integration.
- Validated against deployed n8n/Postgres on July 18, 2026 with synthetic `us014-validation` assets.
- `select`, `promote canonical`, and `reject` all update `canonical_asset_registry` as expected.
- Fixed a URL mismatch where `/assets/select` returned the internal MinIO fallback (`http://192.168.0.194:9000`) because the console was not sending `baseUrl`. The console now sends the configured MinIO base URL for select actions too.
- Public/mobile image access is through the authenticated console gateway URL, not anonymous MinIO access. Anonymous `HEAD` to `/minio/...` returns `401`, which is expected while the console is protected by login.
- Follow-up captured in US-016 for SQL/string hardening in legacy Asset Review n8n workflows.

## US-015 — Wave 1 Runbook

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want a short runbook for Estefanía production, so that I can follow the workflow consistently.

### Acceptance Criteria

- [x] Runbook explains the Wave 1 flow.
- [x] Runbook explains what each status means.
- [x] Runbook explains common failures.
- [x] Runbook explains when human approval is required.
- [x] Runbook is linked from the console or repo.

### Technical Tasks

- [x] Create operator runbook document.
- [x] Add link from console admin/help area if available.
- [x] Keep runbook aligned with actual UI.

### Dependencies

- US-001 through US-009 shape finalized.

### Notes

- The runbook should be practical, not architectural.
- Implemented as `docs/operations/runbooks/wave-1-estefania-publication.md`.
- Linked from `docs/operations/README.md` and `docs/README.md`. The console does not yet have a dedicated help/docs area, so the repo link satisfies this story without adding a weak UI element.

---

## US-016 — Harden Legacy Asset Review Workflow SQL Handling

Status: Done
Priority: P1
Epic: EPIC-03 Asset Review
Wave: Wave 1

### User Story

As a technical operator, I want legacy Asset Review workflows to handle free-text notes safely, so that review notes with quotes or special characters do not break SQL updates.

### Acceptance Criteria

- [x] Promote canonical accepts review notes containing apostrophes and quotes.
- [x] Reject asset accepts review notes containing apostrophes and quotes.
- [x] Metadata updates always use `COALESCE(metadata, '{}'::jsonb)`.
- [x] Validation test covers normal notes and notes with special characters.

### Technical Tasks

- [x] Refactor SQL builders in legacy promote/reject workflows to use escaped values consistently.
- [x] Re-import and publish updated workflows in n8n.
- [x] Run endpoint tests and verify Postgres state.

### Dependencies

- US-014.

### Notes

- Hardened `Avatares AI - API - Promote Canonical Asset` and `Avatares AI - API - Reject Asset`.
- Validated on July 18, 2026 with synthetic `us016-validation` assets and review notes containing apostrophes and double quotes.
- Confirmed both `review_notes` and `metadata.reviewNotes` persist the exact text.

---

## US-017 — Resolve Comfy Reference Image Contract

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want image generation to use reference images that Comfy Cloud can actually load, so that generation does not fail with missing `LoadImage` files.

### Acceptance Criteria

- [x] Prompt pack no longer passes MinIO `objectPath` as if it were a Comfy local input filename.
- [x] The Comfy handoff contract clearly distinguishes `minioObjectPath`, public/proxy URL, and Comfy input filename.
- [x] `Generate images` submits only reference inputs that are valid for the target Comfy Cloud workflow.
- [x] Existing canonical/reference images can still be used for identity guidance without manual upload by the operator.
- [x] Failure message explains the exact missing reference asset and the expected remediation.

### Technical Tasks

- [x] Inspect the ai-gateway Comfy workflow patcher and identify how node `47: LoadImage` is populated.
- [x] Define a `referenceImage` object contract instead of a plain string.
- [x] Update prompt-pack generation to emit structured reference image metadata.
- [x] Update generation submission to send the new contract to ai-gateway.
- [x] Update ai-gateway patching logic to avoid writing raw MinIO paths into `LoadImage`.
- [x] Validate with an Estefania job using the same scene that failed.

### Dependencies

- US-003.
- US-004.

### Notes

- Root cause found during live Wave 1 testing: Comfy Cloud failed with `The system couldn't load this image` because `LoadImage` received `avatars/estefania-montealegre/raw-image/estefania-raw-image-night-city-20260604T055247-2Z.png`, which exists as a MinIO object path but not as a Comfy Cloud input file.
- We should not require the operator to upload images manually to Comfy Cloud.
- Implemented `comfy-reference-image-v1`. `ai-gateway` now only writes `comfyInputName` into `LoadImage`. MinIO paths remain metadata and never overwrite the template input.
- Server dry-run on July 18, 2026 confirmed the failed `night-city` MinIO path is ignored for `LoadImage`, and the workflow keeps the template's valid input image.

---

## US-018 — Sync MinIO Reference Assets To Comfy Cloud Inputs

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As the system, I want to make required reference images available to Comfy Cloud before submission, so that workflows using `LoadImage` can run without manual file uploads.

### Acceptance Criteria

- [ ] Given a MinIO canonical/reference asset, the system can prepare a Comfy-loadable input.
- [ ] If Comfy Cloud supports upload-by-API, the system uploads the asset and receives/stores the Comfy input filename.
- [ ] If Comfy Cloud supports URL-based loading instead, the workflow patcher uses the URL-compatible node/field.
- [ ] Prepared reference mapping is stored with the generation job metadata.
- [ ] Repeated generation can reuse an already prepared reference image when possible.

### Technical Tasks

- [ ] Confirm Comfy Cloud API support for file upload or URL image input.
- [ ] Add ai-gateway function to download from authenticated MinIO/public proxy and prepare the Comfy input.
- [ ] Store mapping `{ assetId, minioObjectPath, comfyInputName, preparedAt }`.
- [ ] Update generation submission to call preparation before workflow submit.
- [ ] Add server-side validation when preparation fails.

### Dependencies

- US-017.

### Notes

- This is the operational fix if the current Comfy workflow must keep `LoadImage`.
- If US-017 can replace `LoadImage` with URL-compatible input safely, this story may shrink or become unnecessary.

---

## US-019 — Comfy Generation Preflight And Operator Error

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want the console to detect invalid Comfy references before submitting generation, so that failures are clear and recoverable from the console.

### Acceptance Criteria

- [ ] Before Comfy submission, the system validates required reference images and workflow inputs.
- [ ] Missing/unprepared reference images block submission with a clear operator-facing error.
- [ ] The publication job is marked `failed` with a timeline `step-failed` event.
- [ ] Retry becomes available after the missing reference condition is fixed.
- [ ] Technical details are visible only in technical mode.

### Technical Tasks

- [ ] Add preflight validation to `/publications/jobs/generate-images`.
- [ ] Return structured error payloads from ai-gateway.
- [ ] Map Comfy validation errors into `record-error`/timeline.
- [ ] Add a test using the failed `night-city` reference path.

### Dependencies

- US-017.
- US-013.

### Notes

- This prevents silent or confusing Comfy-side failures from becoming an operator guessing game.

---

## US-020 — Poll Comfy Cloud Generation Status

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As an operator, I want the system to check whether a submitted Comfy Cloud generation has finished, so that the console does not stay in `generating` after the image already exists.

### Acceptance Criteria

- [x] After `Generate images`, the system stores the Comfy provider job/prompt id in `generation_jobs.result_payload` or metadata.
- [x] `ai-gateway` exposes a status endpoint that can query Comfy Cloud for that provider job/prompt id.
- [x] A n8n endpoint can refresh one publication job's generation status.
- [x] Completed Comfy status returns output image metadata, including a `cloud.comfy.org/api/view` URL or enough data to build one.
- [x] Failed Comfy status updates the publication job to `failed` with an operator-readable error.

### Technical Tasks

- [x] Inspect actual Comfy Cloud submit response shape from `generation.providerResponse`.
- [x] Add `POST /comfy/publication-status` or equivalent to `ai-gateway`.
- [x] Add n8n workflow `POST /publications/jobs/refresh-generation`.
- [x] Update `generation_jobs` with provider status, output metadata, and completed/failed timestamps.
- [x] Add timeline events for submitted, running, completed, and failed provider states.

### Dependencies

- US-004.
- US-017.

### Notes

- Live testing confirmed Comfy can finish while the console remains `generating`.
- This story does not ingest yet; it only makes provider state visible and durable. Auto-ingest belongs to US-021.

---

## US-021 — Auto-Ingest Completed Comfy Output

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want completed Comfy outputs to be ingested automatically, so that I do not have to copy/paste the output URL after every successful generation.

### Acceptance Criteria

- [x] When a refreshed generation is completed and has output metadata, the system downloads the output through `ai-gateway`.
- [x] The output is stored in MinIO.
- [x] The asset is registered in `canonical_asset_registry`.
- [x] The asset is linked to the publication job and generation job.
- [x] The publication job moves from `generating` to `review-ready`.
- [x] Auto-ingest is idempotent; refreshing the same completed output twice does not create duplicate canonical registry rows.

### Technical Tasks

- [x] Reuse the current `/publications/jobs/ingest-comfy-output` logic where possible.
- [x] Add an auto-ingest path that accepts provider output metadata instead of a manually pasted URL.
- [x] Store `latestGeneratedAssetId`, bucket, object path, sha256, and source output URL in job metadata.
- [x] Add timeline event `output-ingested`.
- [x] Validate against an already completed Comfy job.

### Dependencies

- US-020.
- US-005.

### Notes

- Manual ingest remains useful as fallback, but it should not be the normal happy path.
- `Avatares AI - Publications - Ingest Comfy Output` is now both webhook-callable and workflow-callable so `refresh-generation` can trigger it automatically.

---

## US-022 — Console Auto-Refresh For Generating Jobs

Status: Done
Priority: P1
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want the console to refresh generating jobs automatically, so that the next action appears when Comfy finishes without manual reloads or guesswork.

### Acceptance Criteria

- [x] When an open publication job is `generating`, the console periodically calls the refresh-generation endpoint.
- [x] The operator sees a clear status such as `Submitted`, `Running`, `Completed`, `Ingesting`, or `Failed`.
- [x] When auto-ingest succeeds, the UI shows the generated asset and enables selection.
- [x] Polling stops when the job reaches `review-ready`, `failed`, or another terminal/recoverable state.
- [x] Manual `Refresh` remains available.

### Technical Tasks

- [x] Add polling to `PublicationsPanel` for `generating` jobs.
- [x] Add UI copy/status for provider progress.
- [x] Refresh timeline after each status change.
- [x] Avoid duplicate concurrent refresh requests.

### Dependencies

- US-020.
- US-021.

### Notes

- This is the visible operator experience after provider polling and auto-ingest exist.

---

## US-024 — Anatomy-Aware Composition Policy

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want the system to improve visible hands and feet instead of hiding them by default, so that Estefania can produce realistic lifestyle scenes without over-cropping every image.

### Acceptance Criteria

- [x] Prompt packs no longer reject visible feet by default.
- [x] Prompt packs ask for anatomically correct feet when visible.
- [x] Prompts avoid making hands or feet the focal point unless intentionally requested.
- [x] Negative prompts reject malformed feet, distorted toes, awkward foot crops, and distorted hands.
- [x] Composition policy explains when visible feet are acceptable.

### Technical Tasks

- [x] Update `Avatares AI - Publications - Generate Prompt Pack`.
- [x] Replace safe-crop-only policy with anatomy-aware composition.
- [x] Rename generator version to `n8n-publication-prompt-pack-v4-anatomy-aware-composition`.

### Dependencies

- US-023.

### Notes

- This improves prompt behavior but does not replace a future image QA/correction pass.

---

## US-026 — Generation Attempt History

Status: Done
Priority: P0
Epic: EPIC-04 Admin Operations
Wave: Wave 1

### User Story

As an operator, I want to see every generation attempt for a publication job, so that repeated submissions do not hide previous outputs or create confusion about which image is current.

### Acceptance Criteria

- [x] The publication job loader returns recent generation attempts.
- [x] The console shows attempt id, generation status, provider status, linked asset, and updated time.
- [x] The newest attempt remains the active generation while older attempts remain visible.
- [x] The operator can distinguish submitted/running attempts from review-ready attempts.

### Technical Tasks

- [x] Extend `POST /publications/jobs/list` to include `generationAttempts`.
- [x] Add generation-attempt types to the console.
- [x] Add attempts table to `PublicationsPanel`.

### Dependencies

- US-020.
- US-021.

### Notes

- This does not yet add side-by-side candidate comparison; it makes the existing attempts visible.

---

## US-027 — Publication Candidate Quality Review Criteria

Status: Done
Priority: P1
Epic: EPIC-03 Asset Review
Wave: Wave 1

### User Story

As an operator, I want a clear quality checklist for generated publication candidates, so that I can consistently reject bad identity, bad hands/feet, or unusable compositions.

### Acceptance Criteria

- [x] The publication review UI shows quality criteria: identity, face, hands, feet, composition, brand fit, publishability.
- [x] Rejection reasons can be selected from a structured list.
- [x] Rejection notes are saved with the asset/job.
- [x] Candidate quality criteria distinguish `reject for publication` from `reject as canonical identity`.

### Technical Tasks

- [x] Add quality criteria metadata to docs/product.
- [x] Add rejection reason controls to publication candidate UI.
- [x] Persist structured review metadata.

### Dependencies

- US-026.

---

## US-028 — Dedicated Identity Reference Sync

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As the system, I want approved identity references from MinIO to be prepared as Comfy-loadable inputs, so that generation uses the actual canonical Estefania images instead of relying on manually uploaded Comfy files.

### Acceptance Criteria

- [x] Canonical MinIO assets can be prepared for Comfy Cloud input usage through `metadata.comfyInputName`.
- [x] Prepared references store `comfyInputName` in registry metadata.
- [x] Prompt pack `identityReferences` prefer prepared canonical references.
- [x] Generation submission fails with a clear error if no prepared identity reference exists.

### Technical Tasks

- [x] Complete the Wave 1 reference contract by requiring `comfyInputName` before submission.
- [x] Add prepared-reference cache metadata.
- [x] Add operator-facing preflight error.

### Dependencies

- US-018.
- US-019.

---

## US-029 — Automated Image QA And Correction Pass

Status: Done
Priority: P1
Epic: EPIC-06 AI Provider Router
Wave: Wave 1

### User Story

As the system, I want to detect obvious anatomy and identity problems after generation, so that bad candidates are flagged or corrected before the operator wastes time reviewing them.

### Acceptance Criteria

- [x] Generated outputs can be scored for face consistency, hand/foot risk, and composition risk.
- [x] High-risk outputs are flagged in the console.
- [x] The system can optionally flag a correction/inpaint recommendation for hands/feet.
- [x] QA results are stored with generated asset metadata.

### Technical Tasks

- [x] Evaluate lightweight visual QA provider/model options.
- [x] Add QA metadata schema.
- [x] Add n8n QA metadata step after auto-ingest.
- [x] Add console QA badges.

### Dependencies

- US-027.
- US-028.

---

## US-030 — Comfy Cloud Reference Upload Adapter

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want to upload or register approved MinIO identity references into Comfy Cloud automatically, so that operators do not manually upload reference files before generation.

### Acceptance Criteria

- [x] `ai-gateway` exposes a reference preparation endpoint for canonical assets.
- [x] The adapter downloads the MinIO object and uploads/registers it with the Comfy Cloud API.
- [x] The resulting Comfy input filename is stored as `metadata.comfyInputName` on the registry asset.
- [x] Repeated preparations reuse cached `comfyInputName` when the source asset already has one.
- [x] Operator receives a clear failure if the Comfy upload API rejects the file.

### Technical Tasks

- [x] Confirm and implement the Comfy-compatible `/upload/image` input contract behind configuration.
- [x] Add `/comfy/prepare-reference` to `ai-gateway`.
- [x] Add n8n workflow or callable node to prepare canonical references.
- [x] Add console action/status for reference preparation.

### Dependencies

- US-028.

---

## US-031 — Pixel-Level Visual QA Provider

Status: Done
Priority: P1
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want a visual QA provider to inspect generated images, so that face drift, hands, feet, and composition problems are detected from pixels instead of prompt heuristics.

### Acceptance Criteria

- [x] QA provider receives the generated image URL or object bytes.
- [x] QA returns identity, face, hands, feet, composition, and publishability scores.
- [x] QA flags are stored in `metadata.qa`.
- [x] Console shows QA flags and blocks one-click selection when status is `blocked`.
- [x] Correction recommendations can be routed to a future inpaint/correction workflow.

### Technical Tasks

- [x] Add configurable OpenAI-compatible visual QA provider support.
- [x] Add `/publication-image-qa` to `ai-gateway`.
- [x] Call QA after ingest and before `review-ready`.
- [x] Keep heuristic fallback explicit when no visual QA provider is configured.

### Dependencies

- US-029.

### Notes

- Pixel-level QA is active when `VISUAL_QA_API_KEY`, `VISUAL_QA_BASE_URL`, and `VISUAL_QA_MODEL` are configured. Without those variables, the system returns an explicit heuristic result and does not pretend to inspect pixels.

---

## US-032 — Auto-Prepare References Before Image Generation

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As an operator, I want `Generate images` to prepare required Comfy references automatically, so that image generation is one operational step and I do not need to remember a separate reference-preparation action.

### Acceptance Criteria

- [x] `Generate images` checks prompt-pack identity references before submitting to Comfy.
- [x] Missing `comfyInputName` references are prepared automatically by calling the reference preparation workflow.
- [x] Generation continues only after references are prepared and the prompt pack has been updated.
- [x] If reference preparation fails, image generation is blocked with a clear error and no Comfy generation is submitted.
- [x] Manual `Prepare references` remains available only in technical mode.

### Technical Tasks

- [x] Insert reference preparation into `Avatares AI - Publications - Generate Images`.
- [x] Re-load the updated prompt pack after preparation.
- [x] Hide the manual prepare button from standard operators.
- [x] Validate without submitting a new Comfy generation.

### Dependencies

- US-030.

---

## US-023 — Stabilize Estefania Identity And Safe Composition

Status: Done
Priority: P0
Epic: EPIC-01 Publications
Wave: Wave 1

### User Story

As an operator, I want Estefania image generations to use safer composition and stronger identity guidance, so that outputs are less likely to drift from the approved face or produce bad feet/hands.

### Acceptance Criteria

- [x] Prompt packs include an explicit safe-composition policy for Estefania.
- [x] Default publication prompts avoid full-body framing and visible feet.
- [x] Negative prompts include face drift, asymmetry, bad feet, malformed toes, and distorted hands.
- [x] Prompt packs separate identity references from scene references in metadata.
- [x] The generated prompt pack explains that the first reference is the primary identity/scene anchor.
- [x] Existing broken/incomplete publication jobs are cleaned from the live server so operators do not continue from bad state.

### Technical Tasks

- [x] Update `Avatares AI - Publications - Generate Prompt Pack`.
- [x] Add `compositionPolicy` to prompt packs.
- [x] Add `identityReferences` and `sceneReferences` arrays derived from approved registry assets.
- [x] Deploy the updated workflow to n8n.
- [x] Clean incomplete `publication_jobs` rows and orphaned failed/running `generation_jobs` rows from live Postgres.

### Dependencies

- US-017.
- US-020.
- US-021.

### Notes

- This does not solve high-fidelity identity by itself. It reduces obvious failure cases while US-018 and future identity-control work make reference handling stronger.
- Operators should reject images with face drift, malformed feet, bad hands, or full-body artifacts.

---

## Wave 1 Checklist

### P0

- [x] US-001 — Create Publication Job
- [x] US-002 — Generate Publication Brief With DeepSeek
- [x] US-003 — Generate Prompt Pack For Comfy Cloud
- [x] US-004 — Submit Generation Job To Comfy Cloud
- [x] US-005 — Ingest Generated Outputs Into MinIO/Postgres
- [x] US-005A — Reopen Existing Publication Jobs
- [x] US-006 — Select Publication Asset
- [x] US-007 — Generate Caption / Copy Pack
- [x] US-008 — Export Publishing Pack
- [x] US-009 — Mark Publication As Published
- [x] US-011 — Estefanía Business Profile Configuration
- [x] US-014 — Validate Existing Asset Review Against Publication Flow
- [x] US-017 — Resolve Comfy Reference Image Contract
- [x] US-018 — Sync MinIO Reference Assets To Comfy Cloud Inputs
- [x] US-020 — Poll Comfy Cloud Generation Status
- [x] US-021 — Auto-Ingest Completed Comfy Output
- [x] US-023 — Stabilize Estefania Identity And Safe Composition
- [x] US-024 — Anatomy-Aware Composition Policy
- [x] US-026 — Generation Attempt History
- [x] US-028 — Dedicated Identity Reference Sync
- [x] US-030 — Comfy Cloud Reference Upload Adapter
- [x] US-032 — Auto-Prepare References Before Image Generation
- [x] US-033 — Operator-First Publications Flow Cleanup
- [x] US-036 — Local Anatomy QA Provider For Generated Avatars
- [x] US-038 — AI-Owned Prompt Pack Generation
- [x] US-035 — Compact Publication Workspace UX
- [x] US-034A — Automatic Defective Image Classification
- [x] US-034B — Automatic QA Remediation Loop
- [x] US-039 — Human Review Feedback Into Future Prompts

### P1

- [x] US-010 — Publication Job Timeline
- [x] US-012 — Operator Home / Next Action View
- [x] US-013 — Publication Job Error Handling And Retry
- [x] US-016 — Harden Legacy Asset Review Workflow SQL Handling
- [x] US-015 — Wave 1 Runbook
- [x] US-019 — Comfy Generation Preflight And Operator Error
- [x] US-022 — Console Auto-Refresh For Generating Jobs
- [x] US-027 — Publication Candidate Quality Review Criteria
- [x] US-029 — Automated Image QA And Correction Pass
- [x] US-031 — Pixel-Level Visual QA Provider

---

## US-033 — Operator-First Publications Flow Cleanup

Status: Done
Priority: P0
Epic: EPIC-04 Admin Operations
Wave: Wave 1 Stabilization

### User Story

As an operator, I want the console to present one clear Estefania publication path, so that I can run the Wave 1 flow without choosing between legacy/manual workflows or technical implementation steps.

### Acceptance Criteria

- [x] The standard operator sees `Publications` as the primary publication workflow.
- [x] Legacy/manual `Content Cycle` is hidden from standard operation and available only through technical mode.
- [x] Internal reference preparation is not exposed as a standard operator action.
- [x] `Publications` shows a clear recommended next action for the current job.
- [x] Raw technical identifiers and JSON remain available where needed, but do not define the normal operating path.

### Technical Tasks

- [x] Hide `Content Cycle` tab unless technical mode is enabled.
- [x] Redirect away from `Content Cycle` when technical mode is disabled.
- [x] Gate manual `Prepare references` behind technical mode.
- [x] Add operator-facing job status and next-action labels in `Publications`.
- [x] Validate the console build.

### Dependencies

- US-010.
- US-012.
- US-032.

---

## US-035 — Compact Publication Workspace UX

Status: Done
Priority: P0
Epic: EPIC-04 Admin Operations
Wave: Wave 1 Stabilization

### User Story

As an operator, I want the publication workspace to be organized by focused stages instead of one long vertical page, so that I can complete a publication without excessive scrolling or hunting for the next button.

### Acceptance Criteria

- [x] `Publications` has internal stage navigation for the active job.
- [x] Stages include at minimum: `Job`, `Brief`, `Prompt`, `Images`, `Review`, `Copy`, `Publish`.
- [x] Only the selected stage is expanded by default.
- [x] The recommended next action remains visible without scrolling.
- [x] The primary action for the current stage is visible near the top of the workspace.
- [x] Brief, prompt pack, and copy pack show operator-readable summaries by default.
- [x] Raw JSON editing is available only in technical mode or behind an explicit raw editor control.
- [x] Image generation status and image review are visually separated.
- [x] Publishing shows the final image, caption, hashtags, copy buttons, published URL field, and `Mark published` action without excessive scrolling.
- [x] Existing job loading, timeline, retry, QA badges, and technical diagnostics remain available.

### Technical Tasks

- [x] Add publication stage state and stage navigation to `PublicationsPanel`.
- [x] Move long sections behind stage-specific rendering.
- [x] Add a sticky recommended-action bar for the active job.
- [x] Create compact summary renderers for brief, prompt pack, copy pack, and generation state.
- [x] Move raw JSON textareas behind technical/raw edit controls.
- [x] Split image generation state from publication asset review controls.
- [x] Make the publish stage focused on manual Instagram publishing.
- [x] Validate responsive behavior on desktop and mobile widths.

### Dependencies

- US-010.
- US-012.
- US-033.

### Notes

- This story should be completed before expanding automatic QA remediation. Otherwise the remediation loop will add more state to an already long screen.
- This is a UX restructuring story, not a change to publication semantics or automated publishing.
- Implemented as stage navigation in the Publications console. Standard mode renders the selected stage only; technical mode can still expose diagnostics.

---

## US-034A — Automatic Defective Image Classification

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want visual QA to automatically classify clearly defective Comfy outputs, so that unusable images are marked without requiring the operator to manually inspect every obvious failure.

### Acceptance Criteria

- [x] Every ingested Comfy output receives a structured QA decision: `pass`, `review_required`, or `blocked`.
- [x] `blocked` outputs are automatically marked as defective for the publication job.
- [x] Defective outputs remain stored and traceable, but are not offered as the recommended publication candidate.
- [x] The defect reason is stored with the asset metadata and generation attempt.
- [x] The console shows the defective status, QA flags, scores, and notes.
- [x] The operator can still inspect defective outputs in technical/admin review.
- [x] The system does not publish, select, or canonize any image automatically.

### Technical Tasks

- [x] Define `defective` handling in publication asset metadata.
- [x] Extend `publication-image-qa` response normalization with defect severity.
- [x] Update `Avatares AI - Publications - Ingest Comfy Output` to persist defect decisions.
- [x] Update job metadata with latest usable candidate vs latest defective candidate.
- [x] Update Publications UI to separate usable candidates from defective attempts.
- [x] Add timeline event `image-defective` when QA blocks an output.

### Dependencies

- US-021.
- US-026.
- US-031.
- US-035.

### Notes

- This story does not regenerate images. It only makes the system confident and explicit about bad outputs.
- Defective means unsuitable for the current publication flow, not necessarily deleted from storage.
- Current console behavior keeps generated outputs visible with image preview, QA status, flags, defect status, and scores. Blocked assets are marked as QA-blocked and are not automatically selectable/canonical.

---

## US-036 — Local Anatomy QA Provider For Generated Avatars

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want a local visual QA service to detect obvious anatomy defects in generated avatar images, so that broken outputs can be blocked without depending on paid external vision providers.

### Acceptance Criteria

- [x] A local `local-visual-qa` service exists for the Ubuntu server stack.
- [x] The service is designed to run inside the internal Docker network.
- [x] The service accepts generated image bytes or base64 input.
- [x] The service returns structured QA output compatible with `publication-image-qa-v1`.
- [x] The service can detect obvious person/body defects such as no detectable person and low-confidence pose.
- [x] The service returns `pass`, `review_required`, or `blocked`.
- [x] `ai-gateway` can use the local service when `VISUAL_QA_PROVIDER=local`.
- [x] If the local service is unavailable, `ai-gateway` falls back safely to explicit heuristic QA.
- [x] The implementation is documented with server requirements and operating notes.
- [x] The service is validated against known good, review-required, and defective Estefanía images generated during Wave 1.
- [x] The service is deployed to `~/local-ai-stack`.

### Technical Tasks

- [x] Add `infra/local-visual-qa` service.
- [x] Implement CPU-friendly pose/anatomy checks with MediaPipe/OpenCV.
- [x] Add Dockerfile and compose service snippet.
- [x] Add `/health` and `/qa/anatomy` endpoints.
- [x] Extend `ai-gateway` visual QA routing for `VISUAL_QA_PROVIDER=local`.
- [x] Normalize local QA output into existing `metadata.qa` schema.
- [x] Deploy service to `~/local-ai-stack`.
- [x] Configure server env for local QA.
- [x] Validate after Docker restart.

### Dependencies

- US-031.
- US-034A.

### Notes

- This service is a first-pass anatomy filter, not a final identity or aesthetic judge.
- GTX 1050 is available after driver reboot, but MVP remains CPU-compatible because VRAM is only 2 GB.
- Validation found that `very_strict` created false positives on usable waist-up night-city images. Production strictness was moved back to `strict`.

### Validation Evidence

| Image | Visual read | QA result | Notes |
| --- | --- | --- | --- |
| `estefania-raw-image-nature-cabin-20260725T221529-1Z.png` | Usable candidate | `review_required` | Local QA did not block; human review still useful. |
| `estefania-raw-image-airport-20260725T223647-1Z.png` | Defective hand/object interaction | `blocked` / `ambiguous-hand-object-interaction` | User observed coffee cup plus phone with apparent extra hands. |
| `estefania-raw-image-airport-20260725T225825-1Z.png` | Better candidate | `review_required` / `weak-right_arm-keypoints` | QA preserved candidate for review instead of blocking. |
| `estefania-raw-image-airport-20260725T233309-1Z.png` | Defective hand/object interaction | `blocked` / `ambiguous-hand-object-interaction` | Confirmed blocked output remains inspectable. |
| `estefania-raw-image-night-city-20260726T013426-1Z.png` | Much better candidate | `review_required` / `weak-right_leg-keypoints` | `defective=false`; scores around `0.72`; exposed in console after dashboard update. |

---

## US-038 — AI-Owned Prompt Pack Generation

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As an operator, I want the system to generate the final image prompt intelligently without requiring me to inspect or repair JSON, so that publication image generation feels magical instead of engineering-heavy.

### Acceptance Criteria

- [x] DeepSeek generates the final `promptPack` consumed by the Comfy generation workflow.
- [x] The generated prompt pack uses one coherent pose/composition instead of combining contradictory template fragments.
- [x] The generated prompt pack includes operator-readable summary fields.
- [x] The standard console hides raw prompt JSON from non-technical operation.
- [x] Raw prompt JSON remains available only in technical mode.
- [x] n8n stores prompt provider metadata for auditability.
- [x] Prompt guardrails preserve Estefania's identity and brand fit while allowing natural variation in confidence, posture, and expressiveness.
- [x] Validate at least 3 new image generations against the AI-owned prompt-pack flow.

### Technical Tasks

- [x] Add `POST /publication-prompt-pack` to `ai-gateway`.
- [x] Route `Avatares AI - Publications - Generate Prompt Pack` through `ai-gateway`.
- [x] Store `promptPackProvider` and `promptPackProviderMeta`.
- [x] Keep references and technical prompt fields server-side.
- [x] Add standard-mode prompt summary in the Publications console.
- [x] Deploy `ai-gateway`, n8n workflow, and dashboard changes.
- [x] Keep Estefania character-tone guidance broad enough to avoid over-constraining natural variation.
- [x] Update the operator runbook with the new prompt behavior.

### Dependencies

- US-023.
- US-024.
- US-030.
- US-032.
- US-033.

### Notes

- Root-cause analysis showed DeepSeek's brief was reasonable, but the old n8n prompt template produced "prompt soup" by combining contradictory pose and framing fragments.
- The operator should not validate JSON. DeepSeek owns the final prompt pack, and the console presents a human summary by default.
- Early post-change generations improved substantially. Estefania can appear a little more relaxed/assertive in some scenes; this is acceptable variation for now and should be monitored rather than blocked.
- Validation covered multiple post-change airport and night-city generations reviewed in the console, including both `review_required` and blocked QA outcomes.

---

## US-034B — Automatic QA Remediation Loop

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want blocked/defective Comfy outputs to trigger controlled regeneration attempts, so that the pipeline can keep working until it finds a valid candidate or reaches a safe attempt limit.

### Acceptance Criteria

- [x] When QA marks an output as `blocked`, the system can create a corrective regeneration attempt automatically.
- [x] The remediation loop stops when a generated output receives `pass`.
- [x] The remediation loop stops and asks for human review when all attempts are exhausted.
- [x] The maximum number of automatic attempts is configurable and defaults to `3`.
- [x] The system stores parent/child attempt relationships.
- [x] Corrective prompt changes are derived from QA flags and stored with the new attempt.
- [x] Identity-critical failures can stop the loop immediately when configured.
- [x] The console shows all attempts, their QA result, defect reason, and whether another attempt is pending.
- [x] The system never publishes automatically.
- [x] The system never promotes an image to canonical automatically.

### Technical Tasks

- [x] Add remediation policy configuration to the publication generation workflow.
- [x] Add attempt counting and loop guard in n8n/Postgres.
- [x] Generate corrective prompt deltas from QA flags.
- [x] Re-submit Comfy generation with the corrected prompt pack.
- [x] Link new generation attempts to the source defective attempt.
- [x] Auto-refresh/poll each remediation attempt until completed or failed.
- [x] Add timeline events: `remediation-started`, `remediation-submitted`, `remediation-exhausted`, `remediation-passed`.
- [x] Update Publications UI to show remediation progress and final candidate state.

### Dependencies

- US-034A.
- US-020.
- US-021.
- US-026.
- US-031.
- US-035.

### Notes

- This is an automation loop, not an autonomous publishing loop.
- Cost control is mandatory: no infinite retries, no hidden repeated Comfy submissions.
- The first implementation should prefer full regeneration with safer prompt deltas. Inpaint/correction can be a later story.
- Implemented with `qa-remediation-v1`, default `maxAttempts=3`, prompt delta appended to the remediation generation prompt, and auto-submit during console polling when an ingested image is blocked.

---

## US-039 — Human Review Feedback Into Future Prompts

Status: Done
Priority: P0
Epic: EPIC-06 AI Provider Router
Wave: Wave 1 Stabilization

### User Story

As the system, I want human review checklist decisions, rejection reasons, and review notes to inform future prompt packs and remediation attempts, so that operator feedback improves later images instead of remaining only as audit metadata.

### Acceptance Criteria

- [x] Quality checklist values are persisted as structured review feedback for selected and rejected assets.
- [x] Rejection reasons are mapped to prompt guidance categories such as identity, hands, feet, composition, brand fit, and publishability.
- [x] Review notes are summarized into concise, non-technical prompt guidance before being sent to DeepSeek.
- [x] Future prompt-pack generation can include recent relevant human feedback for the same avatar/scene.
- [x] QA remediation attempts can merge automatic QA flags with human rejection reasons when available.
- [x] The console shows when human feedback influenced a prompt or remediation attempt.
- [x] The system does not train a model or alter canonical identity automatically from review notes.
- [x] Feedback influence is capped to avoid overfitting to one operator comment or one bad generation.

### Technical Tasks

- [x] Define `publication-human-feedback-v1` metadata schema.
- [x] Extend select/reject workflows to persist normalized feedback.
- [x] Add a feedback lookup step for recent same-avatar/same-scene reviews.
- [x] Add feedback summarization in `ai-gateway` or n8n before prompt-pack generation.
- [x] Inject summarized feedback into `/publication-prompt-pack` context.
- [x] Inject rejection-reason prompt deltas into QA remediation when applicable.
- [x] Add UI indicator showing feedback was used.
- [ ] Validate with at least 3 feedback-driven regenerations.

### Dependencies

- US-027.
- US-034A.
- US-034B.
- US-038.

### Notes

- This story turns review controls from passive curation metadata into active prompt memory.
- Feedback must stay advisory. A single note should not permanently redefine Estefania or the scene.
- Implemented on July 26, 2026. Remaining validation is live operator sampling across multiple feedback-driven regenerations.

---

## US-040 — Operator Studio Information Architecture

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want the console to be organized around characters, work queues, and clear next actions instead of internal systems, so that I can manage multiple AI characters without needing to understand jobs, workflows, prompt packs, ingest details, or technical IDs.

### Problem Statement

The current console has gained significant operational value, but it still reflects how the system was built rather than how a non-technical operator thinks. The same operator action can appear across `Home`, `Asset Review`, and `Publications`; technical concepts such as job IDs, prompt packs, Comfy status, ingest, QA remediation, and timeline events leak into the standard experience; and the home view works more like a job queue than a business/character dashboard.

This becomes a scaling risk as soon as the system manages more than one character.

### Acceptance Criteria

- [x] Define a new top-level navigation model that separates `Studio` work from `Ops/Admin` work.
- [x] Define the non-technical Studio pages required to manage multiple characters.
- [x] Define the Ops/Admin pages required to monitor and operate the underlying system.
- [x] Map current pages/components to the proposed new information architecture.
- [x] Identify duplicated or overlapping experiences, especially `Asset Review` vs publication image review.
- [x] Define which concepts are hidden from standard mode and remain available only in technical/debug mode.
- [x] Define human-readable labels for job, generation, QA, publication, and error states.
- [x] Define the dashboard metrics needed to understand character activity at a glance.
- [x] Define the primary operator workflows and the single recommended next action for each workflow state.
- [x] Define a migration path that preserves the current working console while new pages are introduced.
- [x] Produce implementation stories for the first Studio dashboard, unified review inbox, simplified publication workspace, and Ops/Admin dashboard.
- [x] Validate the proposed IA against the Estefania flow before implementing UI changes.

### Proposed Studio IA

- `Dashboard`: cross-character activity, active jobs, review queue, publish-ready content, QA blocks, recent successes/failures, and primary next actions.
- `Characters`: per-character overview with identity/canonical state, active scenes, recent assets, quality trends, publication activity, and character-level actions.
- `Production`: publication/content jobs grouped by operator state such as preparing, generating, needs review, copy ready, publish ready, published, and needs attention.
- `Review`: unified image review inbox for publication candidates and asset/canonical decisions.
- `Publish`: final publishing queue with approved image, caption, hashtags, copy actions, and published URL recording.

### Proposed Ops/Admin IA

- `Ops Dashboard`: system health, active workers, recent failures, stuck jobs, ingest status, gateway/Comfy/n8n status, and backup freshness.
- `Ingest`: ingest profiles, watcher controls, manual pipeline runs, and last-run preview.
- `Catalogs`: avatars, scenes, asset types, workflows, and models.
- `Backups`: backup creation, listing, and restore/recovery guidance.
- `Access`: user access and approval controls.
- `Technical Debug`: raw IDs, JSON payloads, timelines, provider metadata, workflow diagnostics, and low-level retry/debug tools.

### Technical Tasks

- [x] Audit current routes, tabs, panels, and operator actions.
- [x] Inventory all standard-mode technical leaks.
- [x] Draft the new navigation hierarchy and page responsibilities.
- [x] Draft state-label taxonomy for publications, assets, QA, generation, and publishing.
- [x] Draft dashboard KPI definitions and required API/data gaps.
- [x] Draft unified review inbox behavior and decision model.
- [x] Draft simplified publication workspace behavior.
- [x] Draft Ops/Admin dashboard behavior.
- [x] Split the implementation into follow-up US-041+ stories.
- [x] Review the proposal with product/operator perspective before coding.

### Out Of Scope

- Building the new dashboard UI.
- Rewriting `PublicationsPanel`.
- Changing backend workflow behavior.
- Removing existing technical/admin screens.
- Adding support for a new character.

### Dependencies

- US-033.
- US-035.
- US-036.
- US-038.
- US-039.

### Notes

- This is a product architecture story, not a visual polish task.
- Current pages should keep working while the new IA is introduced.
- The goal is not to hide capability; the goal is to put capability behind the right mental model.
- A non-technical operator should not need to know what n8n, Comfy, prompt packs, ingest, or metadata are in order to create and publish content.
- Delivered in `docs/product/operator-studio-information-architecture.md`.

---

## US-041 — Character Activity Dashboard

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want a Studio dashboard that summarizes character activity, pending work, QA issues, and publish-ready content, so that I can understand what needs attention without opening technical pages.

### Acceptance Criteria

- [x] Dashboard is the default standard-mode landing page.
- [x] Dashboard shows active characters with current production/review/publish counts.
- [x] Dashboard shows active publication jobs grouped by human next action.
- [x] Dashboard shows images awaiting review.
- [x] Dashboard shows QA-blocked or failed items as attention cards.
- [x] Dashboard shows publish-ready items.
- [x] Dashboard shows recent successes/failures.
- [x] Dashboard provides a primary `Create publication` action.
- [x] Dashboard can open the relevant production/review/publish task directly.
- [x] Dashboard hides raw IDs and technical provider details in standard mode.

### Technical Tasks

- [x] Reuse or extend publication summary APIs for cross-character metrics.
- [x] Add dashboard data adapter in the console.
- [x] Build dashboard cards for characters, queues, attention items, and publish-ready items.
- [x] Add human state labels from US-040.
- [x] Preserve current `OperatorHomePanel` until replacement is validated.

### Dependencies

- US-040.

### Notes

- Implemented as the new standard `Studio Dashboard` inside `OperatorHomePanel`.
- MVP uses the existing publication jobs summary endpoint with `includePublished=true` and no avatar filter.
- Deeper analytics such as acceptance rate, regeneration rate, QA score trends, and per-character quality history require follow-up data work.
- Post-review refinement compacted the global header, moved user controls into a profile chip/menu, removed the body-level user card, and upgraded the recommended next-action hero into a contextual task card.

---

## US-042 — Unified Review Inbox

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want one review inbox for generated images, publication candidates, and canonical/reference decisions, so that I do not need to know whether an image belongs to Asset Review or Publications before deciding what to do with it.

### Acceptance Criteria

- [x] Review inbox combines publication candidates and asset/canonical review candidates in one standard-mode queue.
- [x] Each review item shows image preview, character, scene, source context, QA status, and recommended action.
- [x] Operator can approve for publication when the image belongs to a publication job.
- [x] Operator can reject and request another attempt when supported.
- [x] Operator can reject as not suitable for canonical/reference use.
- [x] Canonical promotion is permission-gated or technical/admin only.
- [x] Human feedback checklist and notes are available from the review item.
- [x] QA flags are shown in human language.
- [x] Raw asset IDs, metadata, and provider details are hidden unless technical mode is enabled.
- [x] Existing Asset Review and Publications flows continue working during migration.

### Technical Tasks

- [x] Define unified review item view model.
- [x] Reuse existing asset review and publication APIs where possible.
- [x] Add source-aware actions for publication select/reject and canonical review.
- [x] Preserve `publication-human-feedback-v1` persistence.
- [x] Add filters for character, scene, queue, QA status, and source.

### Dependencies

- US-027.
- US-034A.
- US-039.
- US-040.

### Notes

- Review Inbox now shows a humanized quality check with QA status, visible flags/reasons, and confidence scores when available.
- Items blocked by QA cannot be selected from the standard inbox, but the operator can still request another generation.
- Standard-mode filters now include character, scene, queue, QA status, and source. Source is currently publication-only until canonical/reference candidates are merged into the inbox.
- Review Inbox now merges publication candidates with raw asset/reference candidates. Publication items can be selected or regenerated, while asset/reference candidates can be rejected as unsuitable from the same queue.
- Canonical promotion remains intentionally technical/admin-only in the legacy grid to avoid accidental identity changes from the standard inbox.

- MVP adds a standard-mode `Review Inbox` focused on publication candidates from the summary endpoint.
- Publication candidates can now be selected or rejected inline with a quick review note.
- `Needs another try` now rejects the current image and submits another Comfy Cloud generation for the same publication job.
- Technical mode still exposes the legacy Asset Review grid for canonical/reference actions.
- Full completion requires bringing raw/canonical asset candidates into the same inbox and adding inline feedback/actions instead of opening the publication workspace.

---

## US-042A — Review Inbox Regenerate After Rejection

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want `Needs another try` in the Review Inbox to reject the current image and immediately request a replacement, so that review work feels operational instead of requiring me to open the publication workspace for the common rejection path.

### Acceptance Criteria

- [x] `Needs another try` persists the rejection and human feedback for the current image.
- [x] After rejection succeeds, the inbox submits a new image generation for the same publication job.
- [x] The new generation uses the existing publication prompt pack and Comfy Cloud generation endpoint.
- [x] The inbox shows a success message when the replacement generation is submitted.
- [x] If regeneration fails after rejection, the operator sees a safe error and can open the publication workspace.
- [x] The system does not publish, select, or canonize any image automatically.
- [x] Existing backend generation preflight and safety checks still apply.

### Technical Tasks

- [x] Call `rejectAsset` with `publication-quality-review-v1` notes from Review Inbox.
- [x] Call `generatePublicationImages` after successful rejection.
- [x] Refresh Review Inbox after the replacement request.
- [x] Keep the full publication workspace available for advanced retry/remediation.

### Dependencies

- US-042.
- US-034B.

### Notes

- This is not a new remediation loop. It is an operator-triggered replacement request from the inbox.
- Attempt limits and deeper remediation policy remain owned by the generation workflows.

---

## US-043 — Simplified Publication Workspace

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want a simplified publication workspace that shows one safe next action at a time, so that I can create, review, package, and publish content without understanding brief JSON, prompt packs, Comfy, ingest, timelines, or internal IDs.

### Acceptance Criteria

- [x] Standard workspace shows a single recommended next action prominently.
- [x] Workspace summarizes creative direction without raw brief JSON.
- [ ] Workspace summarizes visual direction without raw prompt pack JSON.
- [ ] Image generation state is shown as human status, not provider status.
- [x] Latest generated image and QA guidance are visible in the same workspace.
- [ ] Review decision controls are visible only when image review is the next action.
- [ ] Copy and publishing controls are visible only when relevant.
- [x] Timeline, IDs, prompt JSON, provider metadata, and raw events move to technical/debug mode.
- [x] Existing `PublicationsPanel` remains available or recoverable during migration.
- [ ] Workspace can load an existing publication job from Dashboard/Production.

### Technical Tasks

- [ ] Extract reusable human state and next-action helpers.
- [ ] Create standard-mode publication workspace component.
- [ ] Move technical sections behind a debug/details boundary.
- [x] Reuse existing publication APIs.
- [ ] Add transition links from Dashboard, Production, Review, and Publish.

### Dependencies

- US-038.
- US-039.
- US-040.
- US-041.

### Notes

- First US-043 increment added a real primary CTA to `Recommended Action`, driven by the current publication job state.
- The publication workspace now prioritizes creating/configuring a publication job before secondary recovery tools such as loading by `publicationJobId`.
- `Create job` and `Load recent` now live together as start-work actions. Recent jobs open in a modal selector instead of consuming the main workspace.
- Publication image review now uses the same human QA language as Review Inbox: readable status, humanized flags, and score labels with percentages.
- Standard-mode brief review now renders creative direction, caption angle, emotional tone, scene notes, caption ideas, and avoid rules without exposing raw JSON.

---

## US-044 — Ops/Admin Dashboard

Status: Done
Priority: P1
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an admin/operator, I want an Ops dashboard that summarizes system health, stuck jobs, ingest status, recent failures, and backup freshness, so that I can detect operational problems without SSH, Docker, n8n, MinIO, or Postgres access.

### Acceptance Criteria

- [x] Ops dashboard shows ai-gateway, n8n, Comfy, DeepSeek, ingest watcher, and backup health where available.
- [x] Dashboard shows recent failed publication/generation jobs.
- [x] Dashboard shows stuck or long-running generation jobs.
- [x] Dashboard shows active ingest profile and watcher state.
- [x] Dashboard shows latest backup freshness.
- [x] Dashboard links to Ingest, Catalogs, Backups, Access, and Technical Debug.
- [x] Standard admin view uses human labels; raw diagnostics require technical mode.
- [x] Ingest profiles are clearly labeled as ingest/import setups, not character identity profiles.
- [x] Ingest setup creation/editing opens in a modal so the main view stays focused on the operational list.
- [x] Existing Ops/Admin sections continue working.

### Technical Tasks

- [x] Inventory existing health/status APIs.
- [x] Define missing health data gaps.
- [x] Build Ops dashboard view model.
- [x] Add dashboard cards for services, failures, stuck jobs, ingest, and backups.
- [x] Link each card to its operational destination.
- [x] Rename confusing ingest profile labels and explain watcher classification behavior.
- [x] Move ingest setup editor out of the default page flow into an explicit modal.
- [x] Add authenticated ai-gateway health bridge for DeepSeek, Comfy Cloud, and Visual QA provider status.

### Dependencies

- US-013.
- US-015.
- US-040.

### Notes

- First increment adds a read-only Ops dashboard above the existing Ops/Admin tools.
- n8n health is inferred from successful dashboard webhook responses.
- Ops dashboard now reads ai-gateway `/health` through the authenticated console gateway and shows DeepSeek, Comfy Cloud, and Visual QA configuration status.
- Raw aggregated diagnostics are available only in technical mode.
- Ingest Profiles copy now clarifies that these setups classify generated files during ingest and do not control creative reference selection for image generation.
- Ingest setup editor now opens only from `New ingest setup` or `Edit setup`, keeping the list as the default operator view.
- Validation confirmed ai-gateway online, n8n responding, AI providers configured, and latest backup fresh after re-enabling `Avatares AI - Admin - Daily Backup`.

---

## US-045 — Operator Creative Direction And Feedback

Status: Done
Priority: P0
Epic: EPIC-10 Operator Experience And Scale
Wave: Wave 2 Studio UX

### User Story

As an operator, I want to guide a publication with human creative direction and revise the brief with comments, so that I can request posts about events, moods, must-have details, or changes without editing prompts or JSON.

### Acceptance Criteria

- [x] Operator can add optional topic/event context before creating a publication job.
- [x] Operator can add desired mood before creating a publication job.
- [x] Operator can add must-include details before creating a publication job.
- [x] Operator can add avoid constraints before creating a publication job.
- [x] Creative direction is folded into the publication objective consumed by brief generation.
- [x] Operator can add plain-language feedback after seeing the brief.
- [x] Feedback can be applied without exposing or editing raw brief JSON.
- [x] AI gateway regenerates a genuinely revised brief from current brief plus operator feedback.
- [x] Feedback history is stored as job metadata for audit and future prompt guidance.
- [x] Prompt pack generation clearly reflects applied brief feedback.

### Technical Tasks

- [x] Add creative direction fields to standard Publications create flow.
- [x] Add standard-mode brief feedback textbox.
- [x] Save applied feedback using existing manual brief update path.
- [x] Extend `Avatares AI - Publications - Generate Brief` to pass `briefFeedback` to `ai-gateway`.
- [x] Extend `ai-gateway` `/publication-brief` to revise from current brief and feedback.
- [x] Store `operator-brief-feedback-v1` entries in publication job metadata.
- [x] Show last applied feedback in the brief summary.

### Dependencies

- US-038.
- US-043.

### Notes

- Deep feedback revision now routes through `ai-gateway` and DeepSeek when `briefFeedback` is provided. n8n stores `lastBriefFeedback` and appends to `briefFeedbackHistory`.
- Prompt pack generation receives `operatorBriefFeedback`, stores `promptPackOperatorBriefFeedback`, and shows the last applied feedback in the standard brief summary.

---

## US-046 — Character Onboarding Foundation

Status: In Progress
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to create and prepare a new character through a guided onboarding flow, so that new characters can be configured safely without editing JSON, database rows, prompts, or workflow internals.

### Acceptance Criteria

- [x] Operator can create a draft character profile from the web console.
- [x] Onboarding captures display name, short handle, business profile, content pillars, caption tone, brand fit, and publishing limits.
- [x] Operator can define initial scenes or select starter scene templates.
- [ ] Operator can upload or select candidate identity reference images.
- [x] Operator can classify references as global identity canon or scene-specific canon.
- [x] Operator can see that ingest profiles are operational import recipes, not character identity profiles.
- [x] Character has visible onboarding status: `draft`, `references-needed`, `identity-review`, `ready-for-tests`, `ready`.
- [ ] Character cannot be used for normal publication jobs until minimum onboarding requirements are complete.
- [x] Standard UI uses human labels and guided steps; technical JSON/debug data remains behind technical mode.
- [x] Existing Estefania configuration can be represented by the same onboarding model without breaking current publication flows.

### Technical Tasks

- [x] Inventory current character, avatar catalog, scene catalog, prompt profile, and canonical registry data dependencies.
- [x] Define character onboarding view model and minimum-ready rules.
- [x] Add create/edit character API endpoints or n8n workflows.
- [x] Add onboarding UI entry point from Ops/Admin or Characters.
- [ ] Add reference image selection/upload step.
- [x] Add canon classification fields: `identity-canon`, `scene-canon`, `supporting-reference`, `rejected-reference`.
- [x] Add operator-facing copy that distinguishes character profiles, reference canon, and ingest profiles.
- [x] Persist onboarding status and validation checklist.
- [x] Add compatibility mapping for existing Estefania data.

### Dependencies

- US-044.
- US-045.

### Notes

- This US is the umbrella for scaling beyond Estefania.
- It should not attempt to solve image consistency quality by itself; it creates the structured path where identity hardening can run.
- Ingest profiles should remain operational import configurations. They must not be presented as character identity profiles or used as creative reference source of truth.
- Implemented first deployable slice on 2026-07-30 UTC: `Characters` tab, `/admin/characters/list`, `/admin/characters/save`, `character_onboarding` table, catalog sync, readiness checklist, and Estefania seed.

---

## US-047 — Character Identity Hardening

Status: In Progress
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want each character to pass an identity consistency hardening step before publication, so that generated images keep the same recognizable person across scenes, moods, and prompts.

### Acceptance Criteria

- [ ] Operator can mark one or more canonical identity anchor images for a character.
- [ ] Operator can mark scene-specific canonical references for each scene.
- [ ] System shows which identity references are used by prompt pack and Comfy generation.
- [ ] System shows which scene references are used by prompt pack and Comfy generation.
- [ ] Character has an identity prompt/profile summary used consistently by brief and prompt-pack generation.
- [x] Prompt pack generation resolves references from `avatar + scene + assetType`, using scene canon when available and falling back to global identity canon when needed.
- [x] Prompt pack generation never depends on the active ingest profile to choose creative or identity references.
- [ ] Operator can run controlled identity test generations across at least three scenes.
- [ ] Identity test results separate identity drift, anatomy defects, composition defects, and scene/style mismatch.
- [ ] Character is blocked from normal publishing until identity hardening passes or is explicitly overridden by an admin.
- [ ] Estefania can be audited through the same hardening flow without replacing her current assets.
- [ ] Standard UI explains identity risk in human language; raw QA/provider metadata remains available in technical mode.

### Technical Tasks

- [ ] Define canonical identity reference rules and primary anchor selection.
- [x] Define scene-canon selection and fallback rules.
- [x] Add reference resolver for generation: `avatar + scene + assetType -> identity references + scene references`.
- [x] Extend prompt pack metadata with identity references actually used.
- [x] Extend prompt pack metadata with scene references actually used.
- [ ] Add identity profile fields to ai-gateway avatar profiles or equivalent character config.
- [ ] Add controlled identity test job type or workflow.
- [ ] Add identity QA summary and operator decision fields.
- [ ] Add readiness gate tying identity hardening to character onboarding status.
- [ ] Backfill Estefania identity audit view from existing canonical registry data.

### Dependencies

- US-046.

### Notes

- This US turns what we learned from Estefania into a repeatable quality gate for every future character.
- The goal is not stricter anatomy validation; it is stable character identity across otherwise valid images.
- Generation should treat active ingest profile as irrelevant for creative reference selection. Active ingest profile only classifies files entering through generic ingest.
- Implemented first resolver slice on 2026-07-30 UTC: prompt pack load context now prefers scene references and falls back to `portrait-canon` / `public-identity` identity anchors when no scene references exist. Metadata records `referenceResolution.usesActiveIngestProfile = false`.

---

## US-048 — Character Type Blueprint

Status: Done
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to choose the avatar type when creating a character, so that onboarding, defaults, scenes, safety limits, tone, and publishing rules are configured for the right kind of persona: influencer, GFE/BFE, or authority.

### Acceptance Criteria

- [x] Operator can choose one avatar type: `influencer`, `gfe-bfe`, or `authority`.
- [x] Each type loads human-readable defaults, not technical JSON.
- [x] Influencer blueprint includes brand fit, lifestyle pillars, campaign/platform framing, and commercial review triggers.
- [x] GFE/BFE blueprint includes relational tone, intimacy boundaries, safety limits, public/private framing, and stricter review triggers.
- [x] Authority blueprint includes expert domain, educational tone, claim limits, citation/review triggers, and trust-building scenes.
- [x] Type-specific starter scenes are proposed and editable.
- [x] Type-specific content pillars, caption tone, brand fit, publishing limits, and review triggers are persisted.
- [x] The selected type is stored with the character and synced into catalog/profile metadata.
- [x] Existing Estefania is represented as `influencer` without breaking her current flows.

### Technical Tasks

- [x] Extend character onboarding model with `avatarType` and `reviewTriggers`.
- [x] Define blueprint constants for `influencer`, `gfe-bfe`, and `authority`.
- [x] Add type selector to the Characters UI.
- [x] Apply blueprint defaults when creating a new character or changing type.
- [x] Persist `avatarType` and `reviewTriggers` in `character_onboarding`.
- [x] Sync avatar type into `avatar_catalog.avatar_kind`.
- [x] Backfill Estefania as `influencer`.

### Dependencies

- US-046.

### Notes

- This is the correction that makes onboarding type-aware instead of a generic character form.
- The three avatar types should drive later wizard steps, reference requirements, QA strictness, and publishing policy.
- Implemented on 2026-07-30 UTC: type-aware `Characters` blueprints for influencer, GFE/BFE, and authority; persisted `avatarType` and `reviewTriggers`; synced `avatar_catalog.avatar_kind`; Estefania remains influencer.

---

## US-049 — Character Creation Wizard

Status: Done
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want a guided wizard that creates a character from scratch, so that I do not need to know which tables, prompts, profiles, or workflows must be configured manually.

### Acceptance Criteria

- [x] Wizard guides the operator through type, narrative identity, voice, limits, scenes, visual strategy, and summary.
- [x] Wizard creates or updates character onboarding, avatar catalog, scene catalog, and prompt/profile configuration.
- [x] Defaults are editable at every step.
- [x] The operator sees progress, missing items, and next recommended action.
- [x] Completing the wizard places the character in `references-needed` or `identity-review`, not `ready`.

### Notes

- Implemented on 2026-07-30 UTC as the `Characters` creation wizard: type, identity, voice, limits, scenes, visual canon strategy, and summary/save. It reuses `/admin/characters/save`, which updates onboarding plus avatar/scene catalogs.

---

## US-050 — Identity Reference Intake

Status: In Progress
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to upload or register character reference images, so that the system can build a visual identity without manual MinIO or database work.

### Acceptance Criteria

- [ ] Operator can upload reference images from Characters.
- [x] Operator can register an existing MinIO reference URL or object path from Characters.
- [x] Each reference is associated with avatar and optionally scene.
- [x] References can be classified as `identity-candidate`, `identity-canon`, `scene-candidate`, `scene-canon`, `supporting-reference`, or `rejected-reference`.
- [x] Registered references are stored in `canonical_asset_registry` with `raw-image` compatibility for prompt reference resolution.
- [x] Rejected references are registered as `status=rejected`, so they are excluded from normal generation reference resolution.
- [x] UI shows what reference evidence is still missing.

### Implementation Notes

- First safe slice supports registration of already-uploaded MinIO images. Direct binary upload from Characters remains pending because the current MinIO gateway only proxies reads.
- Reference classification metadata is stored under `metadata.referenceClassification` and `metadata.referenceIntake = characters-console`.

---

## US-051 — Canon Portrait Generation

Status: In Progress
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to generate canon portrait candidates, so that I can establish a character's visual identity even when I do not already have a perfect reference.

### Acceptance Criteria

- [ ] Operator can generate portrait canon candidates from onboarding.
- [x] Operator can queue a canon portrait generation job from onboarding.
- [x] Prompt pack is generated automatically from type, narrative identity, and visual strategy.
- [ ] Candidates are registered as `identity-candidate`.
- [ ] Operator can select one or more candidates as `identity-canon`.
- [ ] QA result and rejection reasons are visible.
- [ ] Character cannot advance without approved identity canon.

### Implementation Notes

- First slice adds a Canon portrait generation workbench inside Characters > Visual.
- The workbench creates a `portrait-canon` generation job with a character-specific prompt pack and shows the generated positive/negative prompts to the operator.
- Current generic generation runner still returns manual Comfy instructions, so automatic candidate ingest/classification remains pending.

---

## US-052 — Scene Pack Generation

Status: Backlog
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to generate starter scene packs for a character, so that new avatars quickly reach a usable scene set similar to Estefania.

### Acceptance Criteria

- [ ] Operator can generate images for starter scenes proposed by the avatar type.
- [ ] Generated images are registered with avatar, scene, and asset type.
- [ ] Operator can select `scene-canon`.
- [ ] Generation falls back to `identity-canon` when a scene has no canon yet.
- [ ] UI shows scenes as ready, pending, defective, or needing review.
- [ ] Character requires a minimum scene pack before normal publishing.

---

## US-053 — Identity Test Matrix

Status: Backlog
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to test a character across multiple scenes, so that I can decide whether identity is stable before using the character in production publications.

### Acceptance Criteria

- [ ] Operator can run identity test generation across at least three scenes.
- [ ] Results separate identity drift, face mismatch, anatomy defects, scene mismatch, and composition issues.
- [ ] System summarizes whether the character is stable enough for publication.
- [ ] Operator can approve, regenerate, request better canon, or flag `needs-lora`.
- [ ] Failed identity tests keep the character out of normal publishing.

---

## US-054 — Character Readiness Gate

Status: Backlog
Priority: P0
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want normal publication jobs to unlock only when a character is ready, so that incomplete avatars are not accidentally used.

### Acceptance Criteria

- [ ] Normal publication creation is blocked for characters that are not `ready`.
- [ ] `ready` requires type, profile, limits, identity canon, minimum scenes, and approved identity test matrix.
- [ ] Admin override is possible with mandatory note.
- [ ] UI explains exactly what is missing in plain language.
- [ ] Existing Estefania remains usable after readiness backfill.

---

## US-055 — First Publication From Onboarding

Status: Backlog
Priority: P1
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator, I want to launch the first publication directly from onboarding, so that the path from new character to publishable output is continuous.

### Acceptance Criteria

- [ ] A `ready` character shows `Create first publication`.
- [ ] Operator selects one ready scene and starts the publication workflow.
- [ ] Brief, prompt pack, image generation, review, copy, and export run through the existing publication pipeline.
- [ ] The publication is linked back to onboarding history.
- [ ] The operator does not need to switch to technical pages.

---

## US-056 — LoRA Decision And Training Handoff

Status: Backlog
Priority: P1
Epic: EPIC-11 Character Scale And Identity
Wave: Wave 3 Character Onboarding

### User Story

As an operator or admin, I want the system to recommend LoRA training only when references and canon are not enough, so that training is a deliberate escalation rather than a mandatory first step.

### Acceptance Criteria

- [ ] System can flag `needs-lora` after repeated identity failures.
- [ ] Operator sees which approved references are suitable as a training dataset.
- [ ] Dataset can be exported or handed off to a training provider.
- [ ] Trained LoRA metadata can be registered back to the character.
- [ ] Comfy generation can use the registered LoRA when available.
- [ ] Training provider remains pluggable and separate from Comfy Cloud inference.
