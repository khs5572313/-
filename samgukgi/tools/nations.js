// 진영 종합 승률만 빠르게.  node tools/nations.js [판수]
const D = require('../js/data.js'), E = require('../js/engine.js');
const ns = Object.keys(D.NATIONS); let seed = 31337; const n = +process.argv[2] || 300; const t = {}; ns.forEach((x) => (t[x] = 0));
for (const a of ns) for (const b of ns) { if (a >= b) continue; for (let i = 0; i < n; i++) { const f = i % 2; const st = E.autoPlay({ sides: f ? [{ nation: b }, { nation: a }] : [{ nation: a }, { nation: b }], seed: (seed += 7919) }); const w = st.winner < 0 ? .5 : ((f ? 1 - st.winner : st.winner) === 0 ? 1 : 0); t[a] += w; t[b] += 1 - w; } }
console.log(ns.map((x) => D.NATIONS[x].name + ' ' + (100 * t[x] / (6 * n)).toFixed(1)).join(' | '));
const avg = (k) => ns.map((x) => D.NATIONS[x].name + ' ' + (D.ROSTER[x].reduce((a, id) => a + D.GRADES[D.GENERALS[id].stats[k]].value, 0) / 40).toFixed(1)).join(' | ');
if (process.argv[3]) ['lead', 'war', 'int', 'pol'].forEach((k) => console.log(D.STATS[k].name, avg(k)));
