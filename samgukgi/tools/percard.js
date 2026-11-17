// 인물별 승률(덱에 들어 있던 판 기준).  node tools/percard.js [진영] [판수] [길 수]
const D = require('../js/data.js'), E = require('../js/engine.js');
const ns = Object.keys(D.NATIONS); let seed = 4242; const nat = process.argv[2] || 'sui', n = +process.argv[3] || 6000, L = +process.argv[4] || 3;
const agg = {};
for (let i = 0; i < n; i++) {
  const flip = i % 2, other = ns.filter((x) => x !== nat)[i % 6];
  const st = E.autoPlay({ sides: flip ? [{ nation: other }, { nation: nat }] : [{ nation: nat }, { nation: other }], lanes: L, seed: (seed += 7919) });
  if (st.winner < 0) continue;
  const si = flip ? 1 : 0, s = st.sides[si];
  [...s.deck, ...s.hand, ...s.field.filter(Boolean), ...s.grave].forEach((c) => { (agg[c.gid] = agg[c.gid] || { w: 0, g: 0 }); agg[c.gid].g++; if (st.winner === si) agg[c.gid].w++; });
}
Object.keys(agg).sort((a, b) => agg[b].w / agg[b].g - agg[a].w / agg[a].g).forEach((id) => { const g = D.GENERALS[id];
  console.log((100 * agg[id].w / agg[id].g).toFixed(1).padStart(5) + '%', g.cls, g.unit, g.stats.lead + g.stats.war + g.stats.int + g.stats.pol, D.ARCH[g.skill.arch].label, g.name); });
