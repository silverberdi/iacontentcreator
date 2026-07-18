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
- [ ] The publication job has a clear status history.
- [ ] A non-technical operator can understand what to do next.

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

Status: Backlog  
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
- [ ] US-018 — Sync MinIO Reference Assets To Comfy Cloud Inputs
- [x] US-020 — Poll Comfy Cloud Generation Status
- [x] US-021 — Auto-Ingest Completed Comfy Output
- [x] US-023 — Stabilize Estefania Identity And Safe Composition
- [x] US-024 — Anatomy-Aware Composition Policy
- [x] US-026 — Generation Attempt History
- [x] US-028 — Dedicated Identity Reference Sync
- [x] US-030 — Comfy Cloud Reference Upload Adapter

### P1

- [x] US-010 — Publication Job Timeline
- [x] US-012 — Operator Home / Next Action View
- [x] US-013 — Publication Job Error Handling And Retry
- [x] US-016 — Harden Legacy Asset Review Workflow SQL Handling
- [x] US-015 — Wave 1 Runbook
- [ ] US-019 — Comfy Generation Preflight And Operator Error
- [x] US-022 — Console Auto-Refresh For Generating Jobs
- [x] US-027 — Publication Candidate Quality Review Criteria
- [x] US-029 — Automated Image QA And Correction Pass
- [x] US-031 — Pixel-Level Visual QA Provider
