/* 삼국기 — 전투 엔진 v0.2 (화면과 분리된 순수 로직)
 * 모든 함수는 상태(state)를 바꾸고, 화면이 재생할 "이벤트"를 돌려준다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'));
  else root.SGEngine = factory(root.SGData);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';

  const LANES = 3;
  const CFG = {
    hqBase: 1400, deckSize: 10, startHand: 4, handMax: 6, turnLimit: 20,
    cmdStart: 4, cmdMax: 8, cardCost: 2, tacticCost: 1, tacticCd: 2,
    atkScale: 6,          // 무력 수치 → 기본 피해
    defK: 0.6,            // 통솔 → 일반 공격 피해 감소
    resK: 0.4,            // 지력 → 계략 피해 감소
    advMul: 1.4, disMul: 0.75,
    spearCounter: 0.45, spearGuard: 0.9, cavHqMul: 1.25, hqDefMul: 0.8,
    cavRushMul: 0.75,     // 기병이 배치한 턴에 바로 치는 공격의 위력
    chargeMul: 1.5, guardMul: 0.5, guardCounter: 0.3,
    burnBase: 90, burnTurns: 2, burnWeak: 0.15,
    insightK: 0.022,      // 간파: 지력 차 1당 받는 일반 공격 피해 감소율
    stunBase: 0.75,
    moraleStart: 60, killMorale: 8, lossMorale: 12, hqHitMorale: 3, polMorale: 3,
    routHq: 130,          // 패주: 장수가 격파되면 그 진영 본진 내구도 깎인다
    deployMode: 'alternate', // 배치 순서: alternate(턴마다 교대) | initFirst | initLast
    // 실험용 스위치(시뮬레이션에서 끄고 켜며 효과를 잰다)
    useInsight: true, useSkills: true, useTactics: true,
  };

  const gv = (grade) => D.GRADES[grade].value;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function rand(state) {
    state.seed = (state.seed + 0x6D2B79F5) >>> 0;
    let t = state.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(state, arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand(state) * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  function makeCard(state, gid) {
    const g = D.GENERALS[gid];
    const maxTroops = gv(g.stats.lead) * 10;
    const A = D.ARCH[g.skill.arch];
    return {
      uid: 'c' + (++state.uidSeq), gid, name: g.name, nation: g.nation, unit: g.unit, cls: g.cls,
      stats: Object.assign({}, g.stats), troops: maxTroops, maxTroops,
      cost: CFG.cardCost, skill: { name: g.skill.name, arch: g.skill.arch, cd: A.cd }, cd: A.cd - 1, tcd: 0,
      ready: false, fresh: false, stunned: 0, buffs: [], burn: null, charge: false, guard: false,
    };
  }

  /** 무작위 덱. kind: 'mix'(무5·문5) | 'm'(무인만) | 'c'(문인만) | 병종 키(해당 병종 위주) */
  function randomDeck(nation, rnd, kind) {
    const pool = D.ROSTER[nation].map((id) => D.GENERALS[id]);
    const pick = (arr, n) => { const a = arr.slice(); const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0].id); return out; };
    if (kind === 'm' || kind === 'c') return pick(pool.filter((g) => g.cls === kind), CFG.deckSize);
    if (D.UNITS[kind]) { const a = pick(pool.filter((g) => g.unit === kind), CFG.deckSize); return a.concat(pick(pool.filter((g) => a.indexOf(g.id) < 0), CFG.deckSize - a.length)); }
    const h = CFG.deckSize / 2;
    return pick(pool.filter((g) => g.cls === 'm'), h).concat(pick(pool.filter((g) => g.cls === 'c'), h));
  }

  function draw(side, n) {
    for (let i = 0; i < n; i++) { if (!side.deck.length || side.hand.length >= CFG.handMax) return; side.hand.push(side.deck.shift()); }
  }

  /** opts: { sides:[{nation, deck?, kind?, hqMul?}, …], seed?, init? } — sides[0]이 플레이어 */
  function createBattle(opts) {
    const state = { seed: (opts.seed || Date.now()) >>> 0, uidSeq: 0, turn: 0, phase: 'deploy', winner: null, reason: '', sides: [], dice: null, init: 0 };
    opts.sides.forEach((o, i) => {
      const ids = o.deck || randomDeck(o.nation, () => rand(state), o.kind);
      const hqMax = Math.round(CFG.hqBase * (o.hqMul || 1));
      const side = { idx: i, nation: o.nation, deck: shuffle(state, ids.map((id) => makeCard(state, id))),
        hand: [], field: new Array(LANES).fill(null), grave: [], hq: hqMax, hqMax, morale: CFG.moraleStart, cmd: 0, cmdMax: 0 };
      draw(side, CFG.startHand);
      state.sides.push(side);
    });
    // 선제 공격권: 주사위 두 개(1~6)를 굴려 큰 쪽. 같으면 다시 굴린다.
    if (opts.init === 0 || opts.init === 1) { state.init = opts.init; state.dice = null; }
    else {
      let a, b; const rolls = [];
      do { a = 1 + Math.floor(rand(state) * 6); b = 1 + Math.floor(rand(state) * 6); rolls.push([a, b]); } while (a === b);
      state.dice = rolls; state.init = a > b ? 0 : 1;
    }
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
      s.field.forEach((c) => { if (c) { c.ready = true; c.fresh = false; if (c.cd > 0) c.cd--; if (c.tcd > 0) c.tcd--; } });
    });
  }

  function canDeploy(state, si, handIdx, lane) {
    const s = state.sides[si], c = s.hand[handIdx];
    return state.phase === 'deploy' && !!c && lane >= 0 && lane < LANES && !s.field[lane] && c.cost <= s.cmd;
  }
  function deploy(state, si, handIdx, lane) {
    if (!canDeploy(state, si, handIdx, lane)) return null;
    const s = state.sides[si], c = s.hand.splice(handIdx, 1)[0];
    s.cmd -= c.cost;
    c.ready = c.unit === 'cav';
    c.fresh = true;
    s.field[lane] = c;
    s.morale = clamp(s.morale + D.GRADES[c.stats.pol].pt * CFG.polMorale, 0, 100);
    return { t: 'deploy', side: si, lane, uid: c.uid, morale: [state.sides[0].morale, state.sides[1].morale] };
  }

  const sumBuff = (c, k) => c.buffs.reduce((a, b) => a + (b.k === k ? b.v : 0), 0);
  function relation(att, def) {
    if (D.UNITS[att.unit].beats === def.unit) return 1;
    if (D.UNITS[def.unit].beats === att.unit) return -1;
    return 0;
  }

  // 일반 공격 피해. def가 null이면 본진.
  function calcAttack(state, att, attSide, def) {
    let mult = 1, adv = 0, defF, insight = false;
    if (def) {
      adv = relation(att, def);
      mult = adv > 0 ? CFG.advMul : adv < 0 ? CFG.disMul : 1;
      defF = 100 / (100 + gv(def.stats.lead) * CFG.defK) * (1 - Math.min(0.7, sumBuff(def, 'def')));
      if (def.unit === 'spr') defF *= CFG.spearGuard;
      if (def.guard) defF *= CFG.guardMul;
      const diff = gv(def.stats.int) - gv(att.stats.int);
      if (CFG.useInsight && diff > 0) { defF *= 1 - diff * CFG.insightK; insight = true; }
    } else defF = CFG.hqDefMul * (att.unit === 'cav' ? CFG.cavHqMul : 1);
    const troopF = 0.5 + 0.5 * att.troops / att.maxTroops;
    const moraleF = 0.8 + 0.4 * attSide.morale / 100;
    const atkF = Math.max(0.3, 1 + sumBuff(att, 'atk') - (att.burn ? CFG.burnWeak : 0)) * (att.charge ? CFG.chargeMul : 1) * (att.fresh ? CFG.cavRushMul : 1);
    const dmg = gv(att.stats.war) * CFG.atkScale * mult * troopF * moraleF * atkF * defF * (0.9 + 0.2 * rand(state));
    return { dmg: Math.max(1, Math.round(dmg)), adv, insight };
  }

  function hurt(state, si, lane, dmg) {
    const s = state.sides[si], o = state.sides[1 - si], c = s.field[lane];
    c.troops = Math.max(0, c.troops - dmg);
    if (c.troops > 0) return false;
    s.field[lane] = null; s.grave.push(c);
    s.hq = Math.max(0, s.hq - CFG.routHq);
    s.morale = clamp(s.morale - CFG.lossMorale, 0, 100);
    o.morale = clamp(o.morale + CFG.killMorale, 0, 100);
    return true;
  }
  function hurtHq(state, si, dmg) {
    const s = state.sides[si];
    s.hq = Math.max(0, s.hq - dmg);
    s.morale = clamp(s.morale - CFG.hqHitMorale, 0, 100);
  }
  const morales = (state) => [state.sides[0].morale, state.sides[1].morale];
  const hqs = (state) => [state.sides[0].hq, state.sides[1].hq];

  // ── 병종 전법 ───────────────────────────────────────────────
  function canUseTactic(state, si, lane) {
    const s = state.sides[si], c = s.field[lane];
    if (!CFG.useTactics || state.phase !== 'deploy' || !c || c.tcd > 0 || c.stunned || s.cmd < CFG.tacticCost) return false;
    if (c.unit === 'cav') return !c.charge;
    if (c.unit === 'spr') return !c.guard;
    const t = state.sides[1 - si].field[lane];
    return !!t && !t.burn;
  }
  function burnDmg(src, tgt, base) {
    return Math.max(1, Math.round(base * gv(src.stats.int) / 85 * 100 / (100 + gv(tgt.stats.int) * CFG.resK)));
  }
  function useTactic(state, si, lane) {
    if (!canUseTactic(state, si, lane)) return null;
    const s = state.sides[si], c = s.field[lane];
    s.cmd -= CFG.tacticCost; c.tcd = CFG.tacticCd;
    const e = { t: 'tactic', side: si, lane, uid: c.uid, kind: D.UNITS[c.unit].tactic.key };
    if (c.unit === 'cav') c.charge = true;
    else if (c.unit === 'spr') c.guard = true;
    else { const t = state.sides[1 - si].field[lane]; t.burn = { dmg: burnDmg(c, t, CFG.burnBase), turns: CFG.burnTurns }; e.targetUid = t.uid; e.burn = t.burn.dmg; }
    return e;
  }

  // ── 장수 계략 ───────────────────────────────────────────────
  function canUseSkill(state, si, lane) {
    const c = state.sides[si].field[lane];
    return CFG.useSkills && state.phase === 'deploy' && !!c && c.cd === 0 && !c.stunned;
  }
  function useSkill(state, si, lane) {
    if (!canUseSkill(state, si, lane)) return null;
    const s = state.sides[si], o = state.sides[1 - si], ei = 1 - si, c = s.field[lane];
    const A = D.ARCH[c.skill.arch];
    const sf = gv(c.stats[A.scale]) / 85;                       // A등급 = 1.0
    const phys = A.scale === 'war';
    const fx = [];
    const allies = () => s.field.filter(Boolean);
    const skillDmg = (t, power) => {
      const red = phys ? 100 / (100 + gv(t.stats.lead) * CFG.defK) * (t.guard ? CFG.guardMul : 1) * 1.6   // 무력 계략: 통솔로 막는다
                       : 100 / (100 + gv(t.stats.int) * CFG.resK);                                        // 지력 계략: 지력으로만 막는다
      return Math.max(1, Math.round(power * sf * red * (1 - Math.min(0.7, sumBuff(t, 'def')) * (phys ? 1 : 0.5)) * (0.9 + 0.2 * rand(state))));
    };
    A.fx.forEach((f) => {
      if (f.type === 'nuke_all') {
        for (let l = 0; l < LANES; l++) { const t = o.field[l]; if (!t) continue; const dmg = skillDmg(t, f.power); const killed = hurt(state, ei, l, dmg); fx.push({ t: 'dmg', side: ei, lane: l, uid: t.uid, dmg, after: t.troops, killed }); }
      } else if (f.type === 'nuke_one') {
        const t = o.field[lane];
        if (t) { const dmg = skillDmg(t, f.power); const killed = hurt(state, ei, lane, dmg); fx.push({ t: 'dmg', side: ei, lane, uid: t.uid, dmg, after: t.troops, killed }); }
        else { const dmg = Math.round(f.power * sf * 0.6); hurtHq(state, ei, dmg); fx.push({ t: 'hq', side: ei, delta: -dmg, after: o.hq }); }
      } else if (f.type === 'hq_dmg') {
        const dmg = Math.round(f.power * sf); hurtHq(state, ei, dmg); fx.push({ t: 'hq', side: ei, delta: -dmg, after: o.hq });
      } else if (f.type === 'burn_all') {
        o.field.forEach((t) => { if (t) { t.burn = { dmg: burnDmg(c, t, f.power), turns: f.turns }; fx.push({ t: 'burnset', side: ei, uid: t.uid }); } });
      } else if (f.type === 'buff_atk' || f.type === 'buff_def') {
        const k = f.type === 'buff_atk' ? 'atk' : 'def';
        allies().forEach((a) => a.buffs.push({ k, v: f.power / 100 * sf, turns: f.turns }));
        fx.push({ t: 'buff', side: si, k, uids: allies().map((a) => a.uid) });
      } else if (f.type === 'self_atk') {
        c.buffs.push({ k: 'atk', v: f.power / 100 * sf, turns: f.turns }); fx.push({ t: 'buff', side: si, k: 'atk', uids: [c.uid] });
      } else if (f.type === 'debuff_atk') {
        const ts = o.field.filter(Boolean);
        ts.forEach((t) => { const res = 100 / (100 + gv(t.stats.int) * CFG.resK) * 1.36; t.buffs.push({ k: 'atk', v: -f.power / 100 * sf * res, turns: f.turns }); });
        fx.push({ t: 'debuff', side: ei, uids: ts.map((t) => t.uid) });
      } else if (f.type === 'heal' || f.type === 'self_heal') {
        (f.type === 'heal' ? allies() : [c]).forEach((a) => { const amt = Math.min(a.maxTroops - a.troops, Math.round(f.power * sf)); a.troops += amt; fx.push({ t: 'heal', side: si, uid: a.uid, amount: amt, after: a.troops }); });
      } else if (f.type === 'self_cost') {
        const amt = Math.min(c.troops - 1, Math.round(c.maxTroops * f.power / 100)); c.troops -= amt; fx.push({ t: 'cost', side: si, uid: c.uid, amount: amt, after: c.troops });
      } else if (f.type === 'stun') {
        const t = o.field[lane];
        if (t) { const p = clamp(CFG.stunBase + f.bonus + (gv(c.stats.int) - gv(t.stats.int)) / 100, 0.2, 0.97); const ok = rand(state) < p; if (ok) t.stunned = 1; fx.push({ t: 'stun', side: ei, uid: t.uid, ok }); }
      } else if (f.type === 'morale') {
        s.morale = clamp(s.morale + Math.round(f.power * sf), 0, 100); fx.push({ t: 'morale', side: si });
      } else if (f.type === 'foe_morale') {
        o.morale = clamp(o.morale - Math.round(f.power * sf), 0, 100); fx.push({ t: 'morale', side: ei });
      } else if (f.type === 'hq_repair') {
        const amt = Math.min(s.hqMax - s.hq, Math.round(f.power * sf)); s.hq += amt; fx.push({ t: 'hq', side: si, delta: amt, after: s.hq });
      } else if (f.type === 'cmd') {
        s.cmd += f.power; fx.push({ t: 'cmd', side: si, amount: f.power });
      }
    });
    c.cd = c.skill.cd;
    checkWin(state, false);
    return { t: 'skill', side: si, lane, uid: c.uid, gid: c.gid, name: c.skill.name, arch: c.skill.arch, vis: A.vis, fx, morale: morales(state), hq: hqs(state) };
  }

  function outOfCards(s) { return !s.deck.length && !s.hand.length && !s.field.some(Boolean); }
  function checkWin(state, endOfTurn) {
    if (state.winner !== null) return true;
    const [a, b] = state.sides;
    const set = (w, r) => { state.winner = w; state.reason = r; state.phase = 'end'; return true; };
    if (a.hq <= 0 && b.hq <= 0) return set(-1, '양측 본진 붕괴');
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

  /** 교전: 궁병 → 기병 → 창병. 같은 병종이면 선제 공격권을 가진 쪽이 먼저. */
  function resolve(state) {
    state.phase = 'resolve';
    const ev = [], actors = [];
    state.sides.forEach((s, si) => s.field.forEach((c, lane) => { if (c) actors.push({ si, lane, c }); }));
    actors.sort((x, y) => D.UNITS[x.c.unit].order - D.UNITS[y.c.unit].order ||
      (x.si === state.init ? 0 : 1) - (y.si === state.init ? 0 : 1) || gv(y.c.stats.war) - gv(x.c.stats.war) || x.lane - y.lane);

    for (const a of actors) {
      if (state.winner !== null) break;
      const s = state.sides[a.si], o = state.sides[1 - a.si], ei = 1 - a.si;
      if (s.field[a.lane] !== a.c) continue;
      if (a.c.stunned) { ev.push({ t: 'skip', side: a.si, lane: a.lane, uid: a.c.uid, why: 'stun' }); continue; }
      if (!a.c.ready) continue;
      const def = o.field[a.lane];
      const r = calcAttack(state, a.c, s, def);
      const e = { t: 'attack', side: a.si, lane: a.lane, uid: a.c.uid, unit: a.c.unit, dmg: r.dmg, adv: r.adv, insight: r.insight, charge: a.c.charge };
      if (def) {
        e.target = 'card'; e.targetUid = def.uid; e.guard = def.guard;
        const before = def.troops;
        e.killed = hurt(state, ei, a.lane, r.dmg);
        e.after = def.troops;
        if (e.killed && a.c.charge && r.dmg > before) {           // 돌격 관통
          const over = Math.round((r.dmg - before) * CFG.hqDefMul);
          hurtHq(state, ei, over); e.overrun = { dmg: over, after: o.hq };
        }
        const melee = a.c.unit !== 'arc';
        if (!e.killed && melee && ((def.unit === 'spr' && a.c.unit === 'cav') || def.guard)) {
          const cd = Math.max(1, Math.round(r.dmg * (def.guard ? CFG.guardCounter : CFG.spearCounter) * (def.guard && def.unit === 'spr' && a.c.unit === 'cav' ? 2 : 1)));
          const k = hurt(state, a.si, a.lane, cd);
          e.counter = { dmg: cd, after: a.c.troops, killed: k };
        }
      } else { e.target = 'hq'; hurtHq(state, ei, r.dmg); e.after = o.hq; }
      e.morale = morales(state); e.hq = hqs(state);
      ev.push(e);
      checkWin(state, false);
    }

    // 화상 피해 → 지속 효과 정리
    if (state.winner === null) state.sides.forEach((s, si) => s.field.forEach((c, lane) => {
      if (!c || !c.burn) return;
      const dmg = c.burn.dmg; c.burn.turns--; if (c.burn.turns <= 0) c.burn = null;
      const killed = hurt(state, si, lane, dmg);
      ev.push({ t: 'burn', side: si, lane, uid: c.uid, dmg, after: c.troops, killed, morale: morales(state), hq: hqs(state) });
    }));
    state.sides.forEach((s) => s.field.forEach((c) => {
      if (!c) return;
      c.buffs.forEach((b) => b.turns--); c.buffs = c.buffs.filter((b) => b.turns > 0);
      if (c.stunned) c.stunned--;
      c.charge = false; c.guard = false;
    }));
    checkWin(state, true);
    if (state.winner !== null) ev.push({ t: 'end', winner: state.winner, reason: state.reason });
    return ev;
  }

  // ── AI (적군과 자동 전투가 함께 쓴다) ────────────────────────
  function wantSkill(state, si, l) {
    const s = state.sides[si], o = state.sides[1 - si], c = s.field[l];
    const allies = s.field.filter(Boolean), foes = o.field.filter(Boolean), opp = o.field[l];
    const missing = allies.reduce((a, x) => a + (x.maxTroops - x.troops), 0), total = allies.reduce((a, x) => a + x.maxTroops, 0);
    switch (c.skill.arch) {
      case 'strike': case 'pierce': return true;
      case 'fury': return c.ready;
      case 'laststand': case 'rally': case 'inspire': return allies.filter((x) => x.ready).length >= 2;
      case 'wall': return foes.length >= 2 && allies.length >= 2;
      case 'volley': case 'flood': case 'scheme': case 'fire': case 'feint': return foes.length >= 2;
      case 'ambush': case 'discord': return !!opp && !opp.stunned;
      case 'relief': return missing >= total * 0.25;
      case 'reinforce': return missing >= total * 0.15 || s.hq < s.hqMax * 0.8;
      case 'build': return s.hq < s.hqMax * 0.82;
      case 'reform': return true;
    }
    return false;
  }

  // 한 행동씩 실행하며 이벤트를 내놓는다(화면이 행동마다 연출을 끼워 넣을 수 있도록 제너레이터로 작성).
  function* aiSteps(state, si) {
    const s = state.sides[si], o = state.sides[1 - si];
    // 1) 군령을 늘려 주는 개혁부터
    for (let l = 0; l < LANES; l++) if (canUseSkill(state, si, l) && s.field[l].skill.arch === 'reform') { const e = useSkill(state, si, l); if (e) yield e; }
    // 2) 배치: 상성 유리한 맞대응 우선, 빈 길엔 기병
    for (;;) {
      let best = null;
      s.hand.forEach((c, hi) => {
        if (c.cost > s.cmd) return;
        for (let l = 0; l < LANES; l++) {
          if (s.field[l]) continue;
          const opp = o.field[l];
          let sc = rand(state) * 8;
          if (opp) { sc += 15 + relation(c, opp) * 35 + (gv(c.stats.int) - gv(opp.stats.int)) * 0.4; if (opp.troops < opp.maxTroops * 0.4) sc += 10; }
          else if (c.unit === 'cav') sc += 12;
          if (!best || sc > best.sc) best = { sc, hi, l };
        }
      });
      if (!best) break;
      const e = deploy(state, si, best.hi, best.l);
      if (!e) break;
      yield e;
    }
    // 3) 계략
    for (let l = 0; l < LANES && state.winner === null; l++) if (canUseSkill(state, si, l) && wantSkill(state, si, l)) { const e = useSkill(state, si, l); if (e) yield e; }
    // 4) 남은 군령으로 병종 전법
    for (let l = 0; l < LANES && state.winner === null; l++) {
      if (!canUseTactic(state, si, l)) continue;
      const c = s.field[l], opp = o.field[l];
      const want = c.unit === 'cav' ? c.ready && (!opp || relation(c, opp) >= 0 || opp.troops < opp.maxTroops * 0.5)
                 : c.unit === 'spr' ? !!opp && opp.ready && !opp.stunned
                 : true;
      if (want) { const e = useTactic(state, si, l); if (e) yield e; }
    }
  }
  const aiAct = (state, si) => Array.from(aiSteps(state, si));

  /** 이번 턴에 먼저 배치하는 쪽. 홀수 턴은 선공 측, 짝수 턴은 후공 측(먼저 배치하면 패를 읽히므로 번갈아 맡는다). */
  function firstDeployer(state) {
    if (CFG.deployMode === 'initFirst') return state.init;
    if (CFG.deployMode === 'initLast') return 1 - state.init;
    return state.turn % 2 === 1 ? state.init : 1 - state.init;
  }

  /** 화면 없이 한 판을 끝까지 돌린다(시뮬레이션용). */
  function autoPlay(opts) {
    const st = createBattle(opts);
    let guard = 0;
    while (st.winner === null && guard++ < 200) {
      const first = firstDeployer(st);
      aiAct(st, first); if (st.winner !== null) break;
      aiAct(st, 1 - first); if (st.winner !== null) break;
      resolve(st);
      if (st.winner === null) beginTurn(st);
    }
    return st;
  }

  return { CFG, LANES, createBattle, beginTurn, canDeploy, deploy, canUseSkill, useSkill, canUseTactic, useTactic, resolve, aiAct, aiSteps, autoPlay, firstDeployer, randomDeck, relation, gv };
});
