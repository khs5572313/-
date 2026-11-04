#!/usr/bin/env node
// 밸런스 시뮬레이터: 같은 AI끼리 수백 판을 자동 대전시켜 승률표를 뽑는다.
//   node tools/balance.js            # 전체 리포트
//   node tools/balance.js --n 400    # 판 수 지정
import baseData from '../src/data/index.js';
import scenario645 from '../src/data/scenarios/liaodong645.js';
import { createGame, endTurn, aliveUnits } from '../src/game.js';
import { runAiTurn } from '../src/ai.js';

const TYPES = ['cavalry', 'spear', 'archer'];

function testData(overrides = {}) {
  const gen = (id, o = {}) => ({
    name: id, nation: id, lead: 70, war: 70, int: 70, pol: 70, cha: 70,
    aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [], ...o,
  });
  return {
    ...baseData,
    nations: { ...baseData.nations, red: { name: '적군' }, blue: { name: '청군' } },
    generals: { ...baseData.generals, g_red: gen('red', overrides.red), g_blue: gen('blue', overrides.blue) },
  };
}

function arena(rows, a, b) {
  return {
    id: 'arena', rows, territory: [], castles: [], sides: ['red', 'blue'], turnLimit: 30,
    units: [
      { general: 'g_red', nation: 'red', type: a.type, troops: a.troops ?? 5000, col: a.col ?? 2, row: 3 },
      { general: 'g_blue', nation: 'blue', type: b.type, troops: b.troops ?? 5000, col: b.col ?? 8, row: 3 },
    ],
  };
}

const PLAINS = Array(7).fill('.'.repeat(11));

export function playOut(state, data, maxSteps = 400) {
  let steps = 0;
  while (!state.winner && !state.timeout && steps++ < maxSteps) {
    runAiTurn(state, data);
    endTurn(state, data);
  }
  if (state.winner) return state.winner;
  // 시간 초과: 남은 병력 비율이 높은 쪽
  const score = (n) => aliveUnits(state, n).reduce((s, u) => s + u.troops / u.maxTroops, 0);
  const [a, b] = state.sides;
  return score(a) === score(b) ? 'draw' : score(a) > score(b) ? a : b;
}

// red를 먼저 두는 판과 blue를 먼저 두는 판을 절반씩
export function duel(data, scen, n, seed0 = 1) {
  let red = 0, blue = 0, draw = 0;
  for (let i = 0; i < n; i++) {
    const s = { ...scen, sides: i % 2 ? ['blue', 'red'] : ['red', 'blue'] };
    const w = playOut(createGame(s, data, seed0 + i), data);
    if (w === 'red') red++; else if (w === 'blue') blue++; else draw++;
  }
  return { red: red / n, blue: blue / n, draw: draw / n };
}

export function matchupMatrix(n = 200, rows = PLAINS) {
  const data = testData();
  const out = {};
  for (const a of TYPES) {
    out[a] = {};
    for (const b of TYPES) out[a][b] = duel(data, arena(rows, { type: a }, { type: b }), n).red;
  }
  return out;
}

const pct = (x) => `${(x * 100).toFixed(0).padStart(3)}%`;
const label = { cavalry: '기병', spear: '창병', archer: '궁병' };

function printMatrix(title, m) {
  console.log(`\n■ ${title} (행 병종의 승률)`);
  console.log('        ' + TYPES.map((t) => label[t].padEnd(5)).join(''));
  for (const a of TYPES) console.log(`  ${label[a]}  ` + TYPES.map((b) => pct(m[a][b]) + '  ').join(''));
}

function main() {
  const argN = process.argv.indexOf('--n');
  const n = argN > 0 ? Number(process.argv[argN + 1]) : 200;
  console.log(`삼국기 밸런스 리포트 (판 수 ${n}, 동일 능력치 70·적성 B·병력 5000)`);

  printMatrix('평지 1:1 상성', matchupMatrix(n));

  console.log('\n■ 능력치 영향 (같은 병종 기병 1:1, 평지)');
  for (const war of [70, 80, 90, 100]) {
    const d = testData({ red: { war, lead: war } });
    console.log(`  무력·통솔 ${war} vs 70 → 승률 ${pct(duel(d, arena(PLAINS, { type: 'cavalry' }, { type: 'cavalry' }), n).red)}`);
  }

  console.log('\n■ 적성 영향 (창병 1:1, 평지)');
  for (const a of ['S', 'A', 'C']) {
    const d = testData({ red: { aptitude: { cavalry: 'B', spear: a, archer: 'B' } } });
    console.log(`  적성 ${a} vs B → 승률 ${pct(duel(d, arena(PLAINS, { type: 'spear' }, { type: 'spear' }), n).red)}`);
  }

  console.log('\n■ 명장의 역상성 돌파 (명장 기병 vs 평범 창병 70·B, 평지)');
  for (const [war, a] of [[80, 'A'], [90, 'S'], [100, 'S']]) {
    const d = testData({ red: { war, lead: war, aptitude: { cavalry: a, spear: 'B', archer: 'B' } } });
    console.log(`  기병 무력·통솔 ${war}·적성 ${a} vs 창병 → 승률 ${pct(duel(d, arena(PLAINS, { type: 'cavalry' }, { type: 'spear' }), n).red)}`);
  }

  console.log('\n■ 병력 차이 (창병 1:1, 평지)');
  for (const t of [5500, 6000, 7500]) {
    console.log(`  ${t} vs 5000 → 승률 ${pct(duel(testData(), arena(PLAINS, { type: 'spear', troops: t }, { type: 'spear' }), n).red)}`);
  }

  console.log('\n■ 645 안시성 시나리오 (AI 대 AI)');
  const res = { tang: 0, goguryeo: 0, other: 0 };
  for (let i = 0; i < n; i++) {
    const w = playOut(createGame(scenario645, baseData, 1000 + i), baseData, 200);
    res[w in res ? w : 'other']++;
  }
  console.log(`  당 승 ${pct(res.tang / n)} / 고구려 승 ${pct(res.goguryeo / n)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
