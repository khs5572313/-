from __future__ import annotations

import threading
from dataclasses import dataclass, field

from .. import config


class EngineError(RuntimeError):
    pass


@dataclass
class Usage:
    """여러 스레드에서 누적되는 토큰 사용량."""
    input_tokens: int = 0
    output_tokens: int = 0
    calls: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def add(self, input_tokens: int, output_tokens: int) -> None:
        with self._lock:
            self.input_tokens += input_tokens
            self.output_tokens += output_tokens
            self.calls += 1

    def cost_usd(self, model: str) -> float | None:
        price = config.PRICES.get(model)
        if not price:
            return None
        return round(self.input_tokens / 1e6 * price[0] + self.output_tokens / 1e6 * price[1], 4)

    def to_dict(self, model: str) -> dict:
        return {"model": model, "calls": self.calls, "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens, "estimated_cost_usd": self.cost_usd(model)}
