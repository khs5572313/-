// 카드 속성별 승률: 덱에 들어 있던 쪽이 이긴 비율.  node tools/cardstats.js [판수]
const D = require('../js/data.js'), E = require('../js/engine.js');
const ns = Object.keys(D.NATIONS); let seed = 777; const n = +process.argv[2] || 20000;
const agg = {}; const add = (k, w) => { (agg[k] = agg[k] || { w: 0, g: 0 }); agg[k].g++; agg[k].w += w; };
for (let i = 0; i < n; i++) {
  const st = E.autoPlay({ sides: [{ nation: ns[i % 7] }, { nation: ns[(i + 1 + (i % 6)) % 7] }], seed: (seed += 7919) });
  if (st.winner < 0) continue;
  st.sides.forEach((s, si) => [...s.deck, ...s.hand, ...s.field.filter(Boolean), ...s.grave].forEach((c) => {
    const g = D.GENERALS[c.gid], w = st.winner === si ? 1 : 0, st4 = g.stats.lead + g.stats.war + g.stats.int + g.stats.pol;
    add('병종 ' + D.UNITS[g.unit].name, w); add('구분 ' + (g.cls === 'm' ? '무인' : '문인'), w); add('능력치 ' + st4, w); add('계략 ' + D.ARCH[g.skill.arch].label, w);
    add('구분×병종 ' + (g.cls === 'm' ? '무인' : '문인') + ' ' + D.UNITS[g.unit].name, w);
  }));
}
Object.keys(agg).sort().forEach((k) => console.log(k.padEnd(22), (100 * agg[k].w / agg[k].g).toFixed(1) + '%', agg[k].g));
