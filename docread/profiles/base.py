from __future__ import annotations

import re

UNCERTAIN_RE = re.compile(r"⟦\?")


def S(desc: str = "") -> dict:
    return {"type": "string", "description": desc} if desc else {"type": "string"}


def arr(items: dict) -> dict:
    return {"type": "array", "items": items}


def obj(props: dict) -> dict:
    """구조화 출력용 객체 스키마: 모든 필드 필수, 추가 필드 금지."""
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


UNCERTAIN_FIELDS = arr(S("판독이 불확실한(⟦?…⟧ 표시가 있던) 필드 이름 목록"))


class Profile:
    key = "generic"
    label = "일반 문서"
    transcribe_guide = ""
    structure_guide = ""
    schema: dict | None = None

    def validate(self, data: dict) -> list[dict]:
        return []


def issue(level: str, where: str, message: str) -> dict:
    return {"level": level, "where": where, "message": message}


def num(v: str | None) -> float | None:
    """'85.3', '85', ' 85 ' → 숫자. '-', 'P', '' 등은 None."""
    if v is None:
        return None
    v = v.strip().replace(",", "")
    try:
        return float(v)
    except ValueError:
        return None


def is_blank(v: str | None) -> bool:
    return v is None or v.strip() in ("", "-", "·", "—")


def uncertain_issues(rows: list[dict], path: str) -> list[dict]:
    out = []
    for i, r in enumerate(rows):
        for f in r.get("uncertain_fields") or []:
            out.append(issue("warning", f"{path}[{i}].{f}", f"판독 불확실 — 원본과 대조 필요 ({_label(r)})"))
    return out


def _label(r: dict) -> str:
    for k in ("subject", "number", "area", "year"):
        if r.get(k):
            return f"{k}={r[k]}"
    return ""
