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

Status: Backlog  
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

Status: Backlog  
Priority: P0  
Epic: EPIC-01 Publications  
Wave: Wave 1  

### User Story

As an operator, I want to export a publishing pack, so that I can manually publish the approved content on social platforms.

### Acceptance Criteria

- [ ] Export includes approved image URL or downloadable asset.
- [ ] Export includes final caption.
- [ ] Export includes hashtags.
- [ ] Export includes platform notes and metadata.
- [ ] Job status changes to `ready-to-publish`.
- [ ] Export is stored and can be reopened later.

### Technical Tasks

- [ ] Define `publishing_pack` JSON structure.
- [ ] Create endpoint `POST /publications/jobs/export-pack`.
- [ ] Store export result in Postgres.
- [ ] Add export panel in console.
- [ ] Add copy-to-clipboard actions.

### Dependencies

- US-006.
- US-007.

### Notes

- Wave 1 is manual publish/export, not auto-posting.

---

## US-009 — Mark Publication As Published

Status: Backlog  
Priority: P0  
Epic: EPIC-01 Publications  
Wave: Wave 1  

### User Story

As an operator, I want to mark a publication as published, so that the system records what content was actually used.

### Acceptance Criteria

- [ ] Operator can mark a job as published.
- [ ] Operator can enter platform and published URL.
- [ ] System stores publish timestamp.
- [ ] Job status changes to `published`.
- [ ] Published jobs remain searchable.

### Technical Tasks

- [ ] Add status transition to `published`.
- [ ] Add published URL/platform fields.
- [ ] Add endpoint `POST /publications/jobs/mark-published`.
- [ ] Add UI form.

### Dependencies

- US-008.

### Notes

- Manual publishing is acceptable for Wave 1.

---

## US-010 — Publication Job Timeline

Status: Backlog  
Priority: P1  
Epic: EPIC-04 Admin Operations  
Wave: Wave 1  

### User Story

As an operator, I want to see the timeline of a publication job, so that I understand what happened and what the next step is.

### Acceptance Criteria

- [ ] Each important event is recorded.
- [ ] Console shows job status and timeline.
- [ ] Errors are visible in human-readable form.
- [ ] Operator can identify the next required action.

### Technical Tasks

- [ ] Create `publication_job_events` table.
- [ ] Add event writes in n8n workflows.
- [ ] Add event list endpoint.
- [ ] Add timeline component.

### Dependencies

- US-001.

### Notes

- This is the bridge from technical workflow to operator trust.

---

## US-011 — Estefanía Business Profile Configuration

Status: Backlog  
Priority: P0  
Epic: EPIC-02 Character Profiles  
Wave: Wave 1  

### User Story

As the system, I need a structured Estefanía business profile, so that prompts and captions follow the influencer-brand strategy.

### Acceptance Criteria

- [ ] Estefanía has `businessProfile: influencer-brand`.
- [ ] Profile includes brand fit, commercial tone, avoid rules, content pillars, caption style, and visual constraints.
- [ ] Profile is stored in a machine-usable format.
- [ ] n8n can read the profile.
- [ ] Console can display the profile summary.

### Technical Tasks

- [ ] Create JSON schema for character/business profile.
- [ ] Create Estefanía profile JSON from existing docs.
- [ ] Store profile in repo.
- [ ] Add profile load endpoint or n8n workflow.
- [ ] Use profile in brief/copy generation.

### Dependencies

- `strategy/business-intent.md`.
- Estefanía canon documents.

### Notes

- This story can start with repo JSON before moving to Postgres.

---

## US-012 — Operator Home / Next Action View

Status: Backlog  
Priority: P1  
Epic: EPIC-04 Admin Operations  
Wave: Wave 1  

### User Story

As an operator, I want a simple home screen that tells me what to do next, so that I can operate the system without knowing its internals.

### Acceptance Criteria

- [ ] Home screen shows active publication jobs.
- [ ] Jobs are grouped by status.
- [ ] Each job shows the next action.
- [ ] Operator can jump directly to the required step.
- [ ] Technical details are hidden unless technical mode is enabled.

### Technical Tasks

- [ ] Add dashboard/home route or tab.
- [ ] Create job summary endpoint.
- [ ] Add next-action mapping by status.
- [ ] Add UI cards/table for job queue.

### Dependencies

- US-001.
- US-010 recommended.

### Notes

- This is important for making the system operable by someone other than the builder.

---

## US-013 — Publication Job Error Handling And Retry

Status: Backlog  
Priority: P1  
Epic: EPIC-04 Admin Operations  
Wave: Wave 1  

### User Story

As an operator, I want clear errors and retry actions, so that failures do not require SSH or manual n8n debugging.

### Acceptance Criteria

- [ ] Failed jobs show a clear error message.
- [ ] Operator can retry failed brief/copy/generation steps.
- [ ] Retry creates a new event.
- [ ] Technical error details are available only in technical mode.

### Technical Tasks

- [ ] Define retryable statuses.
- [ ] Store error type, message, and raw details.
- [ ] Add retry endpoints.
- [ ] Add retry buttons in console.

### Dependencies

- US-010.

### Notes

- This can be incremental per step.

---

## US-014 — Validate Existing Asset Review Against Publication Flow

Status: Ready  
Priority: P0  
Epic: EPIC-03 Asset Review  
Wave: Wave 1  

### User Story

As the product owner, I want to validate the existing Asset Review behavior against the publication workflow, so that we know what can be reused and what must change.

### Acceptance Criteria

- [ ] Select asset works end-to-end.
- [ ] Promote canonical works end-to-end.
- [ ] Reject asset works end-to-end.
- [ ] MinIO image URLs work from public/mobile access.
- [ ] Actions update Postgres as expected.
- [ ] Any mismatch is captured as follow-up US.

### Technical Tasks

- [ ] Test actions in deployed console.
- [ ] Verify DB state after each action.
- [ ] Verify UI refresh behavior.
- [ ] Document issues as backlog items.

### Dependencies

- Existing deployed console.

### Notes

- This should be done before heavy publication-job integration.

---

## US-015 — Wave 1 Runbook

Status: Backlog  
Priority: P1  
Epic: EPIC-04 Admin Operations  
Wave: Wave 1  

### User Story

As an operator, I want a short runbook for Estefanía production, so that I can follow the workflow consistently.

### Acceptance Criteria

- [ ] Runbook explains the Wave 1 flow.
- [ ] Runbook explains what each status means.
- [ ] Runbook explains common failures.
- [ ] Runbook explains when human approval is required.
- [ ] Runbook is linked from the console or repo.

### Technical Tasks

- [ ] Create operator runbook document.
- [ ] Add link from console admin/help area if available.
- [ ] Keep runbook aligned with actual UI.

### Dependencies

- US-001 through US-009 shape finalized.

### Notes

- The runbook should be practical, not architectural.

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
- [ ] US-008 — Export Publishing Pack
- [ ] US-009 — Mark Publication As Published
- [ ] US-011 — Estefanía Business Profile Configuration
- [ ] US-014 — Validate Existing Asset Review Against Publication Flow

### P1

- [ ] US-010 — Publication Job Timeline
- [ ] US-012 — Operator Home / Next Action View
- [ ] US-013 — Publication Job Error Handling And Retry
- [ ] US-015 — Wave 1 Runbook
