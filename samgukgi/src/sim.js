// 헤드리스 자동 대전 (브라우저·Node 공용). 밸런스 시뮬레이터와 웹 '100판 돌리기'가 함께 쓴다.
import { createGame, endTurn, aliveUnits } from './game.js';
import { runAiTurn } from './ai.js';

export function playOut(state, data, maxSteps = 400) {
  let steps = 0;
  while (!state.winner && !state.timeout && steps++ < maxSteps) {
    runAiTurn(state, data);
    endTurn(state, data);
  }
  return state.winner || judge(state);
}

// 시간 초과 판정: 남은 병력 비율 합이 높은 쪽
export function judge(state) {
  const score = (n) => aliveUnits(state, n).reduce((s, u) => s + u.troops / u.maxTroops, 0);
  const [a, b] = state.sides;
  if (Math.abs(score(a) - score(b)) < 1e-9) return 'draw';
  return score(a) > score(b) ? a : b;
}

// 선공을 절반씩 바꿔 n판. 결과: 진영별 승률
export function runMany(scenario, data, n, seed0 = 1, { swapFirst = true } = {}) {
  const wins = {};
  for (let i = 0; i < n; i++) {
    const s = swapFirst && i % 2 ? { ...scenario, sides: [...scenario.sides].reverse() } : scenario;
    const w = playOut(createGame(s, data, seed0 + i), data);
    wins[w] = (wins[w] || 0) + 1;
  }
  for (const k of Object.keys(wins)) wins[k] /= n;
  return wins;
}
