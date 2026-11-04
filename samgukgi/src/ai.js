// 기본 AI
//  1) 공격: 부대마다 (이동 후보 × 공격 대상)을 전부 평가해
//     '준 피해 − 받을 반격 + 격파 보너스 + 공성 의지 − 다음 턴 위험'이 최대인 행동을 고른다.
//  2) 전진: 공격할 가치가 없으면 목표(가장 가까운 적 또는 비어 있는 목표 성)까지의
//     '실제 행군 비용'이 가장 줄어드는 칸으로 이동한다. 강은 여울로 돌아가고,
//     산은 넘는 것과 우회하는 것 중 싼 쪽을 고른다.
import { distance, neighbors } from './hex.js';
import { computeDamage, canCounter } from './combat.js';
import {
  moveRange, attackTargets, moveUnit, attack, waitUnit, aliveUnits, activeNation, isEnemy, unitAt, tileAt,
  movePoints, findPath, travelCostMap, travelDays, bridgeSites, buildBridge, BRIDGE_WORK,
} from './game.js';
import { getMods } from './modifiers.js';
import { key } from './hex.js';

function withPos(unit, col, row, fn) {
  const oc = unit.col, or = unit.row;
  unit.col = col; unit.row = row;
  try { return fn(); } finally { unit.col = oc; unit.row = or; }
}

// 그 칸에 섰을 때 다음 적 턴에 받을 것으로 예상되는 피해 합계
function dangerAt(state, data, unit, col, row, ignore = null) {
  return withPos(unit, col, row, () => {
    let sum = 0;
    for (const e of aliveUnits(state)) {
      if (!isEnemy(e, unit) || e === ignore) continue;
      const reach = (e.hold ? 0 : Math.floor(movePoints(state, data, e) / 2)) + data.units[e.type].range + 1;
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
    const onObjective = objective && target.col === objective.col && target.row === objective.row;
    const tt = tileAt(state.map, target.col, target.row);
    // 성벽을 깎는 가치: 성벽 1 = 병력 약 40명 상당 (목표 성이면 두 배)
    const wall = tt.castle && tt.wall > 0
      ? (unit.troops / 5000) * data.wallDamage[unit.type] * (1 + getMods(state, data, unit, {}).wall) * 40 * (onObjective ? 2 : 1) : 0;
    const siege = (onObjective ? dmg * 1.5 + 150 : 0) + wall;
    const danger = dangerAt(state, data, unit, col, row, kill ? target : null);
    return dmg - 0.9 * ctr + kill + siege - 0.35 * danger;
  });
}

function goalFor(state, data, unit) {
  const objective = captureTarget(state, unit);
  if (objective && objective.owner !== unit.nation && !unitAt(state, objective.col, objective.row)) return objective;
  // 공성병기는 목표 성(없으면 가장 가까운 적 성)으로 간다
  if (unit.type === 'siege') {
    if (objective && objective.owner !== unit.nation) return objective;
    const castles = state.map.tiles.filter((t) => t.castle && t.owner && t.owner !== unit.nation);
    if (castles.length) return castles.sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  }
  let best = null, bd = Infinity;
  for (const e of aliveUnits(state)) {
    if (!isEnemy(e, unit)) continue;
    const d = distance(unit, e);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// 한 부대의 행동을 결정·실행하고, 화면 연출용으로 무엇을 했는지 돌려준다.
export function actUnit(state, data, unit) {
  const result = { unit, from: { col: unit.col, row: unit.row }, path: null, target: null, ranged: false };
  if (unit.dead || unit.acted) return result;
  const reach = moveRange(state, data, unit);
  let best = null;
  for (const k of reach.keys()) {
    const [col, row] = k.split(',').map(Number);
    const targets = withPos(unit, col, row, () => attackTargets(state, data, unit, { col, row }));
    for (const t of targets) {
      const s = scoreAttack(state, data, unit, t, col, row) + state.rng() * 0.01; // 동점 무작위 처리
      if (!best || s > best.score) best = { score: s, col, row, target: t };
    }
  }
  const go = (col, row) => {
    result.path = findPath(state, data, unit, col, row);
    moveUnit(state, data, unit, col, row);
  };
  if (best && best.score > -0.35 * dangerAt(state, data, unit, unit.col, unit.row) + 1) {
    go(best.col, best.row);
    result.target = best.target;
    result.ranged = distance(unit, best.target) > 1;
    result.res = attack(state, data, unit, best.target);
    return result;
  }
  const goal = goalFor(state, data, unit);
  if (goal && !unit.hold) {
    const travel = travelCostMap(state, data, unit.type, goal);
    const here = travelDays(travel, data, unit, unit.col, unit.row, tileAt(state.map, unit.col, unit.row)) ?? Infinity;
    // 부교: 강 건너편으로 가는 길이 크게 줄어들면 다리를 놓는다
    for (const site of bridgeSites(state, data, unit)) {
      const work = 1 + getMods(state, data, unit, {}).bridge;
      const days = Math.ceil((BRIDGE_WORK - (site.bridgeWork || 0)) / work);
      let beyond = Infinity;
      for (const n of neighbors(site.col, site.row)) {
        const t = tileAt(state.map, n.col, n.row);
        if (!t || (n.col === unit.col && n.row === unit.row) || t.terrain === 'river' || t.terrain === 'sea') continue;
        beyond = Math.min(beyond, travel.get(`${key(n.col, n.row)}|land`) ?? Infinity);
      }
      if (beyond + days + 1 < here - 1) {
        buildBridge(state, data, unit, site);
        return result;
      }
    }
    let pick = null;
    for (const k of reach.keys()) {
      const [col, row] = k.split(',').map(Number);
      const t = travelDays(travel, data, unit, col, row, tileAt(state.map, col, row)) ?? 99;
      const def = data.terrain[tileAt(state.map, col, row).terrain].def ?? 1;
      // 동점이면 목표에 직선으로 더 가까운 칸, 그래도 같으면 무작위 (탐색 순서에 따른 방향 편향 제거)
      const cost = t * 700 + dangerAt(state, data, unit, col, row) * 0.5 - def * 50
        + distance({ col, row }, goal) * 5 + state.rng();
      if (!pick || cost < pick.cost) pick = { col, row, cost };
    }
    if (pick) go(pick.col, pick.row);
  }
  waitUnit(state, unit);
  return result;
}

// 원거리 부대가 먼저 쏘고, 근접 부대가 뒤따른다
export function aiOrder(state, data) {
  return aliveUnits(state, activeNation(state))
    .sort((a, b) => data.units[b.type].range - data.units[a.type].range);
}

export function runAiTurn(state, data) {
  for (const u of aiOrder(state, data)) {
    if (state.winner) return;
    actUnit(state, data, u);
  }
}
