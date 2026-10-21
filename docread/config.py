"""전역 설정. 모든 값은 환경변수로 덮어쓸 수 있다."""
import os

MODEL = os.getenv("DOCREAD_MODEL", "claude-opus-5-5")

# 판독(전사)·대조판정·구조화 단계별 effort. 전사는 정확도가 핵심이라 high 기본.
EFFORT_TRANSCRIBE = os.getenv("DOCREAD_EFFORT_TRANSCRIBE", "high")
EFFORT_ADJUDICATE = os.getenv("DOCREAD_EFFORT_ADJUDICATE", "high")
EFFORT_STRUCTURE = os.getenv("DOCREAD_EFFORT_STRUCTURE", "medium")

# 렌더링·전처리
RENDER_DPI = int(os.getenv("DOCREAD_DPI", "300"))
WORK_WIDTH = int(os.getenv("DOCREAD_WORK_WIDTH", "2400"))  # 페이지를 이 폭(px)으로 맞춘 뒤 조각낸다

# Claude 고해상도 비전 한계(긴 변 2576px, 약 3.75MP) 안쪽으로 조각 크기를 잡는다.
TILE_MAX_LONG_EDGE = 2576
TILE_MAX_PIXELS = 3_600_000
TILE_OVERLAP = 90
OVERVIEW_LONG_EDGE = 1400

PAGE_WORKERS = int(os.getenv("DOCREAD_PAGE_WORKERS", "4"))

# 비용 추정용 단가 (USD / 100만 토큰). 모델을 바꾸면 함께 갱신할 것.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-haiku-5-5": (0.10, 0.50),
}

# 선택: 네이버 CLOVA OCR (General). 둘 다 설정되면 2차 판독 엔진으로 자동 사용.
CLOVA_OCR_URL = os.getenv("CLOVA_OCR_URL", "")
CLOVA_OCR_SECRET = os.getenv("CLOVA_OCR_SECRET", "")

DATA_DIR = os.getenv("DOCREAD_DATA_DIR", os.path.join(os.getcwd(), "data"))
