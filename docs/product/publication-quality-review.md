# Publication Quality Review

This document defines the Wave 1 review contract for generated publication assets.

## Operator Criteria

Every publication candidate is reviewed against these criteria:

- `identity`: Estefania remains recognizable and consistent with approved references.
- `face`: expression, eyes, smile, and skin look natural.
- `hands`: hands are natural if visible; no extra or malformed fingers.
- `feet`: feet are natural if visible; no malformed toes, warped scale, or awkward distortion.
- `composition`: subject, crop, pose, and scene are usable for the selected format.
- `brandFit`: the image fits Estefania's lifestyle creator positioning.
- `publishability`: the image can be used as a real Instagram candidate.

## Decisions

- `select-for-publication`: acceptable for the current publication job.
- `reject-for-publication`: not usable for the current publication, but not necessarily invalid as identity material.
- `reject-as-canonical`: must not be promoted or reused as identity/canonical reference.

## Rejection Reasons

Structured rejection reasons:

- `identity-drift`
- `face-artifact`
- `hand-artifact`
- `foot-artifact`
- `bad-composition`
- `brand-mismatch`
- `not-publishable`
- `not-canonical-quality`

## Metadata Contract

Review metadata is stored as `metadata.publicationQualityReview`:

```json
{
  "contractVersion": "publication-quality-review-v1",
  "decision": "reject-for-publication",
  "criteria": {
    "identity": true,
    "face": true,
    "hands": false,
    "feet": true,
    "composition": true,
    "brandFit": true,
    "publishability": false
  },
  "reasons": ["hand-artifact", "not-publishable"],
  "notes": "Visible hand distortion makes this unusable for the post.",
  "reviewedAt": "2026-07-18T00:00:00.000Z"
}
```

## QA Contract

Automated QA metadata is stored as `metadata.qa`:

```json
{
  "contractVersion": "publication-image-qa-v1",
  "provider": "heuristic-pre-visual",
  "status": "review_required",
  "scores": {
    "identity": 0.5,
    "hands": 0.4,
    "feet": 0.4,
    "composition": 0.6,
    "publishability": 0.5
  },
  "flags": ["foot-risk-review", "hand-risk-review", "identity-review"],
  "notes": ["Heuristic QA only; human review is still required before publication."],
  "correctionRecommended": true,
  "correctionMode": "manual-or-future-inpaint-pass",
  "reviewedAt": "2026-07-18T00:00:00.000Z"
}
```

Wave 1 QA is intentionally conservative and heuristic. Pixel-level face/anatomy scoring and automatic inpaint/correction should be implemented as the next dedicated QA provider story.
