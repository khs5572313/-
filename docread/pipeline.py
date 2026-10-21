"""전체 처리 흐름.

페이지마다
  ① 텍스트 레이어가 믿을 만하면 그대로 사용 (OCR 생략)
  ② 아니면 보정 → 1차 판독(보정본) + 2차 판독(원본 또는 CLOVA) → 대조 → 불일치만 재판정
문서 전체로
  ③ 프로파일 스키마로 구조화 → ④ 양식 규칙 검증 → 의심 항목 목록
"""
from __future__ import annotations

import json
import os
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from typing import Callable

import cv2

from . import config
from .consensus import apply_decisions, compare, count_markers, strip_markers
from .engines import ClaudeEngine, ClovaEngine, EngineError
from .pdf_input import PageInput, load_inputs
from .preprocess import prepare
from .profiles import get_profile

Progress = Callable[[str], None]


@dataclass
class Options:
    profile: str = "saenggibu"
    passes: int = 2  # 1: 단일 판독(저렴), 2: 이중 판독 + 대조(정확)
    second_engine: str = "auto"  # auto | claude | clova
    force_ocr: bool = False  # 텍스트 레이어가 있어도 이미지로 판독
    structure: bool = True
    dpi: int = config.RENDER_DPI
    work_width: int = config.WORK_WIDTH


def run(paths: list[str], out_dir: str, opts: Options, claude: ClaudeEngine | None = None,
        second=None, progress: Progress = print) -> dict:
    t0 = time.time()
    os.makedirs(os.path.join(out_dir, "pages"), exist_ok=True)
    profile = get_profile(opts.profile)
    claude = claude or ClaudeEngine()
    if opts.passes >= 2 and second is None:
        use_clova = opts.second_engine == "clova" or (opts.second_engine == "auto" and ClovaEngine.available())
        second = ClovaEngine() if use_clova else claude

    progress("파일 읽는 중…")
    pages = load_inputs(paths, dpi=opts.dpi)
    progress(f"{len(pages)}쪽 확인 (텍스트 레이어 {sum(p.kind == 'pdf_text' for p in pages)}쪽)")

    done = [0]

    def work(p: PageInput) -> dict:
        try:
            r = _process_page(p, out_dir, opts, profile, claude, second)
        except Exception as e:  # 한 페이지 실패가 전체를 멈추지 않게
            r = {"page": p.index + 1, "source": p.source, "error": f"{type(e).__name__}: {e}",
                 "trace": traceback.format_exc(limit=3), "transcript": ""}
        done[0] += 1
        progress(f"판독 {done[0]}/{len(pages)}쪽 완료")
        return r

    with ThreadPoolExecutor(max_workers=config.PAGE_WORKERS) as ex:
        page_results = list(ex.map(work, pages))

    result = {
        "meta": {"profile": profile.key, "profile_label": profile.label, "options": asdict(opts),
                 "inputs": [os.path.basename(p) for p in paths], "page_count": len(pages),
                 "second_engine": getattr(second, "name", None) if opts.passes >= 2 else None},
        "pages": page_results,
        "structured": None,
        "issues": [],
    }
    _finish(result, out_dir, profile, claude, opts, progress)
    result["meta"]["elapsed_sec"] = round(time.time() - t0, 1)
    save(result, out_dir)
    progress("완료")
    return result


def restructure(out_dir: str, claude: ClaudeEngine | None = None, progress: Progress = print) -> dict:
    """사람이 전사문을 고친 뒤 구조화·검증만 다시 돌린다."""
    result = load(out_dir)
    opts = Options(**result["meta"]["options"])
    _finish(result, out_dir, get_profile(opts.profile), claude or ClaudeEngine(), opts, progress)
    save(result, out_dir)
    progress("완료")
    return result


def _finish(result: dict, out_dir: str, profile, claude: ClaudeEngine, opts: Options, progress: Progress) -> None:
    pages = result["pages"]
    issues = []
    for p in pages:
        if p.get("error"):
            issues.append({"level": "error", "where": f"page {p['page']}", "message": f"판독 실패: {p['error']}"})
        elif p.get("low_agreement"):
            issues.append({"level": "error", "where": f"page {p['page']}",
                           "message": f"두 판독 결과 일치율 {p['agreement']:.0%} — 페이지 전체를 원본과 대조하세요"})
        n = count_markers(p.get("transcript", ""))
        if n:
            issues.append({"level": "warning", "where": f"page {p['page']}", "message": f"불확실 표시(⟦?⟧) {n}곳 확인 필요"})

    transcript = "\n\n".join(f"=== {p['page']}쪽 ({p['source']}) ===\n{p.get('transcript', '')}" for p in pages)
    with open(os.path.join(out_dir, "transcript.md"), "w", encoding="utf-8") as f:
        f.write(transcript)
    with open(os.path.join(out_dir, "transcript_clean.md"), "w", encoding="utf-8") as f:
        f.write(strip_markers(transcript))

    structured = None
    if opts.structure and profile.schema is not None and any(p.get("transcript") for p in pages):
        progress("구조화 중…")
        try:
            structured = claude.structure(transcript, profile)
            issues += profile.validate(structured)
            with open(os.path.join(out_dir, f"{profile.key}.json"), "w", encoding="utf-8") as f:
                json.dump(structured, f, ensure_ascii=False, indent=2)
        except (EngineError, json.JSONDecodeError) as e:
            issues.append({"level": "error", "where": "structure", "message": f"구조화 실패: {e}"})

    order = {"error": 0, "warning": 1, "info": 2}
    result["structured"] = structured
    result["issues"] = sorted(issues, key=lambda i: order.get(i["level"], 3))
    result["usage"] = claude.usage.to_dict(claude.model)


def _process_page(p: PageInput, out_dir: str, opts: Options, profile, claude: ClaudeEngine, second) -> dict:
    n = p.index + 1
    rec: dict = {"page": n, "source": p.source, "kind": p.kind}

    if p.kind == "pdf_text" and not opts.force_ocr:
        _save_img(out_dir, f"p{n:03d}_original.png", p.image)
        rec.update(method="text_layer", transcript=p.text_layer.strip(), images={"original": f"pages/p{n:03d}_original.png"})
        return rec

    baseline, enhanced, meta = prepare(p.image, opts.work_width, is_photo=(p.kind == "photo"))
    rec["preprocess"] = meta
    rec["images"] = {
        "original": _save_img(out_dir, f"p{n:03d}_original.png", baseline),
        "enhanced": _save_img(out_dir, f"p{n:03d}_enhanced.png", enhanced),
    }

    text_a = claude.transcribe(enhanced, profile)
    rec["pass_a"] = text_a
    if opts.passes < 2:
        rec.update(method="ocr_single", transcript=text_a)
        return rec

    # 2차 판독: 다른 엔진이 있으면 그것으로, 없으면 Claude가 '보정 전' 이미지를 독립적으로 다시 본다.
    text_b = second.transcribe(baseline if second is claude else enhanced, profile)
    rec["pass_b"] = text_b
    rec["pass_b_engine"] = second.name
    cmp = compare(text_a, text_b)
    rec.update(agreement=cmp.agreement, low_agreement=cmp.low_agreement)

    if not cmp.discrepancies:
        rec.update(method="ocr_double", transcript=text_a, discrepancies=[])
        return rec
    if cmp.low_agreement:
        rec.update(method="ocr_double", transcript=text_a, discrepancies=[d.to_dict() for d in cmp.discrepancies])
        return rec

    decisions = claude.adjudicate(enhanced, [d.to_dict() for d in cmp.discrepancies])
    final, log = apply_decisions(text_a, cmp.discrepancies, decisions)
    rec.update(method="ocr_double_adjudicated", transcript=final, discrepancies=log)
    return rec


def _save_img(out_dir: str, name: str, img) -> str:
    rel = f"pages/{name}"
    cv2.imwrite(os.path.join(out_dir, rel), img)
    return rel


def save(result: dict, out_dir: str) -> None:
    tmp = os.path.join(out_dir, "result.json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    os.replace(tmp, os.path.join(out_dir, "result.json"))


def load(out_dir: str) -> dict:
    with open(os.path.join(out_dir, "result.json"), encoding="utf-8") as f:
        return json.load(f)
