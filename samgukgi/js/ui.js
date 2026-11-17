/* 삼국기 — 화면/연출. 엔진이 돌려준 이벤트를 순서대로 재생한다. */
(function () {
  'use strict';
  const D = SGData, E = SGEngine, P = SGPortrait;
  const $ = (s, r) => (r || document).querySelector(s);
  const ME = 0, FOE = 1;

  let B = null;            // 현재 전투 상태
  let setup = null;        // 다시하기용 설정
  let selected = -1;       // 선택한 손패 인덱스
  let busy = false;        // 연출 중 입력 잠금
  let speed = 1;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms / speed));
  const gradeHTML = (g) => `<b class="g-${g}">${g}</b>`;
  const natStyle = (n) => `--nc:${D.NATIONS[n].color};--nc2:${D.NATIONS[n].color2}`;

  // ── 카드 그리기 ─────────────────────────────────────────────
  function cardHTML(g, c, where) {
    const onField = where === 'field';
    const max = c ? c.maxTroops : E.gv(g.stats.lead) * 10;
    const troops = c ? c.troops : max;
    const ready = onField && c.skill && c.cd === 0 && !c.stunned;
    const cls = ['card'];
    if (ready) cls.push('sk-ready');
    let tag = '';
    if (onField && c.stunned) tag = '<div class="tag stun">혼란</div>';
    else if (onField && !c.ready) tag = '<div class="tag prep">정비 중</div>';
    let bufs = '';
    if (onField && c.buffs.length) {
      const a = c.buffs.filter((b) => b.k === 'atk').reduce((x, b) => x + b.v, 0);
      const d = c.buffs.filter((b) => b.k === 'def').reduce((x, b) => x + b.v, 0);
      bufs = `<div class="bufs">${a ? `<span class="atk">공+${Math.round(a * 100)}%</span>` : ''}${d ? `<span class="def">방+${Math.round(d * 100)}%</span>` : ''}</div>`;
    }
    const sk = g.skill ? (onField && c.cd > 0 ? `${g.skill.name} · ${c.cd}턴` : g.skill.name) : '— 병졸 —';
    return `<div class="${cls.join(' ')}" style="${natStyle(g.nation)}" data-gid="${g.id}"${c ? ` data-uid="${c.uid}"` : ''} data-max="${max}">
      <div class="cost">${E.costOf(g)}</div><div class="ubadge u-${g.unit}">${D.UNITS[g.unit].hanja}</div>
      ${P.html(g)}${tag}${bufs}
      <div class="nm">${g.name}</div>
      <div class="stats">${['lead', 'war', 'int', 'pol'].map((k) => `<span>${D.STATS[k].short}${gradeHTML(g.stats[k])}</span>`).join('')}</div>
      <div class="troops"><i style="width:${100 * troops / max}%"></i><em>${troops}</em></div>
      <div class="sk">${sk}</div>
    </div>`;
  }

  // ── 타이틀 화면 ─────────────────────────────────────────────
  function initTitle() {
    $('#scenario-list').innerHTML = D.SCENARIOS.map((s, i) => `
      <div class="scn"><div class="scn-head"><span class="scn-year">${s.year}년</span><span class="scn-name">${s.name}</span></div>
      <div class="scn-desc">${s.desc}</div>
      <div class="scn-sides"><span>진영 선택 ▸</span>${s.sides.map((sd, k) =>
        `<button class="btn nbtn" style="${natStyle(sd.nation)}" data-scn="${i}" data-pick="${k}">${D.NATIONS[sd.nation].name}</button>`).join('<span>vs</span>')}</div></div>`).join('');
    $('#scenario-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-scn]'); if (!b) return;
      const s = D.SCENARIOS[+b.dataset.scn], k = +b.dataset.pick;
      startBattle({ title: `${s.year}년 ${s.name}`, sides: [s.sides[k], s.sides[1 - k]] });
    });
    const opts = Object.keys(D.NATIONS).map((n) => `<option value="${n}">${D.NATIONS[n].name}</option>`).join('');
    $('#free-a').innerHTML = opts; $('#free-b').innerHTML = opts; $('#free-b').value = 'tang';
    $('#free-start').onclick = () => startBattle({ title: '자유 대전', sides: [{ nation: $('#free-a').value }, { nation: $('#free-b').value }] });

    $('#gallery-tabs').innerHTML = Object.keys(D.NATIONS).map((n) => `<button class="btn ghost" data-nat="${n}">${D.NATIONS[n].name}</button>`).join('');
    const showNat = (n) => {
      document.querySelectorAll('#gallery-tabs .btn').forEach((b) => b.classList.toggle('on', b.dataset.nat === n));
      $('#gallery').innerHTML = D.deckOf(n).map((id) => cardHTML(D.GENERALS[id])).join('');
    };
    $('#gallery-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-nat]'); if (b) showNat(b.dataset.nat); });
    $('#gallery').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) showDetail(D.GENERALS[c.dataset.gid]); });
    showNat('goguryeo');
  }

  function show(screen) {
    $('#screen-title').hidden = screen !== 'title';
    $('#screen-battle').hidden = screen !== 'battle';
    window.scrollTo(0, 0);
  }

  // ── 전투 화면 ───────────────────────────────────────────────
  function startBattle(cfg) {
    setup = cfg;
    B = E.createBattle({ sides: cfg.sides });
    selected = -1;
    $('#log').innerHTML = '';
    $('#result').hidden = true;
    show('battle');
    log(`<span class="t">【${cfg.title}】</span> ${D.NATIONS[B.sides[ME].nation].name} vs ${D.NATIONS[B.sides[FOE].nation].name}`);
    enemyPhase();
  }

  function barHTML(si) {
    const s = B.sides[si], N = D.NATIONS[s.nation];
    return `<div class="nat">${N.name}<small>${N.hanja} · ${si === ME ? '아군' : '적군'}</small></div>
      <div class="meters">
        <div class="meter hq"><i id="hq-${si}" style="width:${100 * s.hq / s.hqMax}%"></i><em id="hqt-${si}">본진 ${s.hq}</em></div>
        <div class="meter mo"><i id="mo-${si}" style="width:${s.morale}%"></i><em id="mot-${si}">사기 ${s.morale}</em></div>
      </div>
      <div class="cnt">패 ${s.hand.length} · 덱 ${s.deck.length}</div>`;
  }
  function setHq(si, v) { const s = B.sides[si]; $('#hq-' + si).style.width = (100 * v / s.hqMax) + '%'; $('#hqt-' + si).textContent = '본진 ' + v; }
  function setMorale(m) { [0, 1].forEach((si) => { $('#mo-' + si).style.width = m[si] + '%'; $('#mot-' + si).textContent = '사기 ' + m[si]; }); }

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
    $('#hand').innerHTML = me.hand.length ? me.hand.map((c, i) => {
      const h = cardHTML(D.GENERALS[c.gid], c, 'hand');
      const extra = (i === selected ? ' selected' : '') + (c.cost > me.cmd ? ' unaffordable' : '');
      return h.replace('class="card', `data-hand="${i}" class="card${extra}`);
    }).join('') : '<div class="hand-empty">손패가 없습니다.</div>';
    let pips = '';
    for (let i = 0; i < me.cmdMax; i++) pips += `<span class="pip${i < me.cmd ? '' : ' off'}"></span>`;
    $('#cmd-box').innerHTML = `<b>군령 ${me.cmd}/${me.cmdMax}</b>${pips}`;
    $('#turn-label').textContent = `${B.turn}턴 / ${E.CFG.turnLimit}`;
    $('#btn-fight').disabled = busy || B.winner !== null;
    $('#phase-label').textContent = busy ? '— 교전 —' : (selected >= 0 ? '배치할 길을 고르세요' : '장수를 배치하고 전투 개시');
  }

  function log(html) { const el = $('#log'); el.insertAdjacentHTML('beforeend', `<div>${html}</div>`); el.scrollTop = el.scrollHeight; }
  const cardEl = (uid) => $(`#screen-battle .lane [data-uid="${uid}"]`);
  const nm = (si, name) => `<span class="p${si}">${name}</span>`;
  function inst(uid) {
    for (const s of B.sides) for (const c of [...s.field, ...s.grave, ...s.hand]) if (c && c.uid === uid) return c;
    return null;
  }

  // ── 연출 도구 ───────────────────────────────────────────────
  function center(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function floatText(el, html, cls) {
    if (!el) return;
    const p = center(el), d = document.createElement('div');
    d.className = 'dmg ' + (cls || ''); d.innerHTML = html; d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    $('#fx-layer').appendChild(d);
    d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-90%) scale(1.25)', opacity: 1, offset: .2 },
      { transform: 'translate(-50%,-190%) scale(1)', opacity: 0 }], { duration: 950 / speed, easing: 'ease-out' }).onfinish = () => d.remove();
  }
  function shake(el) {
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    el.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-7px,2px) rotate(-2deg)' }, { transform: 'translate(6px,-2px) rotate(2deg)' },
      { transform: 'translate(-3px,1px)' }, { transform: 'translate(0,0)' }], { duration: 300 / speed });
  }
  function setTroops(el, v) {
    if (!el) return;
    $('.troops i', el).style.width = (100 * v / +el.dataset.max) + '%'; $('.troops em', el).textContent = v;
  }
  async function die(el) {
    if (!el) return;
    await el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.55) rotate(-10deg)', filter: 'grayscale(1) brightness(.4)' }],
      { duration: 480 / speed, easing: 'ease-in', fill: 'forwards' }).finished;
    el.remove();
  }
  // 근접 공격: 살짝 뒤로 뺐다가 상대에게 달려들어 부딪친다.
  function lunge(el, target) {
    const a = center(el), b = center(target), dx = b.x - a.x, dy = b.y - a.y;
    el.style.zIndex = 20;
    const an = el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-dx * .1}px,${-dy * .1}px) scale(1.06)`, offset: .3 },
      { transform: `translate(${dx * .72}px,${dy * .72}px) scale(1.12)`, offset: .55 }, { transform: 'translate(0,0) scale(1)' }],
      { duration: 560 / speed, easing: 'ease-in-out' });
    an.onfinish = () => { el.style.zIndex = ''; };
    return an.finished;
  }
  // 원거리 공격: 화살 세 발이 날아간다.
  function volley(el, target) {
    const a = center(el), b = center(target);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 220 / speed });
    const ps = [];
    for (let i = 0; i < 3; i++) {
      const ar = document.createElement('div'); ar.className = 'arrow';
      const ox = (i - 1) * 14;
      ar.style.left = (a.x - 17 + ox) + 'px'; ar.style.top = a.y + 'px';
      $('#fx-layer').appendChild(ar);
      const an = ar.animate([{ transform: `translate(0,0) rotate(${ang}deg)`, opacity: 1 }, { transform: `translate(${b.x - a.x - ox * .5}px,${b.y - a.y}px) rotate(${ang}deg)`, opacity: 1 }],
        { duration: 300 / speed, delay: i * 60 / speed, easing: 'ease-in', fill: 'backwards' });
      an.onfinish = () => ar.remove();
      ps.push(an.finished);
    }
    return Promise.all(ps);
  }
  async function cutin(e) {
    const g = D.GENERALS[e.gid], el = $('#cutin');
    el.innerHTML = `<div class="cutin-band" style="${natStyle(g.nation)}">${P.html(g)}<div><h3>${e.name}</h3><p>${g.name} — ${g.skill.desc}</p></div></div>`;
    el.hidden = false;
    await sleep(900);
    el.hidden = true;
  }

  // ── 이벤트 재생 ─────────────────────────────────────────────
  async function playAttack(e) {
    const att = cardEl(e.uid); if (!att) return;
    const a = inst(e.uid);
    const tgt = e.target === 'card' ? cardEl(e.targetUid) : $('#bar-' + (1 - e.side));
    const advTxt = e.adv > 0 ? '<small class="up">상성 유리!</small>' : e.adv < 0 ? '<small class="down">상성 불리</small>' : '';
    const hit = () => {
      if (e.target === 'card') { shake(tgt); setTroops(tgt, e.after); }
      else { tgt.classList.remove('hit'); void tgt.offsetWidth; tgt.classList.add('hit'); setHq(1 - e.side, e.after); }
      floatText(tgt, `${advTxt}-${e.dmg}`);
      setMorale(e.morale);
    };
    if (e.unit === 'arc') { await volley(att, tgt); hit(); await sleep(260); }
    else { const p = lunge(att, tgt); await sleep(300); hit(); await p; }
    if (e.target === 'card') {
      const t = inst(e.targetUid);
      log(`${nm(e.side, a.name)} ▶ ${nm(1 - e.side, t.name)} <b>-${e.dmg}</b>${e.adv > 0 ? ' (상성 유리)' : e.adv < 0 ? ' (상성 불리)' : ''}${e.killed ? ' — <b>격파!</b>' : ''}`);
    } else log(`${nm(e.side, a.name)} ▶ ${nm(1 - e.side, '본진')} <b>-${e.dmg}</b>`);
    if (e.counter) {
      shake(att); setTroops(att, e.counter.after); floatText(att, `<small>창병 반격</small>-${e.counter.dmg}`);
      await sleep(260);
      if (e.counter.killed) { log(`${nm(e.side, a.name)} 반격에 쓰러짐`); await die(att); }
    }
    if (e.killed) await die(tgt);
    await sleep(120);
  }

  async function playSkill(e) {
    const c = inst(e.uid);
    log(`${nm(e.side, c.name)}의 계략 <span class="t">「${e.name}」</span>`);
    await cutin(e);
    const deaths = [];
    for (const f of e.fx) {
      if (f.t === 'dmg') { const el = cardEl(f.uid); shake(el); setTroops(el, f.after); floatText(el, '-' + f.dmg); if (f.killed) deaths.push(die(el)); }
      else if (f.t === 'heal') { const el = cardEl(f.uid); setTroops(el, f.after); if (f.amount) floatText(el, '+' + f.amount, 'heal'); }
      else if (f.t === 'buff') f.uids.forEach((u) => floatText(cardEl(u), f.k === 'atk' ? '공격 ↑' : '방어 ↑', 'info'));
      else if (f.t === 'stun') floatText(cardEl(f.uid), f.ok ? '혼란!' : '간파', 'info');
      else if (f.t === 'hq') { setHq(f.side, f.after); floatText($('#bar-' + f.side), (f.delta > 0 ? '+' : '') + f.delta, f.delta > 0 ? 'heal' : ''); }
    }
    setMorale(e.morale);
    await Promise.all(deaths);
    await sleep(650);
  }

  async function play(events) {
    for (const e of events) {
      if (e.t === 'attack') await playAttack(e);
      else if (e.t === 'skill') { await playSkill(e); render(); }
      else if (e.t === 'deploy') {
        render();
        const el = cardEl(e.uid), c = inst(e.uid);
        log(`${nm(e.side, c.name)} 출진 (${D.UNITS[c.unit].name})`);
        if (el) await el.animate([{ transform: `translateY(${e.side === ME ? 40 : -40}px) scale(1.15)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260 / speed, easing: 'ease-out' }).finished;
      } else if (e.t === 'skip' && e.why === 'stun') { floatText(cardEl(e.uid), '혼란 — 행동 불가', 'info'); await sleep(350); }
    }
  }

  // ── 턴 진행 ─────────────────────────────────────────────────
  async function enemyPhase() {
    busy = true; selected = -1; render();
    log(`<span class="t">— ${B.turn}턴 —</span>`);
    await sleep(300);
    await play(E.aiAct(B, FOE));
    busy = false; render();
    if (B.winner !== null) showResult();
  }

  async function fight() {
    if (busy || B.winner !== null) return;
    busy = true; selected = -1; render();
    await play(E.resolve(B));
    if (B.winner !== null) { render(); return showResult(); }
    E.beginTurn(B);
    await enemyPhase();
  }

  async function playerSkill(lane) {
    if (busy) return;
    const e = E.useSkill(B, ME, lane); if (!e) return;
    busy = true; selected = -1; render();
    await play([e]);
    busy = false; render();
    if (B.winner !== null) showResult();
  }

  function showResult() {
    const w = B.winner, el = $('#result');
    const title = w === ME ? '승 리' : w === FOE ? '패 배' : '무 승 부';
    log(`<span class="t">전투 종료 — ${title.replace(/ /g, '')} (${B.reason})</span>`);
    el.innerHTML = `<div class="sheet result-box ${w === ME ? 'win' : 'lose'}"><h2>${title}</h2><p>${B.reason} · ${B.turn}턴</p>
      <p>아군 본진 ${B.sides[ME].hq}/${B.sides[ME].hqMax} · 적 본진 ${B.sides[FOE].hq}/${B.sides[FOE].hqMax}</p>
      <div class="acts" style="justify-content:center"><button class="btn" id="r-again">다시 싸우기</button><button class="btn" id="r-home">전투 선택으로</button></div></div>`;
    el.hidden = false;
    $('#r-again').onclick = () => startBattle(setup);
    $('#r-home').onclick = () => { el.hidden = true; show('title'); };
  }

  // ── 장수 상세 ───────────────────────────────────────────────
  function showDetail(g, c, lane) {
    const el = $('#detail'), U = D.UNITS[g.unit];
    const canSkill = c && lane != null && !busy && E.canUseSkill(B, ME, lane);
    const rows = ['lead', 'war', 'int', 'pol'].map((k) =>
      `<tr><td>${D.STATS[k].name}</td><td class="g-${g.stats[k]}">${g.stats[k]}</td><td>${D.GRADES[g.stats[k]].value} · ${D.STATS[k].desc}</td></tr>`).join('');
    el.innerHTML = `<div class="sheet"><div class="sheet-top">${cardHTML(g, c, c && lane != null ? 'field' : 'hand')}
      <div><h3>${g.name}<small>${g.hanja}</small></h3>
      <p>${D.NATIONS[g.nation].name} · <b>${U.name}</b> · 배치 비용 ${E.costOf(g)}</p><p>${U.trait}</p>${g.note ? `<p><em>${g.note}</em></p>` : ''}</div></div>
      <table>${rows}</table>
      ${g.skill ? `<p><b>계략 「${g.skill.name}」</b> (재사용 ${g.skill.cd}턴) — ${g.skill.desc}</p>` : '<p>계략 없음 (일반 병졸)</p>'}
      <div class="acts">${canSkill ? '<button class="btn primary" id="d-skill">계략 사용</button>' : ''}<button class="btn" id="d-close">닫기</button></div></div>`;
    el.hidden = false;
    $('#d-close').onclick = () => { el.hidden = true; };
    if (canSkill) $('#d-skill').onclick = () => { el.hidden = true; playerSkill(lane); };
  }

  // ── 입력 ────────────────────────────────────────────────────
  function bind() {
    $('#hand').addEventListener('click', (e) => {
      const c = e.target.closest('.card'); if (!c || busy) return;
      const i = +c.dataset.hand, card = B.sides[ME].hand[i];
      if (i === selected || card.cost > B.sides[ME].cmd) { selected = -1; render(); return showDetail(D.GENERALS[card.gid], card); }
      selected = i; render();
    });
    $('#screen-battle .board').addEventListener('click', (e) => {
      const lane = e.target.closest('.lane'); if (!lane) return;
      const si = +lane.dataset.side, l = +lane.dataset.lane, c = B.sides[si].field[l];
      if (c) return showDetail(D.GENERALS[c.gid], c, si === ME ? l : null);
      if (busy || si !== ME || selected < 0) return;
      const ev = E.deploy(B, ME, selected, l);
      selected = -1;
      if (ev) play([ev]); else render();
    });
    $('#btn-fight').onclick = fight;
    // 브라우저 confirm 대신 "한 번 더 누르면 나가기" 방식
    $('#btn-exit').onclick = (e) => {
      const b = e.currentTarget;
      if (B.winner !== null || b.dataset.armed) { delete b.dataset.armed; b.textContent = '← 나가기'; if (B.winner === null) B.winner = FOE; return show('title'); }
      b.dataset.armed = '1'; b.textContent = '한 번 더 누르면 포기';
      setTimeout(() => { delete b.dataset.armed; b.textContent = '← 나가기'; }, 2500);
    };
    $('#btn-speed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; $('#btn-speed').textContent = '속도 ×' + speed; };
    $('#detail').addEventListener('click', (e) => { if (e.target.id === 'detail') e.target.hidden = true; });
  }

  initTitle();
  bind();
  window.SGDebug = { get state() { return B; } };
})();
