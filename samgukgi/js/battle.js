/* 삼국기 - 자동 전투 엔진
 * 화면과 분리된 순수 로직이다. 같은 시드(seed)를 넣으면 항상 같은 결과가 나온다. */
(function (root) {
  'use strict';
  var SGK = root.SGK;
  var MAX_ROUNDS = 8;
  var DMG_K = 0.135;

  /* 시드 기반 난수 (mulberry32) */
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

  /* 같은 국가 무장 수에 따른 진영 효과. 3명이면 100%, 2명이면 50%. */
  function teamMods(ids) {
    var cnt = {};
    ids.forEach(function (id) { if (id) { var n = SGK.GENERALS[id].nation; cnt[n] = (cnt[n] || 0) + 1; } });
    var best = null, c = 0;
    Object.keys(cnt).forEach(function (n) { if (cnt[n] > c) { c = cnt[n]; best = n; } });
    var f = c >= 3 ? 1 : c === 2 ? 0.5 : 0;
    var m = { dmgOut: 1, dmgIn: 1, rate: 0, nation: f > 0 ? best : null, count: c, factor: f };
    if (f > 0) {
      if (best === 'gogu') m.dmgOut = 1 + 0.12 * f;
      if (best === 'baek') m.rate = 0.08 * f;
      if (best === 'silla') m.dmgIn = 1 - 0.12 * f;
    }
    return m;
  }

  function buildUnit(spec, side, slot) {
    var g = SGK.GENERALS[spec.id];
    var st = SGK.calcStats(spec.id, spec.lv || 1, spec.adv || 0);
    var tactics = [SGK.TACTICS[g.tactic]];
    if (spec.equip && SGK.TACTICS[spec.equip]) tactics.push(SGK.TACTICS[spec.equip]);
    return {
      uid: side + slot, side: side, slot: slot, id: g.id, name: g.name, nation: g.nation, troop: g.troop,
      lv: spec.lv || 1, stats: st, maxTroops: st.maxTroops, troops: st.maxTroops, alive: true,
      tactics: tactics, buffs: [], status: {}, burn: 0,
      lastStand: tactics.some(function (t) { return t.special === 'lastStand'; })
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
   * teamA, teamB: [{id, lv, adv, equip}] 3명. 순서는 [선봉, 중군, 본영].
   * 반환: {result:'win'|'lose'|'draw', rounds, events, units} (A 기준) */
  function simulate(teamA, teamB, seed) {
    var rng = makeRng(seed || 1);
    var B = { units: [], events: [], over: false, winner: null, round: 0 };
    teamA.forEach(function (s, i) { B.units.push(buildUnit(s, 'A', i)); });
    teamB.forEach(function (s, i) { B.units.push(buildUnit(s, 'B', i)); });
    B.mods = {
      A: teamMods(teamA.map(function (s) { return s.id; })),
      B: teamMods(teamB.map(function (s) { return s.id; }))
    };

    function snap() {
      var o = {};
      B.units.forEach(function (u) {
        var st = [];
        if (u.status.stun) st.push('기절');
        if (u.status.silence) st.push('침묵');
        if (u.status.burn) st.push('화상');
        o[u.uid] = { t: u.troops, s: st };
      });
      return o;
    }
    function log(type, text, extra) {
      var e = { type: type, round: B.round, text: text, state: snap() };
      if (extra) for (var k in extra) e[k] = extra[k];
      B.events.push(e);
    }
    function foes(u) { return B.units.filter(function (x) { return x.side !== u.side && x.alive; }); }
    function allies(u) { return B.units.filter(function (x) { return x.side === u.side && x.alive; }); }

    function pick(actor, target, lastHit) {
      var f = foes(actor), a = allies(actor);
      switch (target) {
        case 'front': return f.slice(0, 1);
        case 'leader': {
          var l = f.filter(function (x) { return x.slot === 2; });
          return l.length ? l : f.slice(0, 1);
        }
        case 'random': return f.length ? [f[Math.floor(rng() * f.length)]] : [];
        case 'random2': {
          var pool = f.slice(), out = [];
          while (pool.length && out.length < 2) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
          return out;
        }
        case 'all': return f;
        case 'same': return (lastHit || []).filter(function (x) { return x.alive; });
        case 'self': return actor.alive ? [actor] : [];
        case 'allies': return a;
        case 'lowest': {
          if (!a.length) return [];
          return [a.slice().sort(function (x, y) { return x.troops / x.maxTroops - y.troops / y.maxTroops; })[0]];
        }
      }
      return [];
    }

    function checkEnd() {
      if (B.over) return;
      var aLead = B.units[2], bLead = B.units[5];
      if (!bLead.alive) { B.over = true; B.winner = 'A'; }
      else if (!aLead.alive) { B.over = true; B.winner = 'B'; }
    }

    function hurt(target, amount, text, extra) {
      amount = Math.max(1, Math.round(amount));
      target.troops = Math.max(0, target.troops - amount);
      var ex = { target: target.uid, value: amount };
      if (extra) for (var k in extra) ex[k] = extra[k];
      log('dmg', text.replace('{v}', amount), ex);
      if (target.troops <= 0 && target.alive) {
        target.alive = false; target.buffs = []; target.status = {};
        log('dead', target.name + ' 부대가 무너졌다.', { target: target.uid });
        checkEnd();
      }
    }

    function calcDamage(a, d, stat, coef) {
      var atk = a.stats[stat];
      var def = stat === 'str' ? d.stats.lead : d.stats.int * 0.6 + d.stats.lead * 0.4;
      var ratio = clamp(Math.pow(atk / def, 0.9), 0.4, 2.5);
      var troopF = a.maxTroops * (0.45 + 0.55 * a.troops / a.maxTroops);
      var dmg = coef * DMG_K * troopF * ratio * counterMult(a, d);
      dmg *= clamp(1 + buffSum(a, 'atk'), 0.3, 3);
      dmg *= clamp(1 - buffSum(d, 'def'), 0.3, 2);
      dmg *= B.mods[a.side].dmgOut * B.mods[d.side].dmgIn;
      if (a.lastStand && a.troops / a.maxTroops <= 0.5) dmg *= 1.4;
      if (d.lastStand && d.troops / d.maxTroops <= 0.5) dmg *= 0.8;
      return dmg * (0.94 + rng() * 0.12);
    }

    function addBuff(u, stat, val, dur, src) {
      for (var i = 0; i < u.buffs.length; i++) {
        if (u.buffs[i].src === src && u.buffs[i].stat === stat) { u.buffs[i].dur = dur; u.buffs[i].val = val; return; }
      }
      u.buffs.push({ stat: stat, val: val, dur: dur, src: src });
    }

    var STAT_LABEL = { atk: '공격', def: '받는 피해', spd: '속도', rate: '전법 발동률' };
    var STATUS_LABEL = { stun: '기절', silence: '침묵', burn: '화상' };

    function buffText(e) {
      if (e.stat === 'def') return '받는 피해 ' + (e.val > 0 ? '-' : '+') + Math.round(Math.abs(e.val) * 100) + '%';
      if (e.stat === 'spd') return '속도 ' + (e.val > 0 ? '+' : '') + e.val;
      if (e.stat === 'rate') return '전법 발동률 ' + (e.val > 0 ? '+' : '') + Math.round(e.val * 100) + '%p';
      return STAT_LABEL[e.stat] + ' ' + (e.val > 0 ? '+' : '') + Math.round(e.val * 100) + '%';
    }

    function applyEffects(actor, tactic) {
      var lastHit = [];
      for (var i = 0; i < tactic.effects.length && !B.over; i++) {
        var e = tactic.effects[i];
        if (e.k === 'dmg') {
          var hits = e.hits || 1, hitSet = [];
          for (var h = 0; h < hits && !B.over; h++) {
            var ts = pick(actor, e.target, lastHit);
            for (var j = 0; j < ts.length && !B.over; j++) {
              var d = ts[j];
              if (!d.alive) continue;
              hurt(d, calcDamage(actor, d, e.stat, e.coef), d.name + '에게 ' + '{v}' + ' 피해', { actor: actor.uid, tactic: tactic.name });
              if (hitSet.indexOf(d) < 0) hitSet.push(d);
            }
          }
          lastHit = hitSet;
        } else if (e.k === 'status') {
          pick(actor, e.target, lastHit).forEach(function (d) {
            if (rng() >= e.chance) return;
            if (e.s === 'burn') {
              d.status.burn = e.dur;
              d.burn = e.coef * DMG_K * actor.maxTroops * (0.45 + 0.55 * actor.troops / actor.maxTroops);
            } else {
              d.status[e.s] = Math.max(d.status[e.s] || 0, e.dur);
            }
            log('status', d.name + ' ' + STATUS_LABEL[e.s] + ' (' + e.dur + '턴)', { target: d.uid });
          });
        } else if (e.k === 'buff') {
          var bt = pick(actor, e.target, lastHit);
          bt.forEach(function (d) { addBuff(d, e.stat, e.val, e.dur, tactic.id); });
          if (bt.length) {
            var who = bt.length > 1 ? (bt[0].side === actor.side ? '아군 전체' : '적 전체') : bt[0].name;
            log('buff', who + ' ' + buffText(e) + (e.dur < 90 ? ' (' + e.dur + '턴)' : ''), { targets: bt.map(function (x) { return x.uid; }) });
          }
        } else if (e.k === 'heal') {
          pick(actor, e.target, lastHit).forEach(function (d) {
            var amt = Math.round(e.coef * 0.1 * actor.maxTroops * (0.45 + 0.55 * actor.troops / actor.maxTroops) * (actor.stats.int / (actor.stats.int + 60)) * 1.6);
            amt = Math.min(amt, d.maxTroops - d.troops);
            if (amt <= 0) return;
            d.troops += amt;
            log('heal', d.name + ' 병력 ' + amt + ' 회복', { target: d.uid, value: amt });
          });
        }
      }
    }

    function tickBuffs(u) {
      u.buffs = u.buffs.filter(function (b) { if (b.dur >= 90) return true; b.dur -= 1; return b.dur > 0; });
    }

    /* ---- 전투 시작: 지휘 전법 적용 ---- */
    log('start', '전투 시작');
    B.units.forEach(function (u) {
      u.tactics.forEach(function (t) {
        if (t.type !== 'command') return;
        log('tactic', u.name + '의 지휘 전법 [' + t.name + ']', { actor: u.uid, tactic: t.name });
        applyEffects(u, t);
      });
    });

    /* ---- 라운드 진행 ---- */
    for (B.round = 1; B.round <= MAX_ROUNDS && !B.over; B.round++) {
      log('round', B.round + '턴');
      var order = B.units.filter(function (u) { return u.alive; }).map(function (u) {
        return { u: u, s: u.stats.spd + buffSum(u, 'spd') + rng() * 0.5 };
      }).sort(function (x, y) { return y.s - x.s; });

      for (var oi = 0; oi < order.length && !B.over; oi++) {
        var u = order[oi].u;
        if (!u.alive) continue;

        if (u.status.burn) {
          u.status.burn -= 1;
          hurt(u, u.burn, u.name + ' 화상으로 {v} 피해', { dot: true });
          if (!u.alive || B.over) continue;
        }
        if (u.status.stun) {
          u.status.stun -= 1;
          log('skip', u.name + '은(는) 기절해 움직이지 못했다.', { actor: u.uid });
          tickBuffs(u);
          continue;
        }

        var silenced = !!u.status.silence;
        for (var ti = 0; ti < u.tactics.length && !B.over && u.alive; ti++) {
          var t = u.tactics[ti];
          if (t.type !== 'active' || silenced) continue;
          var rate = t.rate + B.mods[u.side].rate + buffSum(u, 'rate');
          if (rng() < rate) {
            log('tactic', u.name + '의 전법 [' + t.name + '] 발동!', { actor: u.uid, tactic: t.name });
            applyEffects(u, t);
          }
        }
        if (!B.over && u.alive) {
          var tg = pick(u, 'front')[0];
          if (tg) hurt(tg, calcDamage(u, tg, 'str', 1), u.name + ' → ' + tg.name + ' 일반 공격 {v}', { actor: u.uid });
        }
        if (u.status.silence) u.status.silence -= 1;
        tickBuffs(u);
      }
    }

    /* ---- 판정 ---- */
    var result;
    if (B.winner) result = B.winner === 'A' ? 'win' : 'lose';
    else {
      var ra = 0, rb = 0;
      B.units.forEach(function (x) { if (x.side === 'A') ra += x.troops / x.maxTroops; else rb += x.troops / x.maxTroops; });
      result = Math.abs(ra - rb) < 0.05 ? 'draw' : ra > rb ? 'win' : 'lose';
    }
    B.round = Math.min(B.round, MAX_ROUNDS);
    log('end', result === 'win' ? '승리!' : result === 'lose' ? '패배…' : '무승부 (결판을 내지 못했다)', { result: result });

    return { result: result, rounds: B.round, events: B.events, units: B.units, mods: B.mods, byLeaderKill: !!B.winner };
  }

  SGK.Battle = { simulate: simulate, teamMods: teamMods, makeRng: makeRng, MAX_ROUNDS: MAX_ROUNDS };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK.Battle; }
