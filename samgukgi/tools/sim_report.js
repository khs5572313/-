/* 시나리오 난이도 측정: AI끼리 자동 대전을 반복해 나라별 목표 달성률·생존율을 잰다
 * 사용: node tools/sim_report.js [반복수=12] [난이도=normal] [시나리오id(선택)]
 * 별점 기준(보통): 그 나라를 AI가 맡았을 때 목표 달성률 ≥45% ★, ≥25% ★★, ≥10% ★★★, 그 미만 ★★★★ */
const fs = require('fs'), path = require('path');
global.window = {}; global.SGK = window.SGK = {};
global.localStorage = { getItem: () => null, setItem: () => {} };
const files = ['core.js', 'data/nations.js', 'data/map.js', 'data/units.js', 'data/buildings.js', 'data/specials.js', 'data/officers.js', 'data/officers2.js', 'data/balance.js',
  'data/scenarios.js', 'data/scenarios3k.js', 'data/events.js', 'data/events3k.js', 'game.js', 'battle.js'];
for (const f of files) eval(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'));
const S = window.SGK, G = S.G;
const REPS = +(process.argv[2] || 12), DIFF = process.argv[3] || 'normal', ONLY = process.argv[4] || null;
const N3 = ['goguryeo', 'baekje', 'silla'];
const out = {}, hero = {};
const star = (r) => (r >= 0.45 ? 1 : r >= 0.25 ? 2 : r >= 0.1 ? 3 : 4);
console.log(`반복 ${REPS}회 · 난이도 ${DIFF}\n시나리오 | 나라: 목표 달성률 / 생존율 / 평균 도시(시작→끝) / 별점`);
for (const sc of S.SCENARIOS.filter((x) => !ONLY || x.id === ONLY)) {
  const acc = {};
  N3.forEach((n) => (acc[n] = { goal: 0, alive: 0, c0: 0, c1: 0 }));
  const turns = Math.min(168, (sc.endYear - sc.year + 1) * 12); /* 월 단위 */
  for (let r = 0; r < REPS; r++) {
    G.newGame(sc.id, sc.hero, { diff: DIFF });
    const st = S.state;
    const c0 = {}; N3.forEach((n) => (c0[n] = G.citiesOf(n).length));
    st.player = 'none_';
    const hero = sc.hero;
    st.focus = hero;
    const done = {};
    for (let t = 0; t < turns; t++) {
      for (const ev of G.pendingEvents()) G.fireEvent(ev, ev.choices[0]);
      for (const m of N3) {
        if (!st.nations[m].alive) continue;
        for (const a of G.aiTurn(m)) {
          if (st.cities[a.to].owner === a.attNation) { a.att.forEach((u) => (st.cities[a.from].troops[u.uid] = (st.cities[a.from].troops[u.uid] || 0) + u.troops)); continue; }
          G.applyBattle(a, new S.Battle(a).autoResolve());
        }
      }
      G.advance(); G.lifeCycle(); st.player = hero; G.income(); st.player = 'none_'; /* 주인공은 난이도의 플레이어 배율을 받는다 */
      for (const n of N3) if (!done[n] && st.nations[n].alive && G.goalStatus(n).every((g) => g.ok)) done[n] = true;
    }
    for (const n of N3) {
      acc[n].goal += done[n] ? 1 : 0; acc[n].alive += st.nations[n].alive ? 1 : 0;
      acc[n].c0 += c0[n]; acc[n].c1 += G.citiesOf(n).length;
    }
  }
  out[sc.id] = {};
  hero[sc.id] = `${S.NATIONS[sc.hero].name} ${Math.round((acc[sc.hero].goal / REPS) * 100)}%`;
  const row = N3.map((n) => {
    const a = acc[n], gr = a.goal / REPS;
    out[sc.id][n] = star(gr);
    return `${S.NATIONS[n].name}: ${Math.round(gr * 100)}% / ${Math.round((a.alive / REPS) * 100)}% / ${(a.c0 / REPS).toFixed(0)}→${(a.c1 / REPS).toFixed(1)} / ${'★'.repeat(star(gr))}`;
  });
  console.log(`${sc.year} ${sc.title} | ${row.join(' | ')}`);
}
console.log('\n주인공 목표 달성률: ' + S.SCENARIOS.filter((x) => hero[x.id]).map((x) => `${x.title}(${hero[x.id]})`).join(' · '));
console.log('STARS=' + JSON.stringify(out));
