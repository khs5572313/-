/* 삼국기 - 로직 검증 (Node 내장 기능만 사용)
 * 실행: node samgukgi/tests/sim.test.js */
'use strict';
const assert = require('assert');
const SGK = require('../js/data.js');
require('../js/battle.js');
require('../js/gacha.js');
require('../js/city.js');
const { simulate, unitStats, teamMods, makeRng } = SGK.Battle;
const City = SGK.City;

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
/* ids 순서: [지휘, 전투, 책략, 병참] */
const army = (ids, lv, extra) => Object.assign({
  roles: { cmd: { id: ids[0], lv, adv: 0 }, atk: { id: ids[1], lv, adv: 0 }, tac: { id: ids[2], lv, adv: 0 }, sup: { id: ids[3], lv, adv: 0 } }
}, extra || {});
const newSave = () => ({
  gold: 1000, food: 3000, reserve: 12000, minsim: 50, chian: 50, month: 0, owned: {},
  posts: { gov: null, guard: null, sage: null, steward: null },
  tech: { weapon: 0, armor: 0, farm: 0, wall: 0 }, research: { target: 'farm', pts: 0 }
});
const own = (save, id, lv) => { save.owned[id] = { lv: lv || 1, exp: 0, adv: 0 }; };

console.log('데이터');
test('장수 27명, 국가별 9명, 능력치 4종과 전법이 모두 존재', () => {
  assert.strictEqual(SGK.GENERAL_IDS.length, 27);
  const per = {};
  SGK.GENERAL_IDS.forEach(id => {
    const g = SGK.GENERALS[id];
    per[g.nation] = (per[g.nation] || 0) + 1;
    SGK.STAT_KEYS.forEach(k => assert.ok(g[k] >= 1 && g[k] <= 100, id + ' ' + k));
    assert.ok(SGK.TACTICS[g.tactic], id + ' 전법 없음');
    assert.ok(SGK.TROOPS[g.troop]);
  });
  assert.deepStrictEqual(per, { gogu: 9, baek: 9, silla: 9 });
});
test('부대 4자리와 성 4관직이 능력치 4종을 하나씩 쓴다', () => {
  assert.deepStrictEqual(SGK.ROLES.map(r => r.stat), ['lead', 'str', 'int', 'pol']);
  assert.deepStrictEqual(SGK.POSTS.map(p => p.stat), ['lead', 'str', 'int', 'pol']);
});
test('전장과 시작 장수는 실제 장수 4명으로 이루어진다', () => {
  SGK.STAGES.forEach(s => {
    assert.strictEqual(new Set(s.team).size, 4, s.name);
    s.team.forEach(id => assert.ok(SGK.GENERALS[id], id));
  });
  Object.values(SGK.NATIONS).forEach(n => { assert.strictEqual(n.starter.length, 4); n.starter.forEach(id => assert.ok(SGK.GENERALS[id], id)); });
});

console.log('부대 능력');
test('자리를 맡은 장수의 해당 능력치가 부대 수치를 좌우한다', () => {
  // 온달(무력 93)을 전투에 두면 전투력이 높고, 병참에 두면 병참력이 낮다
  const good = unitStats(army(['gangisik', 'ondal', 'myeongnim', 'eulpaso'], 1).roles);
  const bad = unitStats(army(['gangisik', 'eulpaso', 'myeongnim', 'ondal'], 1).roles);
  assert.ok(good.atk > bad.atk + 30, `전투력 ${good.atk} vs ${bad.atk}`);
  assert.ok(good.sup > bad.sup + 30, `병참력 ${good.sup} vs ${bad.sup}`);
  assert.strictEqual(good.cmd, bad.cmd);
});
test('병참력이 높으면 시작 사기가 높다', () => {
  const hi = unitStats(army(['gangisik', 'ondal', 'myeongnim', 'eulpaso'], 1).roles);
  const lo = unitStats(army(['gangisik', 'eulpaso', 'myeongnim', 'ondal'], 1).roles);
  assert.ok(hi.morale > lo.morale);
});
test('부대 병종은 대장(지휘)의 병종을 따른다', () => {
  assert.strictEqual(unitStats(army(['ondal', 'gangisik', 'myeongnim', 'eulpaso'], 1).roles).troop, 'cav');
  assert.strictEqual(unitStats(army(['eulpaso', 'gangisik', 'myeongnim', 'ondal'], 1).roles).troop, 'arc');
});
test('진영 효과: 4명 100%, 3명 50%, 2명 이하는 없음', () => {
  assert.strictEqual(teamMods(['ondal', 'jangsu', 'eulji', 'eulpaso']).dmgOut, 1.12);
  assert.strictEqual(teamMods(['ondal', 'jangsu', 'eulji', 'isabu']).dmgOut, 1.06);
  assert.strictEqual(teamMods(['isabu', 'kimyusin', 'gwanchang', 'munmu']).dmgIn, 0.88);
  assert.strictEqual(teamMods(['mu', 'seong', 'gyebaek', 'boksin']).rate, 0.08);
  const none = teamMods(['ondal', 'jangsu', 'mu', 'isabu']);
  assert.ok(none.dmgOut === 1 && none.dmgIn === 1 && none.rate === 0);
});

console.log('전투');
const T1 = ['yangmanchun', 'ondal', 'eulji', 'jangsu'], T2 = ['kimyusin', 'gwanchang', 'isabu', 'kimchunchu'];
test('같은 시드는 같은 결과를 낸다', () => {
  const r1 = simulate(army(T1, 10), army(T2, 10), 777), r2 = simulate(army(T1, 10), army(T2, 10), 777);
  assert.strictEqual(JSON.stringify(r1.events), JSON.stringify(r2.events));
});
test('병력·사기는 범위를 벗어나지 않고, 10턴 안에 끝난다', () => {
  const r = makeRng(99);
  for (let s = 1; s <= 400; s++) {
    const ids = SGK.GENERAL_IDS.slice().sort(() => r() - 0.5);
    const o = simulate(army(ids.slice(0, 4), 20), army(ids.slice(4, 8), 20), s);
    assert.ok(o.turns <= 10);
    assert.ok(['win', 'lose', 'draw'].includes(o.result));
    o.events.forEach(e => ['A', 'B'].forEach(k => {
      assert.ok(e.state[k].t >= 0 && e.state[k].t <= o[k].maxTroops);
      assert.ok(e.state[k].m >= 0 && e.state[k].m <= 100);
    }));
  }
});
test('무력을 전투에 둔 편성이, 같은 장수를 엉뚱한 자리에 둔 편성을 이긴다', () => {
  let w = 0;
  const good = ['gangisik', 'ondal', 'myeongnim', 'eulpaso'], bad = ['eulpaso', 'myeongnim', 'ondal', 'gangisik'];
  for (let s = 1; s <= 300; s++) if (simulate(army(good, 10), army(bad, 10), s).result === 'win') w++;
  assert.ok(w >= 270, '승률 ' + (w / 3).toFixed(0) + '%');
});
test('사기가 0이 되면 병력이 남아 있어도 패주한다', () => {
  let rout = 0;
  for (let s = 1; s <= 400; s++) {
    // 병참에 정치 34인 관창을 둔 부대는 사기가 낮다
    const o = simulate(army(['kimyusin', 'munmu', 'isabu', 'kimchunchu'], 25), army(['gangisik', 'yunchung', 'boksin', 'gwanchang'], 12), s);
    if (o.reason === 'rout') { rout++; assert.ok(o.B.troops > 0); assert.strictEqual(o.result, 'win'); }
  }
  assert.ok(rout > 0, '패주가 한 번도 일어나지 않음');
});
test('병종 상성: 유리한 쪽 승률이 더 높다', () => {
  // 같은 장수 구성에서 대장만 바꿔 병종을 창병(유리)·궁병(불리)으로 만든 뒤 기병 부대와 싸운다
  const foe = ['jisusin', 'yunchung', 'myeongnim', 'eulpaso']; // 대장 지수신 = 기병, 나머지 셋은 양쪽이 같다
  const orig = SGK.GENERALS.boksin.troop;
  let adv = 0, dis = 0;
  for (let s = 1; s <= 400; s++) {
    SGK.GENERALS.boksin.troop = 'spr';
    if (simulate(army(['boksin', 'yunchung', 'myeongnim', 'eulpaso'], 10), army(foe, 10), s).result === 'win') adv++;
    SGK.GENERALS.boksin.troop = 'arc';
    if (simulate(army(['boksin', 'yunchung', 'myeongnim', 'eulpaso'], 10), army(foe, 10), s).result === 'win') dis++;
  }
  SGK.GENERALS.boksin.troop = orig;
  assert.ok(adv > dis + 40, `유리 ${adv} vs 불리 ${dis}`);
});
test('기술(무기·갑주)과 원군이 전투에 반영된다', () => {
  let base = 0, teched = 0;
  for (let s = 1; s <= 300; s++) {
    if (simulate(army(T1, 10), army(T1, 10), s).result === 'win') base++;
    if (simulate(army(T1, 10, { atkBonus: 0.2, defBonus: 0.15, aid: 0.12 }), army(T1, 10), s).result === 'win') teched++;
  }
  assert.ok(teched > base + 60, `기술 ${teched} vs 기본 ${base}`);
  assert.strictEqual(simulate(army(T1, 10, { aid: 0.1 }), army(T1, 10), 1).A.maxTroops, Math.round(SGK.armyCapacity(10) * 1.1));
});

console.log('내정');
test('성주(통솔)가 민심과 징병을 올린다', () => {
  const a = newSave(), b = newSave();
  own(b, 'gwanggaeto'); b.posts.gov = 'gwanggaeto';
  assert.ok(City.outlook(b).minsimTarget > City.outlook(a).minsimTarget);
  assert.ok(City.outlook(b).recruit > City.outlook(a).recruit);
});
test('수비대장(무력)이 치안과 성 방어를 올린다', () => {
  const a = newSave(), b = newSave();
  own(b, 'yeongaesomun'); b.posts.guard = 'yeongaesomun';
  assert.ok(City.outlook(b).chianTarget > City.outlook(a).chianTarget);
  assert.ok(City.outlook(b).wall > City.outlook(a).wall);
});
test('책사(지력)가 외교 원군과 기술 연구를 올린다', () => {
  const a = newSave(), b = newSave();
  own(b, 'eulji'); b.posts.sage = 'eulji';
  assert.strictEqual(City.outlook(a).aid, 0);
  assert.ok(City.outlook(b).aid > 0.1);
  assert.ok(City.outlook(b).research > City.outlook(a).research);
});
test('재정관(정치)이 군량과 금화 생산을 올린다', () => {
  const a = newSave(), b = newSave();
  own(b, 'kimchunchu'); b.posts.steward = 'kimchunchu';
  assert.ok(City.outlook(b).food > City.outlook(a).food * 1.5);
  assert.ok(City.outlook(b).gold > City.outlook(a).gold * 1.5);
});
test('한 달이 지나면 자원이 쌓이고, 민심·치안이 목표치로 다가간다', () => {
  const s = newSave(); own(s, 'gwanggaeto'); s.posts.gov = 'gwanggaeto';
  const o = City.outlook(s), rep = City.advanceMonth(s);
  assert.strictEqual(s.month, 1);
  assert.strictEqual(s.food, 3000 + o.food);
  assert.strictEqual(s.gold, 1000 + o.gold);
  assert.strictEqual(s.reserve, 12000 + rep.recruit);
  assert.ok(s.minsim > 50 && s.minsim < o.minsimTarget);
  for (let i = 0; i < 30; i++) City.advanceMonth(s);
  assert.ok(Math.abs(s.minsim - City.outlook(s).minsimTarget) <= 6);
});
test('연구 점수가 차면 기술 레벨이 오른다', () => {
  const s = newSave(); own(s, 'eulji'); s.posts.sage = 'eulji'; s.research.target = 'weapon';
  let up = null;
  for (let i = 0; i < 5 && !up; i++) up = City.advanceMonth(s).techUp;
  assert.deepStrictEqual(up, { key: 'weapon', lv: 1 });
  assert.strictEqual(s.tech.weapon, 1);
});
test('6개월마다 습격: 성 방어가 낮으면 물자를 잃고, 높으면 막아낸다', () => {
  const weak = newSave(), strong = newSave();
  own(strong, 'yeongaesomun'); strong.posts.guard = 'yeongaesomun';
  let rw = null, rs = null;
  for (let i = 0; i < 6; i++) { rw = City.advanceMonth(weak).raid; rs = City.advanceMonth(strong).raid; }
  assert.ok(rw && !rw.repelled && rw.lostGold > 0 && rw.lostFood > 0);
  assert.ok(rs && rs.repelled && rs.lostGold === 0);
});
test('예비 병력은 상한을 넘지 않는다', () => {
  const s = newSave(); s.reserve = City.RESERVE_CAP - 10;
  City.advanceMonth(s);
  assert.strictEqual(s.reserve, City.RESERVE_CAP);
});

console.log('뽑기');
test('확률이 고지한 값에 수렴한다 (20만 회)', () => {
  const rand = makeRng(20261123), cnt = { 3: 0, 4: 0, 5: 0 }, N = 200000;
  for (let i = 0; i < N; i++) cnt[SGK.GENERALS[SGK.Gacha.roll({ pity: 0 }, 1, rand)[0]].star]++;
  assert.ok(Math.abs(cnt[5] / N - 0.03) < 0.003, '5성 ' + cnt[5] / N);
  assert.ok(Math.abs(cnt[4] / N - 0.17) < 0.006, '4성 ' + cnt[4] / N);
});
test('천장: 50회 안에 5성이 반드시 나온다', () => {
  const st = { pity: 0 };
  const got = SGK.Gacha.roll(st, 50, () => 0.99);
  assert.strictEqual(SGK.GENERALS[got[49]].star, 5);
  assert.strictEqual(got.slice(0, 49).filter(id => SGK.GENERALS[id].star === 5).length, 0);
});
test('10연속은 4성 이상을 1명 보장하고, 중복은 돌파·환급된다', () => {
  assert.ok(SGK.Gacha.roll({ pity: 0 }, 10, () => 0.99).some(id => SGK.GENERALS[id].star >= 4));
  const save = { gold: 0, owned: {} };
  assert.strictEqual(SGK.Gacha.grant(save, 'ondal').kind, 'new');
  for (let i = 1; i <= 5; i++) assert.strictEqual(SGK.Gacha.grant(save, 'ondal').adv, i);
  assert.strictEqual(SGK.Gacha.grant(save, 'ondal').kind, 'refund');
  assert.strictEqual(save.gold, 60);
});

console.log('\n밸런스 참고치');
(function () {
  const r = makeRng(5); let turns = 0, draw = 0, rout = 0, wipe = 0; const N = 3000;
  for (let s = 1; s <= N; s++) {
    const p = SGK.GENERAL_IDS.slice().sort(() => r() - 0.5);
    const o = simulate(army(p.slice(0, 4), 20), army(p.slice(4, 8), 20), s);
    turns += o.turns; if (o.result === 'draw') draw++; if (o.reason === 'rout') rout++; if (o.reason === 'wipe') wipe++;
  }
  console.log(`  무작위 편성 ${N}판: 평균 ${(turns / N).toFixed(2)}턴 · 전멸 ${(wipe / N * 100).toFixed(1)}% · 패주 ${(rout / N * 100).toFixed(1)}% · 시간 판정 ${((N - wipe - rout) / N * 100).toFixed(1)}% · 무승부 ${(draw / N * 100).toFixed(1)}%`);
})();
console.log('  시작 장수 4명(최적 자리)으로 각 전장 권장 레벨+1에서 200판 승률');
Object.keys(SGK.NATIONS).forEach(n => {
  const ids = SGK.NATIONS[n].starter.slice();
  // 자리마다 가장 높은 능력치를 가진 장수를 탐욕적으로 배치
  const pick = [], left = ids.slice();
  SGK.ROLES.forEach(role => { left.sort((a, b) => SGK.GENERALS[b][role.stat] - SGK.GENERALS[a][role.stat]); pick.push(left.shift()); });
  const row = SGK.STAGES.map((st, i) => {
    let w = 0;
    for (let s = 1; s <= 200; s++) if (simulate(army(pick, st.lv + 1), army(st.team, st.lv), s * 7 + i).result === 'win') w++;
    return String(Math.round(w / 2)).padStart(3);
  });
  console.log('  ' + SGK.NATIONS[n].name.padEnd(4) + row.join(' '));
});

console.log('\n' + passed + '개 통과');
