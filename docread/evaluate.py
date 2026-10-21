"""정확도 측정: 판독 결과를 사람이 만든 정답 전사문과 비교한다.

  python -m docread.evaluate out/홍길동 정답.md
  python -m docread.evaluate out/홍길동 정답.md --page 3      # 특정 쪽만

지표
- CER(문자 오류율): 공백·표 기호를 뺀 글자 기준 (편집거리 / 정답 글자 수)
- 숫자 오류율: 숫자만 뽑아 비교 — 등급·점수 오판독은 여기서 드러난다
- 플래그 적중률: 실제로 틀린 곳 중 ⟦?⟧ 표시가 붙어 있던 비율 (높을수록 '모르는 걸 안다')
"""
from __future__ import annotations

import argparse
import json
import os
import re
from difflib import SequenceMatcher

from .consensus import MARKER_RE, strip_markers

IGNORE = re.compile(r"[\s|\-:=*_#`>]")


def _chars(text: str) -> str:
    return IGNORE.sub("", strip_markers(text))


def _edit_distance(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def score(pred: str, truth: str) -> dict:
    p, t = _chars(pred), _chars(truth)
    pd, td = re.sub(r"\D", "", p), re.sub(r"\D", "", t)
    cer = _edit_distance(p, t) / max(1, len(t))
    der = _edit_distance(pd, td) / max(1, len(td))

    # 틀린 위치 중 ⟦?⟧로 표시돼 있던 비율
    flagged = set()
    pos = 0
    for m in re.finditer(r"⟦\?[^⟧]*⟧|.", pred, re.S):
        piece = m.group()
        n = len(IGNORE.sub("", strip_markers(piece)))
        if MARKER_RE.fullmatch(piece):
            flagged.update(range(pos, pos + max(1, n)))
        pos += n
    wrong = set()
    for op, i1, i2, _, _ in SequenceMatcher(None, p, t, autojunk=False).get_opcodes():
        if op != "equal":
            wrong.update(range(i1, max(i2, i1 + 1)))
    hit = len(wrong & flagged) / len(wrong) if wrong else 1.0

    return {"chars": len(t), "cer": round(cer, 5), "digits": len(td), "digit_error_rate": round(der, 5),
            "errors_flagged_ratio": round(hit, 3), "flags": len(MARKER_RE.findall(pred))}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("result_dir")
    ap.add_argument("truth", help="정답 전사문(.md/.txt). 쪽 구분은 '=== N쪽' 줄로(없으면 전체 비교)")
    ap.add_argument("--page", type=int)
    a = ap.parse_args()

    with open(os.path.join(a.result_dir, "result.json"), encoding="utf-8") as f:
        pages = {p["page"]: p.get("transcript", "") for p in json.load(f)["pages"]}
    with open(a.truth, encoding="utf-8") as f:
        truth = f.read()

    parts = re.split(r"^===\s*(\d+)쪽.*$", truth, flags=re.M)
    truth_pages = {int(parts[i]): parts[i + 1] for i in range(1, len(parts) - 1, 2)} or None
    if a.page:
        r = score(pages[a.page], truth_pages[a.page] if truth_pages else truth)
    elif truth_pages:
        r = score("\n".join(pages[n] for n in sorted(truth_pages)), "\n".join(truth_pages[n] for n in sorted(truth_pages)))
    else:
        r = score("\n".join(pages[n] for n in sorted(pages)), truth)
    print(json.dumps(r, ensure_ascii=False, indent=2))
    print(f"\n문자 정확도 {100 * (1 - r['cer']):.2f}% · 숫자 정확도 {100 * (1 - r['digit_error_rate']):.2f}% · "
          f"오류 중 표시된 비율 {100 * r['errors_flagged_ratio']:.0f}%")


if __name__ == "__main__":
    main()
