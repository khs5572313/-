/* 삼국기 — 카드 덱 전투
 * 엔진(Battle)은 UI와 분리: 자동 전투(AI vs AI)와 직접 지휘를 같은 규칙으로 처리
 * 한 라운드 = 아군 턴(카드 사용) → 적 턴 → 상태 효과 처리. 최대 12라운드, 시간 초과 시 수비측 승리 */
(function (S) {
  'use strict';
  const U = S.U, G = S.G;
  const MAX_ROUNDS = 12, HAND = 5;

  const mkUnit = (side, idx, def, nation) => {
    const o = def.oid ? S.officerById[def.oid] : null;
    const s = def.oid ? G.ostat(def.oid).slice() : [52, 52, 45, 45];
    const u = S.UNITS[def.uid];
    return { side, idx, key: `${side}${idx}`, oid: def.oid, uid: def.uid, cls: u.cls, nation, name: o ? o.name : '수비대장',
      s, troops: def.troops, troops0: def.troops, merged: def.merged || {}, shield: 0, burn: 0, stun: 0, atkUp: 0, atkT: 0, defUp: 0, defT: 0, counter: null, dead: false };
  };

  class Battle {
    constructor(info, opt = {}) {
      const st = S.state;
      this.info = info;
      this.city = S.cityById[info.to];
      this.cs = st.cities[info.to];
      this.attNation = info.attNation;
      this.defNation = this.cs.owner;
      this.terrain = info.edgeType === 'land' ? (this.city.type === 'pass' ? 'pass' : this.city.type === 'mountain' || this.city.type === 'wall' ? 'mountain' : 'land') : info.edgeType === 'river' ? 'river' : 'sea';
      this.wall = this.cs.wall;
      this.wall0 = this.cs.wall;
      this.att = info.att.map((d, i) => mkUnit('a', i, d, this.attNation));
      this.def = (info.def || G.defenseArmy(info.to)).map((d, i) => mkUnit('d', i, d, this.defNation));
      if (!this.def.length) this.def = [mkUnit('d', 0, { oid: null, uid: 'spear', troops: 300 }, this.defNation)];
      this.round = 1;
      this.morale = { a: 65 + this.moraleBonus('a'), d: 65 + this.moraleBonus('d') };
      this.links = { a: this.activeLinks(this.att), d: this.activeLinks(this.def) };
      this.decks = { a: this.buildDeck(this.att, 'a'), d: this.buildDeck(this.def, 'd') };
      this.hands = { a: [], d: [] };
      this.discard = { a: [], d: [] };
      this.energyMax = { a: this.calcEnergy(this.att), d: this.calcEnergy(this.def) + (this.cs.buildings.includes('chi') ? 1 : 0) };
      this.energy = { a: 0, d: 0 };
      this.log = [];
      this.over = false;
      this.winner = null;
      this.wallDmg = 0;
      this.onEvent = opt.onEvent || null;
    }
    units(side) { return side === 'a' ? this.att : this.def; }
    foe(side) { return side === 'a' ? 'd' : 'a'; }
    nationOf(side) { return side === 'a' ? this.attNation : this.defNation; }
    moraleBonus(side) {
      const n = this.nationOf(side);
      const N = S.state.nations[n];
      let b = N ? N.morale.v || 0 : 0;
      const us = side === 'a' ? this.info.att : null;
      const list = side === 'a' ? this.info.att : G.defenseArmy(this.info.to);
      for (const d of list) if (d.oid) b += G.passive(d.oid, 'morale');
      if (list.some((d) => d.uid === 'hwarang')) b += 10;
      if (side === 'd' && this.city.type === 'capital') b += 10;
      return U.clamp(b, -40, 35);
    }
    activeLinks(units) {
      const ids = units.map((u) => u.oid).filter(Boolean);
      return S.LINKS.filter((l) => { const have = l.members.filter((m) => ids.includes(m)).length; return have >= (l.min || l.members.length); });
    }
    calcEnergy(units) {
      const top = Math.max(...units.map((u) => u.s[0]));
      return 3 + (top >= 90 ? 1 : 0);
    }
    buildDeck(units, side) {
      const deck = [];
      let n = 0;
      const add = (card, owner) => deck.push(Object.assign({ uidx: ++n, owner }, card));
      for (const u of units) {
        const base = S.CLASS_DECK[u.cls] || S.CLASS_DECK.spear;
        for (const cid of base) add(Object.assign({ id: cid }, S.CARDS[cid]), u.key);
        if (u.uid === 'xbow' || u.uid === 'cheonbo') add(Object.assign({ id: 'pierce' }, S.CARDS.pierce), u.key);
        if (u.uid === 'gangung') add(Object.assign({ id: 'volley' }, S.CARDS.volley), u.key);
        if (u.oid) {
          const o = S.officerById[u.oid];
          if (u.s[2] >= 80) add(Object.assign({ id: u.s[2] >= 90 ? 'ambush' : 'firetac' }, S.CARDS[u.s[2] >= 90 ? 'ambush' : 'firetac']), u.key);
          if (u.s[2] >= 75) add(Object.assign({ id: 'confuse' }, S.CARDS.confuse), u.key);
          if (u.s[0] >= 85) add(Object.assign({ id: 'rally' }, S.CARDS.rally), u.key);
          if (u.s[3] >= 82) add(Object.assign({ id: 'regroup' }, S.CARDS.regroup), u.key);
          const sp = S.SPECIALS_AB[o.sp];
          if (sp && sp.card) { add(Object.assign({ id: 'sp_' + o.sp, special: true, stat: 'war' }, sp.card), u.key); add(Object.assign({ id: 'sp_' + o.sp, special: true, stat: 'war' }, sp.card), u.key); }
        }
        add(Object.assign({ id: 'guard' }, S.CARDS.guard), u.key);
      }
      for (const l of this.links[side]) if (l.card) {
        const lead = units.find((u) => l.members.includes(u.oid));
        add(Object.assign({ id: 'link_' + l.id, link: true, stat: 'lead' }, l.card), lead.key);
        add(Object.assign({ id: 'link_' + l.id, link: true, stat: 'lead' }, l.card), lead.key);
      }
      return U.shuffle(deck);
    }
    unitByKey(k) { return this.att.concat(this.def).find((u) => u.key === k); }
    alive(side) { return this.units(side).filter((u) => !u.dead); }
    draw(side, n) {
      for (let i = 0; i < n; i++) {
        if (!this.decks[side].length) { this.decks[side] = U.shuffle(this.discard[side]); this.discard[side] = []; }
        let c = this.decks[side].shift();
        let guard = 0;
        while (c && this.unitByKey(c.owner).dead && guard++ < 60) { if (!this.decks[side].length) { this.decks[side] = U.shuffle(this.discard[side]); this.discard[side] = []; } c = this.decks[side].shift(); }
        if (c && !this.unitByKey(c.owner).dead) this.hands[side].push(c);
      }
    }
    startTurn(side) {
      this.energy[side] = this.energyMax[side];
      this.hands[side] = this.hands[side].filter((c) => !this.unitByKey(c.owner).dead);
      this.draw(side, Math.max(0, HAND - this.hands[side].length));
    }
    endTurn(side) {
      /* 손패 유지(최대 HAND), 사용 안 한 카드 일부 버림 */
      while (this.hands[side].length > HAND - 1) this.discard[side].push(this.hands[side].shift());
    }
    canPlay(side, card) {
      if (this.over) return false;
      if (card.cost > this.energy[side]) return false;
      const u = this.unitByKey(card.owner);
      if (!u || u.dead || u.stun > 0) return false;
      return true;
    }
    linkBonus(side) { return this.links[side].reduce((a, l) => a + l.bonus, 0); }
    statOf(u, stat) { return u.s[{ war: 1, int: 2, lead: 0, pol: 3 }[stat] || 1]; }
    /* 핵심 피해 공식 */
    damage(src, tgt, card, side) {
      const U2 = S.UNITS;
      const stat = card.stat || 'war';
      const tac = card.kind === 'tac';
      const sv = this.statOf(src, stat);
      const tv = tac ? tgt.s[2] : tgt.s[1] * 0.5 + tgt.s[0] * 0.5;
      const ua = U2[src.uid], ud = U2[tgt.uid];
      let atk = (0.55 + sv / 100) * (tac ? 1 : ua.atk);
      let def = (0.55 + tv / 100) * (tac ? 1 : ud.def);
      if (card.ignoreDef) def = 0.9;
      const mu = tac ? 1 : (S.MATCHUP[src.cls] || {})[tgt.cls] || 1;
      const nA = this.nationOf(src.side), nD = this.nationOf(tgt.side);
      const nb = S.NATIONS[nA].bonus || {};
      let m = 1;
      m *= 1 + src.atkUp + (S.state.nations[nA] ? S.state.nations[nA].atk.v || 0 : 0) + this.linkBonus(src.side);
      if (src.oid) m *= 1 + G.passive(src.oid, 'atk') + (src.cls === 'cav' ? G.passive(src.oid, 'cav') + (nb.cav || 0) : 0) + (src.cls === 'bow' ? G.passive(src.oid, 'bow') : 0) + (tac ? G.passive(src.oid, 'tactic') : 0);
      /* 특산품 기술 모드 */
      const homeCity = src.side === 'a' ? this.info.from : this.info.to;
      const hc = S.state.cities[homeCity], sp = S.SPECIALS[S.cityById[homeCity].special];
      if (hc && hc.specialMode === 'tech' && sp && ((sp.tech === 'cav' && src.cls === 'cav') || (sp.tech === 'bow' && src.cls === 'bow'))) m *= 1.08;
      if (hc && src.cls === 'bow' && hc.buildings.includes('workshop')) m *= 1.05;
      /* 지형 */
      const water = this.terrain === 'river' || this.terrain === 'sea';
      if (src.cls === 'navy') m *= water ? 1.4 : 0.8;
      else if (water && src.side === 'a') m *= 0.8;
      if (water) m *= 1 + (src.oid ? G.passive(src.oid, 'naval') : 0) + (nb.naval || 0);
      if (this.terrain === 'mountain' && src.side === 'a' && src.cls === 'cav') m *= 0.8;
      if (card.terrainBonus && card.terrainBonus[this.terrain === 'mountain' ? 'land' : this.terrain]) m *= card.terrainBonus[this.terrain === 'mountain' ? 'land' : this.terrain];
      if (card.terrainBonus && this.city.type === 'pass' && card.terrainBonus.pass) m *= card.terrainBonus.pass;
      if (card.firstTurn && this.round === 1) m *= card.firstTurn;
      if (card.lowHpBonus) m *= 1 + card.lowHpBonus * (1 - src.troops / src.troops0);
      if (src.uid === 'gyeolsa') m *= 1 + 0.5 * (1 - src.troops / src.troops0);
      if (src.uid === 'cheonbo' && src.side === 'd') m *= 1.2;
      if (src.uid === 'gangung' && card.target === 'allEnemy') m *= 1.3;
      /* 훈련도 */
      const tr = src.side === 'a' ? S.state.cities[this.info.from].train : this.cs.train;
      m *= 0.85 + tr / 330;
      /* 사기 */
      m *= 0.7 + this.morale[src.side] / 200;
      /* 수비측: 성벽·지형 보너스 */
      if (tgt.side === 'd' && this.terrain !== 'river' && this.terrain !== 'sea') {
        const tp = S.CITY_TYPES[this.city.type];
        let db = tp.defBonus + G.bldEff(this.cs, 'def') + G.wonderEff(this.defNation, 'defAll');
        if (this.city.type === 'mountain' && nD === 'goguryeo') db += 0.2;
        db += (S.NATIONS[nD].bonus || {}).cityDef || 0;
        if (tgt.oid) db += G.passive(tgt.oid, 'def');
        def *= 1 + db;
        if (!(card.wall)) def *= 1 + this.wall / 1600;
      } else if (tgt.oid) def *= 1 + G.passive(tgt.oid, 'def') * 0.5;
      def *= 1 + tgt.defUp;
      const sq = Math.sqrt(Math.max(100, src.troops) / 1000);
      let dmg = card.pow * 22 * sq * (atk / def) * mu * m * U.rf(0.9, 1.1);
      if (src.uid === 'siege' || src.uid === 'pocha') dmg *= card.wall ? 1 : 0.8;
      return { dmg: Math.max(10, Math.round(dmg)), mu };
    }
    /* 카드 사용 → 결과 이벤트 배열 반환 (UI 애니메이션용) */
    play(side, card, targetKey) {
      const evs = [];
      if (!this.canPlay(side, card)) return evs;
      this.energy[side] -= card.cost;
      this.hands[side] = this.hands[side].filter((c) => c.uidx !== card.uidx);
      this.discard[side].push(card);
      const src = this.unitByKey(card.owner);
      const foe = this.foe(side);
      let targets = [];
      if (card.target === 'enemy') { let t = targetKey ? this.unitByKey(targetKey) : null; if (!t || t.dead || t.side !== foe) t = this.aiTarget(side, card); if (t) targets = [t]; }
      else if (card.target === 'allEnemy') targets = this.alive(foe);
      else if (card.target === 'self') targets = [src];
      else if (card.target === 'allAlly') targets = this.alive(side);
      else if (card.target === 'ally') targets = [targetKey ? this.unitByKey(targetKey) : src];
      evs.push({ type: 'play', side, card, src: src.key, targets: targets.map((t) => t.key) });
      const name = card.name;
      /* 자기 희생 */
      if (card.selfCost) { const loss = Math.round(src.troops * card.selfCost); src.troops -= loss; evs.push({ type: 'dmg', key: src.key, v: loss, self: true }); }
      for (const t of targets) {
        if (card.kind === 'atk' || (card.kind === 'tac' && card.pow > 0)) {
          let { dmg, mu } = this.damage(src, t, card, side);
          if (targets.length > 1) dmg = Math.round(dmg * 0.75);
          if (t.shield > 0 && !card.pierce) { const ab = Math.min(t.shield, dmg); t.shield -= ab; dmg -= ab; evs.push({ type: 'absorb', key: t.key, v: ab }); }
          t.troops -= dmg;
          evs.push({ type: 'dmg', key: t.key, v: dmg, mu, fx: card.fx });
          if (t.counter === src.cls && card.kind === 'atk') { const back = Math.round(dmg * 0.5); src.troops -= back; evs.push({ type: 'dmg', key: src.key, v: back, counter: true }); }
          if (card.wall && t.side === 'd' && this.wall > 0) { const wd = Math.round(card.pow * 6 * card.wall * (1 + (S.NATIONS[this.attNation].bonus.siege || 0) + (src.oid ? G.passive(src.oid, 'siege') : 0))); this.wall = Math.max(0, this.wall - wd); this.wallDmg += wd; evs.push({ type: 'wall', v: wd }); }
          if (card.burn) { t.burn = Math.max(t.burn, card.burn); evs.push({ type: 'status', key: t.key, s: '화상' }); }
          if (card.stun) this.tryStun(src, t, card, evs);
          const lossRatio = dmg / Math.max(1, t.troops0);
          this.morale[t.side] = U.clamp(this.morale[t.side] - lossRatio * 25, 0, 100);
        } else if (card.kind === 'tac' && card.stun) this.tryStun(src, t, card, evs);
        if (card.kind === 'def') {
          let sh = Math.round((card.pow || 10) * 24 * Math.sqrt(Math.max(100, t.troops) / 1000) * (0.6 + this.statOf(src, card.stat || 'lead') / 100));
          if (side === 'd' && (card.fx === 'wall')) sh = Math.round(sh * 1.5);
          if (card.terrainBonus && this.city.type === 'pass' && card.terrainBonus.pass) sh = Math.round(sh * card.terrainBonus.pass);
          t.shield += sh;
          if (card.counter) t.counter = card.counter;
          evs.push({ type: 'shield', key: t.key, v: sh });
        }
        if (card.kind === 'heal') {
          let h = 0;
          if (card.summon) h = card.summon; else h = Math.round(t.troops0 * ((card.pow || 6) / 100) * (0.6 + this.statOf(src, card.stat || 'pol') / 100));
          t.troops += h;
          if (card.summon) t.troops0 += Math.round(h * 0.5);
          if (card.cleanse) { t.burn = 0; t.stun = 0; }
          evs.push({ type: 'heal', key: t.key, v: h });
        }
        if (card.atkUp) { t.atkUp = card.atkUp; t.atkT = card.turns || 2; }
        if (card.defUp) { t.defUp = card.defUp; t.defT = card.turns || 2; }
      }
      if (card.morale) { this.morale[side] = U.clamp(this.morale[side] + card.morale, 0, 100); evs.push({ type: 'morale', side, v: card.morale }); }
      if (card.moraleDmg) { this.morale[foe] = U.clamp(this.morale[foe] - card.moraleDmg, 0, 100); evs.push({ type: 'morale', side: foe, v: -card.moraleDmg }); }
      if (card.draw) this.draw(side, card.draw);
      this.checkDeaths(evs);
      this.log.unshift(`${side === 'a' ? '공' : '수'} ${src.name}: ${name}`);
      this.checkOver(evs);
      return evs;
    }
    tryStun(src, t, card, evs) {
      const p = U.clamp(0.55 + (src.s[2] - t.s[2]) / 80, 0.15, 0.95);
      if (Math.random() < p) { t.stun = Math.max(t.stun, card.stun); evs.push({ type: 'status', key: t.key, s: '혼란' }); }
      else evs.push({ type: 'status', key: t.key, s: '간파!' });
    }
    checkDeaths(evs) {
      for (const u of this.att.concat(this.def)) if (!u.dead && u.troops <= 0) { u.troops = 0; u.dead = true; evs.push({ type: 'rout', key: u.key }); this.morale[u.side] = Math.max(0, this.morale[u.side] - 15); }
    }
    checkOver(evs) {
      if (this.over) return;
      if (!this.alive('a').length || this.morale.a <= 0) { this.over = true; this.winner = 'd'; }
      else if (!this.alive('d').length || this.morale.d <= 0) { this.over = true; this.winner = 'a'; }
      if (this.over && evs) evs.push({ type: 'over', winner: this.winner });
    }
    /* 라운드 종료 처리: 화상, 상태 감소 */
    endRound() {
      const evs = [];
      for (const u of this.att.concat(this.def)) {
        if (u.dead) continue;
        if (u.burn > 0) { const d = Math.round(u.troops * 0.06 + 60); u.troops -= d; u.burn--; evs.push({ type: 'dmg', key: u.key, v: d, fx: 'fire', burn: true }); }
        if (u.stun > 0) u.stun--;
        if (u.atkT > 0 && --u.atkT === 0) u.atkUp = 0;
        if (u.defT > 0 && --u.defT === 0) u.defUp = 0;
        u.shield = Math.round(u.shield * 0.5);
        u.counter = null;
      }
      this.checkDeaths(evs);
      this.round++;
      if (this.round > MAX_ROUNDS && !this.over) {
        /* 시간 초과: 공격측 잔존 병력이 수비측의 1.3배를 넘으면 공격측 승(성을 포위해 함락), 아니면 수비측 승 */
        const rem = (side) => this.alive(side).reduce((a, u) => a + Math.max(0, u.troops), 0);
        const w = rem('a') > rem('d') * 1.3 ? 'a' : 'd';
        this.over = true; this.winner = w; evs.push({ type: 'over', winner: w, timeout: true });
      }
      this.checkOver(evs);
      return evs;
    }
    /* AI: 카드 선택 */
    aiTarget(side, card) {
      const foes = this.alive(this.foe(side));
      if (!foes.length) return null;
      const src = this.unitByKey(card.owner);
      return foes.slice().sort((a, b) => {
        const ma = (S.MATCHUP[src.cls] || {})[a.cls] || 1, mb = (S.MATCHUP[src.cls] || {})[b.cls] || 1;
        return mb * 3000 / (b.troops + b.shield + 300) - ma * 3000 / (a.troops + a.shield + 300);
      })[0];
    }
    aiPick(side) {
      const playable = this.hands[side].filter((c) => this.canPlay(side, c));
      if (!playable.length) return null;
      const me = this.alive(side);
      const weak = me.some((u) => u.troops < u.troops0 * 0.4);
      const score = (c) => {
        let v = (c.pow || 0) * (c.target === 'allEnemy' ? this.alive(this.foe(side)).length * 0.8 : 1);
        if (c.special || c.link) v += 8;
        if (c.kind === 'heal') v = weak ? 18 : 4;
        if (c.kind === 'def') v = weak ? 14 : 6;
        if (c.kind === 'buff') v = this.round <= 2 ? 16 : 8;
        if (c.stun) v += 7;
        if (c.wall && this.wall > 200 && side === 'a') v += 8;
        return v / Math.max(1, c.cost * 0.8);
      };
      return playable.sort((a, b) => score(b) - score(a))[0];
    }
    aiTurn(side) {
      const all = [];
      this.startTurn(side);
      let guard = 0;
      while (!this.over && guard++ < 10) {
        const c = this.aiPick(side);
        if (!c) break;
        all.push(this.play(side, c));
      }
      this.endTurn(side);
      return all;
    }
    /* 자동 전투 (양측 AI) */
    autoResolve() {
      while (!this.over) {
        this.aiTurn('a');
        if (this.over) break;
        this.aiTurn('d');
        if (this.over) break;
        this.endRound();
      }
      return this.result();
    }
    result() {
      return { winner: this.winner, attUnits: this.att.map((u) => ({ uid: u.uid, troops: u.troops, oid: u.oid })),
        defUnits: this.def.map((u) => ({ uid: u.uid, troops: u.troops, troops0: u.troops0, merged: u.merged, oid: u.oid })), wallDmg: this.wallDmg, rounds: this.round };
    }
  }
  S.Battle = Battle;
})(window.SGK);
