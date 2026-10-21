"""선택 엔진: 네이버 CLOVA OCR (General). 한국어 인쇄체·숫자 판독에 강하다.

Claude와 '다른 원리'의 엔진이라, 두 결과가 같은 실수를 할 확률이 낮아 대조 효과가 크다.
CLOVA 콘솔에서 General OCR 도메인을 만들고 APIGW Invoke URL과 Secret Key를 환경변수로 넣는다.
"""
from __future__ import annotations

import time
import uuid

import httpx
import numpy as np

from .. import config
from ..tiling import encode
from .base import EngineError


class ClovaEngine:
    name = "clova"

    def __init__(self, url: str = config.CLOVA_OCR_URL, secret: str = config.CLOVA_OCR_SECRET):
        if not (url and secret):
            raise EngineError("CLOVA_OCR_URL / CLOVA_OCR_SECRET 환경변수가 필요합니다.")
        self.url, self.secret = url, secret
        self.calls = 0

    @classmethod
    def available(cls) -> bool:
        return bool(config.CLOVA_OCR_URL and config.CLOVA_OCR_SECRET)

    def transcribe(self, page_img: np.ndarray, profile=None) -> str:
        mt, data = encode(page_img)
        body = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "lang": "ko",
            "images": [{"format": mt.split("/")[1].replace("jpeg", "jpg"), "name": "page", "data": data}],
        }
        try:
            r = httpx.post(self.url, json=body, headers={"X-OCR-SECRET": self.secret}, timeout=120)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise EngineError(f"CLOVA OCR 오류: {e}") from e
        self.calls += 1
        image = r.json()["images"][0]
        if image.get("inferResult") != "SUCCESS":
            raise EngineError(f"CLOVA OCR 판독 실패: {image.get('message')}")
        lines, cur = [], []
        for f in image.get("fields", []):
            cur.append(f["inferText"])
            if f.get("lineBreak"):
                lines.append(" ".join(cur))
                cur = []
        if cur:
            lines.append(" ".join(cur))
        return "\n".join(lines)
