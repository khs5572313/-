"""학교생활기록부(나이스 양식) 프로파일."""
from __future__ import annotations

import re

from .base import UNCERTAIN_FIELDS, Profile, S, arr, is_blank, issue, num, obj, uncertain_issues

ACH_GENERAL = {"A": 90, "B": 80, "C": 70, "D": 60, "E": 0}  # 5단계 성취도 원점수 하한
SETEUK_LIMIT = 500  # 과목별 세특 기재 한도(자)


class Saenggibu(Profile):
    key = "saenggibu"
    label = "학교생활기록부"

    transcribe_guide = """\
[문서 종류: 학교생활기록부(나이스 양식)]
- 교과학습발달상황 표는 마크다운 표로 옮기고, 열 순서를 원본 그대로 유지하라.
  (학기 | 교과 | 과목 | 단위수 | 원점수/과목평균(표준편차) | 성취도(수강자수) | 석차등급 등)
- "85/72.3(12.4)", "A(152)" 같은 복합 셀은 괄호·슬래시까지 원본 그대로 한 칸에 적어라.
- 진로선택 과목의 성취도별 분포비율(예: A(35.2) B(41.0) C(23.8))도 빠짐없이 옮겨라.
- 세부능력 및 특기사항, 창의적 체험활동, 행동특성 및 종합의견은 문장 하나도 빼지 말고
  원문 그대로(맞춤법 교정 금지) 옮겨라. 과목명·영역명 머리표를 유지하라.
- 학생 이름·주민등록번호·주소·전화번호는 [이름] [주민번호] [주소] [전화] 로 바꿔 적어라.
- 머리글/바닥글(발급번호, 쪽번호, 반복되는 학교명)은 한 줄로 간단히 적어도 된다."""

    structure_guide = """\
전사문에서 학교생활기록부 항목을 추출하라.
- grade_rows: 교과학습발달상황의 과목 한 줄 = 한 행. 값은 원문 문자열 그대로(숫자 변환 금지).
  복합 셀은 나눠 담아라: "85/72.3(12.4)" → raw_score=85, average=72.3, std_dev=12.4,
  "A(152)" → achievement=A, enrolled=152. 해당 칸이 없거나 '-'면 빈 문자열.
  category: 일반 / 진로선택 / 체육·예술 / 교양 / 기타 중 하나.
- subject_notes: 과목별 세부능력 및 특기사항(개인별 세특 포함). 원문 그대로.
- activities: 창체(자율·동아리·봉사·진로) 영역별 특기사항과 시간.
- behavior: 행동특성 및 종합의견(학년별).
- other_sections: 위에 속하지 않는 항목(수상, 독서, 출결, 자격증 등)을 제목/원문으로.
- ⟦?…⟧ 표시가 있던 값은 표시를 떼고 담되, 그 필드명을 해당 행 uncertain_fields에 넣어라.
- 전사문에 없는 내용을 추측해 채우지 마라."""

    schema = obj({
        "school_year_info": S("학년도·학교 유형 등 머리 정보(개인정보 제외)"),
        "grade_rows": arr(obj({
            "year": S("학년 (1/2/3)"),
            "semester": S("학기 (1/2)"),
            "category": S(),
            "group": S("교과 (국어, 수학, 사회(역사/도덕포함) 등)"),
            "subject": S("과목명"),
            "units": S("단위수/학점"),
            "raw_score": S(),
            "average": S(),
            "std_dev": S(),
            "achievement": S("성취도"),
            "enrolled": S("수강자수"),
            "rank_grade": S("석차등급"),
            "distribution": S("성취도별 분포비율 원문"),
            "uncertain_fields": UNCERTAIN_FIELDS,
        })),
        "subject_notes": arr(obj({"year": S(), "subject": S(), "text": S(), "uncertain_fields": UNCERTAIN_FIELDS})),
        "activities": arr(obj({"year": S(), "area": S(), "hours": S(), "text": S(), "uncertain_fields": UNCERTAIN_FIELDS})),
        "behavior": arr(obj({"year": S(), "text": S(), "uncertain_fields": UNCERTAIN_FIELDS})),
        "other_sections": arr(obj({"title": S(), "text": S()})),
    })

    def validate(self, data: dict) -> list[dict]:
        out: list[dict] = []
        rows = data.get("grade_rows") or []
        seen: dict[tuple, int] = {}
        for i, r in enumerate(rows):
            w = f"grade_rows[{i}]"
            name = f"{r.get('year')}학년 {r.get('semester')}학기 {r.get('subject')}"

            key = (r.get("year"), r.get("semester"), (r.get("subject") or "").replace(" ", ""))
            if key in seen:
                out.append(issue("warning", w, f"{name}: 같은 학기·과목이 중복 추출됨 (행 {seen[key]})"))
            seen[key] = i

            if r.get("year", "").strip() not in ("1", "2", "3"):
                out.append(issue("error", f"{w}.year", f"{name}: 학년 값 이상 '{r.get('year')}'"))
            if r.get("semester", "").strip() not in ("1", "2"):
                out.append(issue("error", f"{w}.semester", f"{name}: 학기 값 이상 '{r.get('semester')}'"))

            units = num(r.get("units"))
            if not is_blank(r.get("units")) and (units is None or not 1 <= units <= 10 or units != int(units)):
                out.append(issue("error", f"{w}.units", f"{name}: 단위수 '{r.get('units')}' 비정상(1~10 정수)"))

            raw, avg, sd = num(r.get("raw_score")), num(r.get("average")), num(r.get("std_dev"))
            for fld, v, hi in (("raw_score", raw, 100), ("average", avg, 100), ("std_dev", sd, 50)):
                if not is_blank(r.get(fld)) and (v is None or not 0 <= v <= hi):
                    out.append(issue("error", f"{w}.{fld}", f"{name}: {fld} '{r.get(fld)}' 범위 밖(0~{hi})"))

            rg = r.get("rank_grade", "")
            if not is_blank(rg) and rg.strip() not in ("P",):
                g = num(rg)
                if g is None or g != int(g) or not 1 <= g <= 9:
                    out.append(issue("error", f"{w}.rank_grade", f"{name}: 석차등급 '{rg}' 비정상(1~9 정수)"))

            ach = (r.get("achievement") or "").strip().upper()
            if ach and ach not in ("A", "B", "C", "D", "E", "P", "-"):
                out.append(issue("error", f"{w}.achievement", f"{name}: 성취도 '{ach}' 비정상"))
            cat = r.get("category") or ""
            # 진로선택(3단계)·체육/예술(3단계)은 구간이 달라 일반 5단계 과목만 검사한다.
            if raw is not None and ach in ACH_GENERAL and not any(k in cat for k in ("진로", "체육", "예술")):
                lo = ACH_GENERAL[ach]
                hi = 101 if ach == "A" else ACH_GENERAL[chr(ord(ach) - 1)]
                if not lo <= raw < hi:
                    out.append(issue("warning", w, f"{name}: 원점수 {raw:g}와 성취도 {ach} 구간 불일치 — 숫자 판독 재확인"))

            enrolled = num(r.get("enrolled"))
            if not is_blank(r.get("enrolled")) and (enrolled is None or not 1 <= enrolled <= 2000):
                out.append(issue("error", f"{w}.enrolled", f"{name}: 수강자수 '{r.get('enrolled')}' 비정상"))

            dist = r.get("distribution") or ""
            pcts = [float(x) for x in re.findall(r"\(\s*(\d+(?:\.\d+)?)\s*\)", dist)]
            if len(pcts) >= 2 and abs(sum(pcts) - 100) > 0.6:
                out.append(issue("warning", f"{w}.distribution", f"{name}: 분포비율 합계 {sum(pcts):.1f}% ≠ 100% — 숫자 판독 재확인"))

        out += uncertain_issues(rows, "grade_rows")
        for key in ("subject_notes", "activities", "behavior"):
            out += uncertain_issues(data.get(key) or [], key)

        for i, n in enumerate(data.get("subject_notes") or []):
            if len(n.get("text") or "") > SETEUK_LIMIT * 1.05:
                out.append(issue("warning", f"subject_notes[{i}]", f"{n.get('subject')}: 세특 {len(n['text'])}자 — 기재 한도({SETEUK_LIMIT}자) 초과, 다른 과목 내용이 섞였는지 확인"))

        if not rows:
            out.append(issue("info", "grade_rows", "교과 성적 행이 추출되지 않음 (성적 페이지가 없거나 판독 실패)"))
        return out


PROFILE = Saenggibu()
