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

Partially implemented but blocked in live testing:

- Submit image generation to Comfy Cloud through `ai-gateway`.

Remaining for Wave 1:

- Resolve Comfy reference-image contract so MinIO object paths are not treated as Comfy local `LoadImage` filenames.
- Prepare or sync required reference assets for Comfy Cloud without manual operator upload.
- Add preflight validation and clear operator errors for missing Comfy references.
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
blocked-at-comfy-reference-input
```

Selected asset:

```text
eb0829cc-f31e-443d-bea7-8f6d8519ebf0
```

## Documentation Rule

This status page is a summary. User stories and acceptance criteria belong only in the backlog.
