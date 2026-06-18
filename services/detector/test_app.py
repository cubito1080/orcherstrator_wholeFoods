import base64

import pytest
from fastapi import HTTPException

from app import DetectorRequest, detect, health


def test_health():
    assert health()["ok"] is True


def test_mock_detect_contract():
    response = detect(
        DetectorRequest(
            image=base64.b64encode(b"fake-png").decode("ascii"),
            prompts=["duplex receptacle", "luminaire"],
        )
    )
    body = response.model_dump()
    assert len(body["detections"]) == 2
    assert body["detections"][0]["label"] == "duplex receptacle"


def test_invalid_base64_rejected():
    with pytest.raises(HTTPException) as exc_info:
        detect(DetectorRequest(image="not-base64", prompts=["x"]))
    assert exc_info.value.status_code == 400
