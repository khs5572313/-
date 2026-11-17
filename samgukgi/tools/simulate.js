// AI끼리 자동 대전을 돌려 밸런스를 점검한다.  사용: node tools/simulate.js [판수]
const D = require('../js/data.js');
const E = require('../js/engine.js');
const N = parseInt(process.argv[2] || '300', 10);

function play(sides, seed) {
  const st = E.createBattle({ sides, seed });
  let guard = 0;
  while (st.winner === null && guard++ < 100) {
    // 선후 배치 순서를 턴마다 교대해 공정하게 비교
    const first = st.turn % 2;
    E.aiAct(st, first); if (st.winner !== null) break;
    E.aiAct(st, 1 - first); if (st.winner !== null) break;
    E.resolve(st);
    if (st.winner === null) E.beginTurn(st);
  }
  return st;
}

const nations = Object.keys(D.NATIONS);
const tot = {}; nations.forEach((n) => (tot[n] = { w: 0, g: 0 }));
let turns = 0, games = 0, draws = 0;
console.log('진영 간 승률(행 진영 기준, %)');
console.log(''.padEnd(10) + nations.map((n) => n.slice(0, 6).padStart(8)).join(''));
for (const a of nations) {
  let row = a.padEnd(10);
  for (const b of nations) {
    if (a === b) { row += '-'.padStart(8); continue; }
    let w = 0;
    for (let i = 0; i < N; i++) {
      const st = play([{ nation: a }, { nation: b }], 1000 + i * 7919);
      turns += st.turn; games++;
      if (st.winner === 0) { w++; tot[a].w++; } else if (st.winner === 1) tot[b].w++; else draws++;
      tot[a].g++; tot[b].g++;
    }
    row += (100 * w / N).toFixed(0).padStart(8);
  }
  console.log(row);
}
console.log('\n진영별 종합 승률');
nations.forEach((n) => console.log(`  ${D.NATIONS[n].name.padEnd(4)} ${(100 * tot[n].w / tot[n].g).toFixed(1)}%`));
console.log(`\n평균 턴 수 ${(turns / games).toFixed(1)} / 무승부 ${(100 * draws / games).toFixed(1)}% / 총 ${games}판`);

// 병종 상성 검증: 능력치가 같은 카드 1:1 교환에서 유리 병종이 이기는가
const st = E.createBattle({ sides: [{ nation: 'goguryeo' }, { nation: 'baekje' }], seed: 1 });
console.log('\n배치 비용 분포:', Object.values(D.GENERALS).reduce((m, g) => { const c = E.costOf(g); m[c] = (m[c] || 0) + 1; return m; }, {}));
const reasons = {};
for (let i = 0; i < 400; i++) { const s2 = play([{ nation: nations[i % 7] }, { nation: nations[(i + 3) % 7] }], 5 + i); reasons[s2.reason] = (reasons[s2.reason] || 0) + 1; }
console.log('종료 사유:', reasons);
