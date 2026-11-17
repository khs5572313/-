// 전장 규모 실험: node tools/lanes.js [길 수] [판수]
const D = require('../js/data.js'), E = require('../js/engine.js');
const L = +process.argv[2] || 3, n = +process.argv[3] || 1500, ns = Object.keys(D.NATIONS); let seed = 2024;
const run = (kA, kB, dumb) => { let w = 0, t = 0, acts = 0, initW = 0, g = 0;
  for (let i = 0; i < n; i++) { const f = i % 2, A = { nation: ns[i % 7], kind: kA }, B = { nation: ns[(i + 1 + i % 6) % 7], kind: kB };
    const st = E.autoPlay({ sides: f ? [B, A] : [A, B], lanes: L, seed: (seed += 7919), dumb: dumb ? (f ? 0 : 1) : undefined });
    t += st.turn; if (st.winner < 0) { w += .5; continue; } g++; if (st.winner === st.init) initW++; if ((f ? 1 - st.winner : st.winner) === 0) w++; }
  return { win: (100 * w / n).toFixed(1), turns: (t / n).toFixed(1), init: (100 * initW / g).toFixed(1) }; };
const base = run('mix', 'mix'), skill = run('mix', 'mix', true), cm = run('c', 'm'), mono = ['cav', 'spr', 'arc'].map((k) => run(k, 'mix').win);
console.log(`${L}대${L} | 덱 ${E.sizeRules(L).deckSize} | 평균 ${base.turns}턴 | 선공 승률 ${base.init}% | 상성 읽는 AI vs 무작위 배치 ${skill.win}% | 문vs무 ${cm.win}% | 편중덱(기/창/궁) vs 혼합 ${mono.join('/')}%`);
