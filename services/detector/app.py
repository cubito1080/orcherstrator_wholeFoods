from __future__ import annotations

import base64
import binascii
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class DetectorRequest(BaseModel):
    image: str = Field(..., min_length=1)
    prompts: list[str] = Field(default_factory=list)


class BoundingBox(BaseModel):
    page: int = Field(default=0, ge=0)
    x: float
    y: float
    width: float = Field(..., ge=0)
    height: float = Field(..., ge=0)


class Detection(BaseModel):
    label: str
    confidence: float = Field(..., ge=0, le=1)
    box: BoundingBox


class DetectorResponse(BaseModel):
    detections: list[Detection] = Field(default_factory=list)


app = FastAPI(title="Auto Estimator Detector", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "service": "detector"}


@app.get("/ready")
def ready() -> dict[str, str | bool]:
    mode = os.getenv("DETECTOR_MODE", "mock")
    return {"ready": True, "mode": mode}


@app.post("/detect", response_model=DetectorResponse)
def detect(request: DetectorRequest) -> DetectorResponse:
    image_bytes = _decode_image(request.image)
    mode: Literal["mock", "real"] = "real" if os.getenv("DETECTOR_MODE") == "real" else "mock"
    if mode == "real":
        raise HTTPException(
            status_code=501,
            detail="real detector backend is not wired; use DETECTOR_MODE=mock",
        )
    return DetectorResponse(detections=_mock_detections(image_bytes, request.prompts))


def _decode_image(value: str) -> bytes:
    try:
        decoded = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="image must be valid base64") from exc
    if not decoded:
        raise HTTPException(status_code=400, detail="image cannot be empty")
    return decoded


def _mock_detections(image_bytes: bytes, prompts: list[str]) -> list[Detection]:
    detections: list[Detection] = []
    seed = max(1, len(image_bytes) % 97)
    for index, prompt in enumerate(prompts):
        if not prompt.strip():
            continue
        detections.append(
            Detection(
                label=prompt,
                confidence=round(max(0.55, 0.95 - index * 0.03), 2),
                box=BoundingBox(
                    page=0,
                    x=80 + index * 42 + seed,
                    y=120 + index * 35,
                    width=28,
                    height=22,
                ),
            )
        )
    return detections
