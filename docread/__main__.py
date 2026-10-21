"""명령줄 실행.

  python -m docread 생기부.pdf --profile saenggibu --out out/홍길동
  python -m docread 시험지1.jpg 시험지2.jpg --profile exam --passes 1
  python -m docread --restructure out/홍길동      # 전사문 수정 후 구조화·검증만 재실행
"""
from __future__ import annotations

import argparse
import os
import sys
import time

from .pipeline import Options, restructure, run
from .profiles import PROFILES


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="docread", description="스캔본·사진 문서 정밀 판독")
    ap.add_argument("files", nargs="*", help="PDF 또는 이미지 파일(여러 개면 순서대로 이어 붙임)")
    ap.add_argument("--profile", default="saenggibu", choices=list(PROFILES))
    ap.add_argument("--passes", type=int, default=2, choices=[1, 2], help="2=이중 판독+대조(기본), 1=단일 판독")
    ap.add_argument("--second-engine", default="auto", choices=["auto", "claude", "clova"])
    ap.add_argument("--force-ocr", action="store_true", help="PDF 텍스트 레이어를 무시하고 이미지로 판독")
    ap.add_argument("--no-structure", action="store_true", help="전사까지만 수행")
    ap.add_argument("--out", help="결과 폴더 (기본: out/<첫 파일명>_<시각>)")
    ap.add_argument("--restructure", metavar="OUT_DIR", help="기존 결과 폴더의 구조화·검증만 다시 실행")
    a = ap.parse_args(argv)

    if a.restructure:
        result = restructure(a.restructure)
        out = a.restructure
    else:
        if not a.files:
            ap.error("판독할 파일을 지정하세요.")
        out = a.out or os.path.join("out", f"{os.path.splitext(os.path.basename(a.files[0]))[0]}_{time.strftime('%Y%m%d-%H%M%S')}")
        opts = Options(profile=a.profile, passes=a.passes, second_engine=a.second_engine,
                       force_ocr=a.force_ocr, structure=not a.no_structure)
        result = run(a.files, out, opts)

    print(f"\n결과 폴더: {out}")
    for i in result["issues"][:30]:
        print(f"  [{i['level']}] {i['where']}: {i['message']}")
    if len(result["issues"]) > 30:
        print(f"  … 외 {len(result['issues']) - 30}건 (result.json 참고)")
    u = result.get("usage") or {}
    print(f"API 호출 {u.get('calls')}회, 입력 {u.get('input_tokens')} / 출력 {u.get('output_tokens')} 토큰, "
          f"추정 비용 ${u.get('estimated_cost_usd')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
