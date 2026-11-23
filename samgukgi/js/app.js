/* 삼국기 - 화면과 진행 저장 */
(function () {
  'use strict';
  var SGK = window.SGK;
  var KEY = 'samgukgi_save_v1';
  var $app = document.getElementById('app');
  var $ov = document.getElementById('overlay');
  var save = load();
  var ui = { tab: 'stage' };
  var battle = null; /* 재생 중인 전투 */

  /* ---------- 저장 ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.nation && s.owned && s.team) return s;
    } catch (e) { /* 저장이 깨졌으면 새로 시작 */ }
    return null;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 저장 불가 환경에서는 이번 접속만 유지 */ }
  }
  function newGame(nation) {
    var st = SGK.NATIONS[nation].starter;
    save = { nation: nation, gold: 1000, pity: 0, owned: {}, team: [st[1], st[2], st[0]], equip: {}, cleared: 0 };
    st.forEach(function (id) { save.owned[id] = { lv: 1, exp: 0, adv: 0 }; });
    persist();
  }

  /* ---------- 공통 조각 ---------- */
  function stars(n) { return '★★★★★'.slice(0, n); }
  function gen(id) { return SGK.GENERALS[id]; }
  function troopIcon(id) { return SGK.TROOPS[gen(id).troop].icon; }
  function tacType(t) { return t.type === 'active' ? '능동 ' + Math.round(t.rate * 100) + '%' : t.type === 'command' ? '지휘' : '특수'; }

  function genCard(id, opt) {
    opt = opt || {};
    var g = gen(id), own = save && save.owned[id];
    var sub = own ? 'Lv.' + own.lv + (own.adv ? ' · 돌파 ' + own.adv : '') : '미보유';
    if (opt.sub) sub = opt.sub;
    return '<button class="gen n-' + g.nation + ' s' + g.star + (own || opt.force ? '' : ' locked') + '" data-act="' + (opt.act || 'detail') + '" data-id="' + id + '">' +
      '<div class="row"><span class="stars">' + stars(g.star) + '</span><span>' + troopIcon(id) + '</span></div>' +
      '<div class="nm">' + g.name + '</div><div class="sb">' + SGK.NATIONS[g.nation].name + ' · ' + sub + '</div>' +
      (opt.tag ? '<span class="tag ' + (opt.tagCls || '') + '">' + opt.tag + '</span>' : '') + '</button>';
  }

  function tacticHtml(tid) {
    var t = SGK.TACTICS[tid];
    return '<div class="tac"><b>' + t.name + '</b><span class="ty">' + tacType(t) + '</span>' + t.desc + '</div>';
  }

  /* ---------- 전체 그리기 ---------- */
  function render() {
    if (!save) { $app.innerHTML = introHtml(); return; }
    var n = SGK.NATIONS[save.nation];
    var body = ui.tab === 'stage' ? stageHtml() : ui.tab === 'team' ? teamHtml() : ui.tab === 'roster' ? rosterHtml() : gachaHtml();
    var tabs = [['stage', '⚔️', '전장'], ['team', '🚩', '편성'], ['roster', '📜', '무장'], ['gacha', '🎴', '등용']];
    $app.innerHTML =
      '<div class="top"><h1>삼국기</h1><span class="nation-tag" style="background:' + n.color + '">' + n.name + '</span>' +
      '<span class="gold">금화 ' + save.gold.toLocaleString() + '</span><button class="reset" data-act="reset">초기화</button></div>' +
      '<div class="main">' + body + '</div>' +
      '<div class="tabs">' + tabs.map(function (t) {
        return '<button data-act="tab" data-id="' + t[0] + '" class="' + (ui.tab === t[0] ? 'on' : '') + '"><span class="ico">' + t[1] + '</span>' + t[2] + '</button>';
      }).join('') + '</div>';
  }

  function introHtml() {
    return '<div class="intro"><h1>삼국기</h1><p class="lead">고구려 · 백제 · 신라<br>무장을 등용하고, 부대를 짜고, 전장을 제패하라</p>' +
      Object.keys(SGK.NATIONS).map(function (k) {
        var n = SGK.NATIONS[k];
        return '<button class="pick n-' + k + '" data-act="start" data-id="' + k + '"><b>' + n.name + '</b>' +
          '<div class="bonus">진영 효과: ' + n.bonus + '</div>' +
          '<div class="st">시작 무장: ' + n.starter.map(function (id) { return gen(id).name + '(' + gen(id).star + '성)'; }).join(', ') + '</div></button>';
      }).join('') +
      '<p class="note">시작 국가는 처음 받는 무장만 결정합니다. 등용으로 세 나라 무장을 모두 얻을 수 있고, 같은 나라 무장으로 부대를 채우면 진영 효과가 켜집니다.</p></div>';
  }

  /* ---------- 전장 ---------- */
  function stageHtml() {
    var h = '<div class="sec-title">전장 (역사 속 전장 이름을 빌린 가상 모의전)</div>';
    SGK.STAGES.forEach(function (s, i) {
      var locked = i > save.cleared, done = i < save.cleared;
      var rw = SGK.stageReward(i, !done);
      h += '<div class="card stage' + (locked ? ' locked' : '') + '"><div class="info">' +
        '<div><span class="nm">' + (i + 1) + '. ' + s.name + '</span><span class="lv">Lv.' + s.lv + '</span>' + (done ? '<span class="done">✔ 격파</span>' : '') + '</div>' +
        '<div class="foes">' + s.team.map(function (id, k) { return '<span>' + SGK.SLOT_NAMES[k] + ' ' + troopIcon(id) + gen(id).name + '</span>'; }).join('') + '</div>' +
        '<div class="rw">' + (done ? '반복 보상' : '첫 승리 보상') + ': 금화 ' + rw.gold + ' · 경험치 ' + rw.exp + '</div></div>' +
        '<button class="btn primary small" data-act="fight" data-id="' + i + '"' + (locked ? ' disabled' : '') + '>' + (locked ? '잠김' : '출전') + '</button></div>';
    });
    return h;
  }

  /* ---------- 편성 ---------- */
  function teamHtml() {
    var mods = SGK.Battle.teamMods(save.team);
    var h = '<div class="sec-title">부대 편성 (적은 선봉 → 중군 → 본영 순으로 공격받습니다. 본영이 무너지면 패배)</div>';
    save.team.forEach(function (id, k) {
      var g = gen(id), o = save.owned[id], st = SGK.calcStats(id, o.lv, o.adv);
      var need = SGK.expNeed(o.lv);
      var opts = '<option value="">공용 전법 없음</option>' + SGK.COMMON_TACTICS.map(function (tid) {
        var usedBy = save.team.filter(function (x) { return x !== id && save.equip[x] === tid; })[0];
        return '<option value="' + tid + '"' + (save.equip[id] === tid ? ' selected' : '') + (usedBy ? ' disabled' : '') + '>' +
          SGK.TACTICS[tid].name + (usedBy ? ' (' + gen(usedBy).name + ' 사용 중)' : '') + '</option>';
      }).join('');
      h += '<div class="card slot n-' + g.nation + '"><div class="hd"><span class="pos' + (k === 2 ? ' leader' : '') + '">' + SGK.SLOT_NAMES[k] + (k === 2 ? ' · 대장' : '') + '</span>' +
        '<span class="nm">' + troopIcon(id) + ' ' + g.name + '</span><span class="stars" style="color:var(--gold);font-size:11px">' + stars(g.star) + '</span>' +
        '<button class="btn small" data-act="pick" data-id="' + k + '">교체</button></div>' +
        '<div class="stats"><div><small>무력</small>' + st.str + '</div><div><small>지력</small>' + st.int + '</div><div><small>통솔</small>' + st.lead + '</div><div><small>속도</small>' + st.spd + '</div><div><small>병력</small>' + st.maxTroops + '</div></div>' +
        '<div class="note">Lv.' + o.lv + (o.lv >= SGK.MAX_LV ? ' (최대)' : ' · 경험치 ' + o.exp + '/' + need) + ' · 돌파 ' + o.adv + '/' + SGK.MAX_ADV + '</div>' +
        tacticHtml(g.tactic) + (save.equip[id] ? tacticHtml(save.equip[id]) : '') +
        '<select data-change="equip" data-id="' + id + '">' + opts + '</select></div>';
    });
    var bn = mods.nation ? SGK.NATIONS[mods.nation] : null;
    h += '<div class="sec-title">진영 효과</div><div class="card bonus-box' + (bn ? ' n-' + mods.nation : '') + '">' +
      (bn ? '<b>' + bn.name + ' ' + mods.count + '명</b> — ' + bn.bonus + (mods.factor < 1 ? ' 의 절반 적용 (3명이면 전부 적용)' : ' 전부 적용')
        : '같은 나라 무장이 2명 이상이어야 켜집니다.') +
      '<br>고구려: ' + SGK.NATIONS.gogu.bonus + ' / 백제: ' + SGK.NATIONS.baek.bonus + ' / 신라: ' + SGK.NATIONS.silla.bonus + '</div>' +
      '<div class="sec-title">병종 상성</div><div class="card note">🔱 창병 → 🐎 기병 → 🏹 궁병 → 🔱 창병 순으로 유리합니다. 유리하면 피해 +20%, 불리하면 -15%.</div>';
    return h;
  }

  /* ---------- 무장 목록 ---------- */
  function rosterHtml() {
    var ids = SGK.GENERAL_IDS.slice().sort(function (a, b) {
      var oa = save.owned[a] ? 1 : 0, ob = save.owned[b] ? 1 : 0;
      return ob - oa || gen(b).star - gen(a).star;
    });
    var cnt = Object.keys(save.owned).length;
    return '<div class="sec-title">무장 ' + cnt + ' / ' + ids.length + '</div><div class="grid">' + ids.map(function (id) {
      var inTeam = save.team.indexOf(id) >= 0;
      return genCard(id, inTeam ? { tag: '출전', tagCls: 'inteam' } : {});
    }).join('') + '</div>';
  }

  /* ---------- 등용(뽑기) ---------- */
  function gachaHtml() {
    var G = SGK.Gacha, left = G.PITY - save.pity;
    var h = '<div class="card gacha-hero"><h2>인재 등용</h2><div class="pity">5성 확정까지 ' + left + '회</div>' +
      '<div class="gacha-btns"><button class="btn" data-act="pull" data-id="1"' + (save.gold < G.COST_ONE ? ' disabled' : '') + '>1회 등용<small>금화 ' + G.COST_ONE + '</small></button>' +
      '<button class="btn primary" data-act="pull" data-id="10"' + (save.gold < G.COST_TEN ? ' disabled' : '') + '>10회 등용<small>금화 ' + G.COST_TEN + '</small><small>4성 이상 1명 보장</small></button></div></div>' +
      '<div class="sec-title">확률 안내</div><div class="card"><table class="rates"><tr><th>등급</th><th>무장 (각 무장 확률은 동일)</th><th class="r">등급 확률</th><th class="r">무장별</th></tr>';
    [5, 4, 3].forEach(function (s) {
      var pool = SGK.GENERAL_IDS.filter(function (id) { return gen(id).star === s; });
      h += '<tr><td>' + s + '성</td><td>' + pool.map(function (id) { return gen(id).name; }).join(', ') + '</td>' +
        '<td class="r">' + (G.RATES[s] * 100).toFixed(0) + '%</td><td class="r">' + (G.RATES[s] * 100 / pool.length).toFixed(3) + '%</td></tr>';
    });
    h += '</table><p class="note">· 5성이 ' + G.PITY + '회 연속 나오지 않으면 그다음 1회는 5성이 확정됩니다.<br>' +
      '· 이미 가진 무장이 나오면 돌파 +1(능력치 +4%, 병력 +3%, 최대 ' + SGK.MAX_ADV + '). 돌파가 최대면 금화로 환급합니다(3성 ' + G.REFUND[3] + ' / 4성 ' + G.REFUND[4] + ' / 5성 ' + G.REFUND[5] + ').<br>' +
      '· 금화는 전장에서만 얻습니다. 이 프로토타입에는 실제 결제가 없습니다.</p></div>';
    return h;
  }

  /* ---------- 모달 ---------- */
  function closeOverlay() { $ov.innerHTML = ''; }
  function sheet(title, body) {
    $ov.innerHTML = '<div class="sheet"><h3>' + title + '<button class="x" data-act="close">×</button></h3>' + body + '</div>';
  }

  function showDetail(id) {
    var g = gen(id), o = save.owned[id] || { lv: 1, adv: 0 }, st = SGK.calcStats(id, o.lv, o.adv);
    sheet(troopIcon(id) + ' ' + g.name + ' <span style="color:var(--gold);font-size:13px">' + stars(g.star) + '</span>',
      '<div class="note">' + SGK.NATIONS[g.nation].name + ' · ' + SGK.TROOPS[g.troop].name + (save.owned[id] ? ' · Lv.' + o.lv + ' · 돌파 ' + o.adv : ' · 미보유 (1레벨 기준 수치)') + '</div>' +
      '<div class="stats"><div><small>무력</small>' + st.str + '</div><div><small>지력</small>' + st.int + '</div><div><small>통솔</small>' + st.lead + '</div><div><small>속도</small>' + st.spd + '</div><div><small>병력</small>' + st.maxTroops + '</div></div>' +
      '<div class="sec-title">고유 전법</div>' + tacticHtml(g.tactic) + '<div class="sec-title">인물</div><div class="bio">' + g.bio + '</div>');
  }

  function showPicker(slot) {
    var ids = Object.keys(save.owned).sort(function (a, b) { return gen(b).star - gen(a).star || save.owned[b].lv - save.owned[a].lv; });
    sheet(SGK.SLOT_NAMES[slot] + '에 배치할 무장',
      '<div class="grid">' + ids.map(function (id) {
        var at = save.team.indexOf(id);
        return genCard(id, { act: 'assign:' + slot, tag: at >= 0 ? SGK.SLOT_NAMES[at] : '', tagCls: 'inteam' });
      }).join('') + '</div><p class="note">이미 출전 중인 무장을 고르면 두 자리가 서로 바뀝니다.</p>');
  }

  function assign(slot, id) {
    var at = save.team.indexOf(id);
    if (at >= 0) save.team[at] = save.team[slot];
    save.team[slot] = id;
    /* 부대 안에서 공용 전법이 겹치면 나중 것을 뺀다 */
    var seen = {};
    save.team.forEach(function (x) { var e = save.equip[x]; if (e) { if (seen[e]) delete save.equip[x]; else seen[e] = 1; } });
    persist(); closeOverlay(); render();
  }

  function pull(count) {
    var G = SGK.Gacha, cost = count >= 10 ? G.COST_TEN : G.COST_ONE;
    if (save.gold < cost) return;
    save.gold -= cost;
    var st = { pity: save.pity };
    var ids = G.roll(st, count, Math.random);
    save.pity = st.pity;
    var res = ids.map(function (id) { return G.grant(save, id); });
    persist(); render();
    sheet('등용 결과', '<div class="grid">' + res.map(function (r) {
      var tag = r.kind === 'new' ? '신규' : r.kind === 'adv' ? '돌파 ' + r.adv : '금화 +' + r.gold;
      return genCard(r.id, { tag: tag, tagCls: r.kind === 'new' ? '' : r.kind === 'adv' ? 'adv' : 'refund', force: true, sub: SGK.TROOPS[gen(r.id).troop].name });
    }).join('') + '</div><div style="margin-top:12px"><button class="btn primary" style="width:100%" data-act="close">확인</button></div>');
  }

  /* ---------- 전투 ---------- */
  function unitHtml(u) {
    return '<div class="unit n-' + u.nation + '" id="u-' + u.uid + '"><div class="fl"></div>' +
      '<div class="u1"><span>' + SGK.SLOT_NAMES[u.slot] + '</span><span>' + SGK.TROOPS[u.troop].icon + ' Lv.' + u.lv + '</span></div>' +
      '<div class="u2">' + u.name + '</div><div class="bar"><i></i></div>' +
      '<div class="u3"><span class="tr">' + u.maxTroops + '</span><span class="sts"></span></div></div>';
  }

  function startBattle(index) {
    var stg = SGK.STAGES[index];
    var mine = save.team.map(function (id) { var o = save.owned[id]; return { id: id, lv: o.lv, adv: o.adv, equip: save.equip[id] }; });
    var foe = stg.team.map(function (id) { return { id: id, lv: stg.lv, adv: 0, equip: stg.equip[id] }; });
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    var r = SGK.Battle.simulate(mine, foe, seed);
    var A = r.units.filter(function (u) { return u.side === 'A'; }), Bs = r.units.filter(function (u) { return u.side === 'B'; });
    battle = { r: r, i: 0, speed: 1, timer: null, index: index, max: {}, done: false };
    r.units.forEach(function (u) { battle.max[u.uid] = u.maxTroops; });

    $ov.innerHTML = '<div class="battle"><div class="b-head"><span class="rd" id="b-rd">개전</span><span class="st-name">' + (index + 1) + '. ' + stg.name + '</span>' +
      '<button class="btn small" data-act="speed" id="b-speed">1배속</button><button class="btn small" data-act="skip">건너뛰기</button></div>' +
      '<div class="b-side"><div class="lbl">적군' + modLabel(r.mods.B) + '</div><div class="b-row">' + Bs.slice().reverse().map(unitHtml).join('') + '</div></div>' +
      '<div class="b-log" id="b-log"></div>' +
      '<div class="b-side"><div class="lbl">아군' + modLabel(r.mods.A) + '</div><div class="b-row">' + A.map(unitHtml).join('') + '</div></div>' +
      '<div class="b-result hidden" id="b-res"></div></div>';
    step();
  }
  function modLabel(m) {
    return m.nation ? ' · ' + SGK.NATIONS[m.nation].name + ' 진영 효과' + (m.factor < 1 ? ' (절반)' : '') : '';
  }

  function applyState(state) {
    Object.keys(state).forEach(function (uid) {
      var el = document.getElementById('u-' + uid); if (!el) return;
      var t = state[uid].t, pct = t / battle.max[uid] * 100;
      var bar = el.querySelector('.bar i');
      bar.style.width = pct + '%';
      bar.className = pct <= 25 ? 'low' : pct <= 55 ? 'mid' : '';
      el.querySelector('.tr').textContent = t;
      el.querySelector('.sts').textContent = state[uid].s.join(' ');
      el.classList.toggle('dead', t <= 0);
    });
  }

  function flash(uid, cls, text) {
    var el = document.getElementById('u-' + uid); if (!el) return;
    if (cls === 'dmg') { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    var fl = el.querySelector('.fl');
    fl.className = 'fl ' + cls; fl.textContent = text; void fl.offsetWidth; fl.classList.add('go');
  }

  function showEvent(e, quiet) {
    var log = document.getElementById('b-log');
    var side = e.actor ? ' s' + e.actor.charAt(0) : '';
    var div = document.createElement('div');
    div.className = 'l-' + e.type + side;
    div.textContent = e.type === 'round' ? '── ' + e.text + ' ──' : e.text;
    log.appendChild(div);
    if (e.type === 'round') document.getElementById('b-rd').textContent = e.text;
    applyState(e.state);
    if (!quiet) {
      var acts = document.querySelectorAll('.unit.act');
      for (var k = 0; k < acts.length; k++) acts[k].classList.remove('act');
      if (e.actor) { var a = document.getElementById('u-' + e.actor); if (a) a.classList.add('act'); }
      if (e.type === 'dmg') flash(e.target, 'dmg', '-' + e.value);
      if (e.type === 'heal') flash(e.target, 'heal', '+' + e.value);
      log.scrollTop = log.scrollHeight;
    }
  }

  function step() {
    if (!battle || battle.done) return;
    var ev = battle.r.events;
    if (battle.i >= ev.length) { finishBattle(); return; }
    var e = ev[battle.i++];
    showEvent(e);
    var d = e.type === 'round' ? 520 : e.type === 'tactic' ? 620 : e.type === 'buff' || e.type === 'status' ? 380 : 460;
    battle.timer = setTimeout(step, d / battle.speed);
  }

  function skipBattle() {
    if (!battle || battle.done) return;
    clearTimeout(battle.timer);
    var ev = battle.r.events;
    while (battle.i < ev.length) showEvent(ev[battle.i++], true);
    var log = document.getElementById('b-log'); log.scrollTop = log.scrollHeight;
    finishBattle();
  }

  function finishBattle() {
    battle.done = true;
    var res = battle.r.result, idx = battle.index, win = res === 'win';
    var first = win && idx === save.cleared;
    var rw = SGK.stageReward(idx, first);
    var gold = win ? rw.gold : 0;
    var exp = win ? rw.exp : Math.round(rw.exp * 0.3);
    save.gold += gold;
    var ups = [];
    save.team.forEach(function (id) {
      var o = save.owned[id], before = o.lv;
      if (o.lv >= SGK.MAX_LV) return;
      o.exp += exp;
      while (o.lv < SGK.MAX_LV && o.exp >= SGK.expNeed(o.lv)) { o.exp -= SGK.expNeed(o.lv); o.lv += 1; }
      if (o.lv >= SGK.MAX_LV) o.exp = 0;
      if (o.lv > before) ups.push(gen(id).name + ' Lv.' + before + ' → ' + o.lv);
    });
    if (first) save.cleared += 1;
    persist();
    var title = win ? '승 리' : res === 'draw' ? '무승부' : '패 배';
    var el = document.getElementById('b-res');
    el.innerHTML = '<h2 class="' + (win ? 'win' : 'lose') + '">' + title + '</h2><div class="rw">' +
      (win ? '금화 +' + gold + (first ? ' (첫 승리)' : '') + ' · ' : '') + '출전 무장 경험치 +' + exp +
      (ups.length ? '<br>' + ups.join(' / ') : '') +
      (!win ? '<br>편성·병종 상성·공용 전법을 바꾸거나 무장을 더 키워 다시 도전하세요.' : '') +
      '</div><button class="btn primary" data-act="endbattle">확인</button>';
    el.classList.remove('hidden');
    document.getElementById('b-log').scrollTop = 1e9;
  }

  /* ---------- 입력 ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) { if (ev.target === $ov && !battle) closeOverlay(); return; }
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (el.disabled) return;
    if (act === 'start') { newGame(id); render(); }
    else if (act === 'tab') { ui.tab = id; render(); window.scrollTo(0, 0); }
    else if (act === 'detail') showDetail(id);
    else if (act === 'close') closeOverlay();
    else if (act === 'pick') showPicker(+id);
    else if (act.indexOf('assign:') === 0) assign(+act.split(':')[1], id);
    else if (act === 'pull') pull(+id);
    else if (act === 'fight') startBattle(+id);
    else if (act === 'speed') { battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 4 : 1; el.textContent = battle.speed + '배속'; }
    else if (act === 'skip') skipBattle();
    else if (act === 'endbattle') { battle = null; closeOverlay(); render(); }
    else if (act === 'reset') {
      if (window.confirm('모든 진행 상황을 지우고 처음부터 다시 시작할까요?')) {
        try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
        save = null; ui.tab = 'stage'; render();
      }
    }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.getAttribute && el.getAttribute('data-change') === 'equip') {
      var id = el.getAttribute('data-id');
      if (el.value) save.equip[id] = el.value; else delete save.equip[id];
      persist(); render();
    }
  });

  render();
})();
