"""시험지(내신·모의고사·수능형) 프로파일."""
from __future__ import annotations

import re

from .base import UNCERTAIN_FIELDS, Profile, S, arr, issue, obj, uncertain_issues

CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩"
JAMO_MARKS = "ㄱㄴㄷㄹㅁ"


class Exam(Profile):
    key = "exam"
    label = "시험지"

    transcribe_guide = """\
[문서 종류: 시험지]
- 문항 번호, 발문, 자료(제시문·표·그래프·지도), <보기>, 선지(①~⑤)를 원본 순서대로 옮겨라.
- 2단 편집이면 왼쪽 단을 끝까지 옮긴 뒤 오른쪽 단을 옮겨라. 문항이 섞이지 않게 하라.
- 선지 기호(①②③④⑤), <보기>의 ㄱ. ㄴ. ㄷ. ㄹ., 갑·을·병·정, (가)(나)(다), A·B·C 표기는 원본 그대로.
- 표는 마크다운 표로. 그래프·지도·그림은 [그림: 무엇을 나타내는지 + 축 이름·범례·눈금·
  보이는 모든 숫자와 라벨] 형식으로 빠짐없이 적어라. 그림 속 수치를 추정해 만들지 마라.
- 밑줄·굵게·박스 친 부분은 __밑줄__, **굵게**, [박스: …] 로 표시하라.
- 배점 표기([2점], [3점])와 시험지 머리 정보(과목·학년·회차)도 옮겨라.
- 손글씨 풀이·채점 표시는 옮기지 말고, 있었다는 사실만 [필기 있음]으로 적어라."""

    structure_guide = """\
전사문에서 시험 문항을 추출하라.
- header: 시험 머리 정보(학교/기관, 학년, 과목, 회차).
- questions: 문항 하나 = 한 원소. number는 문항 번호 숫자만.
  stem=발문, passage=제시문·자료·<보기>(표는 마크다운 유지, [그림: …] 유지),
  choices=선지 목록(label은 ①~⑤ 기호, text는 선지 내용). 서답형이면 choices는 빈 배열.
  points=배점(없으면 빈 문자열), figure_note=그림/그래프가 있으면 그 설명.
- 전사문에 있는 내용을 요약·수정하지 말고 그대로 담아라.
- ⟦?…⟧ 표시가 있던 값은 표시를 떼고 담되, 그 필드명을 uncertain_fields에 넣어라."""

    schema = obj({
        "header": S(),
        "questions": arr(obj({
            "number": S(),
            "stem": S(),
            "passage": S(),
            "choices": arr(obj({"label": S(), "text": S()})),
            "points": S(),
            "figure_note": S(),
            "uncertain_fields": UNCERTAIN_FIELDS,
        })),
    })

    def validate(self, data: dict) -> list[dict]:
        out: list[dict] = []
        qs = data.get("questions") or []
        nums = []
        for i, q in enumerate(qs):
            w = f"questions[{i}]"
            n = (q.get("number") or "").strip()
            if not n.isdigit():
                out.append(issue("error", f"{w}.number", f"문항 번호 '{n}' 판독 이상"))
                continue
            nums.append(int(n))
            tag = f"{n}번"
            if not (q.get("stem") or "").strip():
                out.append(issue("error", f"{w}.stem", f"{tag}: 발문이 비어 있음"))

            ch = q.get("choices") or []
            if ch:
                labels = [c.get("label", "").strip() for c in ch]
                if len(ch) != 5:
                    out.append(issue("warning", f"{w}.choices", f"{tag}: 선지 {len(ch)}개 (5지선다 기준) — 누락/중복 확인"))
                expect = list(CIRCLED[:len(ch)])
                if labels != expect:
                    out.append(issue("warning", f"{w}.choices", f"{tag}: 선지 기호 순서 {''.join(labels)} ≠ {''.join(expect)}"))
                if len({c.get('text', '').strip() for c in ch}) < len(ch):
                    out.append(issue("warning", f"{w}.choices", f"{tag}: 내용이 같은 선지가 있음 — 판독 오류 의심"))
                # 선지가 ㄱ,ㄴ,ㄷ 조합이면 자료에 해당 <보기> 진술이 있어야 한다
                used = set(re.findall(f"[{JAMO_MARKS}]", " ".join(c.get("text", "") for c in ch)))
                missing = [j for j in sorted(used) if not re.search(rf"{j}\s*[.．]", q.get("passage") or "")]
                if used and missing:
                    out.append(issue("warning", f"{w}.passage", f"{tag}: 선지에 쓰인 {', '.join(missing)} 진술을 <보기>에서 찾지 못함"))

        if nums:
            dup = sorted({n for n in nums if nums.count(n) > 1})
            gaps = sorted(set(range(min(nums), max(nums) + 1)) - set(nums))
            if dup:
                out.append(issue("error", "questions", f"중복 문항 번호: {dup}"))
            if gaps:
                out.append(issue("warning", "questions", f"빠진 문항 번호: {gaps} — 페이지 누락·판독 누락 확인"))
            if nums != sorted(nums):
                out.append(issue("warning", "questions", "문항 순서가 뒤섞임 — 2단 편집 판독 순서 확인"))
        else:
            out.append(issue("info", "questions", "추출된 문항이 없음"))

        out += uncertain_issues(qs, "questions")
        return out


PROFILE = Exam()
