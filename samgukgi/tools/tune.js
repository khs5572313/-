// 조정 실험: node tools/tune.js '{"cfg":{"insightK":0.016},"arch":{"inspire":[25,40]}}' [판수] [길 수]
// 진영 승률 · 문vs무 · 병종/능력치 배분별 승률 · 편중 덱 지표를 한 번에 본다.
const D = require('../js/data.js'), E = require('../js/engine.js');
const o = JSON.parse(process.argv[2] || '{}'), n = +process.argv[3] || 200, L = +process.argv[4] || 3;
Object.assign(E.CFG, o.cfg || {});
for (const k in (o.arch || {})) o.arch[k].forEach((v, i) => { if (v != null) D.ARCH[k].fx[i].power = v; });
const ns = Object.keys(D.NATIONS); let seed = 1; const t = {}; ns.forEach((x) => (t[x] = 0));
const agg = {}; const add = (k, w) => { (agg[k] = agg[k] || { w: 0, g: 0 }); agg[k].g++; agg[k].w += w; };
let turns = 0, games = 0;
for (const a of ns) for (const b of ns) { if (a >= b) continue; for (let i = 0; i < n; i++) { const f = i % 2;
  const st = E.autoPlay({ sides: f ? [{ nation: b }, { nation: a }] : [{ nation: a }, { nation: b }], lanes: L, seed: (seed += 7919) });
  turns += st.turn; games++;
  const w = st.winner < 0 ? .5 : ((f ? 1 - st.winner : st.winner) === 0 ? 1 : 0); t[a] += w; t[b] += 1 - w;
  if (st.winner >= 0) st.sides.forEach((s, si) => [...s.deck, ...s.hand, ...s.field.filter(Boolean), ...s.grave].forEach((c) => { const g = D.GENERALS[c.gid], x = st.winner === si ? 1 : 0;
    add('U ' + D.UNITS[g.unit].name, x); add('P ' + g.stats.lead + g.stats.war + g.stats.int + g.stats.pol, x); add('A ' + D.ARCH[g.skill.arch].label, x); })); } }
const duel = (kA, kB, m) => { let w = 0; for (let i = 0; i < m; i++) { const f = i % 2, A = { nation: ns[i % 7], kind: kA }, B = { nation: ns[(i + 1 + i % 6) % 7], kind: kB };
  const st = E.autoPlay({ sides: f ? [B, A] : [A, B], lanes: L, seed: (seed += 7919) }); if (st.winner < 0) w += .5; else if ((f ? 1 - st.winner : st.winner) === 0) w++; } return (100 * w / m).toFixed(0); };
const r = (k) => (100 * agg[k].w / agg[k].g).toFixed(1);
const vals = ns.map((x) => 100 * t[x] / (6 * n));
console.log('진영  ' + ns.map((x, i) => D.NATIONS[x].name + ' ' + vals[i].toFixed(1)).join(' | ') + '  → 폭 ' + (Math.max(...vals) - Math.min(...vals)).toFixed(1) + ' / ' + (turns / games).toFixed(1) + '턴');
console.log('문vs무 ' + duel('c', 'm', 1400) + ' | 편중vs혼합 기/창/궁 ' + ['cav', 'spr', 'arc'].map((k) => duel(k, 'mix', 500)).join('/') + ' | 상성덱 기>궁 ' + duel('cav', 'arc', 300) + ' 궁>창 ' + duel('arc', 'spr', 300) + ' 창>기 ' + duel('spr', 'cav', 300));
console.log('병종  ' + Object.keys(agg).filter((k) => k[0] === 'U').map((k) => k.slice(2) + ' ' + r(k)).join(' | '));
console.log('배분  ' + Object.keys(agg).filter((k) => k[0] === 'P').sort().map((k) => k.slice(2) + ' ' + r(k)).join(' | '));
console.log('계략  ' + Object.keys(agg).filter((k) => k[0] === 'A').sort((a, b) => r(b) - r(a)).map((k) => k.slice(2) + ' ' + r(k)).join(' | '));
