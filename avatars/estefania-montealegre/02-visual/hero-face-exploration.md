---

## Exploration Session — Z-Image-Turbo / Comfy Cloud / 2026-05-22

### Purpose

Validate whether the current visual direction for Estefanía Montealegre remains recognizable across more than one scene and emotional context, before introducing identity-control techniques such as face reference workflows or a dedicated LoRA.

### Generation Context

| Field | Value |
|---|---|
| Platform | Comfy Cloud |
| Workflow | `image_z_image_turbo` |
| Base model | `z_image_turbo_bf16.safetensors` |
| Text encoder | `qwen_3_4b.safetensors` |
| VAE | `ae.safetensors` |
| Resolution | `1024 x 1024` |
| Steps | `8` |
| LoRA used | None |
| ControlNet used | None |
| Identity reference image used | None |
| Current usage status | Visual exploration only / selected assets |

### Candidate Visual Direction

The generated images establish a strong provisional visual direction for Estefanía:

- Colombian young-adult woman with cosmopolitan warmth.
- Naturally curly, abundant, dark hair with realistic humidity and movement.
- Olive-green / hazel expressive eyes.
- Natural facial structure with warm, credible beauty rather than stylized perfection.
- Genuine smile and emotionally present gaze.
- Quiet emotional complexity: warm, introspective, socially alive, and slightly nostalgic.
- Strong compatibility with candid lifestyle photography and realistic smartphone-photo aesthetics.

### Validated Identity Anchors

Across the first four selected explorations, the following traits remained sufficiently stable:

| Identity Anchor | Observation |
|---|---|
| Hair | Dark, naturally curly, abundant and visually distinctive across scenes. |
| Eyes | Olive-green / hazel tone remained a recognizable trait. |
| Apparent age | Consistent young-adult presentation. |
| Emotional energy | Warm, spontaneous, introspective and approachable. |
| Realism level | Strong natural photographic appearance without excessive artificial polish. |
| Lifestyle fit | Works convincingly in both private-rock and rainy-coffee settings. |

### Selected Exploration Assets

| Asset Name | Scene | Role in Visual Definition | Status |
|---|---|---|---|
| `estefania-rock-lab-001.png` | Private rock mood, frontal smile, phone in hand | Energy and spontaneous warmth reference | `selected` |
| `estefania-rock-lab-002.png` | Private rock mood, frontal portrait | Frontal facial reference candidate | `selected` |
| `estefania-rock-lab-003.png` | Private rock mood, looking at phone | Candid behavior and natural expression reference | `selected` |
| `estefania-cafe-rain-lab-001.png` | Rainy Medellín coffee shop | Primary everyday identity-direction candidate | `selected-primary` |

### Current Primary Candidate

`estefania-cafe-rain-lab-001.png` is currently the strongest candidate for Estefanía's everyday visual identity direction.

It expresses:

- natural elegance without visible effort;
- warm introspection;
- Colombian urban atmosphere;
- realistic emotional presence;
- a look compatible with future lifestyle scenes.

The rock-scene assets remain valuable as a secondary/private facet of the character rather than as her principal public presentation.

### Important Limitation

These images validate a visual direction, but they do not yet prove exact identity consistency.

Without an identity-reference workflow or a dedicated character LoRA, facial details may still drift between scenes, especially in:

- nose shape;
- cheekbone structure;
- jawline;
- smile shape;
- exact eye spacing.

### Usage Decision

These four images are approved only as **selected visual exploration references**.

They must not yet be treated as:

- canonical final identity assets;
- publication-ready images;
- marketing assets;
- monetizable production outputs.

### Next Validation Step

Before declaring a final canonical face, test one controlled identity-preservation workflow using `estefania-cafe-rain-lab-001.png` as the main visual reference.

No LoRA training should begin until the reference set is intentionally approved and facial consistency is considered strong enough to build a clean identity dataset.