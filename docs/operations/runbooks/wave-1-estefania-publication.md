# Wave 1 Runbook — Estefania Publication

Use this runbook to operate the Wave 1 Estefania Montealegre publication flow from the Avatares AI console.

## Scope

This runbook covers one manual-assisted publication cycle:

```text
create job -> generate brief -> generate prompt pack -> generate images -> ingest output -> select asset -> generate copy -> export pack -> publish manually -> mark published
```

The system is semi-autonomous. The operator still approves creative choices, manually publishes to Instagram, and records the final published URL.

## Required Access

- Avatares AI console: `https://avatars.silverman.pro`
- Authorized Google login.
- Instagram account for Estefania: `@estefaniamontealegre.ai`
- Comfy Cloud access for image job review when generation needs manual inspection.
- Technical mode only when troubleshooting or operating admin controls.

## Normal Operating Flow

1. Open the console and start from `Home`.
2. If an active job exists, open the top-priority job.
3. If no active job exists, go to `Publications` and create a job:
   - Avatar: Estefania Montealegre
   - Scene: choose the intended content scene
   - Format: `Feed post` or `Story`
   - Objective: describe the publication intent in plain language
4. Generate the publication brief.
5. Review the brief. Edit it if the idea is off-brand, unclear, or not publishable.
6. Generate the prompt pack.
7. Generate images.
8. When Comfy Cloud finishes, paste the output URL if the console asks for it, then ingest the output.
9. Review candidates and select the best image for the publication.
10. Generate the copy pack.
11. Export the publishing pack.
12. Publish manually on Instagram.
13. Copy the final Instagram URL.
14. Mark the job as published in the console.

## Human Approval Points

Human approval is required before:

- Accepting the generated brief.
- Sending or accepting generated image output.
- Selecting the final publication asset.
- Using the generated caption/copy.
- Publishing to Instagram.
- Marking the job as published.

The operator should reject or revise anything that damages character consistency, looks visually broken, feels inauthentic, or creates brand risk.

## Status Reference

`draft`: Job exists, but no approved brief is attached yet.

`brief-ready`: Creative brief is available and ready for prompt-pack generation.

`prompt-ready`: Comfy-ready prompt pack exists.

`generating`: Image generation has been submitted or is in progress.

`generated`: Generation has output available, but assets may not yet be ingested or selected.

`assets-ready`: An asset has been selected for the publication.

`copy-ready`: Caption/copy pack is available.

`exported`: Publishing pack has been exported for manual posting.

`published`: The publication has been posted and recorded.

`failed`: A step failed. Open the timeline to see the failed step and retry when available.

## Retry And Recovery

Use retry from the publication timeline when available.

Retry is supported from the console for:

- `generate-brief`
- `generate-prompt-pack`
- `generate-images`
- `generate-copy-pack`

Manual review is required for:

- ingest failures
- asset selection failures
- export failures
- publish-recording failures

For manual-review failures:

1. Read the visible error.
2. Open technical mode only if needed.
3. Confirm the job id, selected asset id, and latest timeline event.
4. Fix the external condition, such as missing Comfy output URL or inaccessible asset.
5. Repeat the failed action from the console if the UI allows it.
6. If the UI does not allow it, create a follow-up issue or US before changing data directly.

## Common Failures

### Comfy Cloud job fails validation

What it looks like:

- Comfy returns an error about an invalid model, node, or value.

What to do:

- Fix the Comfy workflow or model selection in Comfy Cloud.
- Submit again in Comfy Cloud if the issue was workflow-side.
- Return to the console and continue with the generated output URL when available.

### Image unavailable on mobile

What it looks like:

- The console loads, but images show as unavailable on mobile.
- Opening the image points to an internal `192.168...` URL.

What to do:

- Confirm the console is using the public MinIO gateway URL.
- New Asset Review select actions now send the configured MinIO base URL.
- Reopen/refresh the console after deployment changes.

### Unauthorized or blocked access

What it looks like:

- Google login works but the user cannot enter the console.
- n8n webhook calls return `401`.

What to do:

- Confirm the user is approved in the console access store.
- Confirm the console gateway has `AVATARES_API_KEY`.
- Do not expose n8n directly without the gateway.

### Failed job with retry button

What it looks like:

- Job status is `failed`.
- Timeline shows a failed step and a retry button.

What to do:

- Click retry for supported steps.
- Confirm a new `retry-requested` event appears in the timeline.
- Continue from the recovered step.

### Failed job without retry button

What it looks like:

- Job status is `failed`.
- Timeline says manual review is required.

What to do:

- Check whether the failure is ingest, selection, export, or publish recording.
- Fix the missing data or external dependency.
- Avoid direct DB changes unless this becomes an explicit technical maintenance task.

## Asset Review Rules

Use `Asset Review` for reusable visual asset decisions.

- `Select`: marks an asset as selected but not canonical.
- `Promote canonical`: makes the asset the canonical reference for the avatar, scene, and asset type.
- `Reject`: removes the asset from normal candidate flow.

For Wave 1, `assetType` is operationally fixed to `raw-image` and hidden from the operator.

## Publishing Rules

Publishing is manual in Wave 1.

Before publishing:

- Confirm the selected image is visually usable.
- Confirm the caption matches Estefania's character and business intent.
- Confirm there is no broken placeholder text.
- Confirm the target account is `@estefaniamontealegre.ai`.

After publishing:

- Copy the final public post URL.
- Mark the publication as published in the console.
- Add notes if anything was changed manually.

## When To Stop

Stop the flow and do not publish when:

- Identity consistency is weak.
- The image has visible defects.
- The caption does not match Estefania's voice.
- The publication could create brand or platform risk.
- The job has a failure that is not understood.

Create a follow-up US when the issue is repeatable or requires code/workflow changes.
