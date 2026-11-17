// AI 자동 대전으로 밸런스를 잰다.  사용: node tools/simulate.js [판수] [--md 파일]
const fs = require('fs');
const D = require('../js/data.js');
const E = require('../js/engine.js');
const N = parseInt(process.argv[2] || '400', 10);
const mdPath = process.argv.indexOf('--md') > 0 ? process.argv[process.argv.indexOf('--md') + 1] : null;
const nations = Object.keys(D.NATIONS);
const out = [];
const P = (s) => { console.log(s); out.push(s); };
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '-');
let seed = 12345;
const play = (a, b, extra) => E.autoPlay(Object.assign({ sides: [a, b], seed: (seed += 7919) }, extra || {}));
const base = Object.assign({}, E.CFG);
const reset = () => Object.assign(E.CFG, base);

// ── 1. 진영 간 승률 (무5·문5 무작위 덱) ──
P('## 1. 진영 간 승률 (무인 5 + 문인 5 무작위 덱, 조합당 ' + N + '판)\n');
P('| 행 진영 승률(%) | ' + nations.map((n) => D.NATIONS[n].name).join(' | ') + ' | 종합 |');
P('|---|' + nations.map(() => '---:').join('|') + '|---:|');
const tot = {}; nations.forEach((n) => (tot[n] = { w: 0, g: 0 }));
let turns = 0, games = 0, draws = 0, initWin = 0; const reasons = {};
const cell = {};
for (const a of nations) for (const b of nations) {
  if (a >= b) continue;
  let w = 0, d = 0;
  for (let i = 0; i < N; i++) {
    const flip = i % 2 === 1;                      // 좌우 자리를 번갈아 공정하게
    const st = play({ nation: flip ? b : a }, { nation: flip ? a : b });
    const win = st.winner < 0 ? -1 : (flip ? 1 - st.winner : st.winner);
    if (win === 0) w++; else if (win < 0) d++;
    turns += st.turn; games++; if (st.winner < 0) draws++; else if (st.winner === st.init) initWin++;
    reasons[st.reason] = (reasons[st.reason] || 0) + 1;
  }
  cell[a + b] = 100 * (w + d / 2) / N; cell[b + a] = 100 - cell[a + b];
  tot[a].w += w + d / 2; tot[a].g += N; tot[b].w += N - w - d / 2; tot[b].g += N;
}
for (const a of nations) P('| **' + D.NATIONS[a].name + '** | ' + nations.map((b) => (a === b ? '–' : cell[a + b].toFixed(0))).join(' | ') + ' | **' + pct(tot[a].w, tot[a].g) + '** |');
P('\n- 평균 전투 길이 **' + (turns / games).toFixed(1) + '턴**, 무승부 ' + pct(draws, games) + '%, 총 ' + games + '판');
P('- 종료 사유: ' + Object.keys(reasons).map((k) => k + ' ' + pct(reasons[k], games) + '%').join(' / '));
P('- 주사위로 선제 공격권을 얻은 쪽의 승률: **' + pct(initWin, games - draws) + '%**');

// ── 2. 지력은 무력을 이길 수 있는가 ──
function duel(kindA, kindB, n) {
  let w = 0, d = 0, g = 0;
  for (const na of nations) for (let i = 0; i < n; i++) {
    const nb = nations[(nations.indexOf(na) + 1 + (i % 6)) % 7];
    const flip = i % 2 === 1;
    const A = { nation: na, kind: kindA }, B = { nation: nb, kind: kindB };
    const st = play(flip ? B : A, flip ? A : B);
    const win = st.winner < 0 ? -1 : (flip ? 1 - st.winner : st.winner);
    if (win === 0) w++; else if (win < 0) d++; g++;
  }
  return 100 * (w + d / 2) / g;
}
const M = Math.max(60, Math.round(N / 2));
P('\n## 2. 지력은 무력을 이길 수 있는가 (문인 10장 덱 vs 무인 10장 덱, 조건당 ' + M * 7 + '판)\n');
P('| 조건 | 문인 덱 승률 |');
P('|---|---:|');
const tests = [
  ['모든 규칙 적용 (현재 게임)', {}],
  ['간파 끔 (지력 차에 따른 피해 감소 없음)', { useInsight: false }],
  ['병종 전법 끔 (화공·돌격·방진 없음)', { useTactics: false }],
  ['장수 계략 끔', { useSkills: false }],
  ['간파·전법·계략 모두 끔 (순수 무력 싸움)', { useInsight: false, useTactics: false, useSkills: false }],
];
for (const [label, cfg] of tests) { Object.assign(E.CFG, cfg); P('| ' + label + ' | ' + duel('c', 'm', M).toFixed(1) + '% |'); reset(); }
P('\n| 덱 구성 | 혼합 덱(무5·문5) 상대 승률 |');
P('|---|---:|');
P('| 무인 10장 | ' + duel('m', 'mix', M).toFixed(1) + '% |');
P('| 문인 10장 | ' + duel('c', 'mix', M).toFixed(1) + '% |');

// ── 3. 병종 ──
P('\n## 3. 병종 편중 덱끼리의 승률 (' + M * 7 + '판씩)\n');
P('| 행 덱 승률(%) | 기병 위주 | 창병 위주 | 궁병 위주 | 혼합 |');
P('|---|---:|---:|---:|---:|');
for (const a of ['cav', 'spr', 'arc']) P('| **' + D.UNITS[a].name + ' 위주** | ' + ['cav', 'spr', 'arc', 'mix'].map((b) => (a === b ? '–' : duel(a, b, M).toFixed(0))).join(' | ') + ' |');

// ── 4. 선제 공격권 규칙 ──
P('\n## 4. 선제 공격권의 영향\n');
P('| 규칙 | 선공 측 승률 |');
P('|---|---:|');
for (const [label, v] of [['배치 순서를 턴마다 교대 (현재)', 'alternate'], ['선공이 항상 먼저 배치', 'initFirst'], ['선공이 항상 나중에 배치', 'initLast']]) {
  E.CFG.deployMode = v; let w = 0, g = 0;
  for (let i = 0; i < M * 7; i++) { const st = play({ nation: nations[i % 7] }, { nation: nations[(i + 3) % 7] }); if (st.winner >= 0) { g++; if (st.winner === st.init) w++; } }
  P('| ' + label + ' | ' + pct(w, g) + '% |'); reset();
}

// ── 5. 계략 유형별 기여도: 그 유형을 가진 카드가 덱에 있을 때의 승률 ──
P('\n## 5. 계략 유형별 승률 (그 유형의 장수가 덱에 들어 있던 쪽의 승률)\n');
const ar = {}; Object.keys(D.ARCH).forEach((k) => (ar[k] = { w: 0, g: 0 }));
for (let i = 0; i < N * 6; i++) {
  const st = play({ nation: nations[i % 7] }, { nation: nations[(i + 1 + (i % 5)) % 7] });
  if (st.winner < 0) continue;
  st.sides.forEach((s, si) => {
    const all = [...s.deck, ...s.hand, ...s.field.filter(Boolean), ...s.grave];
    new Set(all.map((c) => c.skill.arch)).forEach((k) => { ar[k].g++; if (st.winner === si) ar[k].w++; });
  });
}
P('| 유형 | 기준 능력치 | 승률 | 표본 |');
P('|---|---|---:|---:|');
Object.keys(ar).sort((a, b) => ar[b].w / ar[b].g - ar[a].w / ar[a].g).forEach((k) => P('| ' + D.ARCH[k].label + ' | ' + D.STATS[D.ARCH[k].scale].name + ' | ' + pct(ar[k].w, ar[k].g) + '% | ' + ar[k].g + ' |'));

if (mdPath) fs.writeFileSync(mdPath, out.join('\n') + '\n');
