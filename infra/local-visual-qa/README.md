# Local Visual QA

Internal anatomy QA service for generated avatar images.

The service is designed as a low-cost first-pass filter. It detects obvious
publication blockers and returns the same `publication-image-qa-v1` shape used
by `ai-gateway`.

## Scope

This service is not an identity or beauty judge. It is meant to catch obvious
issues before an operator spends time reviewing a candidate:

- no detectable person,
- multiple people when one avatar is expected,
- low-confidence body geometry,
- hand/foot/body visibility that requires manual review,
- ambiguous hand/object interactions such as phone/cup hand conflicts,
- pose detector unavailable or unable to inspect pixels.

## Endpoints

```text
GET /health
POST /qa/anatomy
```

`POST /qa/anatomy` accepts:

```json
{
  "avatar": "estefania-montealegre",
  "scene": "coffee-rain",
  "mimeType": "image/png",
  "fileBase64": "...",
  "promptPack": {
    "positivePrompt": "..."
  }
}
```

The service is intentionally conservative with automation:

- `pass`: no obvious anatomy issue detected.
- `review_required`: possible issue; an operator should decide.
- `blocked`: strong anatomy signal, such as no detectable person, too many
  hands, possible extra hand regions, or ambiguous hand/object interactions
  when the prompt expects handheld objects.

It returns:

```json
{
  "ok": true,
  "provider": "local-visual-qa",
  "qa": {
    "contractVersion": "publication-image-qa-v1",
    "provider": "local-visual-qa",
    "status": "review_required",
    "scores": {
      "identity": 0.5,
      "face": 0.5,
      "hands": 0.5,
      "feet": 0.5,
      "composition": 0.5,
      "publishability": 0.5
    },
    "flags": ["pose-detector-unavailable"],
    "notes": ["..."],
    "defectSeverity": "review",
    "defectReasons": [],
    "correctionRecommended": false,
    "correctionMode": null,
    "reviewedAt": "..."
  }
}
```

## Docker Compose

Add the service to the same Docker network as `ai-gateway` and configure:

```env
VISUAL_QA_PROVIDER=local
LOCAL_VISUAL_QA_URL=http://local-visual-qa:8096
LOCAL_VISUAL_QA_STRICTNESS=strict
```

`LOCAL_VISUAL_QA_STRICTNESS` controls how quickly anatomy warnings become
blocking defects:

- `lenient`: mostly review-only unless the image is obviously invalid.
- `balanced`: blocks hard failures such as no person or too many hands.
- `strict`: also blocks strong hand/object ambiguity and possible extra hands.
- `very_strict`: additionally blocks missing hands and multiple weak body regions.

The MVP remains CPU-compatible and combines MediaPipe Pose with MediaPipe Hands.
A GTX 1050 can help with future model choices, but this service should not
require GPU to start.
