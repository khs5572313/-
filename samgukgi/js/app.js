/* 삼국기 - 화면과 진행 저장 */
(function () {
  'use strict';
  var SGK = window.SGK;
  var KEY = 'samgukgi_save_v2';
  var $app = document.getElementById('app');
  var $ov = document.getElementById('overlay');
  var save = load();
  var ui = { tab: 'stage' };
  var battle = null; /* 재생 중인 전투 */
  var GROUPS = 6;    /* 전장에 그리는 부대 무리 수 */

  /* ---------- 저장 ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.nation && s.owned && s.army && s.posts) return s;
    } catch (e) { /* 저장이 깨졌으면 새로 시작 */ }
    return null;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 저장 불가 환경에서는 이번 접속만 유지 */ }
  }
  function newGame(nation) {
    save = {
      nation: nation, gold: 1000, food: 3000, reserve: 12000, minsim: 50, chian: 50, month: 0, pity: 0, cleared: 0,
      owned: {}, army: { cmd: null, atk: null, tac: null, sup: null }, posts: { gov: null, guard: null, sage: null, steward: null },
      tech: { weapon: 0, armor: 0, farm: 0, wall: 0 }, research: { target: 'farm', pts: 0 }, report: null
    };
    SGK.NATIONS[nation].starter.forEach(function (id) { save.owned[id] = { lv: 1, exp: 0, adv: 0 }; });
    autoArmy();
    persist();
  }

  /* ---------- 공통 조각 ---------- */
  function stars(n) { return '★★★★★'.slice(0, n); }
  function gen(id) { return SGK.GENERALS[id]; }
  function troopIcon(id) { return SGK.TROOPS[gen(id).troop].icon; }
  function tacType(t) { return t.type === 'active' ? '능동 ' + Math.round(t.rate * 100) + '%' : t.type === 'command' ? '지휘' : '특수'; }
  function statsOf(id) { var o = save.owned[id] || { lv: 1, adv: 0 }; return SGK.calcStats(id, o.lv, o.adv); }
  function num(n) { return Math.round(n).toLocaleString(); }
  function dateLabel() { return (Math.floor(save.month / 12) + 1) + '년 ' + (save.month % 12 + 1) + '월'; }

  /* 장수가 지금 어디에 배치돼 있는지 */
  function whereIs(id) {
    for (var i = 0; i < SGK.ROLES.length; i++) if (save.army[SGK.ROLES[i].key] === id) return { kind: 'army', key: SGK.ROLES[i].key, name: SGK.ROLES[i].name };
    for (var j = 0; j < SGK.POSTS.length; j++) if (save.posts[SGK.POSTS[j].key] === id) return { kind: 'post', key: SGK.POSTS[j].key, name: SGK.POSTS[j].name };
    return null;
  }
  function slotOf(kind) { return kind === 'army' ? save.army : save.posts; }
  function slotDef(kind, key) { return (kind === 'army' ? SGK.ROLES : SGK.POSTS).filter(function (x) { return x.key === key; })[0]; }

  /* 네 능력치를 한 줄로. hi 로 넘긴 능력치는 강조한다. */
  function statLine(id, hi) {
    var st = statsOf(id);
    return '<span class="sl">' + SGK.STAT_KEYS.map(function (k) {
      return '<i class="' + (k === hi ? 'hi' : '') + '">' + SGK.STAT_NAMES[k].charAt(0) + st[k] + '</i>';
    }).join('') + '</span>';
  }
  function statBoxes(st, hi) {
    return '<div class="stats">' + SGK.STAT_KEYS.map(function (k) {
      return '<div class="' + (k === hi ? 'hi' : '') + '"><small>' + SGK.STAT_NAMES[k] + '</small>' + st[k] + '</div>';
    }).join('') + '</div>';
  }

  function genCard(id, opt) {
    opt = opt || {};
    var g = gen(id), own = save && save.owned[id];
    var sub = own ? 'Lv.' + own.lv + (own.adv ? ' · 돌파 ' + own.adv : '') : '미보유';
    if (opt.sub) sub = opt.sub;
    return '<button class="gen n-' + g.nation + ' s' + g.star + (own || opt.force ? '' : ' locked') + '" data-act="' + (opt.act || 'detail') + '" data-id="' + id + '">' +
      '<div class="row"><span class="stars">' + stars(g.star) + '</span><span>' + troopIcon(id) + '</span></div>' +
      '<div class="nm">' + g.name + '</div><div class="sb">' + sub + '</div>' + statLine(id, opt.hi) +
      (opt.tag ? '<span class="tag ' + (opt.tagCls || '') + '">' + opt.tag + '</span>' : '') + '</button>';
  }
  function tacticHtml(tid) {
    var t = SGK.TACTICS[tid];
    return '<div class="tac"><b>' + t.name + '</b><span class="ty">' + tacType(t) + '</span>' + t.desc + '</div>';
  }

  /* ---------- 부대 계산 ---------- */
  function armyRoles() {
    var r = {};
    SGK.ROLE_KEYS.forEach(function (k) {
      var id = save.army[k], o = id && save.owned[id];
      r[k] = o ? { id: id, lv: o.lv, adv: o.adv } : null;
    });
    return r;
  }
  function armyFull() { return SGK.ROLE_KEYS.every(function (k) { return !!save.army[k]; }); }
  /* 출전 계획: 데려갈 병력, 원군, 군량 비용 */
  function sortiePlan() {
    var U = SGK.Battle.unitStats(armyRoles()), o = SGK.City.outlook(save);
    var own = Math.min(U.capacity, save.reserve);
    var aidTroops = Math.round(own * o.aid);
    return { U: U, own: own, aid: o.aid, aidTroops: aidTroops, total: own + aidTroops, food: Math.round(own * 0.1) };
  }
  /* 관직에 없는 장수 중에서, 자리마다 해당 능력치가 가장 높은 장수를 앉힌다 */
  function autoArmy() {
    var pool = Object.keys(save.owned).filter(function (id) { var w = whereIs(id); return !w || w.kind === 'army'; });
    var left = pool.slice(), pick = {};
    /* 후보 간 격차가 큰 자리부터 채운다 */
    var roles = SGK.ROLES.slice();
    while (roles.length && left.length) {
      var best = null;
      roles.forEach(function (r) {
        var sorted = left.slice().sort(function (a, b) { return statsOf(b)[r.stat] - statsOf(a)[r.stat]; });
        var gap = statsOf(sorted[0])[r.stat] - (sorted[1] ? statsOf(sorted[1])[r.stat] : 0);
        if (!best || gap > best.gap) best = { r: r, id: sorted[0], gap: gap };
      });
      pick[best.r.key] = best.id;
      left.splice(left.indexOf(best.id), 1);
      roles.splice(roles.indexOf(best.r), 1);
    }
    SGK.ROLE_KEYS.forEach(function (k) { save.army[k] = pick[k] || null; });
  }

  /* ---------- 전체 그리기 ---------- */
  function render() {
    if (!save) { $app.innerHTML = introHtml(); return; }
    var n = SGK.NATIONS[save.nation];
    var body = ui.tab === 'stage' ? stageHtml() : ui.tab === 'army' ? armyHtml() : ui.tab === 'city' ? cityHtml() : ui.tab === 'roster' ? rosterHtml() : gachaHtml();
    var tabs = [['stage', '⚔️', '전장'], ['army', '🚩', '부대'], ['city', '🏯', '내정'], ['roster', '📜', '장수'], ['gacha', '🎴', '등용']];
    $app.innerHTML =
      '<div class="top"><div class="t1"><h1>삼국기</h1><span class="nation-tag" style="background:' + n.color + '">' + n.name + '</span>' +
      '<span class="date">' + dateLabel() + '</span><button class="reset" data-act="reset">초기화</button></div>' +
      '<div class="res"><span title="금화">💰 ' + num(save.gold) + '</span><span title="군량">🌾 ' + num(save.food) + '</span><span title="예비 병력">🪖 ' + num(save.reserve) + '</span>' +
      '<span title="민심">🙂 ' + save.minsim + '</span><span title="치안">🛡 ' + save.chian + '</span></div></div>' +
      '<div class="main">' + body + '</div>' +
      '<div class="tabs">' + tabs.map(function (t) {
        return '<button data-act="tab" data-id="' + t[0] + '" class="' + (ui.tab === t[0] ? 'on' : '') + '"><span class="ico">' + t[1] + '</span>' + t[2] + '</button>';
      }).join('') + '</div>';
  }

  function introHtml() {
    return '<div class="intro"><h1>삼국기</h1><p class="lead">고구려 · 백제 · 신라<br>장수를 등용해 부대와 성에 앉히고, 전장을 제패하라</p>' +
      Object.keys(SGK.NATIONS).map(function (k) {
        var n = SGK.NATIONS[k];
        return '<button class="pick n-' + k + '" data-act="start" data-id="' + k + '"><b>' + n.name + '</b>' +
          '<div class="bonus">진영 효과: ' + n.bonus + '</div>' +
          '<div class="st">시작 장수: ' + n.starter.map(function (id) { return gen(id).name + '(' + gen(id).star + '성)'; }).join(', ') + '</div></button>';
      }).join('') +
      '<div class="card note"><b>장수의 네 능력치</b><br>' +
      '통솔 — 부대에서는 지휘(방어), 성에서는 민심·징병<br>무력 — 부대에서는 전투(공격), 성에서는 치안·성 방어<br>' +
      '지력 — 부대에서는 책략(전법), 성에서는 외교·기술<br>정치 — 부대에서는 병참(사기), 성에서는 농업·상업<br><br>' +
      '한 부대에는 장수 4명이 한 자리씩 맡고, 성에도 관직 4개가 있습니다. 한 장수는 부대와 성 중 한 곳에만 둘 수 있습니다.</div></div>';
  }

  /* ---------- 전장 ---------- */
  function stageHtml() {
    var full = armyFull(), plan = full ? sortiePlan() : null;
    var h = '<div class="sec-title">내 부대</div><div class="card">';
    if (full) {
      h += '<div class="urow">' + unitLine(plan.U) + '</div>' +
        '<div class="note">출전 병력 ' + num(plan.own) + (plan.aidTroops ? ' + 원군 ' + num(plan.aidTroops) : '') + ' · 군량 ' + num(plan.food) + ' 소모 · 출전하면 한 달이 지납니다.</div>';
    } else h += '<div class="note warn">부대의 네 자리를 모두 채워야 출전할 수 있습니다. 부대 탭에서 장수를 배치하세요.</div>';
    h += '</div><div class="sec-title">전장 (역사 속 전장 이름을 빌린 가상 모의전)</div>';
    SGK.STAGES.forEach(function (s, i) {
      var locked = i > save.cleared, done = i < save.cleared;
      var rw = SGK.stageReward(i, !done);
      var eU = SGK.Battle.unitStats(enemyRoles(s));
      var why = !full ? '편성 필요' : plan.own < 1000 ? '병력 부족' : save.food < plan.food ? '군량 부족' : '';
      h += '<div class="card stage' + (locked ? ' locked' : '') + '"><div class="info">' +
        '<div><span class="nm">' + (i + 1) + '. ' + s.name + '</span><span class="lv">Lv.' + s.lv + '</span>' + (done ? '<span class="done">✔ 격파</span>' : '') + '</div>' +
        '<div class="foes">' + s.team.map(function (id, k) { return '<span>' + SGK.ROLES[k].name + ' ' + gen(id).name + '</span>'; }).join('') + '</div>' +
        '<div class="urow sm">' + unitLine(eU) + '</div>' +
        '<div class="rw">' + (done ? '반복 보상' : '첫 승리 보상') + ': 금화 ' + rw.gold + ' · 군량 ' + rw.food + ' · 경험치 ' + rw.exp + '</div></div>' +
        '<button class="btn primary small" data-act="fight" data-id="' + i + '"' + (locked || why ? ' disabled' : '') + '>' + (locked ? '잠김' : why || '출전') + '</button></div>';
    });
    return h;
  }
  function enemyRoles(s) {
    var r = {};
    SGK.ROLE_KEYS.forEach(function (k, i) { r[k] = { id: s.team[i], lv: s.lv, adv: 0 }; });
    return r;
  }
  function unitLine(U) {
    return '<span>' + SGK.TROOPS[U.troop].icon + SGK.TROOPS[U.troop].name + '</span><span>지휘 <b>' + U.cmd + '</b></span><span>전투 <b>' + U.atk + '</b></span>' +
      '<span>책략 <b>' + U.tac + '</b></span><span>병참 <b>' + U.sup + '</b></span>';
  }

  /* ---------- 부대 ---------- */
  function armyHtml() {
    var U = SGK.Battle.unitStats(armyRoles()), o = SGK.City.outlook(save);
    var mods = SGK.Battle.teamMods(SGK.ROLE_KEYS.map(function (k) { return save.army[k]; }));
    var bn = mods.nation ? SGK.NATIONS[mods.nation] : null;
    var h = '<div class="sec-title">부대 능력 (자리를 맡은 장수 70% + 네 장수 평균 30%)</div>' +
      '<div class="card unit-sum"><div class="us-spr">' + SGK.sprite(U.troop, SGK.NATIONS[save.nation].color) + '<div>' + SGK.TROOPS[U.troop].name + '</div></div>' +
      '<div class="us-grid"><div><small>지휘력 · 방어</small>' + U.cmd + '</div><div><small>전투력 · 공격</small>' + U.atk + '</div>' +
      '<div><small>책략력 · 전법</small>' + U.tac + '</div><div><small>병참력 · 사기</small>' + U.sup + '</div>' +
      '<div><small>병력 한도</small>' + num(U.capacity) + '</div><div><small>시작 사기</small>' + U.morale + '</div></div></div>' +
      '<div class="note" style="margin:-4px 2px 10px">' + (o.aid ? '외교 원군 +' + Math.round(o.aid * 100) + '% · ' : '') +
      (save.tech.weapon ? '무기 기술 피해 +' + save.tech.weapon * 4 + '% · ' : '') + (save.tech.armor ? '갑주 기술 피해 -' + save.tech.armor * 3 + '% · ' : '') +
      (bn ? bn.name + ' ' + mods.count + '명 진영 효과: ' + bn.bonus + (mods.factor < 1 ? '의 절반' : '') : '같은 나라 장수 3명 이상이면 진영 효과가 켜집니다 (4명 전부, 3명 절반).') + '</div>' +
      '<button class="btn" style="width:100%;margin-bottom:12px" data-act="auto">자동 편성 (관직에 없는 장수 중 최적 배치)</button>';
    SGK.ROLES.forEach(function (r) {
      var id = save.army[r.key];
      h += slotCard('army', r, id, r.name + ' · ' + r.title, SGK.STAT_NAMES[r.stat] + ' → ' + r.use, r.desc);
    });
    h += '<div class="sec-title">병종 상성</div><div class="card note">🔱 창병 → 🐎 기병 → 🏹 궁병 → 🔱 창병 순으로 유리합니다. 유리하면 피해 +20%, 불리하면 -15%. 부대 병종은 대장의 병종을 따릅니다.</div>';
    return h;
  }

  /* 부대 자리·성 관직 공용 카드 */
  function slotCard(kind, def, id, title, useLine, desc, effect) {
    var g = id && gen(id), o = id && save.owned[id];
    var h = '<div class="card slot' + (g ? ' n-' + g.nation : '') + '"><div class="hd"><span class="pos">' + title + '</span><span class="use">' + useLine + '</span>' +
      '<button class="btn small" data-act="pick" data-id="' + kind + ':' + def.key + '">' + (g ? '교체' : '배치') + '</button></div>';
    if (g) {
      h += '<div class="who"><span class="nm">' + troopIcon(id) + ' ' + g.name + '</span><span class="stars">' + stars(g.star) + '</span>' +
        '<span class="lvx">Lv.' + o.lv + (o.adv ? ' · 돌파 ' + o.adv : '') + '</span></div>' + statBoxes(statsOf(id), def.stat);
      if (kind === 'army') h += tacticHtml(g.tactic);
    } else h += '<div class="note warn" style="margin-top:8px">비어 있음 — ' + SGK.STAT_NAMES[def.stat] + ' ' + SGK.EMPTY_STAT + ' 으로 계산됩니다.</div>';
    if (effect) h += '<div class="eff">' + effect + '</div>';
    h += '<div class="note" style="margin-top:6px">' + desc + '</div></div>';
    return h;
  }

  /* ---------- 내정 ---------- */
  function cityHtml() {
    var o = SGK.City.outlook(save);
    var safe = o.wall >= o.nextRaidPower, left = o.nextRaid - save.month;
    var h = '<div class="sec-title">성 현황 · ' + dateLabel() + '</div><div class="card city-sum">' +
      meter('민심', save.minsim, o.minsimTarget) + meter('치안', save.chian, o.chianTarget) +
      '<div class="cs-row"><span>다음 달 수입</span><b>🌾 +' + num(o.food) + ' · 💰 +' + num(o.gold) + ' · 🪖 +' + num(o.recruit) + '</b></div>' +
      '<div class="cs-row"><span>적 습격까지 ' + left + '개월</span><b class="' + (safe ? 'ok' : 'bad') + '">습격 전력 ' + num(o.nextRaidPower) + ' vs 성 방어 ' + num(o.wall) + (safe ? ' · 안전' : ' · 위험') + '</b></div>' +
      '<button class="btn primary" style="width:100%;margin-top:10px" data-act="month">한 달 보내기</button></div>';
    if (save.report) h += reportHtml(save.report);

    h += '<div class="sec-title">관직 (부대에 있는 장수는 앉힐 수 없습니다)</div>';
    var eff = {
      gov: '민심 목표 <b>' + o.minsimTarget + '</b> · 징병 <b>+' + num(o.recruit) + '</b>/월',
      guard: '치안 목표 <b>' + o.chianTarget + '</b> (생산 손실 ' + o.lossPct + '%) · 성 방어 <b>' + num(o.wall) + '</b>',
      sage: '외교 원군 <b>+' + Math.round(o.aid * 100) + '%</b> · 기술 연구 <b>+' + o.research + '</b>/월',
      steward: '농업 군량 <b>+' + num(o.food) + '</b>/월 · 상업 금화 <b>+' + num(o.gold) + '</b>/월'
    };
    SGK.POSTS.forEach(function (p) {
      h += slotCard('post', p, save.posts[p.key], p.name, SGK.STAT_NAMES[p.stat] + ' → ' + p.use, p.desc, eff[p.key]);
    });

    h += '<div class="sec-title">기술 연구 (책사의 지력으로 매달 +' + o.research + ')</div><div class="card">';
    SGK.TECHS.forEach(function (t) {
      var lv = save.tech[t.key], max = lv >= SGK.TECH_MAX, on = save.research.target === t.key;
      var need = SGK.techCost(lv);
      h += '<button class="tech' + (on ? ' on' : '') + '" data-act="research" data-id="' + t.key + '"' + (max ? ' disabled' : '') + '>' +
        '<span class="tn2">' + t.name + ' Lv.' + lv + '</span><span class="tp">' + t.per + ' (레벨당)</span>' +
        '<span class="tg">' + (max ? '최대' : on ? '연구 중 ' + save.research.pts + '/' + need : '필요 ' + need) + '</span></button>';
    });
    h += '</div>';
    return h;
  }
  function meter(name, val, target) {
    var arrow = target > val ? '▲' : target < val ? '▼' : '';
    return '<div class="meter"><span>' + name + '</span><div class="mbar"><i style="width:' + val + '%"></i><em style="left:' + target + '%"></em></div><b>' + val + ' <small>' + arrow + ' 목표 ' + target + '</small></b></div>';
  }
  function reportHtml(r) {
    var lines = ['군량 +' + num(r.food) + ' · 금화 +' + num(r.gold) + ' · 병력 +' + num(r.recruit) + (r.research ? ' · 연구 +' + r.research : '')];
    if (r.techUp) lines.push('<b class="ok">' + SGK.TECHS.filter(function (t) { return t.key === r.techUp.key; })[0].name + ' 기술이 Lv.' + r.techUp.lv + ' 이 되었습니다.</b>');
    if (r.exp && r.exp.length) lines.push(r.exp.map(function (id) { return gen(id).name; }).join(', ') + ' 레벨 상승');
    if (r.raid) lines.push(r.raid.repelled
      ? '<b class="ok">적 습격(전력 ' + num(r.raid.power) + ')을 성 방어 ' + num(r.raid.wall) + ' 로 막아냈습니다. 민심 +5</b>'
      : '<b class="bad">적 습격(전력 ' + num(r.raid.power) + ')을 막지 못했습니다(성 방어 ' + num(r.raid.wall) + '). 금화 -' + num(r.raid.lostGold) + ' · 군량 -' + num(r.raid.lostFood) + ' · 민심 -8</b>');
    return '<div class="card report"><div class="rt">지난달 보고</div>' + lines.join('<br>') + '</div>';
  }

  /* ---------- 장수 목록 ---------- */
  function rosterHtml() {
    var ids = SGK.GENERAL_IDS.slice().sort(function (a, b) {
      var oa = save.owned[a] ? 1 : 0, ob = save.owned[b] ? 1 : 0;
      return ob - oa || gen(b).star - gen(a).star;
    });
    return '<div class="sec-title">장수 ' + Object.keys(save.owned).length + ' / ' + ids.length + ' (통솔·무력·지력·정치)</div><div class="grid">' + ids.map(function (id) {
      var w = save.owned[id] && whereIs(id);
      return genCard(id, w ? { tag: w.name, tagCls: w.kind === 'army' ? 'inteam' : 'inpost' } : {});
    }).join('') + '</div>';
  }

  /* ---------- 등용(뽑기) ---------- */
  function gachaHtml() {
    var G = SGK.Gacha, left = G.PITY - save.pity;
    var h = '<div class="card gacha-hero"><h2>인재 등용</h2><div class="pity">5성 확정까지 ' + left + '회</div>' +
      '<div class="gacha-btns"><button class="btn" data-act="pull" data-id="1"' + (save.gold < G.COST_ONE ? ' disabled' : '') + '>1회 등용<small>금화 ' + G.COST_ONE + '</small></button>' +
      '<button class="btn primary" data-act="pull" data-id="10"' + (save.gold < G.COST_TEN ? ' disabled' : '') + '>10회 등용<small>금화 ' + G.COST_TEN + '</small><small>4성 이상 1명 보장</small></button></div></div>' +
      '<div class="sec-title">확률 안내</div><div class="card"><table class="rates"><tr><th>등급</th><th>장수 (각 장수 확률은 동일)</th><th class="r">등급 확률</th><th class="r">장수별</th></tr>';
    [5, 4, 3].forEach(function (s) {
      var pool = SGK.GENERAL_IDS.filter(function (id) { return gen(id).star === s; });
      h += '<tr><td>' + s + '성</td><td>' + pool.map(function (id) { return gen(id).name; }).join(', ') + '</td>' +
        '<td class="r">' + (G.RATES[s] * 100).toFixed(0) + '%</td><td class="r">' + (G.RATES[s] * 100 / pool.length).toFixed(3) + '%</td></tr>';
    });
    h += '</table><p class="note">· 5성이 ' + G.PITY + '회 연속 나오지 않으면 그다음 1회는 5성이 확정됩니다.<br>' +
      '· 이미 가진 장수가 나오면 돌파 +1(능력치 +4%, 최대 ' + SGK.MAX_ADV + '). 돌파가 최대면 금화로 환급합니다(3성 ' + G.REFUND[3] + ' / 4성 ' + G.REFUND[4] + ' / 5성 ' + G.REFUND[5] + ').<br>' +
      '· 금화는 전장 보상과 성의 상업 수입으로만 얻습니다. 이 프로토타입에는 실제 결제가 없습니다.</p></div>';
    return h;
  }

  /* ---------- 모달 ---------- */
  function closeOverlay() { $ov.innerHTML = ''; }
  function sheet(title, body) {
    $ov.innerHTML = '<div class="sheet"><h3>' + title + '<button class="x" data-act="close">×</button></h3>' + body + '</div>';
  }

  function showDetail(id) {
    var g = gen(id), o = save.owned[id], st = statsOf(id), w = o && whereIs(id);
    sheet(troopIcon(id) + ' ' + g.name + ' <span style="color:var(--gold);font-size:13px">' + stars(g.star) + '</span>',
      '<div class="note">' + SGK.NATIONS[g.nation].name + ' · ' + SGK.TROOPS[g.troop].name +
      (o ? ' · Lv.' + o.lv + ' (경험치 ' + o.exp + '/' + SGK.expNeed(o.lv) + ') · 돌파 ' + o.adv + (w ? ' · 현재 ' + w.name : ' · 대기 중') : ' · 미보유 (1레벨 기준 수치)') + '</div>' +
      '<div class="spr-demo">' + SGK.sprite(g.troop, SGK.NATIONS[g.nation].color) + '</div>' + statBoxes(st) +
      '<table class="uses"><tr><th></th><th>부대에서</th><th>성에서</th></tr>' +
      SGK.ROLES.map(function (r, i) { return '<tr><td>' + SGK.STAT_NAMES[r.stat] + ' ' + st[r.stat] + '</td><td>' + r.name + ' (' + r.use + ')</td><td>' + SGK.POSTS[i].name + ' (' + SGK.POSTS[i].use + ')</td></tr>'; }).join('') + '</table>' +
      '<div class="sec-title">고유 전법</div>' + tacticHtml(g.tactic) + '<div class="sec-title">인물</div><div class="bio">' + g.bio + '</div>');
  }

  function showPicker(kind, key) {
    var def = slotDef(kind, key), cur = slotOf(kind)[key];
    var ids = Object.keys(save.owned).sort(function (a, b) { return statsOf(b)[def.stat] - statsOf(a)[def.stat]; });
    sheet(def.name + ' — ' + SGK.STAT_NAMES[def.stat] + ' 높은 순',
      '<p class="note">' + def.desc + '</p><div class="grid">' + ids.map(function (id) {
        var w = whereIs(id);
        return genCard(id, { act: 'assign:' + kind + ':' + key, hi: def.stat, tag: w ? w.name : '', tagCls: w ? (w.kind === 'army' ? 'inteam' : 'inpost') : '' });
      }).join('') + '</div><p class="note">다른 자리에 있는 장수를 고르면 두 자리가 서로 바뀝니다.</p>' +
      (cur ? '<button class="btn" style="width:100%" data-act="clear:' + kind + ':' + key + '">이 자리 비우기</button>' : ''));
  }

  function assign(kind, key, id) {
    var slots = slotOf(kind), prev = slots[key], w = whereIs(id);
    if (w) slotOf(w.kind)[w.key] = prev || null;   /* 서로 자리를 바꾼다 */
    slots[key] = id;
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
      return genCard(r.id, { tag: tag, tagCls: r.kind === 'new' ? '' : r.kind === 'adv' ? 'adv' : 'refund', force: true, sub: SGK.NATIONS[gen(r.id).nation].name });
    }).join('') + '</div><div style="margin-top:12px"><button class="btn primary" style="width:100%" data-act="close">확인</button></div>');
  }

  function passMonth() {
    save.report = SGK.City.advanceMonth(save);
    persist(); render();
  }

  /* ---------- 전투 ---------- */
  /* 무리 위치 [가로, 세로] (부대 상자 안, 픽셀). 0~2 는 앞줄, 3~5 는 뒷줄. 병력이 줄면 뒷줄부터 쓰러진다. */
  var GPOS = [[80, 70], [84, 6], [84, 134], [8, 80], [12, 16], [12, 144]];
  var STATUS_ICON = { '혼란': '💫', '봉쇄': '🔇', '화상': '🔥' };

  function armyHtmlB(u, color) {
    var h = '<div class="army side-' + u.side + ' t-' + u.troop + '" id="army-' + u.side + '" data-troop="' + u.troop + '"><div class="fl"></div><div class="tn"></div>';
    for (var i = 0; i < GROUPS; i++) {
      h += '<div class="grp" style="' + (u.side === 'A' ? 'left:' : 'right:') + GPOS[i][0] + 'px;top:' + GPOS[i][1] + 'px"><div class="spr">' + SGK.sprite(u.troop, color) + '</div></div>';
    }
    return h + '</div>';
  }
  function panelHtml(u, title) {
    return '<div class="b-panel side-' + u.side + '" id="pn-' + u.side + '"><div class="pt">' + title + ' · ' + SGK.TROOPS[u.troop].icon + SGK.TROOPS[u.troop].name + '<span class="sts"></span></div>' +
      '<div class="pl"><span>병력</span><div class="bar tr-bar"><i></i></div><b class="tr">' + u.troops + '</b></div>' +
      '<div class="pl"><span>사기</span><div class="bar mo-bar"><i></i></div><b class="mo">' + Math.round(u.morale) + '</b></div>' +
      '<div class="chips">' + SGK.ROLES.map(function (r, i) { return '<span><i>' + r.name + '</i>' + (u.ids[i] ? gen(u.ids[i]).name : '-') + '</span>'; }).join('') + '</div>' +
      '<div class="pu">지휘 ' + u.U.cmd + ' · 전투 ' + u.U.atk + ' · 책략 ' + u.U.tac + ' · 병참 ' + u.U.sup + '</div></div>';
  }

  function startBattle(index) {
    var stg = SGK.STAGES[index], plan = sortiePlan();
    if (!armyFull() || plan.own < 1000 || save.food < plan.food) return;
    save.food -= plan.food;
    var mine = { roles: armyRoles(), troops: plan.total, aid: plan.aid, atkBonus: save.tech.weapon * 0.04, defBonus: save.tech.armor * 0.03 };
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    var r = SGK.Battle.simulate(mine, { roles: enemyRoles(stg) }, seed);
    battle = { r: r, i: 0, speed: 1, timer: null, pending: [], index: index, done: false, plan: plan, max: { A: r.A.maxTroops, B: r.B.maxTroops } };

    var foeNation = gen(stg.team[0]).nation;
    $ov.innerHTML = '<div class="battle" id="b-root"><div class="b-head"><span class="rd" id="b-rd">개전</span><span class="st-name">' + (index + 1) + '. ' + stg.name + '</span>' +
      '<button class="btn small" data-act="speed" id="b-speed">1배속</button><button class="btn small" data-act="skip">건너뛰기</button></div>' +
      '<div class="b-stage" id="b-stage">' + armyHtmlB(r.A, SGK.NATIONS[save.nation].color) + armyHtmlB(r.B, SGK.NATIONS[foeNation].color) + '</div>' +
      '<div class="b-panels">' + panelHtml(r.A, '아군') + panelHtml(r.B, '적군') + '</div>' +
      '<div class="b-log" id="b-log"></div><div class="b-result hidden" id="b-res"></div></div>';
    applyState({ A: { t: r.A.startTroops, m: r.A.U.morale, s: [] }, B: { t: r.B.startTroops, m: r.B.U.morale, s: [] } });
    step();
  }

  function $army(side) { return document.getElementById('army-' + side); }
  function other(side) { return side === 'A' ? 'B' : 'A'; }

  function applyState(state) {
    ['A', 'B'].forEach(function (side) {
      var st = state[side], pn = document.getElementById('pn-' + side), ar = $army(side);
      if (!pn || !ar) return;
      var pct = st.t / battle.max[side] * 100;
      var tb = pn.querySelector('.tr-bar i');
      tb.style.width = pct + '%'; tb.className = pct <= 25 ? 'low' : pct <= 55 ? 'mid' : '';
      pn.querySelector('.tr').textContent = st.t;
      var mb = pn.querySelector('.mo-bar i');
      mb.style.width = st.m + '%'; mb.className = st.m <= 25 ? 'low' : '';
      pn.querySelector('.mo').textContent = st.m;
      pn.querySelector('.sts').textContent = st.s.map(function (s) { return STATUS_ICON[s] || s; }).join('');
      var alive = st.t > 0 ? Math.max(1, Math.ceil(pct / 100 * GROUPS)) : 0;
      var gs = ar.querySelectorAll('.grp');
      for (var i = 0; i < gs.length; i++) gs[i].classList.toggle('down', i >= alive);
    });
  }

  /* 조금 뒤에 실행할 연출. 건너뛰기를 누르면 모두 취소된다. */
  function later(fn, ms) {
    var b = battle;
    var id = setTimeout(function () { if (battle === b && !b.done) fn(); }, ms / battle.speed);
    battle.pending.push(id);
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  function flash(side, cls, text) {
    var ar = $army(side); if (!ar) return;
    if (cls === 'dmg') restart(ar, 'hit');
    if (cls === 'heal') restart(ar, 'healed');
    var fl = ar.querySelector('.fl');
    fl.className = 'fl ' + cls; fl.textContent = text; void fl.offsetWidth; fl.classList.add('go');
  }
  function centerOf(el) {
    var r = el.getBoundingClientRect(), s = document.getElementById('b-stage').getBoundingClientRect();
    return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top, w: r.width, h: r.height };
  }

  function shoot(from, to, ms, fire) {
    var stage = document.getElementById('b-stage'); if (!stage) return;
    var p = document.createElement('div');
    p.className = 'proj' + (fire ? ' fire' : '');
    stage.appendChild(p);
    if (!p.animate) { stage.removeChild(p); return; }
    var rot = ' rotate(' + (Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI) + 'deg)';
    var an = p.animate([
      { transform: 'translate(' + from.x + 'px,' + from.y + 'px)' + rot },
      { transform: 'translate(' + ((from.x + to.x) / 2) + 'px,' + ((from.y + to.y) / 2 - 16) + 'px)' + rot },
      { transform: 'translate(' + to.x + 'px,' + to.y + 'px)' + rot }
    ], { duration: ms, easing: 'linear' });
    an.onfinish = function () { if (p.parentNode) p.parentNode.removeChild(p); };
  }
  function spark(side, fire, n) {
    var ar = $army(side), stage = document.getElementById('b-stage'); if (!ar || !stage) return;
    var c = centerOf(ar);
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div');
      s.className = 'spark' + (fire ? ' fire' : '');
      s.style.left = (c.x + (Math.random() - 0.5) * c.w * 0.7) + 'px';
      s.style.top = (c.y + (Math.random() - 0.5) * c.h * 0.7) + 'px';
      s.style.animationDelay = (i * 60 / battle.speed) + 'ms';
      stage.appendChild(s);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700); })(s);
    }
  }

  /* 병종별 공격 동작. 창병은 앞으로 내지르고, 기병은 적진까지 돌격하고, 궁병은 제자리에서 화살을 쏜다. */
  function attackAnim(side, fire) {
    var me = $army(side), en = $army(other(side));
    if (!me || !en) return;
    var ec = centerOf(en), ms = 440 / battle.speed, troop = me.getAttribute('data-troop'), dir = side === 'A' ? 1 : -1;
    var gs = me.querySelectorAll('.grp:not(.down)');
    for (var i = 0; i < gs.length; i++) (function (g, i) {
      if (!g.animate) return;
      var c = centerOf(g), delay = i * 30 / battle.speed;
      restart(g, 'atk');
      if (troop === 'arc') {
        g.querySelector('.spr').animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(' + (-6 * dir) + 'px)', offset: 0.3 }, { transform: 'translateX(0)' }],
          { duration: ms, delay: delay });
        var to = { x: ec.x + (Math.random() - 0.5) * ec.w * 0.6, y: ec.y + (Math.random() - 0.5) * ec.h * 0.7 };
        later(function () { shoot(c, to, ms * 0.36, fire); }, i * 30 + 40);
      } else {
        var f = troop === 'cav' ? 0.6 : 0.26;
        g.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(' + ((ec.x - c.x) * f) + 'px,' + ((ec.y - c.y) * f * 0.5) + 'px)', offset: 0.4 }, { transform: 'translate(0,0)' }],
          { duration: ms, delay: delay, easing: 'ease-in-out' });
      }
    })(gs[i], i);
  }

  function showEvent(e, quiet) {
    var log = document.getElementById('b-log');
    var div = document.createElement('div');
    div.className = 'l-' + e.type + (e.side ? ' s' + e.side : '');
    div.textContent = e.type === 'round' ? '── ' + e.text + ' ──' : e.text;
    log.appendChild(div);
    if (e.type === 'round') document.getElementById('b-rd').textContent = e.text;
    if (quiet) { applyState(e.state); if (e.type === 'dead') $army(e.side).classList.add(e.rout ? 'rout' : 'wiped'); return; }
    log.scrollTop = log.scrollHeight;

    if (e.type === 'dmg') {
      /* 공격 동작이 적에게 닿는 순간에 피해를 표시한다 */
      attackAnim(e.side, !!e.tactic);
      later(function () { applyState(e.state); flash(e.target, 'dmg', '-' + e.value); spark(e.target, !!e.tactic, e.tactic ? 4 : 3); }, 190);
      return;
    }
    applyState(e.state);
    var ar = e.side && $army(e.side);
    if (e.type === 'heal') flash(e.target, 'heal', '+' + e.value);
    else if (e.type === 'morale') flash(e.side, e.value > 0 ? 'mup' : 'mdown', '사기 ' + (e.value > 0 ? '+' : '') + e.value);
    else if (e.type === 'tactic' && ar) { ar.querySelector('.tn').innerHTML = '<small>' + e.gen + '</small>' + e.tactic; restart(ar, 'cast'); }
    else if (e.type === 'buff') restart($army(e.target), e.good ? 'buffed' : 'cursed');
    else if (e.type === 'status') restart($army(e.target), 'cursed');
    else if (e.type === 'skip' && ar) restart(ar, 'cursed');
    else if (e.type === 'dead' && ar) ar.classList.add(e.rout ? 'rout' : 'wiped');
  }

  function step() {
    if (!battle || battle.done) return;
    var ev = battle.r.events;
    if (battle.i >= ev.length) { finishBattle(); return; }
    var e = ev[battle.i++];
    showEvent(e);
    var d = e.type === 'round' ? 520 : e.type === 'tactic' ? 720 : e.type === 'dmg' ? 640 : e.type === 'dead' ? 900 : e.type === 'supply' ? 300 : 380;
    battle.timer = setTimeout(step, d / battle.speed);
  }

  function skipBattle() {
    if (!battle || battle.done) return;
    clearTimeout(battle.timer);
    battle.pending.forEach(clearTimeout);
    var ev = battle.r.events;
    while (battle.i < ev.length) showEvent(ev[battle.i++], true);
    var log = document.getElementById('b-log'); log.scrollTop = log.scrollHeight;
    finishBattle();
  }

  function finishBattle() {
    battle.done = true;
    var r = battle.r, res = r.result, idx = battle.index, win = res === 'win', plan = battle.plan;
    var first = win && idx === save.cleared;
    var rw = SGK.stageReward(idx, first);
    var gold = win ? rw.gold : 0, food = win ? rw.food : 0;
    var exp = win ? rw.exp : Math.round(rw.exp * 0.3);

    /* 병력 정산: 잃은 병력의 30%는 부상병으로 돌아온다 */
    var lossRatio = 1 - r.A.troops / r.A.startTroops;
    var ownLoss = Math.round(plan.own * lossRatio), back = Math.round(ownLoss * 0.3);
    save.reserve = Math.max(0, save.reserve - ownLoss + back);
    save.gold += gold; save.food += food;

    var ups = [];
    SGK.ROLE_KEYS.forEach(function (k) {
      var id = save.army[k], o = save.owned[id], before = o.lv;
      if (o.lv >= SGK.MAX_LV) return;
      o.exp += exp;
      while (o.lv < SGK.MAX_LV && o.exp >= SGK.expNeed(o.lv)) { o.exp -= SGK.expNeed(o.lv); o.lv += 1; }
      if (o.lv >= SGK.MAX_LV) o.exp = 0;
      if (o.lv > before) ups.push(gen(id).name + ' Lv.' + before + ' → ' + o.lv);
    });
    if (first) save.cleared += 1;
    save.report = SGK.City.advanceMonth(save);
    persist();

    var why = r.reason === 'rout' ? (win ? '적 부대 패주' : '아군 부대 패주') : r.reason === 'wipe' ? (win ? '적 부대 전멸' : '아군 부대 전멸') : '10턴 판정';
    var title = win ? '승 리' : res === 'draw' ? '무승부' : '패 배';
    var el = document.getElementById('b-res');
    el.innerHTML = '<h2 class="' + (win ? 'win' : 'lose') + '">' + title + ' <small>' + why + '</small></h2><div class="rw">' +
      (win ? '금화 +' + gold + ' · 군량 +' + food + (first ? ' (첫 승리)' : '') + '<br>' : '') +
      '병력 손실 ' + num(ownLoss) + ' (부상병 ' + num(back) + ' 복귀) · 장수 경험치 +' + exp +
      (ups.length ? '<br>' + ups.join(' / ') : '') +
      (!win ? '<br>자리 배치·병종 상성을 바꾸거나, 내정으로 병력과 기술을 키워 다시 도전하세요.' : '') +
      '</div><button class="btn primary" data-act="endbattle">확인 (한 달 경과)</button>';
    el.classList.remove('hidden');
    document.getElementById('b-log').scrollTop = 1e9;
  }

  /* ---------- 입력 ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) { if (ev.target === $ov && !battle) closeOverlay(); return; }
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (el.disabled) return;
    var parts = act.split(':');
    if (act === 'start') { newGame(id); render(); }
    else if (act === 'tab') { ui.tab = id; render(); window.scrollTo(0, 0); }
    else if (act === 'detail') showDetail(id);
    else if (act === 'close') closeOverlay();
    else if (act === 'pick') showPicker(id.split(':')[0], id.split(':')[1]);
    else if (parts[0] === 'assign') assign(parts[1], parts[2], id);
    else if (parts[0] === 'clear') { slotOf(parts[1])[parts[2]] = null; persist(); closeOverlay(); render(); }
    else if (act === 'auto') { autoArmy(); persist(); render(); }
    else if (act === 'month') passMonth();
    else if (act === 'research') { if (save.research.target !== id) { save.research.target = id; save.research.pts = 0; persist(); render(); } }
    else if (act === 'pull') pull(+id);
    else if (act === 'fight') startBattle(+id);
    else if (act === 'speed') {
      battle.speed = battle.speed === 1 ? 2 : battle.speed === 2 ? 4 : 1; el.textContent = battle.speed + '배속';
      document.getElementById('b-root').style.setProperty('--sp', battle.speed);
    }
    else if (act === 'skip') skipBattle();
    else if (act === 'endbattle') { battle = null; closeOverlay(); render(); }
    else if (act === 'reset') {
      sheet('처음부터 다시 시작', '<p class="note">보유 장수, 자원, 성과 전장 진행 상황이 모두 지워집니다. 되돌릴 수 없습니다.</p>' +
        '<div style="display:flex;gap:10px;margin-top:12px"><button class="btn" style="flex:1" data-act="close">취소</button>' +
        '<button class="btn primary" style="flex:1" data-act="reset-yes">모두 지우고 시작</button></div>');
    }
    else if (act === 'reset-yes') {
      try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
      save = null; ui.tab = 'stage'; closeOverlay(); render();
    }
  });

  render();
})();
