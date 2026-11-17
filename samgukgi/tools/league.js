// 진영을 섞은 무작위 덱으로 싸워 카드 속성의 '순수' 승률을 잰다(진영 효과 제거).  node tools/league.js [판수] [길 수]
const D = require('../js/data.js'), E = require('../js/engine.js');
const n = +process.argv[2] || 20000, L = +process.argv[3] || 3, size = E.sizeRules(L).deckSize;
const all = Object.values(D.GENERALS), M = all.filter((g) => g.cls === 'm'), C = all.filter((g) => g.cls === 'c');
let s = 123456789; const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
const pick = (arr, k) => { const a = arr.slice(), o = []; while (o.length < k) o.push(a.splice(Math.floor(rnd() * a.length), 1)[0].id); return o; };
const deck = () => pick(M, Math.floor(size / 2)).concat(pick(C, Math.ceil(size / 2)));
const agg = {}, card = {}; const add = (o, k, w) => { (o[k] = o[k] || { w: 0, g: 0 }); o[k].g++; o[k].w += w; };
for (let i = 0; i < n; i++) {
  const st = E.autoPlay({ sides: [{ nation: 'goguryeo', deck: deck() }, { nation: 'baekje', deck: deck() }], lanes: L, seed: i * 7919 + 1 });
  if (st.winner < 0) continue;
  st.sides.forEach((sd, si) => [...sd.deck, ...sd.hand, ...sd.field.filter(Boolean), ...sd.grave].forEach((c) => { const g = D.GENERALS[c.gid], w = st.winner === si ? 1 : 0;
    add(card, g.id, w); add(agg, '병종 ' + D.UNITS[g.unit].name, w); add(agg, '배분 ' + g.stats.lead + g.stats.war + g.stats.int + g.stats.pol, w);
    add(agg, '계략 ' + D.ARCH[g.skill.arch].label, w); add(agg, '구분 ' + (g.cls === 'm' ? '무' : '문') + D.UNITS[g.unit].name, w); }));
}
const r = (o, k) => 100 * o[k].w / o[k].g;
for (const p of ['병종', '구분', '배분', '계략']) console.log(p + '  ' + Object.keys(agg).filter((k) => k.startsWith(p)).sort((a, b) => r(agg, b) - r(agg, a)).map((k) => k.slice(3) + ' ' + r(agg, k).toFixed(1)).join(' | '));
console.log('진영 평균 카드 가치  ' + Object.keys(D.ROSTER).map((x) => D.NATIONS[x].name + ' ' + (D.ROSTER[x].reduce((a, id) => a + r(card, id), 0) / 40).toFixed(2)).join(' | '));
console.log('  무인만  ' + Object.keys(D.ROSTER).map((x) => { const ids = D.ROSTER[x].filter((id) => D.GENERALS[id].cls === 'm'); return D.NATIONS[x].name + ' ' + (ids.reduce((a, id) => a + r(card, id), 0) / 20).toFixed(2); }).join(' | '));
