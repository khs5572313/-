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
    t.wall = t.wallMax = c.wall ?? 100;
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
      col: u.col, row: u.row, hold: !!u.hold, moved: false, acted: false, dead: false, embarked: false,
      troops: u.troops, maxTroops: u.troops, morale: 70,
    };
    const mods = getMods(null, data, unit, {});
    unit.troops = unit.maxTroops = Math.round(u.troops * (1 + mods.troops));
    unit.morale = Math.min(100, 70 + mods.moraleStart);
    unit.embarked = isWaterOnly(data, tileAt(state.map, u.col, u.row));
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

// ── 지형 판정 도우미 ──────────────────────────────
const terr = (data, tile) => data.terrain[tile.terrain];
export const isWaterOnly = (data, tile) => !!(terr(data, tile).impassable && terr(data, tile).navigable); // 강·바다
export const isNavigable = (data, tile) => !!terr(data, tile).navigable;                                // + 여울·부교
// 배에서 내릴 수 있는 땅: 걸어 들어갈 수 있고, 성이 아닌 칸
const isLandable = (data, tile, type) => !isWaterOnly(data, tile) && !tile.castle && terr(data, tile).move[type] !== undefined;

export function movePoints(state, data, unit) {
  const base = unit.embarked ? data.ship.move : data.units[unit.type].move;
  return base + getMods(state, data, unit, {}).move;
}

export function enterCost(data, type, tile) {
  const t = terr(data, tile);
  if (t.impassable) return Infinity;
  return t.move[type] ?? Infinity;
}

// 이동 탐색(다익스트라). 규칙:
//  · 강·바다는 걸어서 진입 불가. 적 부대 칸 진입 불가, 아군 칸은 통과만 가능
//  · 적에 인접한 칸(ZOC)에 들어가면 그 칸에서 이동 종료
//  · 여울(stopOnEnter)에 들어가면 그 칸에서 이동 종료
//  · 승선: 나루터에서 옆 물칸으로 나가면 배에 오르고 이동 종료
//  · 배: 물칸(강·바다·여울·부교)을 2MP씩, 하루 8MP. 해안 땅으로 내리면 상륙하고 이동 종료
// 결과의 각 칸에는 그 칸에 섰을 때 배에 타 있는지(embarked)가 정해진다.
function explore(state, data, unit) {
  const mp = movePoints(state, data, unit);
  const startK = key(unit.col, unit.row);
  const best = new Map([[startK, 0]]);
  const prev = new Map();
  const terminal = new Set();
  const frontier = [{ col: unit.col, row: unit.row, cost: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift();
    const ck = key(cur.col, cur.row);
    if (cur.cost > best.get(ck)) continue;
    const curTile = tileAt(state.map, cur.col, cur.row);
    if (ck !== startK) {
      if (terminal.has(ck)) continue;
      if (inZoc(state, unit, cur.col, cur.row)) continue;
      if (!unit.embarked && terr(data, curTile).stopOnEnter) continue;
    }
    for (const n of neighbors(cur.col, cur.row)) {
      const t = tileAt(state.map, n.col, n.row);
      if (!t) continue;
      let step, stop = false;
      if (unit.embarked) {
        if (isNavigable(data, t)) step = 2;
        else if (isLandable(data, t, unit.type)) { step = 0; stop = true; } // 상륙
        else continue;
      } else if (isWaterOnly(data, t)) {
        if (!terr(data, curTile).port) continue;                           // 승선은 나루터에서만
        step = 0; stop = true;
      } else {
        step = enterCost(data, unit.type, t);
      }
      const cost = cur.cost + step;
      if (cost > mp) continue;
      const occ = unitAt(state, n.col, n.row);
      if (occ && isEnemy(occ, unit)) continue;
      const k = key(n.col, n.row);
      if (best.has(k) && best.get(k) <= cost) continue;
      best.set(k, cost);
      prev.set(k, ck);
      if (stop) terminal.add(k); else terminal.delete(k);
      frontier.push({ col: n.col, row: n.row, cost });
    }
  }
  return { best, prev };
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

// 그 칸에 도착했을 때 배에 타 있게 되는가
export function embarkedAt(data, unit, tile) {
  return unit.embarked ? isNavigable(data, tile) : isWaterOnly(data, tile);
}

// 목표까지의 '행군 일수' 지도 (부대는 무시, 지형·배·부교만). 키: "col,row|land" 또는 "col,row|water"
// AI가 여울을 찾고, 산을 넘을지 돌아갈지, 배를 탈지 판단하는 데 쓴다.
export const EMBARK_DAYS = 1;
export function travelCostMap(state, data, type, goal) {
  const landMp = data.units[type].move, shipMp = data.ship.move;
  const dist = new Map();
  const frontier = [];
  const push = (col, row, mode, cost) => {
    const k = `${key(col, row)}|${mode}`;
    if (dist.has(k) && dist.get(k) <= cost) return;
    dist.set(k, cost);
    frontier.push({ col, row, mode, cost });
  };
  // 목표 칸: 그 옆까지만 가면 되므로 이웃을 비용 0으로 시작
  push(goal.col, goal.row, 'land', 0);
  push(goal.col, goal.row, 'water', 0);
  for (const n of neighbors(goal.col, goal.row)) {
    const t = tileAt(state.map, n.col, n.row);
    if (!t) continue;
    if (!isWaterOnly(data, t) && enterCost(data, type, t) !== Infinity) push(n.col, n.row, 'land', 0.01);
    if (isNavigable(data, t)) push(n.col, n.row, 'water', 0.01);
  }
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift();
    if (cur.cost > dist.get(`${key(cur.col, cur.row)}|${cur.mode}`)) continue;
    const curTile = tileAt(state.map, cur.col, cur.row);
    for (const n of neighbors(cur.col, cur.row)) {
      const t = tileAt(state.map, n.col, n.row);
      if (!t) continue;
      if (cur.mode === 'land') {
        // 걸어서 n → cur
        const c = enterCost(data, type, curTile);
        if (c !== Infinity && !isWaterOnly(data, t) && enterCost(data, type, t) !== Infinity) {
          const extra = terr(data, curTile).stopOnEnter ? 1 : 0;
          push(n.col, n.row, 'land', cur.cost + c / landMp + extra);
        }
        // 배에서 cur로 상륙 (n은 물)
        if (isNavigable(data, t) && isLandable(data, curTile, type)) push(n.col, n.row, 'water', cur.cost + EMBARK_DAYS);
      } else {
        // 배로 n → cur
        if (isNavigable(data, t)) push(n.col, n.row, 'water', cur.cost + 2 / shipMp);
        // 나루터 n에서 cur(물)로 승선
        if (terr(data, t).port && isWaterOnly(data, curTile)) push(n.col, n.row, 'land', cur.cost + EMBARK_DAYS);
      }
    }
  }
  return dist;
}

export function travelDays(travel, data, unit, col, row, tile) {
  const mode = embarkedAt(data, unit, tile) ? 'water' : 'land';
  return travel.get(`${key(col, row)}|${mode}`);
}

// ── 부교 ──────────────────────────────────────────
export const BRIDGE_WORK = 3;
export function bridgeSites(state, data, unit) {
  if (unit.embarked || unit.moved || unit.acted || unit.type === 'siege') return [];
  return neighbors(unit.col, unit.row)
    .map((n) => tileAt(state.map, n.col, n.row))
    .filter((t) => t && t.terrain === 'river');
}

export function buildBridge(state, data, unit, tile) {
  if (state.winner || unit.nation !== activeNation(state)) return false;
  if (!bridgeSites(state, data, unit).includes(tile)) return false;
  const work = 1 + getMods(state, data, unit, {}).bridge;
  tile.bridgeWork = (tile.bridgeWork || 0) + work;
  unit.moved = true; unit.acted = true;
  const name = generalOf(unit, data).name;
  if (tile.bridgeWork >= BRIDGE_WORK) {
    tile.terrain = 'bridge';
    delete tile.bridgeWork;
    log(state, `${name} 부대가 부교를 완성했다 (${tile.col},${tile.row}).`);
  } else {
    log(state, `${name} 부대가 부교를 놓는 중 (${tile.bridgeWork}/${BRIDGE_WORK}).`);
  }
  return true;
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
  const t = tileAt(state.map, col, row);
  const wasEmbarked = unit.embarked;
  unit.col = col;
  unit.row = row;
  unit.moved = true;
  unit.embarked = embarkedAt(data, unit, t) && (wasEmbarked || isWaterOnly(data, t));
  if (unit.embarked !== wasEmbarked) {
    // 승선·상륙에 하루가 걸린다: 이번 턴은 공격 불가
    unit.acted = true;
    log(state, `${generalOf(unit, data).name} 부대 ${unit.embarked ? '승선' : '상륙'}`);
  }
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
  // 성 안의 부대를 치면 성벽도 깎인다
  const tt = tileAt(state.map, target.col, target.row);
  if (tt.castle && tt.wall > 0 && !unit.dead) {
    const mods = getMods(state, data, unit, {});
    const wd = Math.round((unit.troops / 5000) * data.wallDamage[unit.type] * (1 + mods.wall) * (0.8 + state.rng() * 0.4));
    tt.wall = Math.max(0, tt.wall - wd);
    res.wallDmg = wd;
    if (tt.wall === 0) log(state, `${tt.castle} 성벽 붕괴!`);
  }
  const an = generalOf(unit, data).name, dn = generalOf(target, data).name;
  log(state, `${an}(${data.units[unit.type].name}) → ${dn}(${data.units[target.type].name}): ` +
    `${res.crit ? '전법 발동! ' : ''}피해 ${res.dmg}${res.counterDmg ? `, 반격 ${res.counterDmg}` : ''}${res.wallDmg ? `, 성벽 -${res.wallDmg}` : ''}`);
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
    if (t.castle && t.owner === u.nation && t.wall < t.wallMax) t.wall = Math.min(t.wallMax, t.wall + 2); // 수비대의 성벽 보수
  }
}
