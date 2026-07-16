# Estefania Montealegre — Comfy Cloud API Workflow

This folder stores the Comfy Cloud API prompt used to generate Estefania Montealegre publication candidates.

## Files

- `estefania-montealegre-api.json`: compact API workflow exported from Comfy Cloud.

## Runtime Mapping

The current API workflow is based on Flux/USO identity preservation with a single reference image and face detail pass.

Fields that should be dynamically patched from `publication_jobs.prompt_pack`:

| Purpose | Node | Input | Source |
| --- | --- | --- | --- |
| Positive prompt | `112:6` | `inputs.text` | `prompt_pack.positivePrompt` |
| Reference image | `47` | `inputs.image` | selected Estefania canonical/reference image |
| Canvas width | `112:110` | `inputs.width` | publication format defaults |
| Canvas height | `112:110` | `inputs.height` | publication format defaults |
| Main seed | `112:31` | `inputs.seed` | generated per run unless fixed |
| Face detail seed | `112:122` | `inputs.seed` | generated per run unless fixed |
| Output prefix | `9` | `inputs.filename_prefix` | publication job ID / generation job ID |

## Fixed Model Dependencies

The workflow expects the Comfy environment to provide:

- `flux1-dev-fp8.safetensors`
- `sigclip_vision_patch14_384.safetensors`
- `uso-flux1-projector-v1.safetensors`
- `uso-flux1-dit-lora-v1.safetensors`
- `face_yolov8n.pt`
- `sam_hq_vit_l.pth`

## Notes

- The workflow does not currently expose a separate negative prompt node. Negative conditioning is produced through `ConditioningZeroOut`.
- The source export keeps `SaveImage` connected to the decoded image before `FaceDetailer`; `PreviewImage` shows the face-detailed output. `ai-gateway` disables the `FaceDetailer` branch by default for Comfy Cloud because the hosted environment may not provide `sam_hq_vit_l.pth`. Set `COMFY_CLOUD_ENABLE_FACE_DETAILER=true` only when that model is available.
- US-005 should use this workflow as the first concrete API contract for generated-image ingest and publication job linking.
