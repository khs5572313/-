import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/index.js';
import scenario from '../src/data/scenarios/liaodong645.js';
import { distance, neighbors, key } from '../src/hex.js';
import { effStat, computeDamage, unitRange } from '../src/combat.js';
import { getMods } from '../src/modifiers.js';
import { createGame, buildMap, moveRange, moveUnit, endTurn, unitAt } from '../src/game.js';
import { runAiTurn } from '../src/ai.js';

const PLAINS = Array(7).fill('.'.repeat(11));
const testData = {
  ...data,
  nations: { ...data.nations, red: { name: 'red' }, blue: { name: 'blue' } },
  generals: {
    ...data.generals,
    avg: { name: '평범', lead: 70, war: 70, int: 70, pol: 70, cha: 70, aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [] },
    ace: { name: '명장', lead: 90, war: 90, int: 70, pol: 70, cha: 70, aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [] },
  },
};

function arena(units, rows = PLAINS, extra = {}) {
  return { id: 't', rows, territory: [], castles: [], sides: ['red', 'blue'], units, ...extra };
}

test('헥스 거리·이웃', () => {
  assert.equal(distance({ col: 0, row: 0 }, { col: 3, row: 0 }), 3);
  assert.equal(distance({ col: 2, row: 2 }, { col: 2, row: 3 }), 1);
  for (const n of neighbors(5, 5)) assert.equal(distance({ col: 5, row: 5 }, n), 1);
  for (const n of neighbors(4, 6)) assert.equal(distance({ col: 4, row: 6 }, n), 1);
});

test('시나리오 맵이 올바르게 파싱된다', () => {
  const map = buildMap(scenario, data);
  assert.equal(map.w, 22);
  assert.equal(map.h, 16);
  assert.equal(map.tiles.filter((t) => t.castle).length, scenario.castles.length);
  for (const u of scenario.units) {
    const t = map.tiles[u.row * map.w + u.col];
    assert.ok(!data.terrain[t.terrain].impassable, `${u.general} 시작 칸이 이동 불가 지형`);
    if (u.general !== null) assert.ok(data.generals[u.general], `${u.general} 무장 데이터 없음`);
  }
});

test('모든 무장의 특기·적성이 정의되어 있다', () => {
  for (const [id, g] of Object.entries(data.generals)) {
    for (const s of g.skills) assert.ok(data.skills[s], `${id}: 특기 ${s} 없음`);
    for (const t of ['cavalry', 'spear', 'archer']) assert.ok(['S', 'A', 'B', 'C', 'D'].includes(g.aptitude[t]), `${id}: ${t} 적성`);
    assert.ok(data.nations[g.nation], `${id}: 국가 ${g.nation} 없음`);
  }
});

test('능력치 체감 곡선: 70 초과분은 덜 오른다', () => {
  assert.equal(effStat(70), 70);
  assert.ok(effStat(100) - effStat(90) < effStat(70) - effStat(60));
});

test('상성: 기병은 창병보다 궁병을 더 크게 때린다', () => {
  const s = createGame(arena([
    { general: 'avg', nation: 'red', type: 'cavalry', troops: 5000, col: 3, row: 3 },
    { general: 'avg', nation: 'blue', type: 'archer', troops: 5000, col: 4, row: 3 },
    { general: 'avg', nation: 'blue', type: 'spear', troops: 5000, col: 3, row: 4 },
  ]), testData);
  const [cav, arc, spr] = s.units;
  assert.ok(computeDamage(s, testData, cav, arc) > computeDamage(s, testData, cav, spr) * 1.5);
});

test('능력치가 높을수록 피해가 크다', () => {
  const s = createGame(arena([
    { general: 'avg', nation: 'red', type: 'spear', troops: 5000, col: 3, row: 3 },
    { general: 'ace', nation: 'red', type: 'spear', troops: 5000, col: 5, row: 3 },
    { general: 'avg', nation: 'blue', type: 'spear', troops: 5000, col: 4, row: 3 },
  ]), testData);
  const [avg, ace, tgt] = s.units;
  assert.ok(computeDamage(s, testData, ace, tgt) > computeDamage(s, testData, avg, tgt));
});

test('국가 버프: 고구려는 성·구릉에서 방어 +15%, 평지에서는 없음', () => {
  const s = createGame(scenario, data);
  const lord = s.units.find((u) => u.generalId === 'ansi_lord');
  assert.ok(Math.abs(getMods(s, data, lord, { role: 'defend' }).def - (0.15 + 0.25)) < 1e-9); // 버프 + 철벽
  const yeonsu = s.units.find((u) => u.generalId === 'go_yeonsu');
  assert.ok(Math.abs(getMods(s, data, yeonsu, { role: 'defend' }).def - (0.15 + 0.1)) < 1e-9); // 구릉 버프 + 개마무사
  yeonsu.col = 9; yeonsu.row = 8; // 평지
  assert.ok(Math.abs(getMods(s, data, yeonsu, { role: 'defend' }).def - 0.1) < 1e-9); // 개마무사만
});

test('국가 버프: 당은 병력 +20%', () => {
  const s = createGame(scenario, data);
  const shimin = s.units.find((u) => u.generalId === 'li_shimin');
  assert.equal(shimin.maxTroops, 7200);
});

test('무장 특기: 강노는 궁병 사거리 +1, 개마무사는 기병일 때만 발동', () => {
  const s = createGame(scenario, data);
  const vice = s.units.find((u) => u.generalId === 'ansi_vice');
  assert.equal(unitRange(s, data, vice), 3);
  const yeonsu = s.units.find((u) => u.generalId === 'go_yeonsu');
  assert.equal(getMods(s, data, yeonsu, {}).atk, 0.2);
  yeonsu.type = 'spear';
  assert.equal(getMods(s, data, yeonsu, {}).atk, 0);
});

test('이동: 적 인접 칸(ZOC)에서 멈추고 적 칸은 지나갈 수 없다', () => {
  const s = createGame(arena([
    { general: 'avg', nation: 'red', type: 'cavalry', troops: 5000, col: 2, row: 3 },
    { general: 'avg', nation: 'blue', type: 'spear', troops: 5000, col: 5, row: 3 },
  ]), testData);
  const r = moveRange(s, testData, s.units[0]);
  assert.ok(r.has(key(4, 3)), 'ZOC 칸 진입은 가능');
  assert.ok(!r.has(key(5, 3)), '적 칸 진입 불가');
  assert.ok(!r.has(key(6, 3)), 'ZOC를 넘어 적 뒤로 갈 수 없음');
});

test('시나리오는 같은 시드면 같은 결과로 끝난다', () => {
  const play = (seed) => {
    const s = createGame(scenario, data, seed);
    let guard = 0;
    while (!s.winner && guard++ < 100) { runAiTurn(s, data); endTurn(s, data); }
    return { winner: s.winner, log: s.log.join('\n') };
  };
  const a = play(7), b = play(7);
  assert.ok(a.winner === 'tang' || a.winner === 'goguryeo');
  assert.deepEqual(a, b);
});

test('안시성 점령 시 당 승리', () => {
  const s = createGame(scenario, data);
  for (const u of s.units) if (u.generalId === 'ansi_lord') u.dead = true;
  const shiji = s.units.find((u) => u.generalId === 'li_shiji');
  shiji.col = 10; shiji.row = 9;
  assert.equal(unitAt(s, 10, 10), null);
  moveUnit(s, data, shiji, 10, 10);
  assert.equal(s.winner, 'tang');
});
