import base64
import os
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

try:
    import mediapipe as mp
except Exception:  # pragma: no cover - startup resilience in minimal images
    mp = None


PORT = int(os.getenv("PORT", "8096"))
MIN_PERSON_CONFIDENCE = float(os.getenv("LOCAL_VISUAL_QA_MIN_PERSON_CONFIDENCE", "0.45"))
MIN_HAND_CONFIDENCE = float(os.getenv("LOCAL_VISUAL_QA_MIN_HAND_CONFIDENCE", "0.45"))
STRICTNESS = os.getenv("LOCAL_VISUAL_QA_STRICTNESS", "strict").strip().lower()

STRICTNESS_LEVELS = {
    "lenient": 0,
    "balanced": 1,
    "strict": 2,
    "very_strict": 3,
}
STRICTNESS_LEVEL = STRICTNESS_LEVELS.get(STRICTNESS, STRICTNESS_LEVELS["strict"])

app = FastAPI(title="local-visual-qa")


class QaRequest(BaseModel):
    avatar: str | None = None
    scene: str | None = None
    mimeType: str | None = "image/png"
    fileBase64: str | None = None
    promptPack: dict[str, Any] | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def qa_payload(
    status: str,
    scores: dict[str, float],
    flags: list[str],
    notes: list[str],
    defect_reasons: list[str] | None = None,
    correction_recommended: bool = False,
) -> dict[str, Any]:
    defect_reasons = defect_reasons or []
    severity = "blocked" if status == "blocked" else "review" if status == "review_required" else "none"
    return {
        "contractVersion": "publication-image-qa-v1",
        "provider": "local-visual-qa",
        "status": status,
        "scores": {key: max(0.0, min(1.0, float(value))) for key, value in scores.items()},
        "flags": flags,
        "notes": [*notes, f"Local QA strictness: {STRICTNESS}."],
        "defectSeverity": severity,
        "defectReasons": defect_reasons,
        "correctionRecommended": correction_recommended,
        "correctionMode": "manual-regenerate-or-inpaint" if correction_recommended else None,
        "reviewedAt": now_iso(),
    }


def base_scores(value: float = 0.65) -> dict[str, float]:
    return {
        "identity": 0.5,
        "face": 0.5,
        "hands": value,
        "feet": value,
        "composition": value,
        "publishability": value,
    }


def is_strict(level: str) -> bool:
    return STRICTNESS_LEVEL >= STRICTNESS_LEVELS[level]


def prompt_expects_full_body(prompt_pack: dict[str, Any] | None) -> bool:
    if not isinstance(prompt_pack, dict):
        return False
    text_parts: list[str] = []
    for key in ["positivePrompt", "sceneDetails"]:
        value = prompt_pack.get(key)
        if isinstance(value, str):
            text_parts.append(value)
    policy = prompt_pack.get("compositionPolicy")
    if isinstance(policy, dict):
        text_parts.extend(str(value) for value in policy.values() if isinstance(value, str))
    text = " ".join(text_parts).lower()
    if any(term in text for term in ["waist-up", "waist up", "medium close-up", "close-up", "portrait"]):
        return False
    return any(term in text for term in ["full body", "full-body", "head to toe", "standing full length"])


def decode_image(file_base64: str | None) -> np.ndarray | None:
    if not file_base64:
        return None
    try:
        raw = base64.b64decode(file_base64, validate=True)
    except Exception:
        return None
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def merge_qa(primary: dict[str, Any], secondary: dict[str, Any]) -> dict[str, Any]:
    status_rank = {"pass": 0, "review_required": 1, "blocked": 2}
    primary_status = str(primary.get("status") or "review_required")
    secondary_status = str(secondary.get("status") or "review_required")
    status = primary_status if status_rank.get(primary_status, 1) >= status_rank.get(secondary_status, 1) else secondary_status
    scores = dict(primary.get("scores") or {})
    for key, value in (secondary.get("scores") or {}).items():
        scores[key] = min(float(scores.get(key, value)), float(value))
    flags = list(dict.fromkeys([*(primary.get("flags") or []), *(secondary.get("flags") or [])]))
    defect_reasons = list(
        dict.fromkeys([*(primary.get("defectReasons") or []), *(secondary.get("defectReasons") or [])])
    )
    notes = list(dict.fromkeys([*(primary.get("notes") or []), *(secondary.get("notes") or [])]))
    return qa_payload(
        status,
        scores,
        flags,
        notes,
        defect_reasons,
        bool(primary.get("correctionRecommended") or secondary.get("correctionRecommended")),
    )


def inspect_hands(
    image: np.ndarray,
    pose_landmarks: Any | None,
    prompt_pack: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if mp is None:
        return qa_payload(
            "review_required",
            base_scores(0.5),
            ["hand-detector-unavailable"],
            ["MediaPipe is not available; local QA could not inspect hand landmarks."],
        )

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with mp.solutions.hands.Hands(
        static_image_mode=True,
        max_num_hands=4,
        min_detection_confidence=MIN_HAND_CONFIDENCE,
    ) as hands:
        result = hands.process(rgb)

    detected_hands = result.multi_hand_landmarks or []
    hand_count = len(detected_hands)
    flags: list[str] = []
    defect_reasons: list[str] = []
    notes: list[str] = []
    scores = base_scores(0.72)

    if hand_count > 2:
        flags.append("too-many-hands-detected")
        defect_reasons.append("too-many-hands-detected")
        scores["hands"] = 0.2
        scores["publishability"] = 0.3
        notes.append(f"Local hand detector found {hand_count} hands; expected at most 2.")
        return qa_payload("blocked", scores, flags, notes, defect_reasons, True)

    if pose_landmarks is not None:
        pose_names = mp.solutions.pose.PoseLandmark
        left_wrist = pose_landmarks.landmark[pose_names.LEFT_WRIST.value].visibility or 0.0
        right_wrist = pose_landmarks.landmark[pose_names.RIGHT_WRIST.value].visibility or 0.0
        visible_wrists = sum(1 for value in [left_wrist, right_wrist] if value >= MIN_PERSON_CONFIDENCE)
        if visible_wrists >= 2 and hand_count < 2:
            flags.append("ambiguous-hand-object-interaction")
            scores["hands"] = 0.42
            scores["publishability"] = 0.45
            notes.append(
                "Pose detector sees two wrists, but hand detector could not clearly separate both hands. Review object/hand interaction."
            )
            if is_strict("very_strict"):
                defect_reasons.append("ambiguous-hand-object-interaction")
        if visible_wrists == 1 and hand_count == 2:
            flags.append("possible-extra-hand-region")
            scores["hands"] = 0.38
            scores["publishability"] = 0.45
            notes.append(
                "Hand detector found two hand regions while pose only confidently sees one wrist. Review for extra or merged hands."
            )
            if is_strict("very_strict"):
                defect_reasons.append("possible-extra-hand-region")

    if hand_count == 0:
        flags.append("no-hands-detected")
        scores["hands"] = 0.45
        notes.append("No clear hands were detected; review if hands are hidden or merged with objects.")
        if is_strict("very_strict"):
            defect_reasons.append("no-hands-detected")

    if defect_reasons:
        return qa_payload("blocked", scores, flags, notes, defect_reasons, True)

    if flags:
        return qa_payload("review_required", scores, flags, notes, [], True)

    return qa_payload("pass", scores, [], [f"Local hand detector found {hand_count} plausible hand region(s)."])


def inspect_pose(image: np.ndarray, prompt_pack: dict[str, Any] | None = None) -> dict[str, Any]:
    if mp is None:
        return qa_payload(
            "review_required",
            base_scores(0.5),
            ["pose-detector-unavailable"],
            ["MediaPipe is not available; local QA could not inspect body keypoints."],
        )

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    with mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1) as pose:
        result = pose.process(rgb)

    if not result.pose_landmarks:
        scores = base_scores(0.25)
        scores["publishability"] = 0.25
        pose_qa = qa_payload(
            "blocked",
            scores,
            ["no-person-detected"],
            ["No person pose was detected in the generated image."],
            ["no-person-detected"],
            True,
        )
        return merge_qa(pose_qa, inspect_hands(image, None, prompt_pack))

    landmarks = result.pose_landmarks.landmark
    visibility = [float(point.visibility or 0.0) for point in landmarks]
    avg_visibility = sum(visibility) / max(len(visibility), 1)
    visible_count = sum(1 for value in visibility if value >= MIN_PERSON_CONFIDENCE)

    pose_names = mp.solutions.pose.PoseLandmark
    checks = {
        "left_arm": [pose_names.LEFT_SHOULDER, pose_names.LEFT_ELBOW, pose_names.LEFT_WRIST],
        "right_arm": [pose_names.RIGHT_SHOULDER, pose_names.RIGHT_ELBOW, pose_names.RIGHT_WRIST],
        "left_leg": [pose_names.LEFT_HIP, pose_names.LEFT_KNEE, pose_names.LEFT_ANKLE],
        "right_leg": [pose_names.RIGHT_HIP, pose_names.RIGHT_KNEE, pose_names.RIGHT_ANKLE],
        "face": [pose_names.NOSE, pose_names.LEFT_EYE, pose_names.RIGHT_EYE],
    }

    weak_parts = []
    expects_full_body = prompt_expects_full_body(prompt_pack)
    for part, indexes in checks.items():
        part_visibility = [landmarks[index.value].visibility or 0.0 for index in indexes]
        if sum(1 for value in part_visibility if value >= MIN_PERSON_CONFIDENCE) < 2:
            weak_parts.append(part)

    flags = []
    defect_reasons = []
    if avg_visibility < 0.35 or visible_count < 10:
        flags.append("low-confidence-pose")
        defect_reasons.append("low-confidence-pose")
    for part in weak_parts:
        flags.append(f"weak-{part}-keypoints")
    blocking_weak_parts = [
        part for part in weak_parts if expects_full_body or ("leg" not in part and part != "face")
    ]
    if is_strict("very_strict") and len(blocking_weak_parts) >= 2:
        defect_reasons.append("multiple-weak-body-regions")
    if is_strict("very_strict") and any("arm" in part for part in weak_parts):
        defect_reasons.append("weak-arm-keypoints")

    scores = base_scores(0.72)
    scores["composition"] = max(0.2, min(0.8, avg_visibility))
    scores["publishability"] = max(0.25, min(0.78, avg_visibility + 0.1))
    if any("arm" in part for part in weak_parts):
        scores["hands"] = 0.42
    if expects_full_body and any("leg" in part for part in weak_parts):
        scores["feet"] = 0.42
    if "face" in weak_parts:
        scores["face"] = 0.4

    if defect_reasons:
        pose_qa = qa_payload(
            "blocked",
            scores,
            flags,
            ["Local pose detector could not confidently validate the avatar body geometry."],
            defect_reasons,
            True,
        )
        return merge_qa(pose_qa, inspect_hands(image, result.pose_landmarks, prompt_pack))

    if flags:
        pose_qa = qa_payload(
            "review_required",
            scores,
            flags,
            ["Local pose detector found body areas that need human review."],
            [],
            scores["hands"] < 0.55 or scores["feet"] < 0.55,
        )
        return merge_qa(pose_qa, inspect_hands(image, result.pose_landmarks, prompt_pack))

    return merge_qa(
        qa_payload("pass", scores, [], ["Local pose detector found one plausible person pose."]),
        inspect_hands(image, result.pose_landmarks, prompt_pack),
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "local-visual-qa",
        "mediapipeConfigured": mp is not None,
        "minPersonConfidence": MIN_PERSON_CONFIDENCE,
        "minHandConfidence": MIN_HAND_CONFIDENCE,
        "strictness": STRICTNESS,
        "strictnessLevel": STRICTNESS_LEVEL,
    }


@app.post("/qa/anatomy")
def qa_anatomy(request: QaRequest) -> dict[str, Any]:
    image = decode_image(request.fileBase64)
    if image is None:
        return {
            "ok": False,
            "provider": "local-visual-qa",
            "error": "fileBase64 must contain a valid image",
            "qa": qa_payload(
                "blocked",
                base_scores(0.2),
                ["invalid-image"],
                ["The local QA service could not decode the generated image."],
                ["invalid-image"],
                True,
            ),
        }
    return {"ok": True, "provider": "local-visual-qa", "qa": inspect_pose(image, request.promptPack)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
