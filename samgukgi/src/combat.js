// 전투 공식 (docs/GDD_M0.md §4와 1:1 대응)
//
// 피해 = 공격측 병력 × BASE_RATE
//      × (공격력 / 방어력)
//      × 상성계수 × 지형계수 × 사격계수 × 사기계수 × 난수(±25%)
// 사격계수: 거리 2 이상 사격은 ×0.85, 숲 등 엄폐 지형의 목표는 추가로 ×cover
// 공격력 = 병종공격 × (0.5 + (무력'×0.6 + 통솔'×0.4)/100) × 적성 × (1+공격 수정치)
// 방어력 = 병종방어 × (0.5 + 통솔'/100) × 적성(절반 반영) × 지형방어 × (1+방어 수정치)
// 능력치' = 체감 곡선(70 초과분은 60%만 반영) → 명장 독주 억제
import { distance } from './hex.js';
import { getMods, tileAt } from './modifiers.js';

export const APT = { S: 1.12, A: 1.06, B: 1.0, C: 0.9, D: 0.8 };
export const BASE_RATE = 0.12;
export const COUNTER_RATE = 0.5;
export const MORALE_SHOCK = 60; // 병력 100% 손실 시 사기 감소량
export const RAND_SPREAD = 0.25; // 피해 난수 폭 ±25%
export const CRIT_MUL = 1.5;     // 전법 발동 시 피해 배율
export const RANGED_FALLOFF = 0.85; // 거리 2 이상 사격의 화력 (반격을 받지 않는 대가)

// 전법 발동 확률: 지력 50 → 5%, 70 → 9%, 100 → 13%  (지력이 전투에 기여하는 통로)
export function critChance(general) {
  return 0.05 + Math.max(0, effStat(general.int) - 50) / 500;
}

export const DEFAULT_GENERAL = {
  name: '무명 장수', lead: 50, war: 50, int: 50, pol: 50, cha: 50,
  aptitude: { cavalry: 'C', spear: 'B', archer: 'B' }, skills: [],
};

export function effStat(s) {
  return s <= 70 ? s : 70 + (s - 70) * 0.6;
}

export function generalOf(unit, data) {
  return (unit.generalId && data.generals[unit.generalId]) || DEFAULT_GENERAL;
}

function apt(general, type) {
  return APT[general.aptitude?.[type] ?? 'B'];
}

// 사거리 = 병종 기본 + 특기(강노·기사) + 고지 보너스(산·성벽 위 궁병 +1)
export function unitRange(state, data, unit, pos = unit) {
  const tile = state?.map ? tileAt(state.map, pos.col, pos.row) : null;
  const height = tile ? data.terrain[tile.terrain].rangeBonus?.[unit.type] ?? 0 : 0;
  return data.units[unit.type].range + getMods(state, data, unit, { pos }).range + height;
}

// 기병이 산악 같은 '하마' 지형에 있으면 말을 끌고 걷는 상태
export function isDismounted(state, data, unit, pos = unit) {
  if (unit.type !== 'cavalry') return false;
  const tile = tileAt(state.map, pos.col, pos.row);
  return !!(tile && data.terrain[tile.terrain].dismount);
}

export function attackPower(state, data, unit, opts = {}) {
  const g = generalOf(unit, data);
  const mods = getMods(state, data, unit, opts);
  const stat = (effStat(g.war) * 0.6 + effStat(g.lead) * 0.4) / 100;
  return data.units[unit.type].atk * (0.5 + stat) * apt(g, unit.type) * (1 + mods.atk);
}

export function defensePower(state, data, unit, opts = {}) {
  const g = generalOf(unit, data);
  const mods = getMods(state, data, unit, { ...opts, role: 'defend' });
  const tile = tileAt(state.map, unit.col, unit.row);
  const terr = data.terrain[tile.terrain];
  const terrainDef = (terr.def ?? 1) * (terr.defUnit?.[unit.type] ?? 1);
  const aptDef = 1 + (apt(g, unit.type) - 1) / 2; // 적성은 방어에 절반만 반영
  return data.units[unit.type].def * (0.5 + effStat(g.lead) / 100) * aptDef * terrainDef * (1 + mods.def);
}

// opts: { role:'attack'|'counter', attPos, moved, rand, attTroops }
export function computeDamage(state, data, att, def, opts = {}) {
  const role = opts.role || 'attack';
  const attPos = opts.attPos || att;
  const dist = distance(attPos, def);
  const aOpts = { role, vs: def, pos: attPos, moved: opts.moved ?? att.moved };
  const atkP = attackPower(state, data, att, aOpts);
  const defP = defensePower(state, data, def, { vs: att });

  const aTerrain = data.terrain[tileAt(state.map, attPos.col, attPos.row).terrain];
  const dTerrain = data.terrain[tileAt(state.map, def.col, def.row).terrain];
  let mul = data.counter[att.type][def.type];
  mul *= aTerrain.atk?.[att.type] ?? 1;
  if (dist === 1) {
    mul *= dTerrain.charge?.[att.type] ?? 1;
    mul *= data.units[att.type].adjacentMul ?? 1;
  } else {
    mul *= RANGED_FALLOFF * (dTerrain.cover ?? 1);
  }
  const morale = 0.6 + 0.4 * (att.morale / 100);
  const troops = opts.attTroops ?? att.troops;
  let dmg = troops * BASE_RATE * (atkP / defP) * mul * morale * (opts.rand ?? 1);
  if (role === 'counter') {
    dmg *= COUNTER_RATE * (1 + getMods(state, data, att, aOpts).counter);
  }
  return Math.max(0, Math.min(def.troops, Math.round(dmg)));
}

export function canCounter(state, data, defender, attPos) {
  return distance(attPos, defender) <= unitRange(state, data, defender);
}

export function applyDamage(state, data, target, dmg) {
  const before = Math.max(1, target.troops);
  target.troops = Math.max(0, target.troops - dmg);
  const mods = getMods(state, data, target, {});
  const shock = (dmg / before) * MORALE_SHOCK * Math.max(0.1, 1 + mods.moraleLoss);
  target.morale = Math.max(mods.moraleFloor, target.morale - shock);
  if (target.troops <= 0 || target.morale <= 0) target.dead = true;
}

// 실제 교전: 공격 → (살아 있고 사거리 안이면) 반격
export function resolveAttack(state, data, att, def, rng) {
  const roll = () => (rng ? 1 - RAND_SPREAD + rng() * 2 * RAND_SPREAD : 1);
  const crit = rng ? rng() < critChance(generalOf(att, data)) : false;
  const dmg = Math.min(def.troops, Math.round(
    computeDamage(state, data, att, def, { role: 'attack', rand: roll() }) * (crit ? CRIT_MUL : 1)));
  applyDamage(state, data, def, dmg);
  let counterDmg = 0;
  if (!def.dead && canCounter(state, data, def, att)) {
    counterDmg = computeDamage(state, data, def, att, { role: 'counter', rand: roll(), moved: false });
    applyDamage(state, data, att, counterDmg);
  }
  if (!att.dead && dmg > counterDmg) att.morale = Math.min(100, att.morale + 3);
  return { dmg, counterDmg, crit };
}
