/* 삼국기 - 자동 전투 엔진 (부대 대 부대)
 * 한 부대는 장수 4명이 지휘·전투·책략·병참을 하나씩 맡는다.
 *   지휘(통솔) → 방어   전투(무력) → 공격   책략(지력) → 전법   병참(정치) → 사기
 * 화면과 분리된 순수 로직이며, 같은 시드(seed)를 넣으면 항상 같은 결과가 나온다. */
(function (root) {
  'use strict';
  var SGK = root.SGK;
  var MAX_TURNS = 10;
  var DMG_K = 0.095;
  var HOLDER_W = 0.7; /* 자리를 맡은 장수의 능력치 70% + 네 장수 평균 30% */

  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* 같은 나라 장수 수에 따른 진영 효과. 4명이면 100%, 3명이면 50%. */
  function teamMods(ids) {
    var cnt = {};
    ids.forEach(function (id) { if (id) { var n = SGK.GENERALS[id].nation; cnt[n] = (cnt[n] || 0) + 1; } });
    var best = null, c = 0;
    Object.keys(cnt).forEach(function (n) { if (cnt[n] > c) { c = cnt[n]; best = n; } });
    var f = c >= 4 ? 1 : c === 3 ? 0.5 : 0;
    var m = { dmgOut: 1, dmgIn: 1, rate: 0, nation: f > 0 ? best : null, count: c, factor: f };
    if (f > 0) {
      if (best === 'gogu') m.dmgOut = 1 + 0.12 * f;
      if (best === 'baek') m.rate = 0.08 * f;
      if (best === 'silla') m.dmgIn = 1 - 0.12 * f;
    }
    return m;
  }

  /* 부대 능력 계산. roles: {cmd, atk, tac, sup} 각 {id, lv, adv} 또는 null.
   * 반환: {cmd 지휘력, atk 전투력, tac 책략력, sup 병참력, avgLv, capacity, troop, morale(시작 사기)} */
  function unitStats(roles) {
    var gens = SGK.ROLES.map(function (r) {
      var s = roles[r.key];
      return s && s.id ? { spec: s, st: SGK.calcStats(s.id, s.lv, s.adv) } : null;
    });
    var filled = gens.filter(Boolean);
    var out = {}, lvSum = 0;
    filled.forEach(function (g) { lvSum += g.spec.lv || 1; });
    SGK.ROLES.forEach(function (r, i) {
      var sum = 0;
      gens.forEach(function (g) { sum += g ? g.st[r.stat] : SGK.EMPTY_STAT; });
      var holder = gens[i] ? gens[i].st[r.stat] : SGK.EMPTY_STAT;
      out[r.key] = Math.round(holder * HOLDER_W + (sum / 4) * (1 - HOLDER_W));
    });
    out.avgLv = filled.length ? lvSum / filled.length : 1;
    out.capacity = SGK.armyCapacity(out.avgLv);
    out.troop = gens[0] ? SGK.GENERALS[gens[0].spec.id].troop : 'spr';
    out.morale = Math.round(clamp(55 + out.sup * 0.4, 40, 100));
    return out;
  }

  function buildArmy(spec, side) {
    var U = unitStats(spec.roles);
    var ids = SGK.ROLE_KEYS.map(function (k) { return spec.roles[k] ? spec.roles[k].id : null; });
    var max = Math.round(U.capacity * (1 + (spec.aid || 0)));
    var tactics = [];
    SGK.ROLE_KEYS.forEach(function (k) {
      var s = spec.roles[k]; if (!s || !s.id) return;
      var g = SGK.GENERALS[s.id];
      tactics.push({ t: SGK.TACTICS[g.tactic], gen: g.name, role: k });
    });
    var troops = Math.min(max, spec.troops ? spec.troops : max);
    return {
      side: side, U: U, ids: ids, troop: U.troop, maxTroops: max, startTroops: troops, troops: troops,
      morale: U.morale, mods: teamMods(ids), tactics: tactics, buffs: [], status: {}, burn: 0, alive: true,
      atkBonus: spec.atkBonus || 0, defBonus: spec.defBonus || 0,
      lastStand: tactics.some(function (x) { return x.t.special === 'lastStand'; }),
      label: side === 'A' ? '아군' : '적군'
    };
  }

  function buffSum(u, stat) {
    var s = 0;
    for (var i = 0; i < u.buffs.length; i++) if (u.buffs[i].stat === stat) s += u.buffs[i].val;
    return s;
  }
  function counterMult(a, d) {
    if (SGK.TROOPS[a.troop].beats === d.troop) return SGK.COUNTER_ADV;
    if (SGK.TROOPS[d.troop].beats === a.troop) return SGK.COUNTER_DIS;
    return 1;
  }

  /* 전투 한 판을 끝까지 계산한다.
   * specA, specB: {roles:{cmd,atk,tac,sup}, troops?, aid?, atkBonus?, defBonus?}
   * 반환: {result:'win'|'lose'|'draw', reason, turns, events, A, B} (A 기준) */
  function simulate(specA, specB, seed) {
    var rng = makeRng(seed || 1);
    var A = buildArmy(specA, 'A'), Bm = buildArmy(specB, 'B');
    var S = { turn: 0, events: [], over: false, winner: null, reason: '' };

    function snapOne(u) {
      var st = [];
      if (u.status.confuse) st.push('혼란');
      if (u.status.silence) st.push('봉쇄');
      if (u.status.burn) st.push('화상');
      return { t: u.troops, m: Math.round(u.morale), s: st };
    }
    function log(type, text, extra) {
      var e = { type: type, turn: S.turn, text: text, state: { A: snapOne(A), B: snapOne(Bm) } };
      if (extra) for (var k in extra) e[k] = extra[k];
      S.events.push(e);
    }
    function foe(u) { return u === A ? Bm : A; }

    function checkEnd(u) {
      if (S.over) return;
      if (u.troops <= 0) { u.alive = false; S.over = true; S.winner = foe(u).side; S.reason = 'wipe'; log('dead', u.label + ' 부대가 전멸했다.', { side: u.side }); }
      else if (u.morale <= 0) { u.alive = false; S.over = true; S.winner = foe(u).side; S.reason = 'rout'; log('dead', u.label + ' 부대의 사기가 무너져 패주했다.', { side: u.side, rout: true }); }
    }

    function changeMorale(u, val, quiet) {
      if (val < 0 && u.lastStand && u.troops / u.maxTroops <= 0.5) val *= 0.5;
      var before = u.morale;
      u.morale = clamp(u.morale + val, 0, 100);
      var diff = Math.round(u.morale - before);
      if (!quiet && diff !== 0) log('morale', u.label + ' 사기 ' + (diff > 0 ? '+' : '') + diff, { side: u.side, value: diff });
      checkEnd(u);
    }

    function hurt(target, amount, text, extra) {
      amount = Math.min(target.troops, Math.max(1, Math.round(amount)));
      target.troops -= amount;
      /* 피해를 입으면 사기가 깎인다. 병참력이 높을수록 덜 깎인다. */
      var resist = clamp(1.25 - target.U.sup / 200, 0.6, 1.1);
      var mLoss = (amount / target.maxTroops) * 110 * resist;
      if (target.lastStand && target.troops / target.maxTroops <= 0.5) mLoss *= 0.5;
      target.morale = clamp(target.morale - mLoss, 0, 100);
      var ex = { side: foe(target).side, target: target.side, value: amount };
      if (extra) for (var k in extra) ex[k] = extra[k];
      log('dmg', text.replace('{v}', amount), ex);
      checkEnd(target);
    }

    function calcDamage(a, d, stat, coef) {
      var ratio = stat === 'str'
        ? a.U.atk / d.U.cmd
        : a.U.tac / (d.U.tac * 0.6 + d.U.cmd * 0.4);
      ratio = clamp(Math.pow(ratio, 0.9), 0.4, 2.5);
      var troopF = a.maxTroops * (0.4 + 0.6 * a.troops / a.maxTroops);
      var dmg = coef * DMG_K * troopF * ratio * counterMult(a, d);
      dmg *= 0.6 + 0.4 * a.morale / 100;
      dmg *= clamp(1 + buffSum(a, 'atk'), 0.3, 3);
      dmg *= clamp(1 - buffSum(d, 'def'), 0.3, 2);
      dmg *= a.mods.dmgOut * d.mods.dmgIn * (1 + a.atkBonus) * (1 - d.defBonus);
      if (a.lastStand && a.troops / a.maxTroops <= 0.5) dmg *= 1.35;
      return dmg * (0.94 + rng() * 0.12);
    }

    function addBuff(u, stat, val, dur, src) {
      for (var i = 0; i < u.buffs.length; i++) {
        if (u.buffs[i].src === src && u.buffs[i].stat === stat) { u.buffs[i].dur = dur; u.buffs[i].val = val; return; }
      }
      u.buffs.push({ stat: stat, val: val, dur: dur, src: src });
    }
    function buffText(e) {
      if (e.stat === 'def') return '받는 피해 ' + (e.val > 0 ? '-' : '+') + Math.round(Math.abs(e.val) * 100) + '%';
      if (e.stat === 'rate') return '전법 발동률 ' + (e.val > 0 ? '+' : '') + Math.round(e.val * 100) + '%p';
      return '공격 ' + (e.val > 0 ? '+' : '') + Math.round(e.val * 100) + '%';
    }
    var STATUS_LABEL = { confuse: '혼란', silence: '책략 봉쇄', burn: '화상' };

    function applyEffects(u, tac) {
      var e2 = foe(u);
      for (var i = 0; i < tac.t.effects.length && !S.over; i++) {
        var e = tac.t.effects[i];
        if (e.k === 'dmg') {
          hurt(e2, calcDamage(u, e2, e.stat, e.coef), e2.label + '에게 ' + (e.stat === 'int' ? '책략' : '무력') + ' 피해 {v}', { tactic: tac.t.name, stat: e.stat });
        } else if (e.k === 'morale') {
          changeMorale(e.to === 'self' ? u : e2, e.val);
        } else if (e.k === 'buff') {
          var bt = e.to === 'self' ? u : e2;
          addBuff(bt, e.stat, e.val, e.dur, tac.t.id);
          log('buff', bt.label + ' ' + buffText(e) + (e.dur < 90 ? ' (' + e.dur + '턴)' : ''), { side: u.side, target: bt.side, good: bt === u });
        } else if (e.k === 'heal') {
          var amt = Math.round(e.coef * 0.065 * u.maxTroops * (u.U.tac / (u.U.tac + 60)) * 1.6);
          amt = Math.min(amt, u.maxTroops - u.troops);
          if (amt > 0) { u.troops += amt; log('heal', u.label + ' 병력 ' + amt + ' 회복', { side: u.side, target: u.side, value: amt }); }
        } else if (e.k === 'status') {
          if (rng() >= e.chance) continue;
          e2.status[e.s] = Math.max(e2.status[e.s] || 0, e.dur);
          log('status', e2.label + ' ' + STATUS_LABEL[e.s] + ' (' + e.dur + '턴)', { side: u.side, target: e2.side });
        }
      }
    }

    function tickBuffs(u) {
      u.buffs = u.buffs.filter(function (b) { if (b.dur >= 90) return true; b.dur -= 1; return b.dur > 0; });
    }

    function act(u) {
      var e2 = foe(u);
      var silenced = !!u.status.silence;
      for (var i = 0; i < u.tactics.length && !S.over; i++) {
        var tac = u.tactics[i];
        if (tac.t.type !== 'active' || silenced) continue;
        /* 책략력이 적보다 높을수록, 그리고 책략 자리를 맡은 장수의 전법일수록 잘 터진다 */
        var rate = tac.t.rate + clamp((u.U.tac - e2.U.tac) * 0.002, -0.1, 0.1) + (tac.role === 'tac' ? 0.08 : 0) + u.mods.rate + buffSum(u, 'rate');
        if (rng() < rate) {
          log('tactic', tac.gen + '의 전법 [' + tac.t.name + '] 발동!', { side: u.side, tactic: tac.t.name, gen: tac.gen });
          applyEffects(u, tac);
        }
      }
      if (!S.over) {
        if (u.status.confuse) {
          u.status.confuse -= 1;
          log('skip', u.label + ' 부대가 혼란에 빠져 공격하지 못했다.', { side: u.side });
        } else {
          hurt(e2, calcDamage(u, e2, 'str', 1), u.label + ' 일반 공격 {v}', { normal: true });
        }
      }
      if (u.status.silence) u.status.silence -= 1;
      tickBuffs(u);
    }

    /* ---- 전투 시작 ---- */
    log('start', '전투 시작');
    [A, Bm].forEach(function (u) {
      u.tactics.forEach(function (tac) {
        if (tac.t.type !== 'command' || S.over) return;
        log('tactic', tac.gen + '의 지휘 전법 [' + tac.t.name + ']', { side: u.side, tactic: tac.t.name, gen: tac.gen });
        applyEffects(u, tac);
      });
    });

    /* ---- 턴 진행: 사기가 높은 쪽이 먼저 움직인다 ---- */
    for (S.turn = 1; S.turn <= MAX_TURNS && !S.over; S.turn++) {
      log('round', S.turn + '턴');
      var order = A.morale >= Bm.morale ? [A, Bm] : [Bm, A];
      for (var oi = 0; oi < 2 && !S.over; oi++) act(order[oi]);
      if (S.over) break;
      /* 병참: 턴이 끝나면 병참력만큼 사기를 회복한다 */
      var ra = 2 + A.U.sup * 0.05, rb = 2 + Bm.U.sup * 0.05;
      A.morale = clamp(A.morale + ra, 0, 100); Bm.morale = clamp(Bm.morale + rb, 0, 100);
      log('supply', '병참 보급: 아군 사기 +' + Math.round(ra) + ' / 적군 사기 +' + Math.round(rb));
    }
    S.turn = Math.min(S.turn, MAX_TURNS);

    var result;
    if (S.winner) result = S.winner === 'A' ? 'win' : 'lose';
    else {
      var sa = A.troops / A.maxTroops * 0.7 + A.morale / 100 * 0.3;
      var sb = Bm.troops / Bm.maxTroops * 0.7 + Bm.morale / 100 * 0.3;
      result = Math.abs(sa - sb) < 0.03 ? 'draw' : sa > sb ? 'win' : 'lose';
      S.reason = 'time';
    }
    log('end', result === 'win' ? '승리!' : result === 'lose' ? '패배…' : '무승부 (결판을 내지 못했다)', { result: result });
    return { result: result, reason: S.reason, turns: S.turn, events: S.events, A: A, B: Bm };
  }

  SGK.Battle = { simulate: simulate, unitStats: unitStats, teamMods: teamMods, makeRng: makeRng, MAX_TURNS: MAX_TURNS };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK.Battle; }
