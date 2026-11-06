/* 시기별 인물 분포 점검: node tools/era_report.js */
const fs = require('fs'), path = require('path');
global.window = {}; global.SGK = window.SGK = {};
const files = ['core.js', 'data/nations.js', 'data/map.js', 'data/units.js', 'data/buildings.js', 'data/specials.js', 'data/officers.js', 'data/officers2.js', 'data/balance.js', 'data/scenarios.js', 'data/scenarios3k.js'];
for (const f of files) eval(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'));
const S = window.SGK;
const N3 = ['goguryeo', 'baekje', 'silla'];
const years = process.argv[2] ? process.argv[2].split(',').map(Number) : [590, 600, 610, 620, 630, 642, 650, 655, 660, 661, 665, 670];
const avail = (o, y) => (o.b || 0) + 16 <= y && (!o.d || o.d >= y);
const sum = (o) => o.s.reduce((a, b) => a + b, 0);
const mil = (o) => o.s[0] + o.s[1];
console.log('연도 | ' + N3.map((n) => `${S.NATIONS[n].name}(수/실존/가상/합평균/무장≥150/지정≥160/S급≥320)`).join(' | '));
for (const y of years) {
  const row = N3.map((n) => {
    const l = S.OFFICERS.filter((o) => o.nation === n && avail(o, y));
    const avg = l.length ? Math.round(l.reduce((a, o) => a + sum(o), 0) / l.length) : 0;
    return `${l.length}/${l.filter((o) => !o.fic).length}/${l.filter((o) => o.fic).length}/${avg}/${l.filter((o) => mil(o) >= 150).length}/${l.filter((o) => o.s[2] + o.s[3] >= 160).length}/${l.filter((o) => sum(o) >= 320).length}`;
  });
  console.log(`${y} | ${row.join(' | ')}`);
}

/* 시나리오 시작 시점 실제 편성 점검 (균형 규칙 적용 후) */
global.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ['data/events.js', 'data/events3k.js', 'game.js']) eval(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'));
console.log('\n시나리오 | ' + N3.map((n) => `${S.NATIONS[n].name}(현역/재야/무장 상위10 평균 통+무/책사 상위5 평균 지+정/S급)`).join(' | '));
for (const sc of S.SCENARIOS) {
  S.G.newGame(sc.id, sc.hero);
  const st = S.state;
  const row = N3.map((n) => {
    const act = S.G.nationOfficers(n);
    const free = Object.keys(st.officers).filter((id) => st.officers[id].status === 'free' && S.officerById[id].nation === n).length;
    const ss = act.map((id) => st.officers[id].s);
    const top = (f, k) => { const v = ss.map(f).sort((a, b) => b - a).slice(0, k); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; };
    return `${act.length}/${free}/${top((s) => s[0] + s[1], 10)}/${top((s) => s[2] + s[3], 5)}/${ss.filter((s) => s.reduce((a, b) => a + b) >= 320).length}`;
  });
  console.log(`${sc.year} ${sc.title} | ${row.join(' | ')}`);
}
