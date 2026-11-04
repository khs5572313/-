// 이동력·사거리·지형 상성 규칙 테스트 (docs/GDD_M0.md §3)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/index.js';
import { createGame, moveRange, findPath } from '../src/game.js';
import { actUnit } from '../src/ai.js';
import { computeDamage, unitRange, isDismounted } from '../src/combat.js';
import { key } from '../src/hex.js';

const W = 16;
const arena = (rows, units) => ({ id: 't', rows, territory: [], castles: [], sides: ['lab_a', 'lab_b'],
  units: units.map(([nation, type, col, row]) => ({ general: 'lab_std', nation, type, troops: 5000, col, row })) });
const plains = Array(9).fill('.'.repeat(W));
const farthestCol = (r, row) => Math.max(...[...r.keys()].map((k) => k.split(',').map(Number)).filter(([, y]) => y === row).map(([x]) => x));

test('평지 하루 이동: 기병 5칸, 창병·궁병 3칸', () => {
  const s = createGame(arena(plains, [['lab_a', 'cavalry', 0, 0], ['lab_a', 'spear', 0, 4], ['lab_a', 'archer', 0, 8], ['lab_b', 'spear', 15, 4]]), data);
  assert.equal(farthestCol(moveRange(s, data, s.units[0]), 0), 5);
  assert.equal(farthestCol(moveRange(s, data, s.units[1]), 4), 3);
  assert.equal(farthestCol(moveRange(s, data, s.units[2]), 8), 3);
});

test('산악: 보병은 하루 1칸, 기병은 말을 끌고 하루 1칸이며 그 뒤로는 못 간다', () => {
  const rows = Array(9).fill('.mmmm' + '.'.repeat(W - 5));
  const s = createGame(arena(rows, [['lab_a', 'cavalry', 0, 0], ['lab_a', 'spear', 0, 2], ['lab_b', 'spear', 15, 8]]), data);
  const cav = moveRange(s, data, s.units[0]);
  const spr = moveRange(s, data, s.units[1]);
  assert.ok(cav.has(key(1, 0)) && !cav.has(key(2, 0)), '기병: 산 1칸만');
  assert.ok(spr.has(key(1, 2)) && !spr.has(key(2, 2)), '창병: 산 1칸만');
  // 이미 평지를 1칸 이동해 MP를 쓴 기병은 산에 들어갈 수 없다(하루 종일 걸리므로)
  const rows2 = Array(9).fill('..mmm' + '.'.repeat(W - 5));
  const s2 = createGame(arena(rows2, [['lab_a', 'cavalry', 0, 0], ['lab_b', 'spear', 15, 8]]), data);
  assert.ok(!moveRange(s2, data, s2.units[0]).has(key(2, 0)), '평지 1칸 + 산 진입 불가');
});

test('하마: 산 위 기병은 공격 ×0.6, 방어 ×0.8', () => {
  const rows = Array(9).fill('..m' + '.'.repeat(W - 3));
  const s = createGame(arena(rows, [['lab_a', 'cavalry', 2, 2], ['lab_b', 'archer', 3, 2], ['lab_a', 'cavalry', 2, 6], ['lab_b', 'archer', 1, 6]]), data);
  const [cavM, tgt] = s.units;
  assert.ok(isDismounted(s, data, cavM));
  const onMountain = computeDamage(s, data, cavM, tgt);
  cavM.col = 3; cavM.row = 1; // 목표에 인접한 평지 칸으로
  assert.ok(!isDismounted(s, data, cavM));
  const onPlains = computeDamage(s, data, cavM, tgt);
  assert.ok(Math.abs(onMountain / onPlains - 0.6) < 0.02, `${onMountain}/${onPlains}`);
});

test('강은 배 없이 못 건너고, 여울에 들어가면 그 턴 이동이 끝난다', () => {
  const rows = Array(9).fill('.......~........');
  rows[4] = '.......=........';
  const s = createGame(arena(rows, [['lab_a', 'cavalry', 5, 2], ['lab_b', 'spear', 15, 8]]), data);
  const cav = s.units[0];
  const r = moveRange(s, data, cav);
  for (let row = 0; row < 9; row++) assert.ok(!r.has(key(7, row)) || row === 4, `강 칸 (7,${row}) 진입 불가`);
  assert.ok(r.has(key(7, 4)), '여울 진입 가능');
  assert.ok(![...r.keys()].some((k) => Number(k.split(',')[0]) >= 8), '여울을 지나 건너편까지는 한 턴에 못 감');
  const path = findPath(s, data, cav, 7, 4);
  assert.deepEqual(path.at(-1), { col: 7, row: 4 });
});

test('반도이격: 여울 위 부대는 방어 ×0.6이라 더 크게 맞는다', () => {
  const rows = Array(9).fill('.'.repeat(W));
  rows[4] = '......=' + '.'.repeat(W - 7);
  const s = createGame(arena(rows, [['lab_b', 'spear', 8, 4], ['lab_a', 'spear', 7, 4], ['lab_a', 'spear', 7, 6], ['lab_b', 'spear', 8, 6]]), data);
  const att = s.units[0];
  const target = s.units[1];
  const dry = computeDamage(s, data, att, target);
  target.col = 6; // 여울로
  att.col = 7;
  const wet = computeDamage(s, data, att, target);
  assert.ok(wet / dry > 1.6, `여울 ${wet} vs 평지 ${dry}`);
});

test('사거리: 궁병 2, 산·성벽 위 궁병 3, 거리 2 사격은 화력 85%·반격 없음', () => {
  const rows = Array(9).fill('.'.repeat(W));
  rows[2] = '....m' + '.'.repeat(W - 5);
  const s = createGame(arena(rows, [['lab_a', 'archer', 2, 4], ['lab_a', 'archer', 4, 2], ['lab_b', 'spear', 4, 4], ['lab_b', 'spear', 5, 4]]), data);
  const [arc, arcHigh, near, far] = s.units;
  assert.equal(unitRange(s, data, arc), 2);
  assert.equal(unitRange(s, data, arcHigh), 3);
  const d2 = computeDamage(s, data, arc, near);  // 거리 2
  arc.col = 3;                                   // 거리 1 (근접전에 말림 ×0.75)
  const d1 = computeDamage(s, data, arc, near);
  assert.ok(Math.abs(d1 / d2 - 0.75 / 0.85) < 0.02, `${d1}/${d2}`);
});

test('숲 엄폐: 숲 속 목표를 향한 사격은 ×0.75', () => {
  const rows = Array(9).fill('.'.repeat(W));
  rows[4] = '....f' + '.'.repeat(W - 5);
  const s = createGame(arena(rows, [['lab_a', 'archer', 2, 4], ['lab_b', 'spear', 4, 4], ['lab_b', 'spear', 4, 6]]), data);
  const [arc, inForest, inOpen] = s.units;
  const a = computeDamage(s, data, arc, inForest);
  arc.row = 6;
  const b = computeDamage(s, data, arc, inOpen);
  // 숲: 엄폐 0.75 × 방어 1.15
  assert.ok(Math.abs(a / b - 0.75 / 1.15) < 0.02, `${a}/${b}`);
});

test('AI 경로: 강을 만나면 여울로 돌아간다', () => {
  const rows = Array(9).fill('.......~........');
  rows[8] = '.......=........';
  const s = createGame(arena(rows, [['lab_a', 'spear', 5, 0], ['lab_b', 'spear', 10, 0]]), data);
  // 창병만 계속 움직여, 여울(7,8)을 거쳐 건너편에 도달하는지 본다
  const visited = [];
  for (let t = 0; t < 10; t++) {
    s.units[0].moved = false; s.units[0].acted = false;
    actUnit(s, data, s.units[0]);
    visited.push(key(s.units[0].col, s.units[0].row));
    if (s.units[0].col >= 8) break;
  }
  assert.ok(visited.includes(key(7, 8)), `여울을 지나야 함: ${visited.join(' ')}`);
  assert.ok(s.units[0].col >= 8, '건너편 도착');
});
