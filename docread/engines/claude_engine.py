"""Claude 비전 엔진: 전사(판독) · 불일치 판정 · 구조화."""
from __future__ import annotations

import json

import anthropic
import numpy as np

from .. import config
from ..profiles.base import Profile
from ..tiling import encode, make_strips, overview
from .base import EngineError, Usage

TRANSCRIBE_SYSTEM = """\
당신은 한국어 문서 전사(轉寫) 전문가다. 이미지에 실제로 보이는 글자를 한 글자도 바꾸지 않고 옮긴다.

규칙
1. 보이는 그대로 옮긴다. 맞춤법·띄어쓰기·오탈자를 고치지 않는다. 문맥으로 짐작해 채우지 않는다.
2. 확신이 없는 글자·숫자는 ⟦?가장유력한읽기⟧ 로, 전혀 읽을 수 없으면 ⟦?⟧ 로 표시한다.
   틀린 값을 자신 있게 적는 것보다 표시를 남기는 것이 훨씬 낫다.
3. 숫자는 한 자리씩 확인한다(3↔8, 1↔7, 5↔6, 0↔9 혼동 주의). 소수점·괄호·슬래시도 그대로.
4. 표는 마크다운 표로 옮긴다. 세로로 병합된 칸의 값은 해당하는 모든 행에 반복해 적는다.
5. 이미지 구성: 첫 장은 페이지 전체 축소본(레이아웃 파악용, 글자 판독에는 쓰지 말 것),
   이후는 같은 페이지를 위에서 아래로 자른 고해상도 조각이다. 인접 조각은 일부가 겹치므로
   겹친 줄은 한 번만 옮긴다.
6. 전사문만 출력한다. 설명·인사·코드블록 표시는 쓰지 않는다."""

ADJUDICATE_SYSTEM = """\
당신은 문서 판독 검수자다. 같은 페이지를 서로 독립적으로 두 번 판독(A, B)한 결과가 어긋난 지점들을
받는다. 고해상도 이미지 조각을 직접 보고 각 지점에서 원본에 실제로 인쇄된 정확한 표기를 결정한다.
- A와 B 둘 다 틀렸을 수 있다. 이미지에서 보이는 것을 기준으로 한다.
- reading에는 A 위치에 들어갈 최종 표기를 적는다(해당 내용이 원본에 없으면 빈 문자열).
- confidence: 이미지에서 또렷이 확인되면 high, 흐려서 추정이 섞이면 medium, 사실상 판독 불가면 low."""

ADJUDICATE_SCHEMA = {
    "type": "object",
    "properties": {
        "decisions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "reading": {"type": "string"},
                    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                    "reason": {"type": "string"},
                },
                "required": ["id", "reading", "confidence", "reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["decisions"],
    "additionalProperties": False,
}


class ClaudeEngine:
    name = "claude"

    def __init__(self, model: str = config.MODEL, client: anthropic.Anthropic | None = None,
                 effort_transcribe: str = config.EFFORT_TRANSCRIBE):
        self.model = model
        self.client = client or anthropic.Anthropic(max_retries=4)
        self.effort_transcribe = effort_transcribe
        self.usage = Usage()

    # ---------- 공통 호출 ----------

    def _call(self, system: str, content: list[dict], effort: str, schema: dict | None = None,
              max_tokens: int = 64000) -> str:
        output_config: dict = {"effort": effort}
        if schema is not None:
            output_config["format"] = {"type": "json_schema", "schema": schema}
        try:
            # 긴 출력이 많아 스트리밍으로 받는다. 안전 분류기 오탐 시 서버가 대체 모델로 자동 재시도.
            with self.client.beta.messages.stream(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": content}],
                output_config=output_config,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            ) as stream:
                msg = stream.get_final_message()
        except anthropic.APIStatusError as e:
            raise EngineError(f"Claude API 오류 {e.status_code}: {e.message}") from e
        except anthropic.APIConnectionError as e:
            raise EngineError(f"Claude API 연결 실패: {e}") from e

        u = msg.usage
        self.usage.add(
            (u.input_tokens or 0) + (getattr(u, "cache_creation_input_tokens", 0) or 0)
            + (getattr(u, "cache_read_input_tokens", 0) or 0),
            u.output_tokens or 0,
        )
        if msg.stop_reason == "refusal":
            raise EngineError("모델이 요청을 거절했습니다(refusal).")
        if msg.stop_reason == "max_tokens":
            raise EngineError("출력이 최대 길이에서 잘렸습니다. 페이지를 나눠 다시 시도하세요.")
        return "".join(b.text for b in msg.content if b.type == "text").strip()

    @staticmethod
    def _image_blocks(page_img: np.ndarray) -> list[dict]:
        blocks: list[dict] = []
        strips = make_strips(page_img)
        mt, data = encode(overview(page_img))
        blocks.append({"type": "text", "text": "[페이지 전체 축소본 — 레이아웃 참고용]"})
        blocks.append({"type": "image", "source": {"type": "base64", "media_type": mt, "data": data}})
        for i, s in enumerate(strips, 1):
            mt, data = encode(s)
            blocks.append({"type": "text", "text": f"[고해상도 조각 {i}/{len(strips)}]"})
            blocks.append({"type": "image", "source": {"type": "base64", "media_type": mt, "data": data}})
        return blocks

    # ---------- 단계별 ----------

    def transcribe(self, page_img: np.ndarray, profile: Profile) -> str:
        content = self._image_blocks(page_img)
        content.append({"type": "text", "text": f"{profile.transcribe_guide}\n\n이 페이지 전체를 규칙에 따라 전사하라."})
        text = self._call(TRANSCRIBE_SYSTEM, content, self.effort_transcribe)
        return _strip_fence(text)

    def adjudicate(self, page_img: np.ndarray, items: list[dict]) -> dict[int, dict]:
        listing = "\n".join(
            f"#{d['id']}: …{d['before'][-25:]}【A: {d['a'] or '(없음)'} | B: {d['b'] or '(없음)'}】{d['after'][:25]}…"
            for d in items
        )
        content = self._image_blocks(page_img)
        content.append({"type": "text", "text": f"불일치 지점 {len(items)}곳:\n{listing}\n\n각 지점의 정확한 표기를 판정하라."})
        raw = self._call(ADJUDICATE_SYSTEM, content, config.EFFORT_ADJUDICATE, schema=ADJUDICATE_SCHEMA)
        return {d["id"]: d for d in json.loads(raw)["decisions"]}

    def structure(self, transcript: str, profile: Profile) -> dict:
        system = "당신은 문서 전사문을 정해진 스키마로 옮기는 데이터 정리 담당자다. 원문 값을 바꾸거나 지어내지 않는다."
        content = [{"type": "text", "text": f"{profile.structure_guide}\n\n<전사문>\n{transcript}\n</전사문>"}]
        raw = self._call(system, content, config.EFFORT_STRUCTURE, schema=profile.schema, max_tokens=100000)
        return json.loads(raw)


def _strip_fence(text: str) -> str:
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()
