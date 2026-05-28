# Identity Training Candidates v01 — Estefanía Montealegre

## Status

AUDITED EXPERIMENT — NOT APPROVED FOR TRAINING

## Decision

`identity-v01` is preserved as an audit record, but it must **not** be used as a LoRA training dataset.

After reviewing the 16 collected images together, the set was found to mix two different visual clusters:

1. **Original Estefanía canon** — natural, everyday, emotionally warm, with darker curls and less polished facial rendering.
2. **Controlled portrait drift** — technically clean portraits that progressively shift toward lighter/copper-highlighted hair, clearer/lighter eyes and a more produced editorial identity.

The controlled portraits are usable as evidence of what to avoid, but they are **not accepted as Estefanía canon**.

## Identity Preservation Rule

The character must remain anchored to the original everyday identity established in the café, rain and domestic lifestyle references.

Do not replace Estefanía with a cleaner or more conventionally polished variant if it changes her perceived identity.

## Primary Identity Anchor

| File | Role | Status |
|---|---|---|
| `estefania-cafe-rain-canon-001.png` | Main original facial and emotional identity baseline. | KEEP — PRIMARY CANON |

## Canon References Preserved

These images define the valid Estefanía identity to protect in future generation work.

| File | Context | Audit Decision | Reason |
|---|---|---|---|
| `estefania-cafe-rain-canon-001.png` | Café / rain / coffee | KEEP — PRIMARY CANON | Strongest original identity anchor; natural and emotionally grounded. |
| `estefania-coffee-candid-001.png` | Casual café | KEEP — SECONDARY CANON | Strong everyday continuity with the primary anchor. |
| `estefania-coworking-001.png` | Creator / laptop context | KEEP — SECONDARY CANON | Preserves identity while adding productive lifestyle context. |
| `estefania-foundational-face-001.png` | Café / phone moment | KEEP — SECONDARY CANON | Natural facial continuity and useful everyday angle. |
| `estefania-sunday-morning-001.png` | Quiet home morning | KEEP — SECONDARY CANON | Preserves natural/private identity without editorial drift. |

## Reserved References

These images are retained, but are not part of the protected core identity subset.

| File | Context | Audit Decision | Reason |
|---|---|---|---|
| `estefania_public_brunch_elegance_v01.png` | Public brunch | RESERVE | Good image, but more polished/glamorous than the core original identity. |
| `estefania-foundational-face-002.png` | Café / phone variation | RESERVE | Compatible, but redundant against stronger everyday references. |
| `estefania-foundational-face-003.png` | Quiet café / phone variation | RESERVE | Useful context, but weaker facial support than the KEEP subset. |

## Controlled Portrait Drift Hold

The following portraits were generated to expand training coverage, but the full audit showed that they define a different, more produced visual version of Estefanía.

| File | Intended Purpose | Audit Decision | Reason |
|---|---|---|---|
| `estefania-identity-v01-001.png` | Clean frontal portrait | HOLD — CONTROLLED IDENTITY DRIFT | Technically strong, but shifts away from original everyday identity. |
| `estefania-identity-v01-002.png` | Clean frontal variation | HOLD — CONTROLLED IDENTITY DRIFT | Reinforces the alternate clean/editorial cluster. |
| `estefania-foundational-left-3q-001.png` | Left three-quarter angle | HOLD — CONTROLLED IDENTITY DRIFT | Valid angle coverage, but for the drifted portrait identity. |
| `estefania-foundational-right-3q-001.png` | Right three-quarter angle | HOLD — CONTROLLED IDENTITY DRIFT | Valid angle coverage, but for the drifted portrait identity. |
| `estefania-foundational-front-neutral-001.png` | Neutral frontal expression | HOLD — CONTROLLED IDENTITY DRIFT | Excellent technically; does not match the original anchor closely enough. |
| `estefania-foundational-face-smile-001.png` | Subtle smile frontal expression | HOLD — CONTROLLED IDENTITY DRIFT | Preserves the alternate clean portrait cluster, not the canon. |
| `estefania-midtorso-neutral-001.png` | Wider neutral portrait | HOLD — CONTROLLED IDENTITY DRIFT | Useful framing experiment, but not accepted for identity training. |
| `estefania-midtorso-subtle-smile-001.png` | Wider subtle-smile portrait | HOLD — CONTROLLED IDENTITY DRIFT | Companion framing experiment; inherits the same drift. |

## Audit Summary

| Metric | Value |
|---|---:|
| Images reviewed | 16 |
| KEEP — protected canon references | 5 |
| RESERVE — compatible but not core | 3 |
| HOLD — controlled identity drift | 8 |
| Approved training dataset | No |
| Training action | Do not train |

## Protected Canon Core

```text
estefania-cafe-rain-canon-001.png
estefania-coffee-candid-001.png
estefania-coworking-001.png
estefania-foundational-face-001.png
estefania-sunday-morning-001.png
```

## Hold Set — Do Not Use for Training

```text
estefania-identity-v01-001.png
estefania-identity-v01-002.png
estefania-foundational-left-3q-001.png
estefania-foundational-right-3q-001.png
estefania-foundational-front-neutral-001.png
estefania-foundational-face-smile-001.png
estefania-midtorso-neutral-001.png
estefania-midtorso-subtle-smile-001.png
```

## Physical File Handling

Do not delete the controlled portraits. Keep them in this folder as audit evidence of the failed controlled-expansion direction.

Do not use this folder directly as a training source.

A future corrected identity dataset must be created as a new version, anchored visually to the original canon subset above.

## Next Production Direction

Future controlled generations must preserve:

- the darker, more natural curl rendering of the original references;
- the original facial proportions and eye impression;
- everyday warmth over editorial polish;
- natural skin texture and lived-in realism;
- the visual tone of the café/rain/home canon.

Avoid:

- copper-highlight drift becoming dominant;
- unusually light or overly vivid eyes;
- studio/model energy;
- beauty-retouched facial smoothing;
- clean portraits that are internally consistent but no longer look like original Estefanía.

## Source of Truth

The classification history and audit decision are recorded in:

`../../selects/selection-registry.md`
