// 수정치 엔진: 국가 버프와 무장 특기를 같은 형식으로 모아 조건을 판정하고 합산한다.
// 이벤트·시나리오 효과도 나중에 같은 형식으로 얹으면 된다.
import { neighbors } from './hex.js';

export const STATS = ['atk', 'def', 'counter', 'move', 'range', 'moraleLoss', 'moraleRegen', 'moraleFloor', 'moraleStart', 'troops'];

export function unitSources(unit, data) {
  const out = [];
  const nation = data.nations[unit.nation];
  if (nation?.buff) for (const m of nation.buff.mods) out.push({ ...m, src: nation.buff.name });
  const general = unit.generalId ? data.generals[unit.generalId] : null;
  if (general) {
    for (const id of general.skills) {
      const skill = data.skills[id];
      if (skill) for (const m of skill.mods) out.push({ ...m, src: skill.name });
    }
  }
  return out;
}

export function tileAt(map, col, row) {
  if (!map || col < 0 || row < 0 || col >= map.w || row >= map.h) return null;
  return map.tiles[row * map.w + col];
}

function isNearWater(map, data, col, row) {
  const cells = [{ col, row }, ...neighbors(col, row)];
  return cells.some(({ col: c, row: r }) => {
    const t = tileAt(map, c, r);
    return t && (t.terrain === 'sea' || t.terrain === 'river' || t.terrain === 'ford');
  });
}

export function condOk(cond, ctx) {
  if (!cond) return true;
  const { unit, tile } = ctx;
  if (cond.unitType && cond.unitType !== unit.type) return false;
  if (cond.vsUnitType && (!ctx.vs || ctx.vs.type !== cond.vsUnitType)) return false;
  if (cond.terrain && (!tile || !cond.terrain.includes(tile.terrain))) return false;
  if (cond.ownTerritory !== undefined && (!tile || (tile.owner === unit.nation) !== cond.ownTerritory)) return false;
  if (cond.role && cond.role !== ctx.role) return false;
  if (cond.afterMove !== undefined && cond.afterMove !== !!ctx.moved) return false;
  if (cond.nearWater !== undefined && cond.nearWater !== !!ctx.nearWater) return false;
  if (cond.troopsBelow !== undefined && !(unit.troops / unit.maxTroops < cond.troopsBelow)) return false;
  return true;
}

// opts: { role, vs, pos:{col,row}, moved }
export function getMods(state, data, unit, opts = {}) {
  const totals = Object.fromEntries(STATS.map((s) => [s, 0]));
  const pos = opts.pos || unit;
  const map = state?.map;
  const tile = map ? tileAt(map, pos.col, pos.row) : null;
  const ctx = {
    unit, tile, role: opts.role, vs: opts.vs,
    moved: opts.moved ?? unit.moved,
    nearWater: map ? isNearWater(map, data, pos.col, pos.row) : false,
  };
  for (const m of unitSources(unit, data)) {
    if (condOk(m.cond, ctx)) totals[m.stat] += m.value;
  }
  return totals;
}
