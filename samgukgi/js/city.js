/* 삼국기 - 내정 (성 운영)
 * 성에는 관직 4개가 있고, 관직마다 장수의 능력치 하나를 쓴다.
 *   성주(통솔) → 민심 · 징병        수비대장(무력) → 치안 · 성 방어
 *   책사(지력) → 외교 · 기술        재정관(정치) → 농업 · 상업
 * 화면과 분리된 순수 로직이다. */
(function (root) {
  'use strict';
  var SGK = root.SGK;
  var RESERVE_CAP = 40000;
  var RAID_EVERY = 6;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* 관직을 맡은 장수의 해당 능력치. 비어 있으면 기본값. */
  function postStat(save, key) {
    var post = SGK.POSTS.filter(function (p) { return p.key === key; })[0];
    var id = save.posts[key];
    if (!id || !save.owned[id]) return SGK.EMPTY_STAT;
    var o = save.owned[id];
    return SGK.calcStats(id, o.lv, o.adv)[post.stat];
  }

  function raidPower(month) { return 1200 + month * 70; }
  function nextRaidMonth(month) { return (Math.floor(month / RAID_EVERY) + 1) * RAID_EVERY; }

  /* 지금 관직 배치로 한 달에 얻는 것들. 저장 데이터를 바꾸지 않는다. */
  function outlook(save) {
    var lead = postStat(save, 'gov'), str = postStat(save, 'guard'), int = postStat(save, 'sage'), pol = postStat(save, 'steward');
    var tech = save.tech;
    var minsimTarget = Math.round(clamp(30 + lead * 0.6, 0, 100));
    var chianTarget = Math.round(clamp(30 + str * 0.6, 0, 100));
    var loss = (100 - save.chian) * 0.004;                       /* 치안이 낮으면 도적에게 생산을 잃는다 */
    var prod = (0.6 + 0.6 * save.minsim / 100) * (1 - loss) * (1 + 0.1 * tech.farm);
    return {
      stats: { lead: lead, str: str, int: int, pol: pol },
      minsimTarget: minsimTarget,
      recruit: Math.round((400 + lead * 8) * (0.5 + save.minsim / 100)),
      chianTarget: chianTarget,
      lossPct: Math.round(loss * 100),
      wall: Math.round((500 + str * 30) * (1 + 0.25 * tech.wall)),
      aid: Math.round(clamp((int - 30) * 0.2, 0, 15)) / 100,      /* 외교: 출전 때 원군 비율 */
      research: Math.round(5 + int * 0.4),
      food: Math.round((150 + pol * 5) * prod),
      gold: Math.round((20 + pol * 0.8) * prod),
      nextRaid: nextRaidMonth(save.month),
      nextRaidPower: raidPower(nextRaidMonth(save.month))
    };
  }

  /* 한 달을 보낸다. 저장 데이터를 바꾸고, 그달의 보고서를 돌려준다. */
  function advanceMonth(save) {
    var o = outlook(save);
    var rep = { month: save.month + 1, food: o.food, gold: o.gold, recruit: 0, research: o.research, techUp: null, raid: null, exp: [] };

    save.month += 1;
    save.food += o.food;
    save.gold += o.gold;
    var before = save.reserve;
    save.reserve = Math.min(RESERVE_CAP, save.reserve + o.recruit);
    rep.recruit = save.reserve - before;

    /* 민심과 치안은 목표치를 향해 매달 1/3씩 움직인다 */
    save.minsim = Math.round(save.minsim + (o.minsimTarget - save.minsim) / 3);
    save.chian = Math.round(save.chian + (o.chianTarget - save.chian) / 3);

    /* 기술 연구 */
    var key = save.research.target;
    if (key && save.tech[key] < SGK.TECH_MAX) {
      save.research.pts += o.research;
      var need = SGK.techCost(save.tech[key]);
      if (save.research.pts >= need) {
        save.research.pts -= need;
        save.tech[key] += 1;
        rep.techUp = { key: key, lv: save.tech[key] };
        if (save.tech[key] >= SGK.TECH_MAX) save.research.pts = 0;
      }
    } else { rep.research = 0; }

    /* 관직을 맡은 장수는 매달 경험치를 조금 얻는다 */
    SGK.POST_KEYS.forEach(function (k) {
      var id = save.posts[k], ow = id && save.owned[id];
      if (!ow || ow.lv >= SGK.MAX_LV) return;
      ow.exp += 15;
      while (ow.lv < SGK.MAX_LV && ow.exp >= SGK.expNeed(ow.lv)) { ow.exp -= SGK.expNeed(ow.lv); ow.lv += 1; rep.exp.push(id); }
    });

    /* 6개월마다 적이 성을 습격한다. 성 방어가 습격 전력보다 낮으면 물자를 잃는다. */
    if (save.month % RAID_EVERY === 0) {
      var power = raidPower(save.month), wall = outlook(save).wall;
      var raid = { power: power, wall: wall, repelled: wall >= power, lostGold: 0, lostFood: 0 };
      if (raid.repelled) { save.minsim = clamp(save.minsim + 5, 0, 100); }
      else {
        raid.lostGold = Math.round(save.gold * 0.15); raid.lostFood = Math.round(save.food * 0.15);
        save.gold -= raid.lostGold; save.food -= raid.lostFood;
        save.minsim = clamp(save.minsim - 8, 0, 100);
      }
      rep.raid = raid;
    }
    return rep;
  }

  SGK.City = { outlook: outlook, advanceMonth: advanceMonth, postStat: postStat, raidPower: raidPower, RESERVE_CAP: RESERVE_CAP, RAID_EVERY: RAID_EVERY };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK.City; }
