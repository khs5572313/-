/* 삼국기 - 로직 검증 (Node 내장 기능만 사용)
 * 실행: node samgukgi/tests/sim.test.js */
'use strict';
const assert = require('assert');
const SGK = require('../js/data.js');
require('../js/battle.js');
require('../js/gacha.js');
const { simulate, teamMods, makeRng } = SGK.Battle;

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
const team = (ids, lv, equip) => ids.map(id => ({ id, lv, adv: 0, equip: (equip || {})[id] }));

console.log('데이터');
test('무장 27명, 국가별 9명, 고유 전법이 모두 존재', () => {
  assert.strictEqual(SGK.GENERAL_IDS.length, 27);
  const per = {};
  SGK.GENERAL_IDS.forEach(id => {
    const g = SGK.GENERALS[id];
    per[g.nation] = (per[g.nation] || 0) + 1;
    assert.ok(SGK.TACTICS[g.tactic], id + ' 전법 없음');
    assert.ok(!SGK.TACTICS[g.tactic].common, id + ' 고유 전법이 공용으로 표시됨');
    assert.ok(SGK.TROOPS[g.troop]);
  });
  assert.deepStrictEqual(per, { gogu: 9, baek: 9, silla: 9 });
});
test('스테이지와 시작 무장이 실제 무장을 가리킨다', () => {
  SGK.STAGES.forEach(s => {
    assert.strictEqual(s.team.length, 3);
    s.team.forEach(id => assert.ok(SGK.GENERALS[id], id));
    Object.keys(s.equip).forEach(id => { assert.ok(s.team.includes(id)); assert.ok(SGK.TACTICS[s.equip[id]].common); });
  });
  Object.values(SGK.NATIONS).forEach(n => n.starter.forEach(id => assert.ok(SGK.GENERALS[id], id)));
});

console.log('전투');
test('같은 시드는 같은 결과를 낸다', () => {
  const a = team(['ondal', 'jangsu', 'eulji'], 10), b = team(['gwanchang', 'isabu', 'kimyusin'], 10);
  const r1 = simulate(a, b, 777), r2 = simulate(a, b, 777);
  assert.strictEqual(JSON.stringify(r1.events), JSON.stringify(r2.events));
});
test('병력은 0과 최대치 사이를 벗어나지 않고, 전투는 8턴 안에 끝난다', () => {
  for (let s = 1; s <= 300; s++) {
    const ids = SGK.GENERAL_IDS.slice().sort(() => makeRng(s * 31)() - 0.5);
    const r = simulate(team(ids.slice(0, 3), 20), team(ids.slice(3, 6), 20), s);
    assert.ok(r.rounds <= 8);
    assert.ok(['win', 'lose', 'draw'].includes(r.result));
    r.units.forEach(u => assert.ok(u.troops >= 0 && u.troops <= u.maxTroops));
    r.events.forEach(e => Object.values(e.state).forEach(x => assert.ok(x.t >= 0)));
  }
});
test('대장(본영)이 쓰러지면 즉시 승패가 갈린다', () => {
  let seen = 0;
  for (let s = 1; s <= 200 && seen < 20; s++) {
    const r = simulate(team(['gwanggaeto', 'yeongaesomun', 'eulji'], 30), team(['gangisik', 'myeongnim', 'eulpaso'], 5), s);
    if (r.byLeaderKill) { seen++; assert.strictEqual(r.units[5].alive, false); assert.strictEqual(r.result, 'win'); }
  }
  assert.ok(seen > 0);
});
test('병종 상성: 유리한 쪽 승률이 더 높다', () => {
  // 같은 무장의 병종만 창병(유리)·궁병(불리)으로 바꿔 기병 부대와 싸운 승수를 비교한다.
  const orig = SGK.GENERALS.gangisik.troop;
  let adv = 0, dis = 0;
  for (let s = 1; s <= 400; s++) {
    SGK.GENERALS.gangisik.troop = 'spr';
    if (simulate(team(['gangisik', 'gangisik', 'gangisik'], 10), team(['jisusin', 'jisusin', 'jisusin'], 10), s).result === 'win') adv++;
    SGK.GENERALS.gangisik.troop = 'arc';
    if (simulate(team(['gangisik', 'gangisik', 'gangisik'], 10), team(['jisusin', 'jisusin', 'jisusin'], 10), s).result === 'win') dis++;
  }
  SGK.GENERALS.gangisik.troop = orig;
  assert.ok(adv > dis + 40, `유리 ${adv} vs 불리 ${dis}`);
});
test('진영 효과: 3명 100%, 2명 50%, 제각각이면 없음', () => {
  assert.strictEqual(teamMods(['ondal', 'jangsu', 'eulji']).dmgOut, 1.12);
  assert.strictEqual(teamMods(['ondal', 'jangsu', 'isabu']).dmgOut, 1.06);
  assert.strictEqual(teamMods(['isabu', 'kimyusin', 'gwanchang']).dmgIn, 0.88);
  assert.strictEqual(teamMods(['mu', 'seong', 'gyebaek']).rate, 0.08);
  const none = teamMods(['ondal', 'mu', 'isabu']);
  assert.ok(none.dmgOut === 1 && none.dmgIn === 1 && none.rate === 0);
});
test('레벨이 높으면 이긴다 (같은 편성, 레벨 30 vs 10)', () => {
  let w = 0;
  for (let s = 1; s <= 200; s++) if (simulate(team(['ondal', 'jangsu', 'eulji'], 30), team(['ondal', 'jangsu', 'eulji'], 10), s).result === 'win') w++;
  assert.ok(w >= 190, '승률 ' + w / 2 + '%');
});

console.log('뽑기');
test('확률이 고지한 값에 수렴한다 (20만 회)', () => {
  const rand = makeRng(20261123), st = { pity: 0 }, cnt = { 3: 0, 4: 0, 5: 0 };
  const N = 200000;
  SGK.Gacha.roll(st, 9, rand); // 10연 보장을 타지 않도록 9회씩
  for (let i = 0; i < N; i++) cnt[SGK.GENERALS[SGK.Gacha.roll({ pity: 0 }, 1, rand)[0]].star]++;
  assert.ok(Math.abs(cnt[5] / N - 0.03) < 0.003, '5성 ' + cnt[5] / N);
  assert.ok(Math.abs(cnt[4] / N - 0.17) < 0.006, '4성 ' + cnt[4] / N);
});
test('천장: 50회 안에 5성이 반드시 나온다', () => {
  const never5 = () => 0.99; // 항상 3성이 나오는 난수
  const st = { pity: 0 };
  const got = SGK.Gacha.roll(st, 50, never5);
  assert.strictEqual(SGK.GENERALS[got[49]].star, 5);
  assert.strictEqual(got.slice(0, 49).filter(id => SGK.GENERALS[id].star === 5).length, 0);
  assert.strictEqual(st.pity, 0);
});
test('10연속은 4성 이상을 1명 보장한다', () => {
  const got = SGK.Gacha.roll({ pity: 0 }, 10, () => 0.99);
  assert.ok(got.some(id => SGK.GENERALS[id].star >= 4));
});
test('중복 무장은 돌파, 돌파 최대면 금화 환급', () => {
  const save = { gold: 0, owned: {} };
  assert.strictEqual(SGK.Gacha.grant(save, 'ondal').kind, 'new');
  for (let i = 1; i <= 5; i++) assert.strictEqual(SGK.Gacha.grant(save, 'ondal').adv, i);
  assert.strictEqual(SGK.Gacha.grant(save, 'ondal').kind, 'refund');
  assert.strictEqual(save.gold, 60);
});

console.log('\n밸런스 참고치 (시작 편성으로 각 스테이지 권장 레벨에서 200판)');
Object.keys(SGK.NATIONS).forEach(n => {
  const ids = SGK.NATIONS[n].starter;
  const order = [ids[1], ids[2], ids[0]]; // 4성을 본영에
  const row = SGK.STAGES.map((st, i) => {
    let w = 0;
    for (let s = 1; s <= 200; s++) if (simulate(team(order, st.lv + 1), team(st.team, st.lv, st.equip), s * 7 + i).result === 'win') w++;
    return String(Math.round(w / 2)).padStart(3);
  });
  console.log('  ' + SGK.NATIONS[n].name.padEnd(4) + row.join(' '));
});

console.log('\n' + passed + '개 통과');
