"""페이지를 위→아래 가로 띠(strip)로 자른다.

비전 모델은 큰 이미지를 내부에서 줄여서 본다. A4 한 장을 통째로 넣으면 세특의
작은 글씨가 뭉개지므로, 모델 한계 해상도 안에서 최대한 크게 보이도록 나눈다.
가로로 자르지 않는 이유: 한 줄의 문장/표 행이 둘로 쪼개지지 않게 하기 위해서다.
"""
from __future__ import annotations

import base64
import math

import cv2
import numpy as np

from . import config

MAX_IMAGE_BYTES = 4_500_000  # API 이미지 1장 한도(5MB)보다 여유 있게


def make_strips(img: np.ndarray, max_long: int = config.TILE_MAX_LONG_EDGE,
                max_pixels: int = config.TILE_MAX_PIXELS, overlap: int = config.TILE_OVERLAP) -> list[np.ndarray]:
    h, w = img.shape[:2]
    if w > max_long:
        img = cv2.resize(img, (max_long, round(h * max_long / w)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]
    strip_h = min(max_long, max_pixels // w)
    if h <= strip_h:
        return [img]
    n = math.ceil((h - overlap) / (strip_h - overlap))
    step = math.ceil((h - overlap) / n)
    strips = []
    for i in range(n):
        y0 = i * step
        y1 = min(h, y0 + step + overlap)
        strips.append(img[y0:y1])
    return strips


def overview(img: np.ndarray, long_edge: int = config.OVERVIEW_LONG_EDGE) -> np.ndarray:
    h, w = img.shape[:2]
    s = long_edge / max(h, w)
    if s >= 1:
        return img
    return cv2.resize(img, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)


def encode(img: np.ndarray) -> tuple[str, str]:
    """(media_type, base64). 글자 보존을 위해 PNG(무손실) 우선, 너무 크면 고품질 JPEG."""
    ok, buf = cv2.imencode(".png", img, [cv2.IMWRITE_PNG_COMPRESSION, 6])
    if ok and len(buf) <= MAX_IMAGE_BYTES:
        return "image/png", base64.standard_b64encode(buf.tobytes()).decode()
    for q in (95, 90, 85):
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
        if ok and len(buf) <= MAX_IMAGE_BYTES:
            return "image/jpeg", base64.standard_b64encode(buf.tobytes()).decode()
    raise ValueError("이미지가 너무 커서 전송할 수 없습니다.")
