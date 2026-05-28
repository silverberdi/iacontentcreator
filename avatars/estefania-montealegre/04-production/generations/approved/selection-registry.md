# Selection Registry — Estefanía Montealegre

## Purpose

Central registry for curated visual assets of Estefanía Montealegre.

This registry records:
- narrative scene selection;
- canon role;
- training suitability;
- identity drift discoveries;
- the audit decision that invalidated `identity-v01` as a training dataset.

## Classification

| Classification | Meaning |
|---|---|
| PRIMARY CANON | Central original identity anchor. Defines Estefanía visually. |
| SECONDARY CANON | Strong compatible identity reference that preserves the primary anchor. |
| RESERVE | Retained as useful context, but excluded from the protected core or training set. |
| SCENE SELECTED | Approved narrative/lifestyle asset, not intended for identity training. |
| HOLD — CONTROLLED IDENTITY DRIFT | Technically usable image that shifts the visual identity away from original canon. |
| HOLD | Useful reference, but not approved for canon or training. |
| EXCLUDE FROM TRAINING | Do not include in any identity-training dataset. |

---

# Canon Decision After Identity-v01 Audit

## Protected Original Canon Core

| Folder | File | Scene | Classification | Training Status | Audit Notes |
|---|---|---|---|---|---|
| `foundational-canon/` | `estefania-cafe-rain-canon-001.png` | Café lluvioso / café en mano | PRIMARY CANON | Future anchor only | Main original identity baseline; natural, warm and grounded. |
| `coffee-candid/` | `estefania-coffee-candid-001.png` | Café casual | SECONDARY CANON | Future anchor only | Strong everyday continuity with the primary anchor. |
| `coworking/` | `estefania-coworking-001.png` | Creator trabajando | SECONDARY CANON | Future anchor only | Valid identity continuity in productive context. |
| `foundational-canon/` | `estefania-foundational-face-001.png` | Café / teléfono | SECONDARY CANON | Future anchor only | Natural facial variation compatible with the original canon. |
| `sunday-morning/` | `estefania-sunday-morning-001.png` | Mañana tranquila en casa | SECONDARY CANON | Future anchor only | Strong private/everyday identity preservation. |

**Important:** `Future anchor only` means these images define what the rebuilt dataset must preserve. It does **not** mean a LoRA should be trained immediately with only these five images.

## Reserved but Non-Core References

| Folder | File | Scene | Classification | Training Status | Audit Notes |
|---|---|---|---|---|---|
| `public-identity/` | `estefania_public_brunch_elegance_v01.png` | Brunch público | RESERVE | No | Good public-facing image, but more polished than the protected original core. |
| `foundational-canon/` | `estefania-foundational-face-002.png` | Café / teléfono variation | RESERVE | No | Compatible but redundant against stronger core references. |
| `foundational-canon/` | `estefania-foundational-face-003.png` | Café tranquilo / teléfono | RESERVE | No | Useful context, but less reliable as a defining face reference. |

---

# Identity-v01 Audit Result

`../training-candidates/identity-v01/` was reviewed as a 16-image candidate subset.

## Result

| Metric | Value |
|---|---:|
| Images reviewed | 16 |
| KEEP — protected original canon | 5 |
| RESERVE — retained but non-core | 3 |
| HOLD — controlled identity drift | 8 |
| Dataset approved for training | No |
| Training recommendation | Do not train from `identity-v01` |

## Reason for Rejection

The set mixes two visual identities:

- the original Estefanía: natural, everyday, darker curls, emotionally grounded;
- a generated controlled-portrait variant: cleaner, more editorial, more copper-highlighted hair and subtly altered facial reading.

The controlled portraits are coherent with each other, but coherence inside a drifted cluster is not identity preservation.

---

# Controlled Identity Portraits — Audit Hold

These images live in:

`../training-candidates/identity-v01/`

| File | Previous Role | Current Classification | Training Candidate | Audit Reason |
|---|---|---|---|---|
| `estefania-identity-v01-001.png` | Clean frontal portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Clean technical output, but the face begins to shift from the original canon. |
| `estefania-identity-v01-002.png` | Clean frontal portrait variation | HOLD — CONTROLLED IDENTITY DRIFT | No | Reinforces the alternate polished identity cluster. |
| `estefania-foundational-left-3q-001.png` | Left three-quarter portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Good angle reference for the wrong visual cluster. |
| `estefania-foundational-right-3q-001.png` | Right three-quarter portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Good angle reference for the wrong visual cluster. |
| `estefania-foundational-front-neutral-001.png` | Front neutral portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Technically useful, but not faithful enough to original Estefanía. |
| `estefania-foundational-face-smile-001.png` | Front subtle-smile portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Natural expression, but within the altered identity cluster. |
| `estefania-midtorso-neutral-001.png` | Mid-torso neutral portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Adds framing coverage only to the rejected controlled direction. |
| `estefania-midtorso-subtle-smile-001.png` | Mid-torso subtle-smile portrait | HOLD — CONTROLLED IDENTITY DRIFT | No | Completes the rejected portrait block; retain for diagnosis only. |

---

# Existing Narrative Assets

The following previously selected lifestyle assets retain their narrative value. Their status is unchanged unless explicitly reassessed later.

| Folder | File | Scene | Classification | Training Candidate | Notes |
|---|---|---|---|---|---|
| `public-identity/` | `estefania_public_socialwarmth_v01.png` | Brunch social warmth | SCENE SELECTED | No | Strong narrative public warmth; not a clean identity anchor. |
| `public-rooftop/` | `estefania-rooftop-goldenhour-001.png` | Rooftop golden hour | SCENE SELECTED | No | Strong lifestyle asset; sunset lighting alters facial reading. |
| `public-street-motion/` | `estefania-street-motion-001.png` | Street movement | SCENE SELECTED | No | Successful motion narrative; unsuitable as identity reference. |
| `travel-airport/` | `estefania-airport-canon-001.png` | Airport traveler | SCENE SELECTED | No | Travel narrative asset; unsuitable for clean identity training. |
| `bookstore-reading/` | `estefania-bookstore-reading-001.png` | Reading / bookstore | SCENE SELECTED | No | Intellectual narrative image; context-heavy. |
| `social-cafe/` | `estefania-social-cafe-001.png` | Café with others | SCENE SELECTED | No | Social narrative only. |
| `social-dinner/` | `estefania-social-dinner-001.png` | Dinner social scene | SCENE SELECTED | No | Social narrative only. |
| `friends-laughing/` | `estefania-friends-laughing-001.png` | Friends laughing | SCENE SELECTED | No | Strong social warmth; expression too broad for identity training. |
| `rain-music/` | `estefania-rain-music-001.png` | Rain and music | SCENE SELECTED | No | Private emotional continuity; narrative-only. |
| `night-music-window/` | `estefania-night-window-001.png` | Night window music | SCENE SELECTED | No | Nighttime narrative mood; unsuitable for clean training. |
| `night-music-window/` | `estefania-night-window-002.png` | Night window alternative | SCENE SELECTED | No | Secondary narrative variation only. |
| `rain-window-night/` | `estefania-rain-window-night-001.png` | Rainy window night | SCENE SELECTED | No | Contemplative narrative asset; unsuitable for clean training. |
| `rain-walk/` | `estefania-rain-walk-001.png` | Walking under rain | SCENE SELECTED | No | Signature cinematic scene; narrative-only. |
| `private-rock/` | `estefania-rock-01.png` | Private rock identity | SCENE SELECTED | No | Important private facet; not dominant public identity. |

---

# Previously Known Drift Hold

| Folder | File | Original Scene | Status | Reason |
|---|---|---|---|---|
| `../generations/public-identity-hold/` | `estefania-public-urbanwalk-drift-001.png` | Public-facing urban walk | HOLD | Facial identity drifts away from the café-rain primary canon. Exclude from training. |

---

# Future Dataset Rebuild Requirement

Do not train using `identity-v01`.

When controlled identity generation resumes, create a **new candidate version** grounded in the protected original canon core:

```text
estefania-cafe-rain-canon-001.png
estefania-coffee-candid-001.png
estefania-coworking-001.png
estefania-foundational-face-001.png
estefania-sunday-morning-001.png
```

Future portrait candidates must preserve:

- darker, naturally varied curls rather than a copper-highlighted studio look;
- original eye impression rather than brighter/lighter eye drift;
- natural everyday warmth;
- non-editorial facial rendering;
- clear similarity to the primary café-rain anchor.

The eight rejected controlled portraits should remain stored as diagnostic evidence and should not be reintroduced into training.
