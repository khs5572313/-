/* 삼국기 — 카드 전투 화면 & 공격·스킬 모션 연출 */
(function (S) {
  'use strict';
  const U = S.U, A = S.Art, el = U.el, $ = U.$;
  const BUI = {};
  const TERRAIN_NAME = { land: '평원', mountain: '산성 공방', pass: '관문 공방', river: '하천전', sea: '해전' };

  BUI.run = (info, opt) => new Promise((resolve) => {
    const b = new S.Battle(info);
    const ps = opt.playerSide, es = ps === 'a' ? 'd' : 'a';
    if (opt.auto) {
      const res = b.autoResolve();
      return BUI.summary(b, ps).then(() => resolve(res));
    }
    let busy = false, targeting = null, autoPlay = false;
    const root = el('div', { class: `battle t-${b.terrain}` });
    document.body.appendChild(root);
    const nA = b.attNation, nD = b.defNation;
    const enemyRow = el('div', { class: 'bt-row enemy' });
    const allyRow = el('div', { class: 'bt-row ally' });
    const stage = el('div', { class: 'bt-stage' }, el('div', { class: 'bt-msg' }));
    const hand = el('div', { class: 'bt-hand' });
    const energy = el('div', { class: 'bt-energy' });
    const info2 = el('div', { class: 'bt-info' });
    const top = el('div', { class: 'bt-top' });
    const links = el('div', { class: 'bt-links' });
    root.append(el('div', { class: 'bt-bg', html: bgArt(b) }), top, links, enemyRow, stage, allyRow,
      el('div', { class: 'bt-bottom' }, energy, hand, el('div', { class: 'bt-btns' }, info2,
        el('button', { class: 'btn gold', id: 'bt-end', onclick: () => !busy && endPlayerTurn() }, '턴 종료'),
        el('button', { class: 'btn sm', id: 'bt-auto', onclick: () => { autoPlay = !autoPlay; $('#bt-auto').classList.toggle('on', autoPlay); if (autoPlay && !busy && cur === ps) endPlayerTurn(true); } }, '자동'),
        ps === 'a' ? el('button', { class: 'btn sm red', onclick: () => { if (busy) return; b.over = true; b.winner = 'd'; finish(true); } }, '퇴각') : null)));
    const slotOf = (key) => root.querySelector(`.bu[data-key="${key}"]`);
    const renderTop = () => {
      const side = (n, s) => el('div', { class: `bt-side ${s === ps ? 'me' : ''}` }, el('span', { html: A.emblem(n, 34) }), el('div', {}, el('b', {}, S.nationName(n)), el('div', { class: 'small' }, s === 'a' ? '공격' : '수비')),
        el('div', { class: 'mor' }, el('div', { class: 'mlab' }, `사기 ${Math.round(b.morale[s])}`), el('div', { class: 'bar' }, el('div', { class: 'fill', style: { width: `${b.morale[s]}%`, background: S.NATIONS[n].color } }))));
      top.innerHTML = '';
      top.append(side(nA, 'a'), el('div', { class: 'bt-mid' }, el('div', { class: 'bt-city' }, `${b.city.name} ${b.city.hanja}`), el('div', { class: 'small' }, `${TERRAIN_NAME[b.terrain]} · ${b.round}/12 라운드`),
        b.wall0 > 0 ? el('div', { class: 'wallbar' }, el('span', {}, `성벽 ${Math.round(b.wall)}`), el('div', { class: 'bar' }, el('div', { class: 'fill', style: { width: `${(b.wall / Math.max(1, b.wall0)) * 100}%` } }))) : null), side(nD, 'd'));
      links.innerHTML = '';
      ['a', 'd'].forEach((s) => b.links[s].forEach((l) => links.appendChild(el('span', { class: `link-tag ${l.neg ? 'neg' : ''} ${s === ps ? 'me' : ''}` }, `🔗 ${l.name} ${l.bonus > 0 ? '+' : ''}${Math.round(l.bonus * 100)}%`))));
    };
    const unitEl = (u) => el('div', { class: `bu ${u.dead ? 'dead' : ''} ${u.stun ? 'stun' : ''}`, 'data-key': u.key, onclick: () => onUnitClick(u) },
      el('div', { class: 'bu-card', html: A.unitCard(u.oid, u.uid, u.nation, u.troops, { w: 116, h: 170 }) }),
      el('div', { class: 'bu-hp' }, el('div', { class: 'fill', style: { width: `${U.clamp((u.troops / u.troops0) * 100, 0, 100)}%` } }), el('span', {}, U.fmt(Math.max(0, u.troops)))),
      el('div', { class: 'bu-st' }, u.shield > 0 ? el('span', { class: 'b-sh' }, `🛡${U.fmt(u.shield)}`) : null, u.burn ? el('span', { class: 'b-bn' }, '🔥') : null, u.stun ? el('span', { class: 'b-sn' }, '💫') : null,
        u.atkUp ? el('span', { class: 'b-up' }, '⚔↑') : null, u.defUp ? el('span', { class: 'b-up' }, '🛡↑') : null, u.counter ? el('span', { class: 'b-up' }, '반격') : null));
    const renderUnits = () => {
      enemyRow.innerHTML = ''; allyRow.innerHTML = '';
      b.units(es).forEach((u) => enemyRow.appendChild(unitEl(u)));
      b.units(ps).forEach((u) => allyRow.appendChild(unitEl(u)));
      if (targeting) root.querySelectorAll(`.bt-row.enemy .bu:not(.dead)`).forEach((x) => x.classList.add('targetable'));
    };
    const renderHand = () => {
      hand.innerHTML = '';
      b.hands[ps].forEach((c) => {
        const ok = b.canPlay(ps, c) && cur === ps && !busy;
        const owner = b.unitByKey(c.owner);
        const ce = S.UI.cardEl(c);
        ce.classList.toggle('disabled', !ok);
        ce.classList.toggle('sel', targeting && targeting.uidx === c.uidx);
        ce.appendChild(el('div', { class: 'cowner' }, owner ? owner.name : ''));
        ce.addEventListener('click', () => onCard(c));
        ce.addEventListener('mouseenter', () => { const s = slotOf(c.owner); if (s) s.classList.add('hl'); });
        ce.addEventListener('mouseleave', () => { const s = slotOf(c.owner); if (s) s.classList.remove('hl'); });
        hand.appendChild(ce);
      });
      energy.innerHTML = '';
      energy.appendChild(el('div', { class: 'elab' }, '지휘력'));
      for (let i = 0; i < b.energyMax[ps]; i++) energy.appendChild(el('span', { class: `orb ${i < b.energy[ps] ? 'on' : ''}` }));
      info2.textContent = `덱 ${b.decks[ps].length} · 버린 패 ${b.discard[ps].length}`;
    };
    const render = () => { renderTop(); renderUnits(); renderHand(); };
    const msg = (t) => { const m = root.querySelector('.bt-msg'); m.textContent = t; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); };

    /* ── 연출 ── */
    const rel = (node) => { const r = node.getBoundingClientRect(), R = root.getBoundingClientRect(); return { x: r.left - R.left, y: r.top - R.top, w: r.width, h: r.height }; };
    const float = (key, text, cls) => {
      const s = slotOf(key); if (!s) return;
      const p = rel(s);
      const f = el('div', { class: `float ${cls}`, style: { left: `${p.x + p.w / 2}px`, top: `${p.y + p.h * 0.3}px` } }, text);
      root.appendChild(f); setTimeout(() => f.remove(), 1300);
    };
    const fxOn = (key, fx) => {
      const s = slotOf(key); if (!s) return;
      const p = rel(s);
      const f = el('div', { class: 'fxwrap', style: { left: `${p.x - 10}px`, top: `${p.y}px`, width: `${p.w + 20}px`, height: `${p.h}px` }, html: A.effect(fx) });
      root.appendChild(f); setTimeout(() => f.remove(), 900);
    };
    const showCard = async (side, card, srcKey) => {
      const ce = S.UI.cardEl(card);
      ce.classList.add('flycard', side === ps ? 'from-me' : 'from-foe');
      const owner = b.unitByKey(srcKey);
      ce.appendChild(el('div', { class: 'cowner' }, owner ? owner.name : ''));
      root.appendChild(ce);
      const s = slotOf(srcKey);
      if (s) { s.classList.add(side === ps ? 'lunge-up' : 'lunge-down'); setTimeout(() => s.classList.remove('lunge-up', 'lunge-down'), 520); }
      msg(`${owner ? owner.name : ''} — ${card.name}`);
      await U.sleep(520);
      setTimeout(() => ce.remove(), 400);
      ce.classList.add('out');
    };
    const animate = async (evs) => {
      for (const e of evs) {
        if (e.type === 'play') {
          await showCard(e.side, e.card, e.src);
          if (e.card.fx && (e.card.kind === 'buff' || e.card.kind === 'heal' || e.card.kind === 'def')) e.targets.forEach((k) => fxOn(k, e.card.fx));
          else if (e.card.fx) e.targets.forEach((k) => fxOn(k, e.card.fx));
          await U.sleep(260);
        } else if (e.type === 'dmg') {
          const s = slotOf(e.key);
          if (s) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
          if (e.burn) fxOn(e.key, 'fire');
          float(e.key, `-${U.fmt(e.v)}${e.counter ? ' 반격' : ''}${e.self ? ' 희생' : ''}`, e.mu > 1 ? 'crit' : 'dmg');
          if (e.mu > 1) float(e.key, '상성 유리!', 'tag');
          else if (e.mu < 1) float(e.key, '상성 불리', 'tag dim');
          updateUnit(e.key);
          await U.sleep(170);
        } else if (e.type === 'absorb') { float(e.key, `방어막 ${U.fmt(e.v)}`, 'shield'); }
        else if (e.type === 'shield') { float(e.key, `+🛡${U.fmt(e.v)}`, 'shield'); updateUnit(e.key); await U.sleep(120); }
        else if (e.type === 'heal') { float(e.key, `+${U.fmt(e.v)}`, 'heal'); updateUnit(e.key); await U.sleep(120); }
        else if (e.type === 'status') { float(e.key, e.s, 'status'); updateUnit(e.key); }
        else if (e.type === 'morale') { renderTop(); }
        else if (e.type === 'wall') { renderTop(); const w = root.querySelector('.wallbar'); if (w) { w.classList.add('hit'); } }
        else if (e.type === 'rout') { const s = slotOf(e.key); if (s) s.classList.add('dead'); float(e.key, '궤멸!', 'crit'); await U.sleep(300); }
      }
      renderTop();
    };
    const updateUnit = (key) => {
      const u = b.unitByKey(key), s = slotOf(key);
      if (!u || !s) return;
      const n = unitEl(u);
      s.querySelector('.bu-hp').replaceWith(n.querySelector('.bu-hp'));
      s.querySelector('.bu-st').replaceWith(n.querySelector('.bu-st'));
      const t = s.querySelector('.uc-troops'); if (t) t.textContent = U.fmt(Math.max(0, u.troops));
    };

    /* ── 진행 ── */
    let cur = null;
    const order = ['a', 'd'];
    const onCard = async (c) => {
      if (busy || cur !== ps) return;
      if (!b.canPlay(ps, c)) { msg(c.cost > b.energy[ps] ? '지휘력이 부족합니다' : '행동할 수 없는 부대입니다'); return; }
      if (c.target === 'enemy') {
        targeting = targeting && targeting.uidx === c.uidx ? null : c;
        render();
        if (targeting) msg('공격할 적 부대를 선택하십시오');
        return;
      }
      await doPlay(c, null);
    };
    const onUnitClick = async (u) => {
      if (!targeting || u.side !== es || u.dead) return;
      const c = targeting; targeting = null;
      await doPlay(c, u.key);
    };
    const doPlay = async (c, key) => {
      busy = true; render();
      const evs = b.play(ps, c, key);
      await animate(evs);
      busy = false; render();
      if (b.over) return finish();
    };
    const aiSide = async (side) => {
      cur = side;
      b.startTurn(side);
      render();
      msg(side === ps ? '아군 자동 지휘' : `${S.nationName(side === 'a' ? nA : nD)}군의 차례`);
      await U.sleep(450);
      let guard = 0;
      while (!b.over && guard++ < 10) {
        const c = b.aiPick(side);
        if (!c) break;
        const evs = b.play(side, c, null);
        await animate(evs);
        render();
      }
      b.endTurn(side);
    };
    let turnIdx = 0;
    const next = async () => {
      if (b.over) return finish();
      const side = order[turnIdx];
      if (side === ps && !autoPlay) {
        cur = ps; b.startTurn(ps); render(); msg(`${b.round}라운드 — 아군의 차례 (카드를 사용하십시오)`);
        return;
      }
      await aiSide(side);
      afterSide();
    };
    const afterSide = async () => {
      if (b.over) return finish();
      turnIdx++;
      if (turnIdx >= 2) {
        turnIdx = 0;
        const evs = b.endRound();
        await animate(evs);
        render();
        if (b.over) return finish();
      }
      next();
    };
    const endPlayerTurn = async (fromAuto) => {
      if (cur !== ps) return;
      targeting = null;
      if (!fromAuto) b.endTurn(ps);
      cur = null; render();
      if (fromAuto) { busy = true; let g = 0; while (!b.over && g++ < 10) { const c = b.aiPick(ps); if (!c) break; await animate(b.play(ps, c, null)); render(); } b.endTurn(ps); busy = false; }
      afterSide();
    };
    let finished = false;
    const finish = async (retreat) => {
      if (finished) return; finished = true;
      busy = true;
      render();
      await U.sleep(400);
      const win = b.winner === ps;
      const banner = el('div', { class: `bt-result ${win ? 'win' : 'lose'}` }, el('div', { class: 'big' }, win ? '勝' : '敗'), el('div', {}, win ? '승리!' : retreat ? '퇴각' : '패배…'));
      root.appendChild(banner);
      await U.sleep(1300);
      root.remove();
      await BUI.summary(b, ps);
      resolve(b.result());
    };
    render();
    msg(`${b.city.name} 전투 개시!`);
    setTimeout(next, 600);
  });

  BUI.summary = async (b, ps) => {
    const win = b.winner === ps;
    const row = (u) => el('tr', { class: u.dead ? 'dead' : '' }, el('td', { html: u.oid ? A.portrait(u.oid, 26) : '' }), el('td', {}, u.name), el('td', {}, S.UNITS[u.uid].name), el('td', {}, U.fmt(u.troops0)), el('td', {}, U.fmt(Math.max(0, u.troops))), el('td', { class: 'red' }, `-${U.fmt(Math.max(0, u.troops0 - Math.max(0, u.troops)))}`));
    const tbl = (side) => el('table', { class: 'sum' }, el('tr', {}, ['', '장수', '병종', '출진', '잔존', '손실'].map((h) => el('th', {}, h))), b.units(side).map(row));
    await S.UI.modal({ title: `${b.city.name} 전투 결과 — ${win ? '승리' : '패배'}`, wide: true, closable: false,
      body: el('div', { class: 'bsum' }, el('h3', {}, `${S.nationName(b.attNation)} (공격) ${b.winner === 'a' ? '승' : '패'}`), tbl('a'), el('h3', {}, `${S.nationName(b.defNation)} (수비) ${b.winner === 'd' ? '승' : '패'}`), tbl('d'),
        el('p', { class: 'muted' }, `${b.round > 12 ? 12 : b.round}라운드 · 성벽 피해 ${U.fmt(b.wallDmg)}`)),
      buttons: [{ label: '확인', cls: 'gold' }] });
  };

  const bgArt = (b) => {
    const t = b.terrain;
    const sky = { land: ['#6f8fa8', '#d9c9a0'], mountain: ['#5e6f7e', '#b8a98a'], pass: ['#7a6a5a', '#c8b48a'], river: ['#5f8fb0', '#a8c6d6'], sea: ['#3d6f99', '#7fb3d8'] }[t];
    let ground = '';
    if (t === 'river' || t === 'sea') ground = `<rect y="260" width="1200" height="340" fill="${t === 'sea' ? '#2f6a94' : '#4f86ae'}"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 90} ${300 + (i % 4) * 60} q22 -12 45 0 t45 0" stroke="#cfe6f5" stroke-width="3" fill="none" opacity=".5"/>`).join('')}`;
    else ground = `<path d="M0 230 L160 150 L300 210 L440 120 L600 200 L760 130 L920 210 L1060 140 L1200 200 V600 H0Z" fill="#6b6152" opacity=".55"/><rect y="270" width="1200" height="330" fill="${t === 'land' ? '#9a8a5a' : '#8a7a62'}"/>`;
    const castle = b.wall0 > 0 && t !== 'sea' && t !== 'river' ? `<g opacity=".55"><path d="M380 270 V200 H400 V185 H420 V200 H440 V185 H460 V200 H480 V185 H500 V200 H700 V185 H720 V200 H740 V185 H760 V200 H780 V185 H800 V200 H820 V270Z" fill="#7a705f"/><path d="M560 200 L600 160 L640 200Z" fill="#3e4a52"/></g>` : '';
    return `<svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="1200" height="600" fill="url(#bsky)"/>${ground}${castle}</svg>`;
  };
  S.BattleUI = BUI;
})(window.SGK);
