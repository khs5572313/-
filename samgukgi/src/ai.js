// 기본 AI: 부대마다 (이동 후보 × 공격 대상)을 전부 평가해
// '준 피해 - 받을 반격 + 격파 보너스 + 지형 방어'가 최대인 행동을 고른다.
// 공격할 대상이 없으면 가장 가까운 적(또는 비어 있는 목표 성)을 향해 전진한다.
import { distance } from './hex.js';
import { computeDamage, canCounter } from './combat.js';
import {
  moveRange, attackTargets, moveUnit, attack, waitUnit, aliveUnits, activeNation, isEnemy, unitAt, tileAt,
} from './game.js';

function withPos(unit, col, row, fn) {
  const oc = unit.col, or = unit.row;
  unit.col = col; unit.row = row;
  try { return fn(); } finally { unit.col = oc; unit.row = or; }
}

// 그 칸에 섰을 때 다음 적 턴에 받을 것으로 예상되는 피해 합계(사거리 안의 적 전부)
function dangerAt(state, data, unit, col, row, ignore = null) {
  return withPos(unit, col, row, () => {
    let sum = 0;
    for (const e of aliveUnits(state)) {
      if (!isEnemy(e, unit) || e === ignore) continue;
      const reach = data.units[e.type].move + (e.hold ? 0 : 1) + data.units[e.type].range;
      if (distance(e, unit) > reach) continue;
      sum += computeDamage(state, data, e, unit, { role: 'attack', attPos: e, moved: true });
    }
    return sum;
  });
}

function captureTarget(state, unit) {
  const v = (state.scenario.victory || []).find((x) => x.type === 'capture' && x.nation === unit.nation);
  return v ? state.map.tiles.find((t) => t.castle === v.castle) : null;
}

function scoreAttack(state, data, unit, target, col, row) {
  const moved = unit.moved || col !== unit.col || row !== unit.row;
  const objective = captureTarget(state, unit);
  return withPos(unit, col, row, () => {
    const dmg = computeDamage(state, data, unit, target, { role: 'attack', moved });
    let ctr = 0;
    if (dmg < target.troops && canCounter(state, data, target, unit)) {
      ctr = computeDamage(state, data, target, unit, {
        role: 'counter', moved: false, attTroops: target.troops - dmg,
      });
    }
    const kill = dmg >= target.troops ? 2000 : 0;
    // 목표 성의 수비대를 깎는 것은 손해를 감수할 가치가 있다(공성 의지)
    const siege = objective && target.col === objective.col && target.row === objective.row ? dmg * 1.5 + 150 : 0;
    const danger = dangerAt(state, data, unit, col, row, kill ? target : null);
    return dmg - 0.9 * ctr + kill + siege - 0.35 * danger;
  });
}

function goalFor(state, data, unit) {
  const enemies = aliveUnits(state).filter((o) => isEnemy(o, unit));
  const capture = (state.scenario.victory || []).find((v) => v.type === 'capture' && v.nation === unit.nation);
  if (capture) {
    const t = state.map.tiles.find((x) => x.castle === capture.castle);
    if (t && t.owner !== unit.nation && !unitAt(state, t.col, t.row)) return t;
  }
  let best = null, bd = Infinity;
  for (const e of enemies) {
    const d = distance(unit, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function actUnit(state, data, unit) {
  if (unit.dead || unit.acted) return;
  const startCol = unit.col, startRow = unit.row;
  const reach = moveRange(state, data, unit);
  let best = null;
  for (const k of reach.keys()) {
    const [col, row] = k.split(',').map(Number);
    const targets = withPos(unit, col, row, () => attackTargets(state, data, unit, { col, row }));
    for (const t of targets) {
      const s = scoreAttack(state, data, unit, t, col, row);
      if (!best || s > best.score) best = { score: s, col, row, target: t };
    }
  }
  // 공격할 가치가 없으면 '가만히 있을 때의 위험'과 비교한다
  if (best && best.score > -0.35 * dangerAt(state, data, unit, startCol, startRow) + 1) {
    moveUnit(state, data, unit, best.col, best.row);
    attack(state, data, unit, best.target);
    return;
  }
  // 전진
  const goal = goalFor(state, data, unit);
  if (goal && !unit.hold) {
    let pick = null;
    for (const k of reach.keys()) {
      const [col, row] = k.split(',').map(Number);
      const d = distance({ col, row }, goal);
      const def = data.terrain[tileAt(state.map, col, row).terrain].def ?? 1;
      const cost = d * 250 + dangerAt(state, data, unit, col, row) * 0.5 - def * 50;
      if (!pick || cost < pick.cost) pick = { col, row, cost };
    }
    moveUnit(state, data, unit, pick.col, pick.row);
  }
  waitUnit(state, unit);
}

export function runAiTurn(state, data) {
  const nation = activeNation(state);
  // 원거리 부대가 먼저 쏘고, 근접 부대가 뒤따른다
  const order = aliveUnits(state, nation).sort((a, b) => data.units[b.type].range - data.units[a.type].range);
  for (const u of order) {
    if (state.winner) return;
    actUnit(state, data, u);
  }
}
