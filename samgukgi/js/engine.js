/* 삼국기 — 전투 엔진 (화면과 완전히 분리된 순수 로직)
 * 모든 함수는 상태(state)를 바꾸고, 화면이 재생할 "이벤트 목록"을 돌려준다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.SGEngine = factory(root.SGData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  const LANES = 3;
  const CFG = {
    hqBase: 1800,        // 본진 내구
    cmdStart: 3,         // 1턴 군령
    cmdMax: 8,           // 군령 상한
    startHand: 4,
    handMax: 6,
    turnLimit: 20,
    atkScale: 6,          // 무력 수치 → 기본 피해 배율
    defK: 0.6,           // 통솔 수치 → 피해 감소 계수
    advMul: 1.5,         // 상성 유리
    disMul: 0.7,         // 상성 불리
    spearCounter: 0.3,   // 창병이 기병에게 되돌려 주는 비율
    spearGuard: 0.9,     // 창병이 받는 피해 배율
    cavHqMul: 1.25,      // 기병의 본진 공격 배율
    hqDefMul: 0.8,       // 본진이 받는 피해 배율
    moraleStart: 60,
    killMorale: 8,
    lossMorale: 12,
    hqHitMorale: 3,
    polMorale: 2,        // 출전 시 정치 등급 pt × 이 값만큼 사기 상승
  };

  const gv = (grade) => D.GRADES[grade].value;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // 시드 고정 난수(mulberry32) — 같은 시드면 같은 전투가 재현된다.
  function rand(state) {
    state.seed = (state.seed + 0x6D2B79F5) >>> 0;
    let t = state.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // 배치 비용: 통솔·무력·지력 등급 합으로 결정(1~6). 정치는 전투 비용에 넣지 않는다.
  function costOf(g) {
    const s = g.stats;
    const pt = D.GRADES[s.lead].pt + D.GRADES[s.war].pt + D.GRADES[s.int].pt;
    return clamp(1 + Math.round(pt / 2.4), 1, 6);
  }

  function makeCard(state, gid) {
    const g = D.GENERALS[gid];
    const maxTroops = gv(g.stats.lead) * 10;
    return {
      uid: 'c' + (++state.uidSeq), gid, name: g.name, nation: g.nation, unit: g.unit,
      stats: Object.assign({}, g.stats), troops: maxTroops, maxTroops,
      cost: costOf(g), skill: g.skill, cd: g.skill ? g.skill.cd : 0,
      ready: false, stunned: 0, buffs: [],
    };
  }

  function shuffle(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand(state) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function draw(side, n) {
    for (let i = 0; i < n; i++) {
      if (!side.deck.length || side.hand.length >= CFG.handMax) return;
      side.hand.push(side.deck.shift());
    }
  }

  /** opts: { sides:[{nation, deck?, hqMul?}, {…}], seed? } — sides[0]이 플레이어 */
  function createBattle(opts) {
    const state = { seed: (opts.seed || Date.now()) >>> 0, uidSeq: 0, turn: 0, phase: 'deploy', winner: null, reason: '', sides: [] };
    opts.sides.forEach((o, i) => {
      const ids = o.deck || D.deckOf(o.nation);
      const hqMax = Math.round(CFG.hqBase * (o.hqMul || 1));
      const side = {
        idx: i, nation: o.nation, deck: shuffle(state, ids.map((id) => makeCard(state, id))),
        hand: [], field: new Array(LANES).fill(null), grave: [],
        hq: hqMax, hqMax, morale: CFG.moraleStart, cmd: 0, cmdMax: 0,
      };
      // 첫 손패에 낼 수 있는 카드가 없는 사고 방지: 비용 3 이하 카드를 한 장 보장
      const k = side.deck.findIndex((c) => c.cost <= CFG.cmdStart);
      if (k > 0) side.deck.unshift(side.deck.splice(k, 1)[0]);
      draw(side, CFG.startHand);
      state.sides.push(side);
    });
    beginTurn(state);
    return state;
  }

  function beginTurn(state) {
    state.turn++;
    state.phase = 'deploy';
    state.sides.forEach((s) => {
      s.cmdMax = Math.min(CFG.cmdStart + state.turn - 1, CFG.cmdMax);
      s.cmd = s.cmdMax;
      if (state.turn > 1) draw(s, 1);
      s.field.forEach((c) => { if (c) { c.ready = true; if (c.cd > 0) c.cd--; } });
    });
  }

  function canDeploy(state, si, handIdx, lane) {
    const s = state.sides[si];
    const c = s.hand[handIdx];
    return state.phase === 'deploy' && !!c && lane >= 0 && lane < LANES && !s.field[lane] && c.cost <= s.cmd;
  }

  function deploy(state, si, handIdx, lane) {
    if (!canDeploy(state, si, handIdx, lane)) return null;
    const s = state.sides[si];
    const c = s.hand.splice(handIdx, 1)[0];
    s.cmd -= c.cost;
    c.ready = c.unit === 'cav'; // 기병 돌격
    s.field[lane] = c;
    const gain = D.GRADES[c.stats.pol].pt * CFG.polMorale;
    s.morale = clamp(s.morale + gain, 0, 100);
    return { t: 'deploy', side: si, lane, uid: c.uid, morale: s.morale };
  }

  const sumBuff = (c, k) => c.buffs.reduce((a, b) => a + (b.k === k ? b.v : 0), 0);

  function relation(att, def) {
    if (D.UNITS[att.unit].beats === def.unit) return 1;
    if (D.UNITS[def.unit].beats === att.unit) return -1;
    return 0;
  }

  // 일반 공격 피해. def가 null이면 본진 공격.
  function calcAttack(state, att, attSide, def) {
    let mult = 1, adv = 0, defF;
    if (def) {
      adv = relation(att, def);
      mult = adv > 0 ? CFG.advMul : adv < 0 ? CFG.disMul : 1;
      defF = 100 / (100 + gv(def.stats.lead) * CFG.defK) * (1 - Math.min(0.7, sumBuff(def, 'def')));
      if (def.unit === 'spr') defF *= CFG.spearGuard;
    } else {
      defF = CFG.hqDefMul * (att.unit === 'cav' ? CFG.cavHqMul : 1);
    }
    const troopF = 0.5 + 0.5 * att.troops / att.maxTroops;   // 병력이 줄면 화력도 준다
    const moraleF = 0.8 + 0.4 * attSide.morale / 100;        // 사기 0→×0.8, 100→×1.2
    const dmg = gv(att.stats.war) * CFG.atkScale * mult * troopF * moraleF * (1 + sumBuff(att, 'atk')) * defF * (0.9 + 0.2 * rand(state));
    return { dmg: Math.max(1, Math.round(dmg)), adv };
  }

  // 카드에 피해 적용. 전사하면 묘지로 보내고 사기를 조정한다.
  function hurt(state, si, lane, dmg) {
    const s = state.sides[si], o = state.sides[1 - si];
    const c = s.field[lane];
    c.troops = Math.max(0, c.troops - dmg);
    if (c.troops > 0) return false;
    s.field[lane] = null;
    s.grave.push(c);
    s.morale = clamp(s.morale - CFG.lossMorale, 0, 100);
    o.morale = clamp(o.morale + CFG.killMorale, 0, 100);
    return true;
  }

  function hurtHq(state, si, dmg) {
    const s = state.sides[si];
    s.hq = Math.max(0, s.hq - dmg);
    s.morale = clamp(s.morale - CFG.hqHitMorale, 0, 100);
  }

  function canUseSkill(state, si, lane) {
    const c = state.sides[si].field[lane];
    return state.phase === 'deploy' && !!c && !!c.skill && c.cd === 0 && !c.stunned;
  }

  function useSkill(state, si, lane) {
    if (!canUseSkill(state, si, lane)) return null;
    const s = state.sides[si], o = state.sides[1 - si], ei = 1 - si;
    const c = s.field[lane];
    const intF = gv(c.stats.int) / 70;
    const fx = [];
    const allies = () => s.field.filter(Boolean);
    c.skill.fx.forEach((f) => {
      if (f.type === 'nuke_all') {
        for (let l = 0; l < LANES; l++) {
          const t = o.field[l];
          if (!t) continue;
          const resist = 100 / (100 + gv(t.stats.int) * 0.4);
          const dmg = Math.round(f.power * intF * resist * (0.9 + 0.2 * rand(state)));
          const killed = hurt(state, ei, l, dmg);
          fx.push({ t: 'dmg', side: ei, lane: l, uid: t.uid, dmg, after: t.troops, killed });
        }
      } else if (f.type === 'nuke_one') {
        const t = o.field[lane];
        if (t) {
          const resist = 100 / (100 + gv(t.stats.int) * 0.4);
          const dmg = Math.round(f.power * intF * resist * (0.9 + 0.2 * rand(state)));
          const killed = hurt(state, ei, lane, dmg);
          fx.push({ t: 'dmg', side: ei, lane, uid: t.uid, dmg, after: t.troops, killed });
        } else {
          const dmg = Math.round(f.power * intF * 0.6);
          hurtHq(state, ei, dmg);
          fx.push({ t: 'hq', side: ei, delta: -dmg, after: o.hq });
        }
      } else if (f.type === 'buff_atk' || f.type === 'buff_def') {
        const k = f.type === 'buff_atk' ? 'atk' : 'def';
        allies().forEach((a) => a.buffs.push({ k, v: f.power / 100, turns: f.turns }));
        fx.push({ t: 'buff', side: si, k, uids: allies().map((a) => a.uid) });
      } else if (f.type === 'heal') {
        allies().forEach((a) => {
          const amt = Math.min(a.maxTroops - a.troops, Math.round(f.power * intF));
          a.troops += amt;
          fx.push({ t: 'heal', side: si, uid: a.uid, amount: amt, after: a.troops });
        });
      } else if (f.type === 'stun') {
        const t = o.field[lane];
        if (t) {
          const p = clamp(0.65 + (gv(c.stats.int) - gv(t.stats.int)) / 100, 0.25, 0.95);
          const ok = rand(state) < p;
          if (ok) t.stunned = 1;
          fx.push({ t: 'stun', side: ei, uid: t.uid, ok });
        }
      } else if (f.type === 'morale') {
        s.morale = clamp(s.morale + f.power, 0, 100);
        fx.push({ t: 'morale', side: si, after: s.morale });
      } else if (f.type === 'hq_repair') {
        const amt = Math.min(s.hqMax - s.hq, Math.round(f.power * intF));
        s.hq += amt;
        fx.push({ t: 'hq', side: si, delta: amt, after: s.hq });
      }
    });
    c.cd = c.skill.cd;
    checkWin(state, false);
    return { t: 'skill', side: si, lane, uid: c.uid, gid: c.gid, name: c.skill.name, fx,
             morale: [state.sides[0].morale, state.sides[1].morale] };
  }

  function outOfCards(s) { return !s.deck.length && !s.hand.length && !s.field.some(Boolean); }

  function checkWin(state, endOfTurn) {
    if (state.winner !== null) return true;
    const [a, b] = state.sides;
    const set = (w, r) => { state.winner = w; state.reason = r; state.phase = 'end'; return true; };
    if (a.hq <= 0 && b.hq <= 0) return set(a.hq === b.hq ? -1 : (a.hq > b.hq ? 0 : 1), '양측 본진 붕괴');
    if (a.hq <= 0) return set(1, '본진 함락');
    if (b.hq <= 0) return set(0, '본진 함락');
    if (!endOfTurn) return false;
    const oa = outOfCards(a), ob = outOfCards(b);
    if (oa || ob || state.turn >= CFG.turnLimit) {
      const reason = (oa || ob) ? '전군 궤멸' : '전투 장기화 — 본진 잔여 내구 판정';
      if (oa && !ob) return set(1, reason);
      if (ob && !oa) return set(0, reason);
      const ra = a.hq / a.hqMax, rb = b.hq / b.hqMax;
      return set(ra === rb ? -1 : (ra > rb ? 0 : 1), reason);
    }
    return false;
  }

  /** 교전 해결: 궁병 → 기병 → 창병 순, 같은 병종끼리는 무력이 높은 쪽 먼저. */
  function resolve(state) {
    state.phase = 'resolve';
    const ev = [];
    const actors = [];
    state.sides.forEach((s, si) => s.field.forEach((c, lane) => { if (c) actors.push({ si, lane, c }); }));
    actors.sort((x, y) =>
      D.UNITS[x.c.unit].order - D.UNITS[y.c.unit].order ||
      gv(y.c.stats.war) - gv(x.c.stats.war) ||
      ((x.si === (state.turn % 2)) ? 1 : -1));

    for (const a of actors) {
      if (state.winner !== null) break;
      const s = state.sides[a.si], o = state.sides[1 - a.si], ei = 1 - a.si;
      if (s.field[a.lane] !== a.c) continue;                       // 이미 전사
      if (a.c.stunned) { ev.push({ t: 'skip', side: a.si, lane: a.lane, uid: a.c.uid, why: 'stun' }); continue; }
      if (!a.c.ready) { ev.push({ t: 'skip', side: a.si, lane: a.lane, uid: a.c.uid, why: 'prep' }); continue; }
      const def = o.field[a.lane];
      const r = calcAttack(state, a.c, s, def);
      const e = { t: 'attack', side: a.si, lane: a.lane, uid: a.c.uid, unit: a.c.unit, dmg: r.dmg, adv: r.adv };
      if (def) {
        e.target = 'card'; e.targetUid = def.uid;
        e.killed = hurt(state, ei, a.lane, r.dmg);
        e.after = def.troops;
        if (!e.killed && def.unit === 'spr' && a.c.unit === 'cav') {
          const cd = Math.max(1, Math.round(r.dmg * CFG.spearCounter));
          const k = hurt(state, a.si, a.lane, cd);
          e.counter = { dmg: cd, after: a.c.troops, killed: k };
        }
      } else {
        e.target = 'hq';
        hurtHq(state, ei, r.dmg);
        e.after = o.hq;
      }
      e.morale = [state.sides[0].morale, state.sides[1].morale];
      ev.push(e);
      checkWin(state, false);
    }

    // 턴 종료 처리: 버프·혼란 지속시간 감소
    state.sides.forEach((s) => s.field.forEach((c) => {
      if (!c) return;
      c.buffs.forEach((b) => b.turns--);
      c.buffs = c.buffs.filter((b) => b.turns > 0);
      if (c.stunned) c.stunned--;
    }));
    checkWin(state, true);
    if (state.winner !== null) ev.push({ t: 'end', winner: state.winner, reason: state.reason });
    return ev;
  }

  // ── AI: 배치 → 스킬. 상성 유리한 맞대응을 우선하고, 빈 길에는 기병을 선호한다. ──
  function aiAct(state, si) {
    const ev = [];
    const s = state.sides[si], o = state.sides[1 - si];
    for (;;) {
      let best = null;
      s.hand.forEach((c, hi) => {
        if (c.cost > s.cmd) return;
        for (let l = 0; l < LANES; l++) {
          if (s.field[l]) continue;
          const opp = o.field[l];
          let sc = c.cost * 10 + rand(state) * 6;
          if (opp) {
            const rel = relation(c, opp);
            sc += 15 + rel * 35;
            if (opp.troops < opp.maxTroops * 0.4) sc += 10;
          } else if (c.unit === 'cav') sc += 12;
          if (!best || sc > best.sc) best = { sc, hi, l };
        }
      });
      if (!best) break;
      const e = deploy(state, si, best.hi, best.l);
      if (!e) break;
      ev.push(e);
    }
    for (let l = 0; l < LANES && state.winner === null; l++) {
      if (!canUseSkill(state, si, l)) continue;
      const c = s.field[l];
      const allies = s.field.filter(Boolean), foes = o.field.filter(Boolean);
      const missing = allies.reduce((a, x) => a + (x.maxTroops - x.troops), 0);
      const total = allies.reduce((a, x) => a + x.maxTroops, 0);
      const want = c.skill.fx.some((f) =>
        (f.type === 'nuke_all' && foes.length >= 2) ||
        (f.type === 'nuke_one') ||
        ((f.type === 'buff_atk' || f.type === 'buff_def') && allies.length >= 2) ||
        (f.type === 'heal' && missing >= total * 0.25) ||
        (f.type === 'stun' && o.field[l] && !o.field[l].stunned) ||
        (f.type === 'morale' && s.morale <= 80) ||
        (f.type === 'hq_repair' && s.hq < s.hqMax * 0.85));
      if (want) { const e = useSkill(state, si, l); if (e) ev.push(e); }
    }
    return ev;
  }

  return { CFG, LANES, createBattle, beginTurn, canDeploy, deploy, canUseSkill, useSkill, resolve, aiAct, costOf, relation, gv };
});
