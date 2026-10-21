"""두 독립 판독 결과를 대조해 불일치 지점을 찾는다.

비교는 '토큰' 단위로 한다. 마크다운 표 기호(|, ---)와 띄어쓰기 차이는 무시하므로
Claude(마크다운 표) vs CLOVA(일반 줄글)처럼 형식이 다른 결과끼리도 비교된다.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import asdict, dataclass
from difflib import SequenceMatcher

TOKEN_RE = re.compile(r"[^\s|]+")
MARKER_RE = re.compile(r"⟦\?([^⟧]*)⟧")
LOW_AGREEMENT = 0.5
MAX_DISCREPANCIES = 150
CONTEXT_CHARS = 40


@dataclass
class Discrepancy:
    id: int
    a: str  # 1차 판독(A) 원문 조각. 빈 문자열이면 B에만 있는 내용
    b: str  # 2차 판독(B) 조각. 빈 문자열이면 A에만 있는 내용
    a_start: int
    a_end: int
    before: str
    after: str
    digits: bool  # 숫자가 걸린 불일치(등급·점수 등) → 우선 검토

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Comparison:
    agreement: float
    discrepancies: list[Discrepancy]
    low_agreement: bool
    truncated: bool


def normalize(tok: str) -> str:
    tok = unicodedata.normalize("NFKC", MARKER_RE.sub(r"\1", tok))
    return tok.strip("*_`#>")


def _tokens(text: str) -> list[tuple[str, int, int]]:
    out = []
    for m in TOKEN_RE.finditer(text):
        n = normalize(m.group())
        if not n or set(n) <= set("-:="):  # 표 구분선 등
            continue
        out.append((n, m.start(), m.end()))
    return out


def compare(a_text: str, b_text: str) -> Comparison:
    ta, tb = _tokens(a_text), _tokens(b_text)
    na, nb = [t[0] for t in ta], [t[0] for t in tb]
    sm = SequenceMatcher(None, na, nb, autojunk=False)
    agreement = sm.ratio() if (na or nb) else 1.0

    diffs: list[Discrepancy] = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        a_join = "".join(na[i1:i2])
        b_join = "".join(nb[j1:j2])
        if a_join == b_join:  # 띄어쓰기만 다름
            continue
        if i1 < i2:
            a_start, a_end = ta[i1][1], ta[i2 - 1][2]
        else:  # B에만 있는 내용: A의 해당 위치에 삽입
            a_start = a_end = ta[i1 - 1][2] if i1 > 0 else 0
        b_part = b_text[tb[j1][1]:tb[j2 - 1][2]] if j1 < j2 else ""
        diffs.append(Discrepancy(
            id=len(diffs) + 1,
            a=a_text[a_start:a_end],
            b=b_part,
            a_start=a_start,
            a_end=a_end,
            before=a_text[max(0, a_start - CONTEXT_CHARS):a_start],
            after=a_text[a_end:a_end + CONTEXT_CHARS],
            digits=bool(re.search(r"\d", a_join + b_join)),
        ))

    low = agreement < LOW_AGREEMENT
    truncated = len(diffs) > MAX_DISCREPANCIES
    if low or truncated:
        # 결과가 통째로 어긋나면 개별 판정이 무의미: 페이지 전체를 사람이 보도록 표시만 한다.
        diffs = sorted(diffs, key=lambda d: not d.digits)[:MAX_DISCREPANCIES]
    return Comparison(round(agreement, 4), diffs, low, truncated)


def apply_decisions(a_text: str, diffs: list[Discrepancy], decisions: dict[int, dict]) -> tuple[str, list[dict]]:
    """판정 결과를 A 텍스트에 반영한다.

    확신(high) 판정만 그대로 반영하고, 나머지는 ⟦?읽기⟧ 표시를 남겨 사람이 확인하게 한다.
    반환: (반영된 텍스트, 불일치별 처리 기록)
    """
    text = a_text
    log = []
    for d in sorted(diffs, key=lambda x: x.a_start, reverse=True):
        dec = decisions.get(d.id)
        if dec is None:
            repl, status = f"⟦?{d.a} ↔ {d.b}⟧", "unresolved"
        elif dec.get("confidence") == "high":
            repl, status = dec["reading"], "auto_resolved"
        else:
            repl = f"⟦?{dec['reading']}⟧" if dec["reading"] else ""
            status = "needs_review"
        text = text[:d.a_start] + repl + text[d.a_end:]
        log.append({**d.to_dict(), "status": status, "decision": dec})
    log.reverse()
    return text, log


def count_markers(text: str) -> int:
    return len(MARKER_RE.findall(text))


def strip_markers(text: str) -> str:
    return MARKER_RE.sub(lambda m: m.group(1).split(" ↔ ")[0], text)
