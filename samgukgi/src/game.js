// 게임 상태와 규칙: 맵 생성, 이동(ZOC 포함), 공격, 턴 진행, 승리 판정.
// 렌더링과 분리되어 있어 브라우저·Node(테스트·밸런스 시뮬레이터) 양쪽에서 같은 코드를 쓴다.
import { neighbors, distance, key } from './hex.js';
import { getMods, tileAt } from './modifiers.js';
import { resolveAttack, unitRange, generalOf } from './combat.js';
import { createRng } from './rng.js';

export { tileAt };

export function buildMap(scenario, data) {
  const h = scenario.rows.length;
  const w = scenario.rows[0].length;
  const byChar = Object.fromEntries(Object.entries(data.terrain).map(([id, t]) => [t.char, id]));
  const tiles = [];
  for (let row = 0; row < h; row++) {
    if (scenario.rows[row].length !== w) throw new Error(`맵 ${row}행 길이 불일치`);
    for (let col = 0; col < w; col++) {
      const terrain = byChar[scenario.rows[row][col]];
      if (!terrain) throw new Error(`알 수 없는 지형 문자 '${scenario.rows[row][col]}' (${col},${row})`);
      const rule = (scenario.territory || []).find((t) => col >= t.minCol && col <= t.maxCol);
      tiles.push({ col, row, terrain, owner: terrain === 'sea' ? null : rule?.nation ?? null });
    }
  }
  const map = { w, h, tiles };
  for (const c of scenario.castles || []) {
    const t = tileAt(map, c.col, c.row);
    t.terrain = 'castle';
    t.castle = c.name;
    t.owner = c.owner;
  }
  return map;
}

export function createGame(scenario, data, seed = 1) {
  const state = {
    scenario, map: buildMap(scenario, data), units: [],
    sides: scenario.sides, activeIndex: 0, turn: 1,
    rng: createRng(seed), log: [], winner: null,
  };
  scenario.units.forEach((u, i) => {
    const unit = {
      id: i, nation: u.nation, generalId: u.general ?? null, type: u.type,
      col: u.col, row: u.row, hold: !!u.hold, moved: false, acted: false, dead: false,
      troops: u.troops, maxTroops: u.troops, morale: 70,
    };
    const mods = getMods(null, data, unit, {});
    unit.troops = unit.maxTroops = Math.round(u.troops * (1 + mods.troops));
    unit.morale = Math.min(100, 70 + mods.moraleStart);
    state.units.push(unit);
  });
  return state;
}

export const activeNation = (state) => state.sides[state.activeIndex];
export const aliveUnits = (state, nation) => state.units.filter((u) => !u.dead && (!nation || u.nation === nation));
export const unitAt = (state, col, row) => state.units.find((u) => !u.dead && u.col === col && u.row === row) || null;
export const isEnemy = (a, b) => a.nation !== b.nation;

function inZoc(state, unit, col, row) {
  return neighbors(col, row).some(({ col: c, row: r }) => {
    const o = unitAt(state, c, r);
    return o && isEnemy(o, unit);
  });
}

export function movePoints(state, data, unit) {
  return data.units[unit.type].move + getMods(state, data, unit, {}).move;
}

// 이동 탐색(다익스트라). 규칙:
//  · 강·바다 등 impassable 지형과 적 부대 칸은 진입 불가
//  · 아군 칸은 통과 가능, 정지 불가
//  · 적에 인접한 칸(ZOC)에 들어가면 그 칸에서 이동 종료
//  · stopOnEnter 지형(여울·나루)에 들어가면 그 칸에서 이동 종료
function explore(state, data, unit) {
  const mp = movePoints(state, data, unit);
  const startK = key(unit.col, unit.row);
  const best = new Map([[startK, 0]]);
  const prev = new Map();
  const frontier = [{ col: unit.col, row: unit.row, cost: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift();
    if (cur.cost > best.get(key(cur.col, cur.row))) continue;
    const isStart = cur.col === unit.col && cur.row === unit.row;
    if (!isStart) {
      if (inZoc(state, unit, cur.col, cur.row)) continue;
      if (data.terrain[tileAt(state.map, cur.col, cur.row).terrain].stopOnEnter) continue;
    }
    for (const n of neighbors(cur.col, cur.row)) {
      const t = tileAt(state.map, n.col, n.row);
      if (!t) continue;
      const step = enterCost(data, unit.type, t);
      const cost = cur.cost + step;
      if (cost > mp) continue;
      const occ = unitAt(state, n.col, n.row);
      if (occ && isEnemy(occ, unit)) continue;
      const k = key(n.col, n.row);
      if (best.has(k) && best.get(k) <= cost) continue;
      best.set(k, cost);
      prev.set(k, key(cur.col, cur.row));
      frontier.push({ col: n.col, row: n.row, cost });
    }
  }
  return { best, prev };
}

export function enterCost(data, type, tile) {
  const terr = data.terrain[tile.terrain];
  if (terr.impassable) return Infinity;
  return terr.move[type] ?? Infinity;
}

export function moveRange(state, data, unit) {
  const result = new Map();
  if (unit.hold || unit.moved) {
    result.set(key(unit.col, unit.row), 0);
    return result;
  }
  const { best } = explore(state, data, unit);
  for (const [k, cost] of best) {
    const [c, r] = k.split(',').map(Number);
    const occ = unitAt(state, c, r);
    if (!occ || occ === unit) result.set(k, cost);
  }
  return result;
}

// 출발점 → (col,row) 경로 [{col,row}, ...] (출발점 포함). 도달 불가면 null
export function findPath(state, data, unit, col, row) {
  if (unit.col === col && unit.row === row) return [{ col, row }];
  const { prev } = explore(state, data, unit);
  let k = key(col, row);
  if (!prev.has(k)) return null;
  const path = [];
  while (k) {
    const [c, r] = k.split(',').map(Number);
    path.unshift({ col: c, row: r });
    k = prev.get(k);
  }
  return path;
}

// 목표까지의 '실제 행군 비용' 지도(부대는 무시, 지형만). AI가 강을 건널 여울을 찾고
// 산을 돌아갈지 넘을지 판단하는 데 쓴다. 값 단위는 MP.
export function travelCostMap(state, data, type, goal) {
  const dist = new Map([[key(goal.col, goal.row), 0]]);
  const frontier = [{ col: goal.col, row: goal.row, cost: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift();
    if (cur.cost > dist.get(key(cur.col, cur.row))) continue;
    const curTile = tileAt(state.map, cur.col, cur.row);
    // cur로 들어오는 비용 (목표 칸 자체는 적이 서 있으므로 0)
    const isGoal = cur.col === goal.col && cur.row === goal.row;
    let step = isGoal ? 2 : enterCost(data, type, curTile);
    if (!isGoal && data.terrain[curTile.terrain].stopOnEnter) step += 6; // 여울에서 하루 멈춤
    if (step === Infinity) continue;
    for (const n of neighbors(cur.col, cur.row)) {
      const t = tileAt(state.map, n.col, n.row);
      if (!t || enterCost(data, type, t) === Infinity) continue;
      const cost = cur.cost + step;
      const k = key(n.col, n.row);
      if (dist.has(k) && dist.get(k) <= cost) continue;
      dist.set(k, cost);
      frontier.push({ col: n.col, row: n.row, cost });
    }
  }
  return dist;
}

export function attackTargets(state, data, unit, pos = unit) {
  const range = unitRange(state, data, unit, pos);
  return aliveUnits(state).filter((o) => isEnemy(o, unit) && distance(pos, o) <= range);
}

function log(state, msg) {
  state.log.push(`[${state.turn}턴] ${msg}`);
}

export function moveUnit(state, data, unit, col, row) {
  if (state.winner || unit.acted || unit.nation !== activeNation(state)) return false;
  if (unit.col === col && unit.row === row) return true;
  if (!moveRange(state, data, unit).has(key(col, row))) return false;
  unit.col = col;
  unit.row = row;
  unit.moved = true;
  const t = tileAt(state.map, col, row);
  if (t.castle && t.owner !== unit.nation) {
    t.owner = unit.nation;
    log(state, `${data.nations[unit.nation]?.name ?? unit.nation}이(가) ${t.castle}을 점령했다.`);
    checkVictory(state, data);
  }
  return true;
}

export function attack(state, data, unit, target) {
  if (state.winner || unit.acted || unit.nation !== activeNation(state)) return null;
  if (!attackTargets(state, data, unit).includes(target)) return null;
  const res = resolveAttack(state, data, unit, target, state.rng);
  unit.acted = true;
  unit.moved = true;
  const an = generalOf(unit, data).name, dn = generalOf(target, data).name;
  log(state, `${an}(${data.units[unit.type].name}) → ${dn}(${data.units[target.type].name}): ` +
    `${res.crit ? '전법 발동! ' : ''}피해 ${res.dmg}${res.counterDmg ? `, 반격 ${res.counterDmg}` : ''}`);
  if (target.dead) log(state, `${dn} 부대 괴멸`);
  if (unit.dead) log(state, `${an} 부대 괴멸`);
  checkVictory(state, data);
  return res;
}

export function waitUnit(state, unit) {
  unit.acted = true;
  unit.moved = true;
}

export function checkVictory(state, data) {
  if (state.winner) return state.winner;
  for (const v of state.scenario.victory || []) {
    if (v.type === 'capture') {
      const t = state.map.tiles.find((x) => x.castle === v.castle);
      if (t && t.owner === v.nation) state.winner = v.nation;
    }
  }
  if (!state.winner) {
    const alive = state.sides.filter((n) => aliveUnits(state, n).length > 0);
    if (alive.length === 1) state.winner = alive[0];
  }
  if (state.winner) log(state, `승리: ${data?.nations[state.winner]?.name ?? state.winner}`);
  return state.winner;
}

export function endTurn(state, data) {
  if (state.winner) return;
  state.activeIndex = (state.activeIndex + 1) % state.sides.length;
  if (state.activeIndex === 0) {
    state.turn += 1;
    const limit = (state.scenario.victory || []).find((v) => v.type === 'survive');
    if (limit && state.turn > limit.turns) {
      state.winner = limit.nation;
      log(state, `제한 턴 종료 — 승리: ${data.nations[limit.nation]?.name ?? limit.nation}`);
      return;
    }
    if (state.scenario.turnLimit && state.turn > state.scenario.turnLimit) {
      state.timeout = true;
      return;
    }
  }
  const nation = activeNation(state);
  for (const u of aliveUnits(state, nation)) {
    u.moved = false;
    u.acted = false;
    const m = getMods(state, data, u, {});
    u.morale = Math.min(100, Math.max(m.moraleFloor, u.morale + 2 + m.moraleRegen));
    const t = tileAt(state.map, u.col, u.row);
    const supply = data.terrain[t.terrain].supply;
    if (supply && t.owner === u.nation) u.troops = Math.min(u.maxTroops, u.troops + Math.round(u.maxTroops * supply));
  }
}
