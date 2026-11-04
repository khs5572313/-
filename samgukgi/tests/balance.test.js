// 밸런스 회귀 테스트: 수치를 바꿨을 때 설계 목표(docs/GDD_M0.md §4.5)가 깨지면 실패한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/index.js';
import { duel, matchupMatrix } from '../tools/balance.js';

const N = 40;
const PLAINS = Array(7).fill('.'.repeat(11));
const gen = (o = {}) => ({ name: 'x', lead: 70, war: 70, int: 70, pol: 70, cha: 70,
  aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [], ...o });
const arena = (a, b) => ({ rows: PLAINS, territory: [], castles: [], sides: ['red', 'blue'], turnLimit: 30, units: [
  { general: 'g_red', nation: 'red', type: a, troops: 5000, col: 2, row: 3 },
  { general: 'g_blue', nation: 'blue', type: b, troops: 5000, col: 8, row: 3 }] });

test('상성 우위는 같은 능력치에서 75% 이상 이긴다', () => {
  const m = matchupMatrix(N);
  assert.ok(m.spear.cavalry >= 0.75, `창>기 ${m.spear.cavalry}`);
  assert.ok(m.cavalry.archer >= 0.75, `기>궁 ${m.cavalry.archer}`);
  assert.ok(m.archer.spear >= 0.75, `궁>창 ${m.archer.spear}`);
  for (const t of ['cavalry', 'spear', 'archer']) {
    assert.ok(m[t][t] > 0.3 && m[t][t] < 0.7, `동일 병종 ${t} ${m[t][t]}`);
  }
});

test('명장(90·적성 S)은 불리한 상성에서도 25~65%로 싸울 수 있다', () => {
  const d = { ...data, nations: { ...data.nations, red: {}, blue: {} },
    generals: { g_red: gen({ war: 90, lead: 90, aptitude: { cavalry: 'S', spear: 'B', archer: 'B' } }), g_blue: gen() } };
  const r = duel(d, arena('cavalry', 'spear'), N).red;
  assert.ok(r >= 0.25 && r <= 0.65, `명장 기병 vs 창병 ${r}`);
});

test('645 안시성 시나리오: AI 대 AI 당 승률 25~75%', async () => {
  const { default: scenario } = await import('../src/data/scenarios/liaodong645.js');
  const { createGame } = await import('../src/game.js');
  const { playOut } = await import('../tools/balance.js');
  const n = 60;
  let tang = 0;
  for (let i = 0; i < n; i++) if (playOut(createGame(scenario, data, 1000 + i), data, 200) === 'tang') tang++;
  assert.ok(tang / n >= 0.25 && tang / n <= 0.75, `당 승률 ${tang / n}`);
});
