"""입력 파일(PDF·이미지)을 페이지 단위로 읽는다.

PDF에 신뢰할 수 있는 텍스트 레이어가 있으면 OCR 없이 그대로 쓴다(오류 0).
단, 스캐너가 이미지 위에 덧씌운 '보이지 않는 OCR 레이어'는 품질이 낮은 경우가 많아
페이지 대부분이 이미지로 덮여 있으면 스캔본으로 간주한다.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass

import pymupdf as fitz
import numpy as np
from PIL import Image, ImageOps

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp", ".heic", ".heif"}
MIN_TEXT_CHARS = 40
SCAN_IMAGE_COVERAGE = 0.8


@dataclass
class PageInput:
    index: int  # 0부터 시작하는 전체 페이지 순번
    image: np.ndarray  # BGR
    kind: str  # "pdf_text" | "pdf_scan" | "photo"
    source: str  # 원본 파일명 + 페이지
    text_layer: str | None = None


def load_inputs(paths: list[str], dpi: int = 300) -> list[PageInput]:
    pages: list[PageInput] = []
    for path in paths:
        ext = os.path.splitext(path)[1].lower()
        if ext == ".pdf":
            pages.extend(_load_pdf(path, dpi, start=len(pages)))
        elif ext in IMAGE_EXTS:
            pages.append(PageInput(len(pages), _load_image(path), "photo", os.path.basename(path)))
        else:
            raise ValueError(f"지원하지 않는 파일 형식입니다: {os.path.basename(path)}")
    if not pages:
        raise ValueError("읽을 페이지가 없습니다.")
    return pages


def _load_pdf(path: str, dpi: int, start: int) -> list[PageInput]:
    doc = fitz.open(path)
    if doc.needs_pass and not doc.authenticate(""):
        raise ValueError(f"암호가 걸린 PDF입니다: {os.path.basename(path)}")
    out = []
    for i, page in enumerate(doc):
        text = page.get_text("text", sort=True)
        trusted = _has_trusted_text(page, text)
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        img = img[:, :, ::-1].copy() if pix.n == 3 else np.dstack([img[:, :, 0]] * 3)
        out.append(PageInput(
            index=start + i,
            image=img,
            kind="pdf_text" if trusted else "pdf_scan",
            source=f"{os.path.basename(path)} p.{i + 1}",
            text_layer=text if trusted else None,
        ))
    doc.close()
    return out


def _has_trusted_text(page: fitz.Page, text: str) -> bool:
    if len(re.sub(r"\s", "", text)) < MIN_TEXT_CHARS:
        return False
    page_area = abs(page.rect)
    if page_area <= 0:
        return False
    covered = 0.0
    for info in page.get_image_info():
        covered += abs(fitz.Rect(info["bbox"]) & page.rect)
    return covered / page_area < SCAN_IMAGE_COVERAGE


def _load_image(path: str) -> np.ndarray:
    if path.lower().endswith((".heic", ".heif")):
        try:
            import pillow_heif  # type: ignore

            pillow_heif.register_heif_opener()
        except ImportError as e:
            raise ValueError("HEIC 사진은 `pip install pillow-heif` 후 사용할 수 있습니다.") from e
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")  # 휴대폰 사진 회전 정보 반영
        return np.asarray(im)[:, :, ::-1].copy()
