"""판독 전 이미지 보정.

원칙: 원본 신호를 바꾸지 않는 보정만 한다. 생성형 초해상도(AI 업스케일)는
흐린 글자를 그럴듯한 다른 글자로 '지어낼' 수 있어 쓰지 않는다.

- baseline: 기하 보정(원근·기울기)만 한 컬러 이미지 → 2차 판독용(독립 시야)
- enhanced: 기하 보정 + 노이즈 제거 + 조명 평탄화 + 대비 보정 + 약한 선명화 → 1차 판독용
"""
from __future__ import annotations

import math

import cv2
import numpy as np


def prepare(img: np.ndarray, work_width: int, is_photo: bool) -> tuple[np.ndarray, np.ndarray, dict]:
    meta: dict = {"input_size": [int(img.shape[1]), int(img.shape[0])]}

    if is_photo:
        quad = find_document_quad(img)
        if quad is not None:
            img = warp_quad(img, quad)
            meta["perspective_corrected"] = True

    angle = estimate_skew(to_gray(img))
    if 0.15 <= abs(angle) <= 15:
        img = rotate(img, -angle)
        meta["deskew_degrees"] = round(angle, 2)

    img = resize_to_width(img, work_width)
    meta["work_size"] = [int(img.shape[1]), int(img.shape[0])]

    baseline = img
    enhanced = unsharp(clahe(normalize_illumination(denoise(to_gray(img)))))
    return baseline, enhanced, meta


def to_gray(img: np.ndarray) -> np.ndarray:
    return img if img.ndim == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def resize_to_width(img: np.ndarray, width: int) -> np.ndarray:
    h, w = img.shape[:2]
    if w == width:
        return img
    # 확대는 바이큐빅(보간만, 글자 생성 없음), 축소는 INTER_AREA(앨리어싱 방지)
    interp = cv2.INTER_CUBIC if width > w else cv2.INTER_AREA
    return cv2.resize(img, (width, round(h * width / w)), interpolation=interp)


# ---------- 원근 보정 (휴대폰 사진) ----------

def find_document_quad(img: np.ndarray) -> np.ndarray | None:
    """사진 속 종이의 네 꼭짓점을 찾는다. 못 찾으면 None."""
    h, w = img.shape[:2]
    scale = 1000 / max(h, w)
    small = cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA)
    gray = cv2.GaussianBlur(to_gray(small), (5, 5), 0)
    edges = cv2.Canny(gray, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area_total = small.shape[0] * small.shape[1]
    for c in sorted(contours, key=cv2.contourArea, reverse=True)[:5]:
        approx = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        area = cv2.contourArea(approx)
        # 너무 작으면 종이가 아니고, 화면을 거의 다 채우면 이미 잘린 사진이다.
        if len(approx) == 4 and 0.3 * area_total < area < 0.97 * area_total and cv2.isContourConvex(approx):
            return approx.reshape(4, 2).astype(np.float32) / scale
    return None


def order_points(pts: np.ndarray) -> np.ndarray:
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], dtype=np.float32)


def warp_quad(img: np.ndarray, quad: np.ndarray) -> np.ndarray:
    tl, tr, br, bl = rect = order_points(quad)
    width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
    dst = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
    m = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(img, m, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


# ---------- 기울기 보정 ----------

def estimate_skew(gray: np.ndarray) -> float:
    """표 괘선·글줄의 수평 성분으로 기울기(도)를 추정한다. rotate(img, -각도)로 바로잡힌다."""
    h, w = gray.shape[:2]
    scale = min(1.0, 1600 / w)
    small = cv2.resize(gray, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else gray
    sw = small.shape[1]

    edges = cv2.Canny(small, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, math.pi / 1800, threshold=150, minLineLength=sw // 4, maxLineGap=15)
    angles = []
    if lines is not None:
        for x1, y1, x2, y2 in lines.reshape(-1, 4):
            a = math.degrees(math.atan2(y2 - y1, x2 - x1))
            if abs(a) < 15:
                angles.append(a)
    if len(angles) >= 3:
        return float(np.median(angles))

    # 괘선이 없는 문서: 글자 덩어리를 가로로 번지게 해 글줄 방향을 본다.
    bw = cv2.threshold(small, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    smear = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, sw // 40), 1)))
    contours, _ = cv2.findContours(smear, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in contours:
        x, y, cw, ch = cv2.boundingRect(c)
        if cw < sw / 6:
            continue
        vx, vy = cv2.fitLine(c, cv2.DIST_L2, 0, 0.01, 0.01).ravel()[:2]
        a = math.degrees(math.atan2(vy, vx))
        a = (a + 90) % 180 - 90  # (-90, 90]로 정규화
        if abs(a) < 15:
            angles.append(a)
    return float(np.median(angles)) if len(angles) >= 3 else 0.0


def rotate(img: np.ndarray, angle: float) -> np.ndarray:
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), -angle, 1.0)
    border = 255 if img.ndim == 2 else (255, 255, 255)
    return cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=border)


# ---------- 화질 보정 ----------

def normalize_illumination(gray: np.ndarray) -> np.ndarray:
    """그림자·조명 얼룩 제거: 배경 밝기를 추정해 나눈다(글자 형태는 그대로)."""
    k = max(15, (gray.shape[1] // 60) | 1)
    bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    bg = cv2.medianBlur(bg, 21)
    out = cv2.divide(gray, bg, scale=255)
    return out


def denoise(gray: np.ndarray) -> np.ndarray:
    """센서 노이즈(어두운 곳 촬영의 자글자글함) 제거. 이후 대비 보정이 노이즈를 키우지 않게 먼저 한다."""
    return cv2.fastNlMeansDenoising(gray, None, h=9, templateWindowSize=7, searchWindowSize=21)


def clahe(gray: np.ndarray) -> np.ndarray:
    return cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8)).apply(gray)


def unsharp(gray: np.ndarray, amount: float = 0.6) -> np.ndarray:
    blur = cv2.GaussianBlur(gray, (0, 0), 1.2)
    return cv2.addWeighted(gray, 1 + amount, blur, -amount, 0)
