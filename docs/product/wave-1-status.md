# Wave 1 Status — Estefanía Publications

## Current Objective

Finish the first usable publication workflow for Estefanía Montealegre as the default AI influencer.

The current operating path is:

```text
console -> n8n -> ai-gateway -> DeepSeek / Comfy Cloud -> MinIO/Postgres -> Asset Review -> Publishing Pack
```

## Current Status

Completed:

- Create publication job.
- Generate publication brief through `ai-gateway` and DeepSeek.
- Generate Comfy-ready prompt pack.
- Ingest generated Comfy output into MinIO/Postgres.
- Reopen existing publication jobs from the console.
- Select the publication asset.
- Generate caption/copy pack.
- Export final manual publishing pack.
- Mark publication as published.
- Add clear job timeline/status history.
- Add error handling and retry for supported publication steps.
- Add operator-oriented next-action guidance.
- Validate existing Asset Review against the publication flow.
- Create the Wave 1 operator runbook.
- Submit image generation to Comfy Cloud through `ai-gateway`.
- Poll Comfy Cloud generation status after submission.
- Auto-ingest completed Comfy outputs into MinIO/Postgres.
- Auto-refresh the console while a publication job is generating.
- Add structured publication quality review criteria and rejection reasons.
- Prefer prepared Comfy identity references and block generation with a clear error when none exists.
- Store initial QA metadata and show QA badges in the console.
- Prepare canonical MinIO references into Comfy input files from the console.
- Run image QA through a configurable visual provider, with explicit heuristic fallback if no provider is configured.

Remaining for Wave 1:

- Configure a production visual QA provider/model if heuristic fallback is not sufficient.
- Validate Comfy Cloud reference upload against a live Estefanía reference.
- Use the runbook in at least one live production cycle and capture gaps.

## Canonical Backlog

The canonical Wave 1 backlog is:

```text
planning/backlog/WAVE-01-estefania-publications.md
```

Do not duplicate user stories in other documents. Link to the backlog instead.

## Validated Job

The first validated Wave 1 publication job is:

```text
dc539e40-c15f-47bb-9d7f-68ca901334e2
```

Validated state:

```text
review-ready-after-auto-ingest
```

Selected asset:

```text
eb0829cc-f31e-443d-bea7-8f6d8519ebf0
```

## Documentation Rule

This status page is a summary. User stories and acceptance criteria belong only in the backlog.
