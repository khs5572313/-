/* 삼국기 — 화면/연출 v0.2. 엔진이 돌려준 이벤트를 순서대로 재생한다. */
(function () {
  'use strict';
  const D = SGData, E = SGEngine, P = SGPortrait;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ME = 0, FOE = 1;

  let B = null;            // 현재 전투 상태
  let setup = null;        // 다시하기용 설정 {title, sides:[{nation, deck}, {nation}]}
  let selected = -1;       // 선택한 손패 인덱스
  let busy = true;         // 연출 중 입력 잠금
  let waiting = null;      // 플레이어 배치를 기다리는 중이면 resolve 함수
  let auto = false;
  let speed = 1;
  let token = 0;           // 전투가 바뀌면 진행 중이던 루프를 멈추기 위한 표식

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms / speed));
  const natStyle = (n) => `--nc:${D.NATIONS[n].color};--nc2:${D.NATIONS[n].color2}`;
  const archOf = (g) => D.ARCH[g.skill.arch];

  // ── 카드 ────────────────────────────────────────────────────
  function cardHTML(g, c, where, extraCls) {
    const onField = where === 'field';
    const max = c ? c.maxTroops : E.gv(g.stats.lead) * 10;
    const troops = c ? c.troops : max;
    const ready = onField && c.cd === 0 && !c.stunned;
    const cls = ['card']; if (extraCls) cls.push(extraCls);
    if (ready) cls.push('sk-ready');
    if (onField && c.burn) cls.push('burning');
    if (onField && c.guard) cls.push('guarding');
    let tag = '';
    if (onField && c.stunned) tag = '<div class="tag stun">혼란</div>';
    else if (onField && !c.ready) tag = '<div class="tag prep">정비 중</div>';
    let bufs = '', sts = '';
    if (onField) {
      const a = c.buffs.filter((b) => b.k === 'atk').reduce((x, b) => x + b.v, 0);
      const d = c.buffs.filter((b) => b.k === 'def').reduce((x, b) => x + b.v, 0);
      if (a || d) bufs = `<div class="bufs">${a > 0 ? `<span class="atk">공+${Math.round(a * 100)}%</span>` : ''}${a < 0 ? `<span class="dn">공${Math.round(a * 100)}%</span>` : ''}${d ? `<span class="def">방+${Math.round(d * 100)}%</span>` : ''}</div>`;
      const st = (c.charge ? '<span class="s-charge">돌격</span>' : '') + (c.guard ? '<span class="s-guard">방진</span>' : '') + (c.burn ? `<span class="s-burn">화상 ${c.burn.turns}</span>` : '');
      if (st) sts = `<div class="sts">${st}</div>`;
    }
    const sk = onField && c.cd > 0 ? `${g.skill.name} · ${c.cd}턴` : g.skill.name;
    return `<div class="${cls.join(' ')}" style="${natStyle(g.nation)}" data-gid="${g.id}"${c ? ` data-uid="${c.uid}"` : ''} data-max="${max}">
      <div class="cls cls-${g.cls}">${g.cls === 'm' ? '武' : '文'}</div><div class="ubadge u-${g.unit}">${D.UNITS[g.unit].hanja}</div>
      ${where === 'pick' || where === 'hand' ? '<div class="info" data-info="1">i</div>' : ''}
      ${P.html(g)}${tag}${bufs}${sts}
      <div class="nm">${g.name}</div>
      <div class="stats">${D.STAT_KEYS.map((k) => `<span>${D.STATS[k].short}<b class="g-${g.stats[k]}">${g.stats[k]}</b></span>`).join('')}</div>
      <div class="troops"><i style="width:${100 * troops / max}%"></i><em>${troops}</em></div>
      <div class="sk">${sk}</div>
    </div>`;
  }

  function filterTabs(el, onChange) {
    const tabs = [['all', '전체'], ['m', '무인'], ['c', '문인'], ['cav', '기병'], ['spr', '창병'], ['arc', '궁병']];
    el.innerHTML = tabs.map(([k, n], i) => `<button class="btn ghost${i ? '' : ' on'}" data-f="${k}">${n}</button>`).join('');
    el.onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; $$('.btn', el).forEach((x) => x.classList.toggle('on', x === b)); onChange(b.dataset.f); };
  }
  const passes = (g, f) => f === 'all' || g.cls === f || g.unit === f;

  // ── 타이틀 ──────────────────────────────────────────────────
  function initTitle() {
    $('#scenario-list').innerHTML = D.SCENARIOS.map((s, i) => `
      <div class="scn"><div class="scn-head"><span class="scn-year">${s.year}년</span><span class="scn-name">${s.name}</span><span class="scn-size${s.lanes === 5 ? ' big' : ''}">${s.lanes === 5 ? '대회전 5대5' : '3대3'}</span></div>
      <div class="scn-desc">${s.desc}</div>
      <div class="scn-sides"><span>진영 선택 ▸</span>${s.sides.map((n, k) =>
        `<button class="btn nbtn" style="${natStyle(n)}" data-scn="${i}" data-pick="${k}">${D.NATIONS[n].name}</button>`).join('<span>vs</span>')}</div></div>`).join('');
    $('#scenario-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-scn]'); if (!b) return;
      const s = D.SCENARIOS[+b.dataset.scn], k = +b.dataset.pick;
      openDeck({ title: `${s.year}년 ${s.name}`, lanes: s.lanes || 3, sides: [{ nation: s.sides[k] }, { nation: s.sides[1 - k] }] });
    });
    const opts = Object.keys(D.NATIONS).map((n) => `<option value="${n}">${D.NATIONS[n].name}</option>`).join('');
    $('#free-a').innerHTML = opts; $('#free-b').innerHTML = opts; $('#free-b').value = 'tang';
    $('#free-start').onclick = () => openDeck({ title: '자유 대전', lanes: +$('#free-size').value, sides: [{ nation: $('#free-a').value }, { nation: $('#free-b').value }] });

    let gNat = 'goguryeo', gF = 'all';
    const draw = () => {
      $$('#gallery-tabs .btn').forEach((b) => b.classList.toggle('on', b.dataset.nat === gNat));
      const list = D.ROSTER[gNat].map((id) => D.GENERALS[id]).filter((g) => passes(g, gF));
      $('#gallery').innerHTML = list.map((g) => cardHTML(g)).join('');
      $('#gallery-count').textContent = `${D.NATIONS[gNat].name} ${list.length}명 — 카드를 누르면 사료 근거가 나옵니다`;
    };
    $('#gallery-tabs').innerHTML = Object.keys(D.NATIONS).map((n) => `<button class="btn ghost" data-nat="${n}">${D.NATIONS[n].name}</button>`).join('');
    $('#gallery-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-nat]'); if (b) { gNat = b.dataset.nat; draw(); } });
    filterTabs($('#gallery-filter'), (f) => { gF = f; draw(); });
    $('#gallery').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) showDetail(D.GENERALS[c.dataset.gid]); });
    draw();
  }

  function show(screen) {
    ['title', 'deck', 'battle'].forEach((s) => { $('#screen-' + s).hidden = s !== screen; });
    window.scrollTo(0, 0);
  }

  // ── 덱 편성 ─────────────────────────────────────────────────
  let deckCfg = null, deckSel = [], deckF = 'all', deckSize = 10;
  function openDeck(cfg) {
    deckCfg = cfg; deckF = 'all'; deckSize = E.sizeRules(cfg.lanes).deckSize;
    deckSel = E.randomDeck(cfg.sides[0].nation, Math.random, 'mix', deckSize);
    $('#deck-help').innerHTML = `출전할 장수 <b>${deckSize}명</b>을 고르세요(${cfg.lanes}대${cfg.lanes} 전투). 카드를 누르면 선택/해제, <b>ⓘ</b>를 누르면 사료 근거가 나옵니다.` + (cfg.lanes === 5 ? ' 대회전은 카드가 작아지므로 휴대폰에서는 가로 화면을 권합니다.' : '');
    $('#deck-title').textContent = `${cfg.title} — ${D.NATIONS[cfg.sides[0].nation].name} 덱 편성`;
    filterTabs($('#deck-filter'), (f) => { deckF = f; drawDeck(); });
    drawDeck(); show('deck');
  }
  function drawDeck() {
    const n = deckCfg.sides[0].nation, sel = deckSel.map((id) => D.GENERALS[id]);
    const cnt = (f) => sel.filter(f).length;
    $('#deck-count').innerHTML = `선택 ${sel.length} / ${deckSize}<small>무인 ${cnt((g) => g.cls === 'm')} · 문인 ${cnt((g) => g.cls === 'c')} ｜ 기병 ${cnt((g) => g.unit === 'cav')} · 창병 ${cnt((g) => g.unit === 'spr')} · 궁병 ${cnt((g) => g.unit === 'arc')}</small>`;
    $('#deck-go').disabled = sel.length !== deckSize;
    $('#deck-grid').innerHTML = D.ROSTER[n].map((id) => D.GENERALS[id]).filter((g) => passes(g, deckF))
      .map((g) => cardHTML(g, null, 'pick', deckSel.indexOf(g.id) >= 0 ? 'picked' : (sel.length >= deckSize ? 'dim' : ''))).join('');
  }
  function bindDeck() {
    $('#deck-grid').addEventListener('click', (e) => {
      const c = e.target.closest('.card'); if (!c) return;
      const id = c.dataset.gid;
      if (e.target.closest('[data-info]')) return showDetail(D.GENERALS[id]);
      const i = deckSel.indexOf(id);
      if (i >= 0) deckSel.splice(i, 1); else if (deckSel.length < deckSize) deckSel.push(id);
      drawDeck();
    });
    $('#deck-auto').onclick = () => { deckSel = E.randomDeck(deckCfg.sides[0].nation, Math.random, 'mix', deckSize); drawDeck(); };
    $('#deck-clear').onclick = () => { deckSel = []; drawDeck(); };
    $('#deck-back').onclick = () => show('title');
    $('#deck-go').onclick = () => startBattle({ title: deckCfg.title, lanes: deckCfg.lanes, sides: [{ nation: deckCfg.sides[0].nation, deck: deckSel.slice() }, { nation: deckCfg.sides[1].nation }] });
  }

  // ── 전투 화면 그리기 ────────────────────────────────────────
  function barHTML(si) {
    const s = B.sides[si], N = D.NATIONS[s.nation];
    return `<div class="nat">${N.name}<small>${si === ME ? '아군' : '적군'}</small>${B.init === si ? '<span class="init-badge">선공</span>' : ''}</div>
      <div class="meters">
        <div class="meter hq"><i id="hq-${si}" style="width:${100 * s.hq / s.hqMax}%"></i><em id="hqt-${si}">본진 ${s.hq}</em></div>
        <div class="meter mo"><i id="mo-${si}" style="width:${s.morale}%"></i><em id="mot-${si}">사기 ${s.morale}</em></div>
      </div>
      <div class="cnt">패 ${s.hand.length} · 덱 ${s.deck.length}</div>`;
  }
  function setHq(si, v) { const s = B.sides[si], el = $('#hq-' + si); if (!el) return; el.style.width = (100 * v / s.hqMax) + '%'; $('#hqt-' + si).textContent = '본진 ' + v; }
  function sync(e) {       // 이벤트에 실린 사기·본진 값을 막대에 반영
    if (e.morale) [0, 1].forEach((si) => { $('#mo-' + si).style.width = e.morale[si] + '%'; $('#mot-' + si).textContent = '사기 ' + e.morale[si]; });
    if (e.hq) [0, 1].forEach((si) => setHq(si, e.hq[si]));
  }

  function render() {
    [ME, FOE].forEach((si) => {
      const s = B.sides[si];
      const bar = $('#bar-' + si); bar.style.cssText = natStyle(s.nation); bar.innerHTML = barHTML(si);
      $('#row-' + si).innerHTML = s.field.map((c, l) => {
        const can = si === ME && !busy && selected >= 0 && E.canDeploy(B, ME, selected, l);
        return `<div class="lane${can ? ' can' : ''}" data-side="${si}" data-lane="${l}">${c ? cardHTML(D.GENERALS[c.gid], c, 'field') : (can ? '배치' : '')}</div>`;
      }).join('');
    });
    const me = B.sides[ME];
    $('#hand').innerHTML = me.hand.length ? me.hand.map((c, i) =>
      cardHTML(D.GENERALS[c.gid], c, 'hand', (i === selected ? 'selected' : '') + (c.cost > me.cmd ? ' unaffordable' : '')).replace('<div class="card', `<div data-hand="${i}" class="card`)).join('')
      : '<div class="hand-empty">손패가 없습니다.</div>';
    let pips = '';
    for (let i = 0; i < Math.max(me.cmdMax, me.cmd); i++) pips += `<span class="pip${i < me.cmd ? '' : ' off'}"></span>`;
    $('#cmd-box').innerHTML = `<b>군령 ${me.cmd}</b>${pips}`;
    $('#turn-label').textContent = `${B.turn}턴 / ${E.CFG.turnLimit}`;
    $('#btn-fight').disabled = busy || B.winner !== null;
    const first = E.firstDeployer(B);
    $('#btn-fight').textContent = first === ME ? '배치 완료 → 적 대응' : '배치 완료 → 교전 ⚔';
    $('#phase-label').textContent = busy ? (auto ? '— 자동 전투 —' : '— 진행 중 —')
      : selected >= 0 ? '배치할 길을 고르세요' : (first === ME ? '이번 턴은 아군이 먼저 배치합니다' : '적의 배치를 보고 대응하세요');
  }

  function log(html) { const el = $('#log'); el.insertAdjacentHTML('beforeend', `<div>${html}</div>`); el.scrollTop = el.scrollHeight; }
  const cardEl = (uid) => $(`#screen-battle .lane [data-uid="${uid}"]`);
  const nm = (si, name) => `<span class="p${si}">${name}</span>`;
  function inst(uid) {
    for (const s of B.sides) for (const c of [...s.field, ...s.grave, ...s.hand]) if (c && c.uid === uid) return c;
    return null;
  }

  // ── 연출 도구 ───────────────────────────────────────────────
  const layer = () => $('#fx-layer');
  function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, l: r.left, t: r.top }; }
  function floatText(el, html, cls) {
    if (!el) return;
    const p = center(el), d = document.createElement('div');
    d.className = 'dmg ' + (cls || ''); d.innerHTML = html; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    layer().appendChild(d);
    d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: .2 },
      { transform: 'translate(-50%,-190%) scale(1)', opacity: 0 }], { duration: 950 / speed, easing: 'ease-out' }).onfinish = () => d.remove();
  }
  // 요소 위에 임팩트 조각을 뿌린다.
  function particles(el, cls, n, opt) {
    if (!el) return;
    const p = center(el); opt = opt || {};
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'fx ' + cls;
      const ox = (Math.random() - .5) * p.w * (opt.spread || .8), oy = (Math.random() - .5) * p.h * (opt.spread || .8) + (opt.oy || 0) * p.h;
      d.style.left = (p.x + ox) + 'px'; d.style.top = (p.y + oy) + 'px';
      d.style.setProperty('--dx', ((Math.random() - .5) * (opt.dx == null ? 30 : opt.dx)) + 'px');
      d.style.setProperty('--dy', (opt.dy == null ? -50 : opt.dy) * (.6 + Math.random() * .8) + 'px');
      d.style.setProperty('--r', (opt.r == null ? -35 + Math.random() * 20 : opt.r) + 'deg');
      if (opt.c) d.style.setProperty('--c', opt.c);
      if (opt.text) d.textContent = opt.text;
      if (opt.w) { d.style.width = p.w * opt.w + 'px'; d.style.left = (p.x - p.w * opt.w / 2) + 'px'; d.style.top = (p.y + (i - (n - 1) / 2) * 16) + 'px'; }
      d.style.animationDelay = (i * (opt.stagger || 30) / speed) + 'ms';
      d.style.animationDuration = ((opt.dur || 700) / speed) + 'ms';
      layer().appendChild(d);
      setTimeout(() => d.remove(), ((opt.dur || 700) + i * (opt.stagger || 30) + 80) / speed);
    }
  }
  // 요소 전체를 덮는 임팩트(물결·안개·방패 등)
  function overlay(el, cls, dur) {
    if (!el) return;
    const r = el.getBoundingClientRect(), box = document.createElement('div');
    box.className = 'fx'; box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;overflow:${cls === 'fx-ring' ? 'visible' : 'hidden'}`;
    const d = document.createElement('div'); d.className = 'fx ' + cls; d.style.animationDuration = (dur / speed) + 'ms';
    box.appendChild(d); layer().appendChild(box);
    setTimeout(() => box.remove(), (dur + 60) / speed);
  }
  const FX = {
    slash: (el) => particles(el, 'fx-slash', 2, { w: 1.5, stagger: 90, dur: 320 }),
    flame: (el) => particles(el, 'fx-flame', 12, { dy: -60, oy: .2 }),
    drop: (el) => particles(el, 'fx-drop', 10, { dy: -40, dx: 60 }),
    bolt: (el) => overlay(el, 'fx-bolt', 450),
    rain: (el) => particles(el, 'fx-rain', 9, { stagger: 35, dur: 420 }),
    ring: (el) => overlay(el, 'fx-ring', 800),
    aura: (el, c) => particles(el, 'fx-aura', 9, { c, oy: .25, dur: 800 }),
    plus: (el) => particles(el, 'fx-plus', 5, { text: '+', oy: .2, dur: 900, stagger: 70 }),
    swirl: (el) => particles(el, 'fx-swirl', 1, { spread: 0, dur: 850 }),
    flag: (el, c) => particles(el, 'fx-flag', 1, { spread: 0, c, dur: 950 }),
    spark: (el) => particles(el, 'fx-spark', 14, { dy: -40, dx: 90, dur: 550 }),
    dust: (el) => particles(el, 'fx-dust', 8, { dy: 20, dx: 80, oy: .4, dur: 600 }),
    scroll: (el) => particles(el, 'fx-scroll', 1, { spread: 0, dur: 900 }),
    bang: (el) => particles(el, 'fx-bang', 1, { spread: 0, text: '!', dur: 600 }),
  };
  function quake() { const b = $('#board'); b.classList.remove('quake'); void b.offsetWidth; b.classList.add('quake'); }
  function shake(el) {
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,2px) rotate(-2deg)' }, { transform: 'translate(6px,-2px) rotate(2deg)' },
      { transform: 'translate(-3px,1px)' }, { transform: 'translate(0,0)' }], { duration: 300 / speed });
  }
  function setTroops(el, v) { if (!el) return; $('.troops i', el).style.width = (100 * v / +el.dataset.max) + '%'; $('.troops em', el).textContent = v; }
  async function die(el) {
    if (!el) return;
    await el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.55) rotate(-10deg)', filter: 'grayscale(1) brightness(.4)' }],
      { duration: 480 / speed, easing: 'ease-in', fill: 'forwards' }).finished;
    el.remove();
  }
  function lunge(el, target, big) {
    const a = center(el), b = center(target), dx = b.x - a.x, dy = b.y - a.y;
    el.style.zIndex = 20;
    const an = el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-dx * (big ? .22 : .1)}px,${-dy * (big ? .22 : .1)}px) scale(1.06)`, offset: .3 },
      { transform: `translate(${dx * .72}px,${dy * .72}px) scale(${big ? 1.25 : 1.12})`, offset: .55 }, { transform: 'translate(0,0) scale(1)' }],
      { duration: (big ? 640 : 560) / speed, easing: 'ease-in-out' });
    an.onfinish = () => { el.style.zIndex = ''; };
    return an.finished;
  }
  function volley(el, target, fire) {
    const a = center(el), b = center(target);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 220 / speed });
    const ps = [];
    for (let i = 0; i < 3; i++) {
      const ar = document.createElement('div'); ar.className = 'arrow' + (fire ? ' fire' : '');
      const ox = (i - 1) * 14;
      ar.style.left = (a.x - 17 + ox) + 'px'; ar.style.top = a.y + 'px';
      layer().appendChild(ar);
      const an = ar.animate([{ transform: `translate(0,0) rotate(${ang}deg)`, opacity: 1 }, { transform: `translate(${b.x - a.x - ox * .5}px,${b.y - a.y}px) rotate(${ang}deg)`, opacity: 1 }],
        { duration: 300 / speed, delay: i * 60 / speed, easing: 'ease-in', fill: 'backwards' });
      an.onfinish = () => ar.remove();
      ps.push(an.finished);
    }
    return Promise.all(ps);
  }
  async function cutin(e) {
    const g = D.GENERALS[e.gid], el = $('#cutin'), A = D.ARCH[e.arch];
    el.innerHTML = `<div class="cutin-band" style="${natStyle(g.nation)}">${P.html(g)}<div><h3>${e.name}<span class="tgt">${A.tgt}</span></h3><p>${g.name} · ${A.label} — ${A.desc}</p></div></div>`;
    el.hidden = false;
    await sleep(950);
    el.hidden = true;
  }

  // ── 이벤트 재생 ─────────────────────────────────────────────
  async function playAttack(e) {
    const att = cardEl(e.uid); if (!att) return;
    const a = inst(e.uid);
    const tgt = e.target === 'card' ? cardEl(e.targetUid) : $('#bar-' + (1 - e.side));
    const notes = (e.adv > 0 ? '<small class="up">상성 유리!</small>' : e.adv < 0 ? '<small class="down">상성 불리</small>' : '') +
      (e.charge ? '<small class="up">돌격!</small>' : '') + (e.guard ? '<small class="down">방진</small>' : '') + (e.insight ? '<small class="down">간파</small>' : '');
    const hit = () => {
      if (e.target === 'card') { shake(tgt); setTroops(tgt, e.after); if (e.guard) FX.ring(tgt); else if (e.unit !== 'arc') FX.slash(tgt); }
      else { tgt.classList.remove('hit'); void tgt.offsetWidth; tgt.classList.add('hit'); FX.spark(tgt); }
      if (e.charge) { quake(); FX.dust(tgt); }
      floatText(tgt, `${notes}-${e.dmg}`);
      sync(e);
    };
    if (e.unit === 'arc') { await volley(att, tgt); hit(); await sleep(260); }
    else { if (e.charge) FX.dust(att); const p = lunge(att, tgt, e.charge); await sleep(e.charge ? 350 : 300); hit(); await p; }
    const tags = (e.adv > 0 ? ' (상성 유리)' : e.adv < 0 ? ' (상성 불리)' : '') + (e.charge ? ' (돌격)' : '') + (e.insight ? ' (간파)' : '');
    if (e.target === 'card') log(`${nm(e.side, a.name)} ▶ ${nm(1 - e.side, inst(e.targetUid).name)} <b>-${e.dmg}</b>${tags}${e.killed ? ' — <b>격파!</b>' : ''}`);
    else log(`${nm(e.side, a.name)} ▶ ${nm(1 - e.side, '본진')} <b>-${e.dmg}</b>${e.charge ? ' (돌격)' : ''}`);
    if (e.overrun) { const bar = $('#bar-' + (1 - e.side)); FX.spark(bar); floatText(bar, `<small class="up">돌격 관통</small>-${e.overrun.dmg}`); log(`돌격 관통 ▶ ${nm(1 - e.side, '본진')} <b>-${e.overrun.dmg}</b>`); }
    if (e.counter) {
      shake(att); setTroops(att, e.counter.after); floatText(att, `<small>반격</small>-${e.counter.dmg}`);
      await sleep(260);
      if (e.counter.killed) { log(`${nm(e.side, a.name)} 반격에 쓰러짐`); sync(e); await die(att); }
    }
    if (e.killed) await die(tgt);
    await sleep(110);
  }

  // ── 계략 연출 ───────────────────────────────────────────────
  // 여러 카드를 감싸는 사각형
  function rectOf(els) {
    const rs = els.filter(Boolean).map((x) => x.getBoundingClientRect());
    if (!rs.length) return null;
    const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), rt = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom));
    return { left: l, top: t, width: rt - l, height: b - t };
  }
  function overlayRect(r, cls, dur, visible) {
    if (!r) return;
    const box = document.createElement('div');
    box.className = 'fx'; box.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;overflow:${visible ? 'visible' : 'hidden'}`;
    const d = document.createElement('div'); d.className = 'fx ' + cls; d.style.animationDuration = (dur / speed) + 'ms';
    box.appendChild(d); layer().appendChild(box);
    setTimeout(() => box.remove(), (dur + 60) / speed);
  }
  function screenFx(cls, color, o, dur) {
    const d = document.createElement('div'); d.className = cls; if (color) d.style.background = color; if (o) d.style.setProperty('--o', o);
    d.style.animationDuration = ((dur || 350) / speed) + 'ms'; layer().appendChild(d); setTimeout(() => d.remove(), ((dur || 350) + 60) / speed);
  }
  // 시전 자세: 카드가 떠오르며 빛난다
  function castPose(el, dur) {
    if (!el) return;
    el.classList.add('casting');
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12) translateY(-4px)', offset: .25 }, { transform: 'scale(1.12) translateY(-4px)', offset: .8 }, { transform: 'scale(1)' }], { duration: dur / speed, easing: 'ease-out' })
      .onfinish = () => el.classList.remove('casting');
  }
  // 시전자가 여러 대상 사이를 차례로 가로지른다(휩쓸기). onPass(i)는 i번째 대상을 지날 때 불린다.
  async function dashThrough(el, targets, onPass) {
    const a = center(el), pts = targets.map((t) => { const b = center(t); return { x: (b.x - a.x) * .78, y: (b.y - a.y) * .78 }; });
    const n = pts.length, kf = [{ transform: 'translate(0,0) scale(1)', offset: 0 }];
    pts.forEach((p, i) => kf.push({ transform: `translate(${p.x}px,${p.y}px) scale(1.15)`, offset: .25 + .5 * (n === 1 ? .5 : i / (n - 1)) }));
    kf.push({ transform: 'translate(0,0) scale(1)', offset: 1 });
    const dur = 520 + n * 170;
    el.style.zIndex = 20;
    const an = el.animate(kf, { duration: dur / speed, easing: 'ease-in-out' });
    for (let i = 0; i < n; i++) { await sleep(dur * (i === 0 ? kf[1].offset : kf[i + 1].offset - kf[i].offset)); onPass(i); }
    await an.finished; el.style.zIndex = '';
  }
  function streak(el, target, cls) {
    const a = center(el), b = center(target), ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const ar = document.createElement('div'); ar.className = 'arrow ' + cls; ar.style.left = (a.x - 35) + 'px'; ar.style.top = a.y + 'px'; layer().appendChild(ar);
    const an = ar.animate([{ transform: `translate(0,0) rotate(${ang}deg)` }, { transform: `translate(${b.x - a.x}px,${b.y - a.y}px) rotate(${ang}deg)` }], { duration: 240 / speed, easing: 'ease-in' });
    an.onfinish = () => ar.remove(); return an.finished;
  }

  async function playSkill(e) {
    const c = inst(e.uid), self = cardEl(e.uid), N = D.NATIONS[c.nation], A = D.ARCH[e.arch];
    log(`${nm(e.side, c.name)}의 계략 <span class="t">「${e.name}」</span> <small>(${A.label} · ${A.tgt})</small>`);
    await cutin(e);
    const foeRow = $('#row-' + (1 - e.side)), myRow = $('#row-' + e.side), foeBar = $('#bar-' + (1 - e.side)), myBar = $('#bar-' + e.side);
    const allies = $$('.card', myRow);
    const byX = (x, y) => x.el.getBoundingClientRect().left - y.el.getBoundingClientRect().left;
    const dmgs = e.fx.filter((f) => f.t === 'dmg').map((f) => ({ f, el: cardEl(f.uid) })).filter((x) => x.el).sort(byX);
    const done = new Set(), deaths = [];
    // 피해 한 건을 화면에 반영(임팩트 종류는 연출마다 다르다)
    const hit = (x, impact) => {
      if (!x || done.has(x.f)) return; done.add(x.f);
      if (impact) impact(x.el); shake(x.el); setTroops(x.el, x.f.after); floatText(x.el, '-' + x.f.dmg);
      if (x.f.killed) deaths.push(die(x.el));
    };
    const stagger = async (impact, gap) => { for (const x of dmgs) { hit(x, impact); await sleep(gap); } };
    const tEls = dmgs.map((x) => x.el);

    switch (e.vis) {
      case 'water':       // 수공: 물결이 적진을 왼쪽에서 오른쪽으로 덮친다
        castPose(self, 1000); overlayRect(foeRow.getBoundingClientRect(), 'fx-wave', 850); await sleep(260);
        await stagger((el) => { FX.drop(el); el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(7deg) translateX(8px)' }, { transform: 'rotate(0)' }], { duration: 420 / speed }); }, 170); break;
      case 'storm':       // 풍랑: 바람 → 파도 → 벼락
        castPose(self, 1300); overlayRect(foeRow.getBoundingClientRect(), 'fx-wind', 900); await sleep(300);
        overlayRect(foeRow.getBoundingClientRect(), 'fx-wave', 800); await sleep(300);
        await stagger((el) => { screenFx('fx-screen', '#dfe8ff', .35); overlay(el, 'fx-bolt', 450); FX.drop(el); }, 190); break;
      case 'navy':        // 수군: 물보라 뒤에 화살 세례
        castPose(self, 1100); overlayRect(foeRow.getBoundingClientRect(), 'fx-wave', 700); await sleep(350);
        particles(foeRow, 'fx-rain', 26, { stagger: 22, dur: 420, spread: 1 }); await sleep(300);
        await stagger((el) => { FX.rain(el); FX.drop(el); }, 110); break;
      case 'arrows':      // 난사: 하늘이 어두워지고 화살비가 적진 전체에 쏟아진다
        castPose(self, 1100); if (self) self.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${e.side === ME ? 10 : -10}px)` }, { transform: 'translateY(0)' }], { duration: 260 / speed });
        overlayRect(foeRow.getBoundingClientRect(), 'fx-sky', 1100); await sleep(180);
        particles(foeRow, 'fx-rain', 34, { stagger: 20, dur: 420, spread: 1 }); await sleep(330);
        await stagger((el) => FX.rain(el), 100); break;
      case 'fire':        // 화계: 불화살이 날아가 꽂히고 불길이 번진다
        castPose(self, 1200);
        if (self) await Promise.all(tEls.map((t) => volley(self, t, true)));
        overlayRect(foeRow.getBoundingClientRect(), 'fx-firewall', 1000); await sleep(200);
        await stagger((el) => FX.flame(el), 130); break;
      case 'grassfire':   // 맞불: 불길이 들판을 쓸고 지나간다
        castPose(self, 1100); overlayRect(foeRow.getBoundingClientRect(), 'fx-firesweep', 900); await sleep(260);
        await stagger((el) => FX.flame(el), 170); break;
      case 'thunder':     // 기책: 번쩍이는 섬광과 함께 한 명씩 벼락
        castPose(self, 1200); await sleep(200);
        await stagger((el) => { screenFx('fx-screen', '#fff', .45); overlay(el, 'fx-bolt', 450); }, 210); break;
      case 'fog':         // 허실: 안개가 적진을 덮는다
        castPose(self, 1000); overlayRect(foeRow.getBoundingClientRect(), 'fx-fog', 1100); await sleep(420); break;
      case 'sweep': {     // 휩쓸기: 시전자가 적 셋을 차례로 베며 가로지른다(궁병은 부채꼴 사격)
        if (!self || !dmgs.length) break;
        if (c.unit === 'arc') { await Promise.all(tEls.map((t) => volley(self, t))); dmgs.forEach((x) => hit(x, FX.rain)); break; }
        if (c.unit === 'cav') overlayRect(rectOf(tEls), 'fx-dustband', 900);
        await dashThrough(self, tEls, (i) => { overlay(tEls[i], 'fx-crescent', 380); hit(dmgs[i], c.unit === 'cav' ? FX.dust : FX.slash); if (i === 0) quake(); });
        break; }
      case 'hunt':        // 사냥: 표적을 찍고 한꺼번에 덮친다
        castPose(self, 1000); tEls.forEach((t) => particles(t, 'fx-mark', 1, { spread: 0, dur: 700 })); await sleep(520);
        if (self) await Promise.all(tEls.map((t) => streak(self, t, 'streak')));
        quake(); dmgs.forEach((x) => hit(x, FX.slash)); break;
      case 'encircle':    // 포위: 포위망이 좁혀 들어온다
        castPose(self, 1200); overlayRect(rectOf(tEls), 'fx-encircle', 950, true);
        tEls.forEach((t) => particles(t, 'fx-runflag', 2, { spread: 1.1, dur: 800, c: N.color2 })); await sleep(700);
        dmgs.forEach((x) => hit(x, (el) => overlay(el, 'fx-ring', 600))); break;
      case 'slash':       // 맹공: 크게 달려들어 두 번 벤다
        if (self) { const t = tEls[0] || foeBar; const p = lunge(self, t, true); await sleep(350); quake(); if (dmgs[0]) hit(dmgs[0], (el) => { FX.slash(el); overlay(el, 'fx-crescent', 380); }); else FX.spark(foeBar); await p; } break;
      case 'charge':      // 돌파: 적을 뚫고 본진까지
        if (self) { FX.dust(self); const t = tEls[0] || foeBar; const p = lunge(self, t, true); await sleep(350); quake(); hit(dmgs[0], FX.dust); await p; if (tEls[0]) await streak(tEls[0], foeBar, 'streak'); } break;
      case 'ambush': {    // 매복: 느낌표 → 양옆에서 덮친다
        const t = tEls[0] || cardEl((e.fx.find((f) => f.t === 'stun') || {}).uid);
        FX.bang(t); await sleep(300); if (t) { particles(t, 'fx-slash', 2, { w: 1.5, stagger: 80, dur: 320, r: 35 }); } hit(dmgs[0], FX.slash); break; }
      case 'swirl': {     // 이간: 의심의 소용돌이
        const t = tEls[0] || cardEl((e.fx.find((f) => f.t === 'stun') || {}).uid);
        FX.swirl(t); particles(t, 'fx-q', 4, { text: '?', dur: 900, stagger: 90 }); await sleep(350); hit(dmgs[0], null); break; }
      case 'rage':        // 분전·결사: 붉은 기운
        screenFx('fx-vignette', null, null, 900); FX.aura(self, '#ff5a4d'); FX.flag(self, '#d9534f'); await sleep(350); break;
      case 'banner':      // 호령: 깃발을 세우고 진영 전체로 함성이 퍼진다
        castPose(self, 1000); FX.flag(self, N.color2); overlayRect(myRow.getBoundingClientRect(), 'fx-shock', 800, true); await sleep(380); break;
      case 'sun':         // 고무: 햇살과 풍악
        castPose(self, 1000); overlayRect(myRow.getBoundingClientRect(), 'fx-ray', 1000); allies.forEach((a) => particles(a, 'fx-note', 3, { text: '♪', dur: 1000, stagger: 110, oy: .1 })); await sleep(400); break;
      case 'shield':      // 철벽: 방패가 차례로 올라온다
        castPose(self, 1000); for (const a of allies) { particles(a, 'fx-shield', 1, { spread: 0, dur: 850 }); await sleep(110); } await sleep(200); break;
      case 'heal':        // 구휼: 푸른 잎이 내린다
        castPose(self, 1000); allies.forEach((a) => particles(a, 'fx-leaf', 8, { dur: 900, stagger: 50 })); await sleep(380); break;
      case 'reinf':       // 원군: 깃발 든 원군이 옆에서 달려온다
        castPose(self, 1000); allies.forEach((a, i) => { const d = (i % 2 ? 1 : -1) * 160; particles(a, 'fx-runflag', 3, { dur: 800, stagger: 90, c: N.color2 }); $$('.fx-runflag', layer()).slice(-3).forEach((x) => x.style.setProperty('--from', d + 'px')); }); await sleep(450); break;
      case 'hammer':      // 축성: 본진에 성벽이 솟는다
        castPose(self, 1000); overlayRect(myBar.getBoundingClientRect(), 'fx-stone', 900); FX.spark(myBar); await sleep(420); break;
      case 'scroll':      // 개혁: 교서를 펼친다
        castPose(self, 1000); FX.scroll($('#cmd-box')); FX.scroll(self); await sleep(350); break;
    }
    dmgs.forEach((x) => hit(x, FX.slash));       // 연출에서 빠진 피해가 있으면 마저 반영

    for (const f of e.fx) {
      const el = f.uid ? cardEl(f.uid) : null;
      if (f.t === 'burnset') { FX.flame(el); floatText(el, '화상', 'info'); }
      else if (f.t === 'heal') { setTroops(el, f.after); if (f.amount) { FX.plus(el); floatText(el, '+' + f.amount, 'heal'); } }
      else if (f.t === 'cost') { setTroops(el, f.after); floatText(el, '-' + f.amount); }
      else if (f.t === 'buff') f.uids.forEach((u) => { const x = cardEl(u); if (f.k === 'atk') FX.aura(x, e.vis === 'rage' ? '#ff5a4d' : '#ffd257'); else FX.ring(x); floatText(x, f.k === 'atk' ? '공격 ↑' : '방어 ↑', 'info'); });
      else if (f.t === 'debuff') f.uids.forEach((u) => floatText(cardEl(u), '공격 ↓', 'info'));
      else if (f.t === 'stun') { FX.swirl(el); floatText(el, f.ok ? '혼란!' : '간파 — 실패', 'info'); }
      else if (f.t === 'hq') { const bar = $('#bar-' + f.side); if (f.delta > 0) FX.plus(bar); else { FX.spark(bar); bar.classList.remove('hit'); void bar.offsetWidth; bar.classList.add('hit'); } floatText(bar, (f.delta > 0 ? '+' : '') + f.delta, f.delta > 0 ? 'heal' : ''); }
      else if (f.t === 'cmd') floatText($('#cmd-box'), '군령 +' + f.amount, 'info');
      else if (f.t === 'morale') floatText($('#bar-' + f.side), f.side === e.side ? '사기 ↑' : '사기 ↓', 'info');
    }
    sync(e);
    await Promise.all(deaths);
    await sleep(650);
  }

  async function playTactic(e) {
    const c = inst(e.uid), el = cardEl(e.uid), T = D.UNITS[c.unit].tactic;
    log(`${nm(e.side, c.name)} 전법 <b>${T.name}</b>`);
    if (e.kind === 'charge') { FX.dust(el); FX.aura(el, '#ffd257'); floatText(el, '돌격 준비!', 'info'); }
    else if (e.kind === 'guard') { FX.ring(el); floatText(el, '방진!', 'info'); }
    else { const t = cardEl(e.targetUid); await volley(el, t, true); FX.flame(t); shake(t); floatText(t, `화공! 턴당 -${e.burn}`, 'info'); }
    await sleep(520);
  }

  async function play(events) {
    const my = token;
    for (const e of events) {
      if (my !== token) return;
      if (e.t === 'attack') await playAttack(e);
      else if (e.t === 'skill') { await playSkill(e); render(); }
      else if (e.t === 'tactic') { await playTactic(e); render(); }
      else if (e.t === 'burn') { const el = cardEl(e.uid); FX.flame(el); shake(el); setTroops(el, e.after); floatText(el, `<small>화상</small>-${e.dmg}`); sync(e); log(`${nm(e.side, inst(e.uid).name)} 화상 <b>-${e.dmg}</b>${e.killed ? ' — <b>격파!</b>' : ''}`); await sleep(300); if (e.killed) await die(el); }
      else if (e.t === 'deploy') {
        render();
        const el = cardEl(e.uid), c = inst(e.uid);
        log(`${nm(e.side, c.name)} 출진 (${D.UNITS[c.unit].name})`);
        if (el) await el.animate([{ transform: `translateY(${e.side === ME ? 40 : -40}px) scale(1.15)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260 / speed, easing: 'ease-out' }).finished;
      } else if (e.t === 'skip') { const el = cardEl(e.uid); FX.swirl(el); floatText(el, '혼란 — 행동 불가', 'info'); await sleep(380); }
    }
  }

  // ── 주사위 ──────────────────────────────────────────────────
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieHTML = (n) => Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].indexOf(i) >= 0 ? 'on' : ''}"></i>`).join('');
  async function rollDice() {
    const el = $('#dice'), my = token;
    el.innerHTML = `<div class="dice-box"><h3>선제 공격권 주사위</h3><div class="dice-row">${[ME, FOE].map((si) =>
      `<div class="dice-side"><div class="die" id="die-${si}" style="${natStyle(B.sides[si].nation)}"></div><b>${D.NATIONS[B.sides[si].nation].name} (${si === ME ? '아군' : '적군'})</b></div>`).join('')}</div><div class="dice-msg" id="dice-msg"></div></div>`;
    el.hidden = false;
    for (const [a, b] of B.dice) {
      $('#dice-msg').textContent = '';
      $$('.die', el).forEach((d) => { d.classList.add('rolling'); d.classList.remove('win'); });
      for (let i = 0; i < 9; i++) { [ME, FOE].forEach((si) => { $('#die-' + si).innerHTML = dieHTML(1 + Math.floor(Math.random() * 6)); }); await sleep(80); if (my !== token) return; }
      $$('.die', el).forEach((d) => d.classList.remove('rolling'));
      $('#die-0').innerHTML = dieHTML(a); $('#die-1').innerHTML = dieHTML(b);
      if (a === b) { $('#dice-msg').textContent = '동점 — 다시 굴립니다'; await sleep(900); }
    }
    $('#die-' + B.init).classList.add('win');
    $('#dice-msg').textContent = B.init === ME ? '아군이 선제 공격권을 잡았습니다!' : '적군이 선제 공격권을 잡았습니다';
    const last = B.dice[B.dice.length - 1];
    log(`주사위 ${last[0]} : ${last[1]} — ${nm(B.init, D.NATIONS[B.sides[B.init].nation].name)} 선제 공격권`);
    await sleep(1500);
    el.hidden = true;
  }

  // ── 턴 진행 ─────────────────────────────────────────────────
  function startBattle(cfg) {
    setup = cfg; token++;
    B = E.createBattle({ sides: cfg.sides, lanes: cfg.lanes });
    $('#screen-battle').className = 'screen lanes-' + B.rules.lanes;
    selected = -1; busy = true; waiting = null;
    $('#log').innerHTML = ''; $('#result').hidden = true; $('#detail').hidden = true;
    show('battle'); render();
    log(`<span class="t">【${cfg.title}】</span> ${D.NATIONS[B.sides[ME].nation].name} vs ${D.NATIONS[B.sides[FOE].nation].name} · ${B.rules.lanes}대${B.rules.lanes}`);
    loop(token);
  }

  async function runAI(si, my) {
    for (const e of E.aiSteps(B, si)) { await play([e]); if (my !== token || B.winner !== null) return; }
  }
  function playerPhase(my) {
    if (auto) return runAI(ME, my);
    return new Promise((res) => { waiting = res; busy = false; selected = -1; render(); });
  }

  async function loop(my) {
    await rollDice();
    while (my === token && B.winner === null) {
      busy = true; render();
      log(`<span class="t">— ${B.turn}턴 — ${E.firstDeployer(B) === ME ? '아군' : '적군'} 선배치</span>`);
      await sleep(250);
      const order = E.firstDeployer(B) === ME ? [ME, FOE] : [FOE, ME];
      for (const si of order) {
        if (si === ME) await playerPhase(my); else await runAI(FOE, my);
        if (my !== token) return;
        busy = true; render();
        if (B.winner !== null) break;
      }
      if (B.winner !== null) break;
      await play(E.resolve(B));
      if (my !== token) return;
      if (B.winner === null) E.beginTurn(B);
    }
    if (my !== token) return;
    busy = true; render(); showResult();
  }

  function endPlayerPhase() { if (!waiting) return; const r = waiting; waiting = null; busy = true; selected = -1; render(); r(); }

  async function playerAct(fn) {       // 플레이어의 계략·전법
    if (busy || !waiting) return;
    const e = fn(); if (!e) return;
    busy = true; selected = -1; render();
    await play([e]);
    if (B.winner !== null) return endPlayerPhase();
    busy = false; render();
  }

  function showResult() {
    const w = B.winner, el = $('#result');
    const title = w === ME ? '승 리' : w === FOE ? '패 배' : '무 승 부';
    log(`<span class="t">전투 종료 — ${title.replace(/ /g, '')} (${B.reason})</span>`);
    el.innerHTML = `<div class="sheet result-box ${w === ME ? 'win' : 'lose'}"><h2>${title}</h2><p>${B.reason} · ${B.turn}턴</p>
      <p>아군 본진 ${B.sides[ME].hq}/${B.sides[ME].hqMax} · 적 본진 ${B.sides[FOE].hq}/${B.sides[FOE].hqMax}</p>
      <div class="acts" style="justify-content:center"><button class="btn" id="r-again">같은 덱으로 다시</button><button class="btn" id="r-home">처음으로</button></div></div>`;
    el.hidden = false;
    $('#r-again').onclick = () => startBattle(setup);
    $('#r-home').onclick = () => { el.hidden = true; show('title'); };
  }

  // ── 장수 상세 ───────────────────────────────────────────────
  function showDetail(g, c, lane) {
    const el = $('#detail'), U = D.UNITS[g.unit], A = archOf(g);
    const mine = c && lane != null && !busy && waiting;
    const canSkill = mine && E.canUseSkill(B, ME, lane), canTac = mine && E.canUseTactic(B, ME, lane);
    const rows = D.STAT_KEYS.map((k) => `<tr><td>${D.STATS[k].name}</td><td class="g-${g.stats[k]}">${g.stats[k]}</td><td>${D.GRADES[g.stats[k]].value} · ${D.STATS[k].desc}</td></tr>`).join('');
    el.innerHTML = `<div class="sheet"><div class="sheet-top">${cardHTML(g, c, c && lane !== undefined ? 'field' : 'view')}
      <div><h3>${g.name}<small>${g.hanja}</small></h3>
      <p>${D.NATIONS[g.nation].name} · ${g.cls === 'm' ? '무인' : '문인'} · <b>${U.name}</b></p>
      <p><b>계략 「${g.skill.name}」</b><br>${A.label} · <b>${A.tgt}</b> (${D.STATS[A.scale].name} 비례, ${A.cd}턴) — ${A.desc}</p></div></div>
      <div class="src"><b>출전</b> ${g.src}<br><b>근거</b> ${g.why}</div>
      <table>${rows}</table>
      <p><b>${U.name} 특성</b> ${U.trait}<br><b>전법 「${U.tactic.name}」</b> (군령 ${E.CFG.tacticCost}) — ${U.tactic.desc}</p>
      <div class="acts">${canTac ? `<button class="btn tactic" id="d-tac">전법: ${U.tactic.name}</button>` : ''}${canSkill ? '<button class="btn primary" id="d-skill">계략 사용</button>' : ''}<button class="btn" id="d-close">닫기</button></div></div>`;
    el.hidden = false;
    $('#d-close').onclick = () => { el.hidden = true; };
    if (canSkill) $('#d-skill').onclick = () => { el.hidden = true; playerAct(() => E.useSkill(B, ME, lane)); };
    if (canTac) $('#d-tac').onclick = () => { el.hidden = true; playerAct(() => E.useTactic(B, ME, lane)); };
  }

  // ── 입력 ────────────────────────────────────────────────────
  function bind() {
    $('#hand').addEventListener('click', (e) => {
      const c = e.target.closest('.card'); if (!c) return;
      const i = +c.dataset.hand, card = B.sides[ME].hand[i];
      if (e.target.closest('[data-info]') || busy || card.cost > B.sides[ME].cmd) return showDetail(D.GENERALS[card.gid], card);
      selected = i === selected ? -1 : i; render();
    });
    $('#board').addEventListener('click', (e) => {
      const lane = e.target.closest('.lane'); if (!lane) return;
      const si = +lane.dataset.side, l = +lane.dataset.lane, c = B.sides[si].field[l];
      if (c) return showDetail(D.GENERALS[c.gid], c, si === ME ? l : null);
      if (busy || si !== ME || selected < 0) return;
      const ev = E.deploy(B, ME, selected, l);
      selected = -1;
      if (ev) play([ev]); else render();
    });
    $('#btn-fight').onclick = endPlayerPhase;
    $('#btn-auto').onclick = () => {
      auto = !auto; $('#btn-auto').textContent = auto ? '자동 ON' : '자동 OFF'; $('#btn-auto').classList.toggle('on', auto);
      if (auto && waiting && !busy) { const r = waiting, my = token; waiting = null; busy = true; selected = -1; render(); runAI(ME, my).then(r); } else render();
    };
    $('#btn-exit').onclick = (e) => {
      const b = e.currentTarget;
      if (B.winner !== null || b.dataset.armed) { delete b.dataset.armed; b.textContent = '← 나가기'; token++; waiting = null; $('#dice').hidden = true; $('#cutin').hidden = true; return show('title'); }
      b.dataset.armed = '1'; b.textContent = '한 번 더 누르면 포기';
      setTimeout(() => { delete b.dataset.armed; b.textContent = '← 나가기'; }, 2500);
    };
    $('#btn-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('#btn-speed').textContent = '속도 ×' + speed; };
    $('#detail').addEventListener('click', (e) => { if (e.target.id === 'detail') e.target.hidden = true; });
  }

  initTitle(); bindDeck(); bind();
  window.SGDebug = {
    get state() { return B; }, get waiting() { return !!waiting; },
    // 개발용: 아군 가운데 길의 장수를 지정한 인물로 바꿔 그 계략을 바로 써 본다(연출 점검)
    cast(gid) {
      const g = D.GENERALS[gid], lane = Math.floor(B.rules.lanes / 2), c = B.sides[ME].field[lane];
      if (!g || !c || busy) return false;
      Object.assign(c, { gid, name: g.name, nation: g.nation, unit: g.unit, cls: g.cls, stats: Object.assign({}, g.stats), skill: { name: g.skill.name, arch: g.skill.arch, cd: D.ARCH[g.skill.arch].cd }, cd: 0, stunned: 0, ready: true });
      render(); playerAct(() => E.useSkill(B, ME, lane)); return true;
    },
  };
})();
