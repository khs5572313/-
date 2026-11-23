/* 삼국기 - 무장 뽑기(등용)
 * 확률: 5성 3% / 4성 17% / 3성 80%
 * 천장: 5성이 50회 연속 나오지 않으면 다음 1회는 5성 확정
 * 10연속: 4성 이상 1명 보장 */
(function (root) {
  'use strict';
  var SGK = root.SGK;

  var RATES = { 5: 0.03, 4: 0.17, 3: 0.80 };
  var PITY = 50;
  var COST_ONE = 100;
  var COST_TEN = 1000;
  var REFUND = { 3: 20, 4: 60, 5: 300 }; /* 돌파가 최대인 무장이 또 나오면 금화로 환급 */

  function poolOf(star) {
    return SGK.GENERAL_IDS.filter(function (id) { return SGK.GENERALS[id].star === star; });
  }

  /* state: {pity}, rand: 0~1 난수 함수. minStar 를 주면 그 등급 이상만 나온다. */
  function rollOne(state, rand, minStar) {
    var star;
    if (state.pity >= PITY - 1) star = 5;
    else {
      var r = rand();
      star = r < RATES[5] ? 5 : r < RATES[5] + RATES[4] ? 4 : 3;
      if (minStar && star < minStar) star = minStar;
    }
    state.pity = star === 5 ? 0 : state.pity + 1;
    var pool = poolOf(star);
    return pool[Math.floor(rand() * pool.length)];
  }

  function roll(state, count, rand) {
    var out = [], hasHigh = false;
    for (var i = 0; i < count; i++) {
      var need = count >= 10 && i === count - 1 && !hasHigh ? 4 : 0;
      var id = rollOne(state, rand, need);
      if (SGK.GENERALS[id].star >= 4) hasHigh = true;
      out.push(id);
    }
    return out;
  }

  /* 뽑은 무장을 보유 목록에 반영하고, 결과(신규/돌파/환급)를 돌려준다. */
  function grant(save, id) {
    var g = SGK.GENERALS[id];
    var own = save.owned[id];
    if (!own) { save.owned[id] = { lv: 1, exp: 0, adv: 0 }; return { id: id, kind: 'new' }; }
    if (own.adv < SGK.MAX_ADV) { own.adv += 1; return { id: id, kind: 'adv', adv: own.adv }; }
    save.gold += REFUND[g.star];
    return { id: id, kind: 'refund', gold: REFUND[g.star] };
  }

  SGK.Gacha = { RATES: RATES, PITY: PITY, COST_ONE: COST_ONE, COST_TEN: COST_TEN, REFUND: REFUND, roll: roll, grant: grant };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK.Gacha; }
