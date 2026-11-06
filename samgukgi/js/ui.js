/* 삼국기 — 화면(UI): 타이틀, 시나리오 선택, 지도, 도시 내정 패널, 모달, 턴 진행 */
(function (S) {
  'use strict';
  const U = S.U, G = S.G, A = S.Art;
  const el = U.el, $ = U.$;
  const UI = {};
  let selCity = null, selOfficer = null, selDiff = 'normal', offSort = 'base', offReady = false;
  const RES = [['food', '식량', '🌾'], ['gold', '돈', '🪙'], ['iron', '철', '⛓'], ['wood', '목재', '🪵']];
  const STAT_NAMES = ['통솔', '무력', '지력', '정치'];

  /* ───────── 공통 모달 ───────── */
  UI.modal = ({ title, body, buttons = [{ label: '닫기' }], wide = false, cls = '', closable = true }) => new Promise((resolve) => {
    const root = $('#modals');
    const box = el('div', { class: `modal ${wide ? 'wide' : ''} ${cls}` });
    const bg = el('div', { class: 'modal-bg' }, box);
    const close = (v) => { bg.remove(); resolve(v); };
    if (title) box.appendChild(el('div', { class: 'modal-title' }, el('span', { html: title }), closable ? el('button', { class: 'x', onclick: () => close(null) }, '✕') : null));
    const b = el('div', { class: 'modal-body' });
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    box.appendChild(b);
    if (buttons && buttons.length) {
      const bar = el('div', { class: 'modal-btns' });
      buttons.forEach((bt) => bar.appendChild(el('button', { class: `btn ${bt.cls || ''}`, disabled: bt.disabled, onclick: () => { if (bt.fn) { const r = bt.fn(); if (r === false) return; } close(bt.value === undefined ? bt.label : bt.value); } }, bt.label)));
      box.appendChild(bar);
    }
    box._close = close;
    root.appendChild(bg);
  });
  UI.toast = (msg, kind = '') => {
    const t = el('div', { class: `toast ${kind}` }, msg);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2800);
  };
  const resStr = (cost) => Object.keys(cost).filter((k) => cost[k]).map((k) => `${RES.find((r) => r[0] === k)[2]}${U.fmt(cost[k])}`).join(' ');
  const bar = (v, max, color) => el('div', { class: 'bar' }, el('div', { class: 'fill', style: { width: `${U.clamp((v / max) * 100, 0, 100)}%`, background: color || '' } }));

  /* 난이도 선택 버튼 묶음 */
  UI.diffPicker = (cur, onPick) => el('div', { class: 'diff-pick' }, Object.keys(G.DIFF).map((k) => el('button', { class: `btn sm ${cur === k ? 'on' : ''}`, title: G.DIFF[k].desc, onclick: () => onPick(k) }, G.DIFF[k].name)),
    el('span', { class: 'diff-desc' }, G.DIFF[cur].desc));
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 4 - n));

  /* ───────── 타이틀 ───────── */
  UI.title = () => {
    const root = $('#app');
    root.innerHTML = '';
    const slots = [1, 2, 3].map((i) => G.saveMeta(i));
    const t = el('div', { class: 'title-screen' },
      el('div', { class: 'title-art', html: titleArt() }),
      el('div', { class: 'title-box' },
        el('div', { class: 'logo' }, el('span', { class: 'hanja' }, '三國記'), el('span', { class: 'kor' }, '삼 국 기')),
        el('div', { class: 'tagline' }, '고구려·백제·신라 삼국 전쟁 — 590~676'),
        el('div', { class: 'title-menu' },
          el('button', { class: 'btn big gold', onclick: UI.scenarioSelect }, '새 게임'),
          el('button', { class: 'btn big gold', onclick: () => S.Campaign.menu() }, '삼국 통일 캠페인'),
          el('button', { class: 'btn big', onclick: () => UI.loadMenu(slots) }, '불러오기'),
          el('button', { class: 'btn big', onclick: UI.settings }, '설정'),
          el('a', { class: 'btn big', href: 'https://github.com/khs5572313/-/blob/claude/friendly-wozniak-os5s4u/samgukgi/docs/%EA%B8%B0%ED%9A%8D%EC%84%9C.md', target: '_blank', rel: 'noopener' }, '기획서'),
        ),
        el('div', { class: 'title-foot' }, '역사 SLG · 카드 덱 전투 · 삼국 인물 300명(나라별 100명)')));
    root.appendChild(t);
  };
  const titleArt = () => `<svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1420"/><stop offset=".6" stop-color="#5a2a22"/><stop offset="1" stop-color="#c46a32"/></linearGradient></defs>
    <rect width="1200" height="500" fill="url(#sky)"/><circle cx="900" cy="300" r="120" fill="#e8a24a" opacity=".55"/>
    <path d="M0 360 L120 260 L220 330 L340 200 L480 320 L600 240 L760 330 L880 220 L1020 320 L1200 250 V500 H0Z" fill="#2a1a1a" opacity=".85"/>
    <path d="M0 420 L160 340 L300 400 L460 330 L640 410 L820 350 L1000 420 L1200 360 V500 H0Z" fill="#140c0c"/>
    <path d="M300 380 V340 H316 V330 H332 V340 H348 V330 H364 V340 H380 V330 H396 V340 H412 V380Z" fill="#0c0808"/>
    ${Array.from({ length: 14 }, (_, i) => `<g transform="translate(${80 + i * 80},${440 - (i % 3) * 8})"><line x1="0" y1="0" x2="0" y2="-70" stroke="#0a0606" stroke-width="3"/><path d="M0 -70 L${i % 2 ? 26 : 22} -62 L0 -52Z" fill="${['#a3242a', '#1f4e8c', '#c79a1e'][i % 3]}"/></g>`).join('')}</svg>`;
  UI.settings = async () => {
    const body = el('div', { class: 'settings' },
      el('label', {}, el('input', { type: 'checkbox', checked: S.settings.fast, onchange: (e) => (S.settings.fast = e.target.checked) }), ' 빠른 전투 애니메이션'),
      el('label', {}, el('input', { type: 'checkbox', checked: S.settings.historicalDeath, onchange: (e) => (S.settings.historicalDeath = e.target.checked) }), ' 역사 수명 (인물이 실제 사망 연도에 사망)'),
      el('label', {}, el('input', { type: 'checkbox', checked: S.settings.balanceRoster !== false, onchange: (e) => (S.settings.balanceRoster = e.target.checked) }), ' 인물 수 균형 (시작 시 장수가 많은 나라의 초과 인원은 재야로 — 탐색으로 등용)'));
    await UI.modal({ title: '설정', body });
    S.store.set('samgukgi_settings', JSON.stringify(S.settings));
  };
  UI.loadMenu = async (slots) => {
    const body = el('div', { class: 'slots' }, [1, 2, 3].map((i) => {
      const m = slots[i - 1];
      return el('button', { class: 'btn slot', disabled: !m, onclick: () => { if (G.load(i)) { document.querySelector('.modal-bg').remove(); UI.startMain(); } } },
        m ? `슬롯 ${i} · ${m.sc} · ${m.n} · ${m.d}` : `슬롯 ${i} · (비어 있음)`);
    }));
    await UI.modal({ title: '불러오기', body });
  };

  /* ───────── 시나리오 선택 ───────── */
  UI.scenarioSelect = () => {
    const root = $('#app');
    root.innerHTML = '';
    let cur = S.SCENARIOS[0];
    const detail = el('div', { class: 'sc-detail' });
    const list = el('div', { class: 'sc-list' });
    const render = () => {
      list.innerHTML = '';
      ['goguryeo', 'baekje', 'silla'].forEach((h) => {
        const N = S.NATIONS[h];
        list.appendChild(el('div', { class: 'sc-group', style: { borderColor: N.color } }, el('span', { html: A.emblem(h, 22) }), ` ${N.name}편`));
        S.SCENARIOS.filter((sc) => sc.hero === h).sort((a, b) => a.year - b.year).forEach((sc) => list.appendChild(el('button', { class: `sc-item ${sc === cur ? 'on' : ''}`, style: { borderLeft: `5px solid ${N.color}` }, onclick: () => { cur = sc; render(); } },
          el('div', { class: 'sc-year' }, `${sc.year}년`), el('div', { class: 'sc-name' }, sc.title), el('div', { class: 'sc-sub' }, sc.sub))));
      });
      detail.innerHTML = '';
      detail.appendChild(el('h2', {}, `${sc_title(cur)}`));
      detail.appendChild(el('p', { class: 'sc-desc' }, cur.desc));
      detail.appendChild(el('p', { class: 'sc-hist' }, '📜 ', cur.hist));
      if (cur.focus) detail.appendChild(el('p', { class: 'sc-focus' }, '⚔ 핵심 인물·사건: ', cur.focus));
      detail.appendChild(el('div', { class: 'sc-pick-label' }, '난이도'));
      detail.appendChild(UI.diffPicker(selDiff, (d) => { selDiff = d; render(); }));
      detail.appendChild(el('div', { class: 'sc-pick-label' }, '세력을 선택하십시오'));
      const picks = el('div', { class: 'sc-picks' });
      cur.playable.forEach((n) => {
        const N = S.NATIONS[n];
        const ruler = cur.nations[n].ruler;
        const goals = (cur.goals[n] || []).map((g) => g.desc).join(' / ');
        const cities = Object.values(cur.cities).filter((c) => c[0] === n).length;
        picks.appendChild(el('button', { class: `sc-nation ${n === cur.hero ? 'hero' : ''}`, style: { borderColor: N.color }, onclick: () => { G.newGame(cur.id, n, { diff: selDiff }); UI.startMain(true); } },
          el('div', { class: 'scn-top' }, el('span', { html: A.emblem(n, 42) }), el('div', {}, el('div', { class: 'scn-name', style: { color: N.color } }, cur.nations[n].alias || N.name, n === cur.hero ? el('span', { class: 'hero-tag' }, '주인공') : null), el('div', { class: 'scn-motto' }, N.motto))),
          el('div', { class: 'scn-ruler', html: ruler ? A.portrait(ruler, 54, { nation: n }) : '' }),
          el('div', { class: 'scn-info' }, el('div', {}, `군주: ${ruler ? S.officerById[ruler].name : '-'} · 도시 ${cities}`), el('div', { class: 'scn-trait' }, N.trait), el('div', { class: 'scn-goal' }, '🎯 ', goals), cur.stars ? el('div', { class: 'scn-stars', title: '보통 난이도 기준, AI 자동 대전 측정값' }, `체감 난이도 ${stars(cur.stars[n] || 2)}`) : null)));
      });
      detail.appendChild(picks);
    };
    const sc_title = (sc) => `${sc.year}년 · ${sc.title} — ${sc.sub}`;
    root.appendChild(el('div', { class: 'sc-screen' }, el('div', { class: 'sc-head' }, el('button', { class: 'btn', onclick: UI.title }, '← 처음으로'), el('h1', {}, '시나리오 선택')), el('div', { class: 'sc-body' }, list, detail)));
    render();
  };

  /* ───────── 메인 화면 ───────── */
  UI.startMain = async (fresh) => {
    const root = $('#app');
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'main' },
      el('div', { id: 'topbar' }),
      el('div', { class: 'main-body' }, el('div', { id: 'mapwrap' }, el('div', { id: 'map' }), el('div', { id: 'maptools' }), el('div', { id: 'ticker' })), el('div', { id: 'side' }))));
    UI.renderTop();
    UI.buildMap();
    const cap = G.capitalOf(S.state.player);
    UI.selectCity(cap);
    UI.centerOn(cap, 1.1);
    UI.refreshLog();
    if (fresh) {
      const sc = S.scenarioById[S.state.scenario];
      await UI.modal({ title: `${sc.year}년 · ${sc.title}`, wide: true, body: el('div', { class: 'intro' }, el('div', { class: 'intro-em', html: A.emblem(S.state.player, 70) }), el('p', {}, sc.desc), el('h3', {}, '승리 조건'), el('ul', {}, G.goalStatus(S.state.player).map((g) => el('li', {}, g.desc))), el('p', { class: 'hint' }, '💡 도시를 클릭해 내정 명령을 내리세요. 장수 1명당 한 턴에 1개 명령. 인접 적 도시를 클릭하면 출진할 수 있습니다.')), buttons: [{ label: '출정', cls: 'gold' }] });
      await UI.runEvents();
    }
  };
  UI.renderTop = () => {
    const st = S.state, n = st.player, N = st.nations[n];
    const tb = $('#topbar');
    if (!tb) return;
    tb.innerHTML = '';
    tb.appendChild(el('div', { class: 'tb-nation', style: { background: S.NATIONS[n].color } }, el('span', { html: A.emblem(n, 34) }), el('div', {}, el('div', { class: 'tb-nname' }, S.nationName(n)), el('div', { class: 'tb-ruler' }, N.ruler ? `군주 ${S.officerById[N.ruler].name}` : ''))));
    tb.appendChild(el('div', { class: 'tb-date' }, el('div', { class: 'y' }, `${st.year}년`), el('div', { class: 's' }, U.SEASONS[st.season])));
    tb.appendChild(el('div', { class: 'tb-diff' }, el('div', {}, `난이도 ${G.diff().name}`), st.campaign ? el('div', { class: 'small' }, `캠페인 제${st.campaign.idx + 1}장`) : null));
    const rs = el('div', { class: 'tb-res' });
    RES.forEach(([k, name, ic]) => rs.appendChild(el('div', { class: 'res', title: name }, el('span', { class: 'ic' }, ic), el('span', { class: 'nm' }, name), el('b', {}, U.fmt(N[k])))));
    rs.appendChild(el('div', { class: 'res ap', title: '전체 도시의 남은 행동력 합계 (행동력은 도시마다 따로 쓴다)' }, el('span', { class: 'ic' }, '⚡'), el('span', { class: 'nm' }, '행동력'), el('b', {}, `${G.nationAp(n)}`), el('span', { class: 'nm' }, `(기본 ${G.nationApMax(n)})`)));
    rs.appendChild(el('div', { class: 'res', title: '총 병력' }, el('span', { class: 'ic' }, '⚔'), el('span', { class: 'nm' }, '병력'), el('b', {}, U.fmt(G.nationTroopTotal(n)))));
    rs.appendChild(el('div', { class: 'res', title: '도시' }, el('span', { class: 'ic' }, '🏯'), el('span', { class: 'nm' }, '도시'), el('b', {}, G.citiesOf(n).length)));
    tb.appendChild(rs);
    const btns = el('div', { class: 'tb-btns' },
      el('button', { class: 'btn sm', onclick: UI.goals }, '🎯 목표'),
      el('button', { class: 'btn sm', onclick: UI.diplomacy }, '🤝 외교'),
      el('button', { class: 'btn sm', onclick: UI.officerList }, '👤 인물'),
      el('button', { class: 'btn sm', onclick: UI.logModal }, '📜 기록'),
      el('button', { class: 'btn sm', onclick: UI.saveMenu }, '💾 저장'),
      el('button', { class: 'btn sm', onclick: () => UI.modal({ title: '메뉴', body: '타이틀 화면으로 돌아갈까요? (저장하지 않은 진행은 사라집니다)', buttons: [{ label: '타이틀로', fn: () => setTimeout(UI.title) }, { label: '취소' }] }) }, '☰'),
      el('button', { class: 'btn gold endturn', onclick: UI.endTurn }, '턴 종료 ▶'));
    tb.appendChild(btns);
  };
  UI.refreshLog = () => {
    const t = $('#ticker');
    if (!t || !S.state) return;
    t.innerHTML = '';
    S.state.log.slice(0, 4).forEach((l) => t.appendChild(el('div', { class: `tk ${l.kind}` }, el('span', { class: 't' }, l.t), ' ', l.msg)));
  };

  /* ───────── 지도 ───────── */
  const NS = 'http://www.w3.org/2000/svg';
  let vb = { x: 0, y: 0, w: U.MAP_W, h: U.MAP_H };
  UI.buildMap = () => {
    S.layoutCities(S.state.inactive);
    const P = (lon, lat) => `${U.px(lon).toFixed(1)},${U.py(lat).toFixed(1)}`;
    const poly = (pts) => pts.map(([a, b]) => P(a, b)).join(' ');
    const smooth = (pts) => { const p = pts.map(([a, b]) => [U.px(a), U.py(b)]); let d = `M${p[0][0]},${p[0][1]}`; for (let i = 1; i < p.length; i++) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; d += ` Q${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`; } d += ` T${p[p.length - 1][0]},${p[p.length - 1][1]}`; return d; };
    let s = `<svg id="mapsvg" xmlns="${NS}" viewBox="0 0 ${U.MAP_W} ${U.MAP_H}">
      <defs>
        <pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse"><rect width="160" height="160" fill="#e9dcbc"/><circle cx="30" cy="40" r="1.2" fill="#d4c39c"/><circle cx="110" cy="90" r="1" fill="#d4c39c"/><circle cx="70" cy="140" r="1.4" fill="#dccba6"/><path d="M0 80 Q40 76 80 82 T160 80" stroke="#e2d2ae" stroke-width="2" fill="none"/></pattern>
        <pattern id="wave" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="#7fa9bf"/><path d="M0 18 Q15 10 30 18 T60 18" stroke="#9cc0d2" stroke-width="2" fill="none"/></pattern>
        <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".4"/></filter>
      </defs>
      <rect x="-1500" y="-1500" width="${U.MAP_W + 3000}" height="${U.MAP_H + 3000}" fill="url(#wave)"/>
      <polygon points="${poly(S.GEO.mainland)}" fill="url(#paper)" stroke="#6b5a3a" stroke-width="3"/>
      ${S.GEO.islands.map((is) => `<polygon points="${poly(is)}" fill="url(#paper)" stroke="#6b5a3a" stroke-width="2.5"/>`).join('')}
      <g id="territory"></g>
      ${S.GEO.mountains.map((m) => m.pts.map(([lo, la], i) => { const nxt = m.pts[i + 1]; const out = []; const steps = nxt ? 4 : 1; for (let k = 0; k < steps; k++) { const t = k / steps; const x = U.px(lo + (nxt ? (nxt[0] - lo) * t : 0)), y = U.py(la + (nxt ? (nxt[1] - la) * t : 0)); const sz = m.big ? 26 : 15; out.push(`<path d="M${x - sz} ${y + sz * 0.6} L${x} ${y - sz} L${x + sz} ${y + sz * 0.6}Z" fill="#a8977a" stroke="#6f6048" stroke-width="1.5" opacity=".75"/><path d="M${x - sz * 0.3} ${y - sz * 0.4} L${x} ${y - sz} L${x + sz * 0.3} ${y - sz * 0.4}" fill="#f4efe3" opacity=".8"/>`); } return out.join(''); }).join('')).join('')}
      ${S.GEO.rivers.map((r) => `<path d="${smooth(r.pts)}" stroke="#4f86ae" stroke-width="${r.name.includes('요하') || r.name.includes('압록') || r.name.includes('한강') || r.name.includes('백강') || r.name.includes('낙동') ? 6 : 4.5}" fill="none" stroke-linecap="round" opacity=".9"/>`).join('')}
      ${S.GEO.rivers.map((r) => { const m = r.pts[Math.floor(r.pts.length / 2)]; return `<text x="${U.px(m[0]) + 8}" y="${U.py(m[1]) - 8}" class="rlabel">${r.name}</text>`; }).join('')}
      <g id="greatwall"></g>
      ${S.GEO.seas.map((x) => `<text x="${U.px(x.lon)}" y="${U.py(x.lat)}" class="sealabel">${x.name}</text>`).join('')}
      ${S.GEO.regions.map((x) => `<text x="${U.px(x.lon)}" y="${U.py(x.lat)}" class="reglabel">${x.name}</text>`).join('')}
      <g id="edges"></g><g id="armies"></g><g id="cities"></g>
    </svg>`;
    $('#map').innerHTML = s;
    UI.drawEdges();
    UI.renderMap();
    UI.mapControls();
    $('#maptools').innerHTML = '';
    $('#maptools').appendChild(el('div', { class: 'legend' },
      el('span', {}, el('i', { class: 'lg land' }), '육로'), el('span', {}, el('i', { class: 'lg river' }), '하천 수로'), el('span', {}, el('i', { class: 'lg sea' }), '바닷길'),
      el('button', { class: 'btn xs', onclick: () => UI.zoom(1.25) }, '＋'), el('button', { class: 'btn xs', onclick: () => UI.zoom(0.8) }, '－'), el('button', { class: 'btn xs', onclick: () => UI.centerOn(G.capitalOf(S.state.player), 1.1) }, '⌂')));
  };
  UI.drawEdges = () => {
    const g = $('#edges');
    let s = '';
    for (const [a, b, t] of S.EDGES) {
      if (S.state.inactive && (S.state.inactive[a] || S.state.inactive[b])) continue;
      const A1 = S.cityById[a], B = S.cityById[b];
      const x1 = S.POS[a].x, y1 = S.POS[a].y, x2 = S.POS[b].x, y2 = S.POS[b].y;
      if (t === 'sea') { const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12, my = (y1 + y2) / 2 - (x2 - x1) * 0.12; s += `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" class="edge sea" data-a="${a}" data-b="${b}"/>`; }
      else s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge ${t}" data-a="${a}" data-b="${b}"/>`;
    }
    g.innerHTML = s;
  };
  UI.renderMap = () => {
    const st = S.state;
    if (!$('#cities')) return;
    /* 영역 (보로노이 근사: 도시 주변 원) */
    let terr = '';
    for (const c of S.CITIES) { if (st.inactive && st.inactive[c.id]) continue; const o = st.cities[c.id].owner; const col = S.NATIONS[o].color; terr += `<circle cx="${S.POS[c.id].x}" cy="${S.POS[c.id].y}" r="${c.type === 'capital' ? 150 : 105}" fill="${col}" opacity=".13"/>`; }
    $('#territory').innerHTML = terr;
    /* 천리장성 */
    const gw = $('#greatwall');
    if (!(st.inactive && st.inactive.cheolli) && (st.flags.cheolliBuilt || st.year >= 647)) {
      const pts = S.GEO.greatWall.map(([a, b]) => `${U.px(a)},${U.py(b)}`).join(' ');
      gw.innerHTML = `<polyline points="${pts}" fill="none" stroke="#5a4a32" stroke-width="9" opacity=".7"/><polyline points="${pts}" fill="none" stroke="#c9b48a" stroke-width="5" stroke-dasharray="6 6"/>`;
    } else gw.innerHTML = '';
    let s = '';
    for (const c of S.CITIES) {
      if (st.inactive && st.inactive[c.id]) continue;
      const cs = st.cities[c.id], N = S.NATIONS[cs.owner];
      const x = S.POS[c.id].x, y = S.POS[c.id].y;
      const tt = G.troopsTotal(cs);
      const sel = selCity === c.id;
      const mine = cs.owner === st.player;
      const ready = false;
      const sc = c.type === 'capital' ? 1.25 : 1;
      s += `<g class="city ${sel ? 'sel' : ''} ${mine ? 'mine' : ''}" data-id="${c.id}" transform="translate(${x},${y})">
        ${sel ? `<circle r="30" class="selring"/>` : ''}
        <g transform="scale(${sc})" filter="url(#shadow)">${A.cityIcon(c.type, N.color, N.dark, c.port)}</g>
        <rect x="-34" y="${15 * sc}" width="68" height="17" rx="4" fill="${N.dark}" opacity=".85"/>
        <text y="${15 * sc + 13}" class="cname">${c.name}</text>
        <rect x="-22" y="${15 * sc + 19}" width="44" height="5" rx="2" fill="#0006"/><rect x="-22" y="${15 * sc + 19}" width="${Math.min(44, (tt / 30000) * 44)}" height="5" rx="2" fill="${N.light}"/>
        ${ready ? `<circle cx="${18 * sc}" cy="${-14 * sc}" r="5" fill="#ffd34d" stroke="#5a4308"/>` : ''}
      </g>`;
    }
    $('#cities').innerHTML = s;
    UI.renderAttackHints();
  };
  /* 선택한 도시의 연결로를 모두 강조: 빨강=전쟁 중(공격 가능), 금색=아군 도시, 회색=그 밖 */
  UI.renderAttackHints = () => {
    const st = S.state;
    const g = $('#armies');
    if (!g) return;
    if (!selCity) { g.innerHTML = ''; return; }
    const own = st.cities[selCity].owner;
    let s2 = '';
    for (const e of S.ADJ[selCity]) {
      const x1 = S.POS[selCity].x, y1 = S.POS[selCity].y, x2 = S.POS[e.to].x, y2 = S.POS[e.to].y;
      const o2 = st.cities[e.to].owner;
      const cls = o2 === own ? 'own' : G.atWar(own, o2) ? 'war' : 'peace';
      const dash = e.type === 'land' ? '' : e.type === 'river' ? 'stroke-dasharray="10 6"' : 'stroke-dasharray="3 9"';
      s2 += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="conn ${cls}" ${dash}/>`;
      s2 += `<circle cx="${x2}" cy="${y2}" r="27" class="connring ${cls}"/>`;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      s2 += `<g transform="translate(${mx},${my})"><rect x="-17" y="-10" width="34" height="18" rx="9" class="connlab ${cls}"/><text y="4" class="conntxt">${({ land: '육로', river: '수로', sea: '해로' })[e.type]}</text></g>`;
    }
    g.innerHTML = s2;
  };
  UI.applyVB = () => { const svg = $('#mapsvg'); if (svg) svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); };
  UI.zoom = (f, cx, cy) => {
    const nw = U.clamp(vb.w / f, 450, U.MAP_W * 1.1);
    const k = nw / vb.w;
    cx = cx == null ? vb.x + vb.w / 2 : cx; cy = cy == null ? vb.y + vb.h / 2 : cy;
    vb.x = cx - (cx - vb.x) * k; vb.y = cy - (cy - vb.y) * k; vb.w = nw; vb.h *= k;
    UI.applyVB();
  };
  UI.centerOn = (cid, zoomW) => {
    const c = S.cityById[cid];
    const wrap = $('#mapwrap');
    const ar = wrap ? wrap.clientHeight / Math.max(1, wrap.clientWidth) : 0.6;
    vb.w = 1250 * (zoomW || 1); vb.h = vb.w * ar;
    vb.x = S.POS[cid].x - vb.w / 2; vb.y = S.POS[cid].y - vb.h / 2;
    UI.applyVB();
  };
  UI.mapControls = () => {
    const svg = $('#mapsvg');
    let drag = null, moved = false;
    const toMap = (ev) => { const r = svg.getBoundingClientRect(); return { x: vb.x + ((ev.clientX - r.left) / r.width) * vb.w, y: vb.y + ((ev.clientY - r.top) / r.height) * vb.h }; };
    svg.addEventListener('wheel', (e) => { e.preventDefault(); const p = toMap(e); UI.zoom(e.deltaY < 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
    svg.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; moved = false; });
    svg.addEventListener('pointerover', (e) => {
      const g = e.target.closest && e.target.closest('.city');
      U.$$('.edge.hov', svg).forEach((x) => x.classList.remove('hov'));
      if (g) U.$$(`.edge[data-a="${g.dataset.id}"], .edge[data-b="${g.dataset.id}"]`, svg).forEach((x) => x.classList.add('hov'));
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      const dx = ((e.clientX - drag.x) / r.width) * vb.w, dy = ((e.clientY - drag.y) / r.height) * vb.h;
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 5) moved = true;
      vb.x = drag.vx - dx; vb.y = drag.vy - dy; UI.applyVB();
    });
    window.addEventListener('pointerup', (e) => {
      if (drag && !moved) { const g = e.target.closest && e.target.closest('.city'); if (g) UI.selectCity(g.dataset.id); }
      drag = null;
    });
    UI.applyVB();
  };

  /* ───────── 도시 패널 ───────── */
  UI.selectCity = (cid) => {
    selCity = cid;
    const st = S.state;
    const offs = G.officersIn(cid);
    if (!selOfficer || !offs.includes(selOfficer) || st.officers[selOfficer].done) selOfficer = offs.find((id) => !st.officers[id].done) || offs[0] || null;
    UI.renderSide();
    UI.renderMap();
  };
  UI.refresh = () => { UI.renderTop(); UI.renderSide(); UI.renderMap(); };
  UI.renderSide = () => {
    const st = S.state, cid = selCity, side = $('#side');
    if (!side || !cid) return;
    const c = S.cityById[cid], cs = st.cities[cid], N = S.NATIONS[cs.owner];
    const mine = cs.owner === st.player;
    const tp = S.CITY_TYPES[c.type];
    side.innerHTML = '';
    side.appendChild(el('div', { class: 'cp-head', style: { background: `linear-gradient(135deg, ${N.color}, ${N.dark})` } },
      el('svg', { viewBox: '-22 -26 44 46', width: 52, height: 54, html: A.cityIcon(c.type, N.light, N.dark, c.port) }),
      el('div', { class: 'cp-title' }, el('div', { class: 'cp-name' }, c.name, el('span', { class: 'cp-hanja' }, c.hanja)),
        el('div', { class: 'cp-tags' }, el('span', { class: 'tag' }, tp.name), c.port ? el('span', { class: 'tag blue' }, c.port === 'sea' ? '바다 항구' : c.port === 'river' ? '하천 나루' : '바다·하천 항구') : null, el('span', { class: 'tag', style: { background: N.light, color: N.dark } }, S.nationName(cs.owner)))),
      el('span', { html: A.emblem(cs.owner, 36) })));
    side.appendChild(el('div', { class: 'cp-note' }, c.note));
    const known = mine || G.isAlly(st.player, cs.owner) || S.ADJ[cid].some((e) => st.cities[e.to].owner === st.player);
    /* 내정 수치 */
    const stats = el('div', { class: 'cp-stats' });
    const row = (label, v, max, col, txt) => stats.appendChild(el('div', { class: 'srow' }, el('span', { class: 'sl' }, label), bar(v, max, col), el('span', { class: 'sv' }, txt || `${U.fmt(v)}${max ? `/${U.fmt(max)}` : ''}`)));
    if (known) {
      row('인구', cs.pop, G.popCap(cid), '#b08d57', `${U.fmt(cs.pop)}/${U.fmt(G.popCap(cid))}`);
      row('농업', cs.agri, G.ecoMax(cid), '#6a9a3a');
      row('상업', cs.comm, G.ecoMax(cid), '#c79a1e');
      row('기술', cs.tech, 999, '#5b7fb5');
      row('성벽', cs.wall, G.wallMax(cid), '#8a7a62');
      row('민심', cs.order, 100, '#c4566a');
      row('훈련', cs.train, 100, '#8a4a2a');
    } else stats.appendChild(el('div', { class: 'muted' }, '정보 부족 — 인접 도시를 확보하면 정찰됩니다.'));
    side.appendChild(sec('내정', stats));
    /* 특산품 */
    if (c.special && S.SPECIALS[c.special]) {
      const sp = S.SPECIALS[c.special];
      const box = el('div', { class: 'cp-special' }, el('div', { class: 'spn' }, `◆ ${sp.name}`),
        el('div', { class: 'spmode' },
          el('button', { class: `btn xs ${cs.specialMode === 'trade' ? 'on' : ''}`, disabled: !mine, onclick: () => { cs.specialMode = 'trade'; UI.refresh(); } }, `무역 (돈 +${sp.trade})`),
          el('button', { class: `btn xs ${cs.specialMode === 'tech' ? 'on' : ''}`, disabled: !mine, onclick: () => { cs.specialMode = 'tech'; UI.refresh(); } }, `기술 (${sp.techDesc})`)));
      side.appendChild(sec('특산품', box));
    }
    /* 병력 */
    const tr = el('div', { class: 'cp-troops' });
    const tt = G.troopsTotal(cs);
    if (known) {
      Object.entries(cs.troops).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([uid, v]) => {
        tr.appendChild(el('div', { class: 'troop', title: S.UNITS[uid].desc }, el('div', { class: 'tart', html: A.unitArt(uid, cs.owner, 54, 44) }), el('div', { class: 'tname' }, S.UNITS[uid].name), el('b', {}, U.fmt(v))));
      });
      if (!tt) tr.appendChild(el('div', { class: 'muted' }, '병력 없음'));
    } else tr.appendChild(el('div', { class: 'muted' }, `추정 병력 약 ${U.fmt(Math.round(tt / 1000) * 1000)}`));
    side.appendChild(sec(`병력 ${known ? U.fmt(tt) : ''}`, tr));
    /* 장수 */
    const offsAll = G.officersIn(cid);
    const SK = { lead: 0, war: 1, int: 2, pol: 3 };
    let offs = offsAll.slice();
    if (offReady && mine) offs = offs.filter((id) => !st.officers[id].done && !(st.officers[id].uses > 0));
    if (offSort !== 'base') offs.sort((a, b) => (offSort === 'sum' ? st.officers[b].s.reduce((x, y) => x + y) - st.officers[a].s.reduce((x, y) => x + y) : st.officers[b].s[SK[offSort]] - st.officers[a].s[SK[offSort]]));
    const ol = el('div', { class: 'cp-offs' });
    if (offsAll.length > 4) ol.appendChild(el('div', { class: 'off-tools' },
      el('select', { onchange: (e) => { offSort = e.target.value; UI.renderSide(); } }, [['base', '기본 순서'], ['sum', '능력 합'], ['lead', '통솔'], ['war', '무력'], ['int', '지력'], ['pol', '정치']].map(([v, l]) => el('option', { value: v, selected: offSort === v }, `정렬: ${l}`))),
      mine ? el('label', {}, el('input', { type: 'checkbox', checked: offReady, onchange: (e) => { offReady = e.target.checked; UI.renderSide(); } }), ' 이번 계절 미사용만') : null));
    offs.forEach((id) => {
      const so = st.officers[id], o = S.officerById[id];
      const isRuler = st.nations[cs.owner].ruler === id;
      ol.appendChild(el('div', { class: `off ${selOfficer === id ? 'sel' : ''} ${so.done ? 'done' : ''} ${so.uses >= 2 ? 'tired' : ''}`, onclick: () => { if (mine) { selOfficer = id; UI.renderSide(); } else UI.officerDetail(id); } },
        el('div', { class: 'op', html: A.portrait(id, 40) }),
        el('div', { class: 'oinfo' }, el('div', { class: 'on' }, isRuler ? '👑 ' : '', o.name, o.legend ? el('span', { class: 'lg-tag' }, '설화') : null, o.fic ? el('span', { class: 'lg-tag fic' }, '가상') : null),
          el('div', { class: 'os' }, so.s.map((v, i) => el('span', { class: 'st' }, `${STAT_NAMES[i][0]}${v}`))),
          el('div', { class: 'osp' }, S.SPECIALS_AB[o.sp] ? `★${S.SPECIALS_AB[o.sp].name}` : '')),
        el('button', { class: 'btn xs info', onclick: (e) => { e.stopPropagation(); UI.officerDetail(id); } }, 'i'),
        so.done ? el('span', { class: 'done-tag' }, '출진') : so.uses ? el('span', { class: 'done-tag use' }, `명령 ${so.uses}회`) : null));
    });
    const frees = G.officersIn(cid, 'free');
    if (mine && frees.length) ol.appendChild(el('div', { class: 'muted' }, `재야 인재의 소문이 있다… (${frees.length}명) — 「탐색」으로 찾기`));
    if (!offs.length) ol.appendChild(el('div', { class: 'muted' }, offsAll.length ? '조건에 맞는 장수 없음' : '배치된 장수 없음'));
    side.appendChild(sec(`장수 ${offsAll.length}`, ol));
    /* 명령 */
    if (mine) {
      const N = cs;
      const cmd = el('div', { class: 'cp-cmd six' });
      const offN = G.officersIn(cid).filter((id) => !st.officers[id].done).length;
      const mk = (icon, label, key, fn, extraDis, title) => el('button', { class: 'btn cmd cmdb', disabled: !offN || (N.ap || 0) < G.AP_COST[key] || extraDis, title: title || '', onclick: fn },
        el('span', { class: 'ci' }, icon), el('span', {}, label), el('span', { class: 'apc' }, `⚡${G.AP_COST[key]}`));
      cmd.appendChild(mk('🌾', '개발', 'agri', () => UI.devModal(), false, '농업·상업·기술·민심'));
      cmd.appendChild(mk('⚔', '군사', 'train', () => UI.milModal(), false, '징병·훈련·축성'));
      cmd.appendChild(mk('🏗', '건설', 'build', () => UI.buildModal()));
      cmd.appendChild(mk('🚶', '이동', 'move', () => UI.moveModal(), !S.ADJ[cid].some((e) => st.cities[e.to].owner === st.player), '장수 여러 명·병력을 한 번에 이동'));
      cmd.appendChild(mk('🔍', '탐색', 'search', () => UI.search(), false, '재야 인재·숨은 재물 찾기'));
      cmd.appendChild(mk('🏯', '출진', 'attack', () => UI.attackModal(), !G.attackTargets(cid).length));
      const parts = G.cityApParts(cid).filter((p) => p[1]);
      side.appendChild(sec(`명령 — 이 도시 행동력 ⚡${cs.ap || 0} (계절마다 ${G.cityApMax(cid)} + 이월 최대 1)`, el('div', {}, cmd,
        el('div', { class: 'ap-parts' }, parts.map(([k, v]) => el('span', { class: `app ${v < 0 ? 'neg' : ''}` }, `${k} ${v > 0 ? '+' : ''}${v}`))),
        el('div', { class: 'muted small' }, '행동력은 도시마다 따로 있고, 인구·농업·상업·기술·민심이 오를수록, 관아를 키울수록 늘어납니다(최대 10). 명령은 이 도시에서 가장 알맞은 장수가 맡고, 같은 장수가 거듭 맡으면 효과가 75% → 50%로 줄어듭니다. 남은 행동력은 1까지 이월됩니다.'))));
    } else {
      /* 적 도시: 인접 아군 거점에서 출진 */
      const froms = S.ADJ[cid].filter((e) => st.cities[e.to].owner === st.player && G.attackTargets(e.to).some((x) => x.to === cid));
      if (froms.length) {
        const box = el('div', { class: 'cp-cmd' });
        froms.forEach((e) => box.appendChild(el('button', { class: 'btn cmd red', onclick: () => { selCity = e.to; selOfficer = null; UI.selectCity(e.to); UI.attackModal(cid); } }, `⚔ ${S.cityById[e.to].name}에서 출진`)));
        side.appendChild(sec('공격', box));
      }
    }
    /* 건물 */
    const bl = el('div', { class: 'cp-blds' });
    for (let i = 0; i < tp.slots; i++) {
      const bid = cs.buildings[i];
      if (bid) { const lv = S.bldLevel(cs, bid); bl.appendChild(el('div', { class: `bld ${S.BUILDINGS[bid].wonder ? 'wonder' : ''} lv${lv}`, title: S.BUILDINGS[bid].desc, onclick: () => UI.buildingInfo(cid, bid) }, el('div', { html: A.building(bid, cs.owner, 46) }), el('div', { class: 'bn' }, S.buildingName(bid, cs.owner)), S.BUILDINGS[bid].wonder ? null : el('span', { class: 'blv' }, `Lv${lv}`, mine && !S.canUpgrade(bid, cs) ? ' ▲' : ''))); }
      else bl.appendChild(el('div', { class: 'bld empty', onclick: () => mine && UI.buildModal() }, el('div', { class: 'plus' }, '+'), el('div', { class: 'bn' }, '빈 터')));
    }
    side.appendChild(sec(`건축물 ${cs.buildings.length}/${tp.slots}`, bl));
  };
  const sec = (title, body) => el('div', { class: 'sec' }, el('div', { class: 'sec-t' }, title), body);
  UI.afterAction = () => {
    const st = S.state;
    const offs = G.officersIn(selCity);
    if (selOfficer && st.officers[selOfficer] && st.officers[selOfficer].done) selOfficer = offs.find((id) => !st.officers[id].done) || selOfficer;
    UI.refresh();
  };

  /* 명령을 맡을 장수: 이번 계절 덜 쓴 장수 → 해당 능력치 높은 순 */
  UI.bestOfficer = (cid, si) => G.officersIn(cid).filter((id) => !S.state.officers[id].done)
    .sort((a, b) => (S.state.officers[a].uses || 0) - (S.state.officers[b].uses || 0) || S.state.officers[b].s[si] - S.state.officers[a].s[si])[0];
  const SI = { agri: 3, comm: 3, tech: 2, order: 3, train: 0, wall: 0 };
  const cmdRow = (cid, k, close) => {
    const st = S.state, C = G.COMMANDS[k], oid = UI.bestOfficer(cid, SI[k]);
    const N = st.cities[cid];
    const gain = oid ? G.calcCommand(oid, k, G.apMultOf(oid)) : 0;
    const cs = st.cities[cid];
    const cur = { agri: cs.agri, comm: cs.comm, tech: cs.tech, order: cs.order, train: cs.train, wall: cs.wall }[k];
    const ok = oid && G.canPay(st.player, C.cost) && (N.ap || 0) >= G.AP_COST[k];
    return el('button', { class: 'opt-row', disabled: !ok, onclick: () => { UI.toast(G.doCommand(oid, k)); close(); UI.afterAction(); } },
      el('span', { class: 'oi' }, C.icon), el('b', {}, C.name), el('span', { class: 'og' }, `${Math.round(cur)} → +${gain}`),
      el('span', { class: 'oo' }, oid ? `${S.officerById[oid].name}${st.officers[oid].uses ? ` (${Math.round(G.apMultOf(oid) * 100)}%)` : ''}` : '-'),
      el('span', { class: 'oc' }, `⚡${G.AP_COST[k]} · ${resStr(C.cost)}`));
  };
  UI.devModal = () => {
    const cid = selCity;
    let close;
    const body = el('div', { class: 'opt-list' }, ['agri', 'comm', 'tech', 'order'].map((k) => cmdRow(cid, k, () => close())));
    const pm = UI.modal({ title: `개발 — ${S.cityById[cid].name}`, body, buttons: [{ label: '닫기' }] });
    close = () => { const m = document.querySelector('.modal-bg:last-child'); if (m) m.remove(); };
    return pm;
  };
  UI.milModal = () => {
    const cid = selCity, st = S.state;
    let close = () => { const m = document.querySelector('.modal-bg:last-child'); if (m) m.remove(); };
    const N = st.cities[cid];
    const rec = el('button', { class: 'opt-row', disabled: (N.ap || 0) < G.AP_COST.recruit, onclick: () => { close(); selOfficer = UI.bestOfficer(cid, 0); UI.recruitModal(); } },
      el('span', { class: 'oi' }, '🛡'), el('b', {}, '징병'), el('span', { class: 'og' }, `모집 가능 약 ${U.fmt(UI.bestOfficer(cid, 0) ? G.recruitAmount(UI.bestOfficer(cid, 0)) : 0)}명`), el('span', { class: 'oo' }, '병종 선택 ▸'), el('span', { class: 'oc' }, `⚡${G.AP_COST.recruit}`));
    const body = el('div', { class: 'opt-list' }, rec, cmdRow(cid, 'train', close), cmdRow(cid, 'wall', close));
    return UI.modal({ title: `군사 — ${S.cityById[cid].name}`, body, buttons: [{ label: '닫기' }] });
  };

  /* ── 징병 ── */
  UI.recruitModal = async () => {
    const st = S.state, cid = selCity, n = st.player;
    const oid = selOfficer && st.officers[selOfficer] && st.officers[selOfficer].city === cid ? selOfficer : UI.bestOfficer(cid, 0);
    if (!oid) return UI.toast('징병을 맡을 장수가 없습니다.');
    const amt = G.recruitAmount(oid);
    const box = el('div', { class: 'rec-list' });
    S.UNIT_ORDER.filter((u) => S.unitAvailable(u, n)).forEach((uid) => {
      const u = S.UNITS[uid];
      const bad = G.unitReqOk(uid, cid, n);
      const cost = G.recruitCost(n, uid, amt, cid);
      const afford = G.canPay(n, cost);
      box.appendChild(el('button', { class: `rec ${u.nation ? 'special' : ''}`, disabled: !!bad || !afford || amt < 100 || (st.cities[cid].ap || 0) < G.AP_COST.recruit, onclick: () => { const r = G.doRecruit(oid, uid); UI.toast(r); $('.modal-bg').remove(); UI.afterAction(); } },
        el('div', { class: 'ra', html: A.unitArt(uid, n, 96, 80) }),
        el('div', { class: 'ri' }, el('div', { class: 'rn' }, `${u.name} `, el('span', { class: 'hj' }, u.hanja), u.nation ? el('span', { class: 'sp-tag' }, '특수') : null),
          el('div', { class: 'rd' }, u.desc),
          el('div', { class: 'rs' }, `공${Math.round(u.atk * 100)} 방${Math.round(u.def * 100)} · 계열 ${({ cav: '기병', spear: '창병', bow: '궁병', siege: '공성', navy: '수군' })[u.cls]}`),
          el('div', { class: `rc ${afford ? '' : 'red'}` }, `비용: ${resStr(cost)}`),
          bad ? el('div', { class: 'red' }, `✖ ${bad}`) : null)));
    });
    await UI.modal({ title: `징병 — ${S.officerById[oid].name} (모집 가능 ${U.fmt(amt)}명)`, body: el('div', {}, el('div', { class: 'hint' }, '상성: 창병 ▶ 기병 ▶ 궁병 ▶ 창병 (유리 ×1.35 / 불리 ×0.75)'), box), wide: true, buttons: [{ label: '닫기' }] });
  };
  /* ── 건설 ── */
  UI.buildModal = async () => {
    const st = S.state, cid = selCity, n = st.player, cs = st.cities[cid];
    const body = el('div', {});
    S.BUILD_CATS.forEach((cat) => {
      const items = Object.keys(S.BUILDINGS).filter((b) => S.BUILDINGS[b].cat === cat && (!S.BUILDINGS[b].nation || S.BUILDINGS[b].nation.split('|').includes(n)));
      if (!items.length) return;
      const grid = el('div', { class: 'bgrid' });
      items.forEach((bid) => {
        const b = S.BUILDINGS[bid];
        const why = S.canBuild(bid, S.cityById[cid], cs, n);
        const mul = bid === 'w_mireuk' && st.flags.mireukDiscount ? 0.6 : 1;
        const cost = {}; for (const k in b.cost) cost[k] = Math.round(b.cost[k] * mul);
        const afford = G.canPay(n, cost);
        grid.appendChild(el('button', { class: `bopt ${b.wonder ? 'wonder' : ''}`, disabled: !!why || !afford || !UI.bestOfficer(cid, 3) || (st.cities[cid].ap || 0) < G.AP_COST.build, onclick: () => { const r = G.doBuild(UI.bestOfficer(cid, 3), bid); UI.toast(r); $('.modal-bg').remove(); UI.afterAction(); } },
          el('div', { html: A.building(bid, n, 58) }),
          el('div', { class: 'bi' }, el('div', { class: 'bname' }, S.buildingName(bid, n), el('span', { class: 'hj' }, b.hanja)), el('div', { class: 'bdesc' }, b.desc), el('div', { class: `bcost ${afford ? '' : 'red'}` }, resStr(cost)), why ? el('div', { class: 'red small' }, why) : null)));
      });
      body.appendChild(el('h4', { class: 'cat' }, cat));
      body.appendChild(grid);
    });
    body.prepend(el('div', { class: 'hint' }, '이미 지은 건물은 도시 화면의 건물 칸을 눌러 Lv2·Lv3로 업그레이드할 수 있습니다(효과 ×1.7 · ×2.5).'));
    await UI.modal({ title: `건설 — ${S.cityById[cid].name} (${cs.buildings.length}/${S.CITY_TYPES[S.cityById[cid].type].slots})`, body, wide: true });
  };
  const effText = (b, lv) => {
    const N = { food: '식량', gold: '돈', agriG: '농업 성장', commG: '상업 성장', techG: '기술 성장', trade: '무역', iron: '철/턴', wood: '목재/턴', recruit: '징병량', train: '훈련/턴', order: '민심/턴', wallMax: '성벽 상한', def: '수비', popCap: '인구 상한', popG: '인구 증가율', cityAp: '도시 행동력', naval: '수상전', cavCost: '기병 비용', bowAtk: '궁병', supply: '원정 식량 절감', alert: '수비 1턴 지휘력', exp: '장수 성장' };
    return Object.entries(b.eff).map(([k, v]) => {
      const x = k === 'cityAp' ? v * lv : v * S.BLD_MUL[lv];
      const pct = ['food', 'gold', 'agriG', 'commG', 'techG', 'trade', 'recruit', 'def', 'naval', 'cavCost', 'bowAtk', 'popG'].includes(k);
      return `${N[k] || k} ${x > 0 ? '+' : ''}${pct ? (k === 'popG' ? (x * 100).toFixed(1) + '%p' : Math.round(x * 100) + '%') : Math.round(x * 10) / 10}`;
    }).join(' · ');
  };
  UI.buildingInfo = async (cid, bid) => {
    const st = S.state, cs = st.cities[cid], b = S.BUILDINGS[bid];
    const mine = cs.owner === st.player;
    const lv = S.bldLevel(cs, bid);
    const why = S.canUpgrade(bid, cs);
    const cost = !b.wonder && lv < S.BLD_MAX ? S.upgradeCost(bid, lv) : null;
    const oid = UI.bestOfficer(cid, 3);
    const body = el('div', { class: 'binfo' }, el('div', { html: A.building(bid, cs.owner, 120) }), el('p', {}, b.desc),
      b.wonder ? null : el('div', { class: 'lvbox' },
        el('div', {}, el('b', {}, `현재 Lv${lv}`), ` — ${effText(b, lv)}`),
        lv < S.BLD_MAX ? el('div', {}, el('b', {}, `Lv${lv + 1}`), ` — ${effText(b, lv + 1)}`) : el('div', { class: 'muted' }, '최고 레벨입니다.'),
        cost ? el('div', { class: 'muted small' }, `업그레이드 비용 ${resStr(cost)} · ⚡${G.AP_COST.upgrade} · 도시 기술 ${S.BLD_TECH[lv + 1]} 필요${why ? ` — ${why}` : ''}`) : null),
      el('p', { class: 'muted' }, `분류: ${b.cat}`));
    const btns = [];
    if (mine && cost) btns.push({ label: `▲ Lv${lv + 1}로 업그레이드`, cls: 'gold', disabled: !!why || !oid || !G.canPay(st.player, cost) || (cs.ap || 0) < G.AP_COST.upgrade, fn: () => { UI.toast(G.doUpgrade(oid, bid)); UI.afterAction(); } });
    if (mine && !b.wonder) btns.push({ label: '철거', cls: 'red', fn: () => { G.doDemolish(cid, bid); UI.refresh(); } });
    btns.push({ label: '닫기' });
    await UI.modal({ title: `${S.buildingName(bid, cs.owner)} ${b.hanja}${b.wonder ? '' : ` · Lv${lv}`}`, body, buttons: btns });
  };
  /* ── 이동·수송 ── */
  /* 이동: 장수 여러 명과 병력을 한 번에 (출발 도시 행동력 1) */
  UI.moveModal = async () => {
    const st = S.state, cid = selCity, cs = st.cities[cid];
    const opts = S.ADJ[cid].filter((e) => st.cities[e.to].owner === st.player);
    if (!opts.length) return UI.toast('인접한 아군 도시가 없습니다.');
    const offs = G.officersIn(cid).filter((id) => !st.officers[id].done);
    let to = opts[0].to;
    const pick = new Set();
    const vals = {};
    const body = el('div', { class: 'mv' });
    const render = () => {
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'hint' }, `장수 몇 명이든, 병력과 함께 한 번에 이동합니다 — 출발 도시 행동력 ⚡${G.AP_COST.move} (남은 ${cs.ap || 0})`));
      body.appendChild(el('div', { class: 'mv-dest' }, el('b', {}, '목적지 '), opts.map((e) => el('button', { class: `btn sm ${to === e.to ? 'on' : ''}`, onclick: () => { to = e.to; render(); } }, `${S.cityById[e.to].name} (${({ land: '육로', river: '수로', sea: '바닷길' })[e.type]})`))));
      body.appendChild(el('div', { class: 'mv-tools' }, el('b', {}, `장수 (${pick.size}/${offs.length} 선택) `),
        el('button', { class: 'btn xs', onclick: () => { offs.forEach((id) => pick.add(id)); render(); } }, '모두 선택'),
        el('button', { class: 'btn xs', onclick: () => { pick.clear(); render(); } }, '선택 해제')));
      body.appendChild(el('div', { class: 'mv-offs' }, offs.map((id) => {
        const so = st.officers[id], o = S.officerById[id];
        return el('div', { class: `mv-off ${pick.has(id) ? 'on' : ''}`, onclick: () => { if (pick.has(id)) pick.delete(id); else pick.add(id); render(); } },
          el('div', { html: A.portrait(id, 34) }), el('div', {}, el('div', { class: 'on' }, o.name), el('div', { class: 'muted small' }, so.s.join('/'))));
      })));
      body.appendChild(el('b', {}, '함께 옮길 병력'));
      body.appendChild(el('div', { class: 'tp-rows' }, Object.entries(cs.troops).filter(([, v]) => v > 0).map(([uid, v]) => {
        if (vals[uid] == null) vals[uid] = 0;
        const lab = el('b', {}, U.fmt(vals[uid]));
        return el('div', { class: 'tp-row' }, el('span', {}, S.UNITS[uid].name), el('input', { type: 'range', min: 0, max: v, step: 100, value: vals[uid], oninput: (e) => { vals[uid] = +e.target.value; lab.textContent = U.fmt(vals[uid]); } }), lab, el('span', { class: 'muted' }, `/ ${U.fmt(v)}`));
      })));
    };
    render();
    await UI.modal({ title: `이동 — ${S.cityById[cid].name}`, body, wide: true,
      buttons: [{ label: `🚶 이동 (⚡${G.AP_COST.move})`, cls: 'gold', fn: () => { const r = G.doMoveGroup(cid, to, [...pick], vals); UI.toast(r); UI.afterAction(); } }, { label: '취소' }] });
  };
  UI.transportModal = () => UI.moveModal();
  UI.search = async () => {
    selOfficer = UI.bestOfficer(selCity, 2);
    if (!selOfficer) return UI.toast('탐색을 맡을 장수가 없습니다.');
    const r = G.doSearch(selOfficer);
    if (r.found) {
      const fid = r.found;
      await UI.modal({ title: '인재 발견', body: el('div', { class: 'found' }, el('div', { html: A.portrait(fid, 110) }), el('div', {}, el('h3', {}, S.officerById[fid].name), el('p', {}, r.msg), el('p', { class: 'muted' }, S.officerById[fid].note || ''))),
        buttons: [{ label: '등용한다', cls: 'gold', fn: () => { const ok = G.doHire(selOfficer, fid); UI.toast(ok ? `${S.officerById[fid].name} 등용 성공!` : '등용 실패… 다음 기회에', ok ? 'good' : 'bad'); UI.afterAction(); } }, { label: '그만둔다' }] });
    } else UI.toast(r.msg);
    UI.afterAction();
  };

  /* ── 출진 편성 ── */
  UI.attackModal = async (preTarget) => {
    const st = S.state, cid = selCity, cs = st.cities[cid], n = st.player;
    const targets = G.attackTargets(cid);
    if (!targets.length) return UI.toast('공격 가능한 인접 도시가 없습니다.');
    let tgt = targets.find((e) => e.to === preTarget) || targets[0];
    const offs = G.officersIn(cid).filter((id) => !st.officers[id].done);
    if (!offs.length) return UI.toast('출진 가능한 장수가 없습니다.');
    const picks = offs.slice(0, 3).map((id) => ({ oid: id, on: true, uid: null, troops: 0 }));
    offs.slice(3).forEach((id) => picks.push({ oid: id, on: false, uid: null, troops: 0 }));
    const avail = () => Object.entries(cs.troops).filter(([, v]) => v >= 100);
    const body = el('div', { class: 'atk' });
    const render = () => {
      body.innerHTML = '';
      const ts = st.cities[tgt.to];
      const tc = S.cityById[tgt.to];
      const tsel = el('div', { class: 'atk-targets' }, targets.map((e) => el('button', { class: `btn ${e === tgt ? 'on' : ''}`, onclick: () => { tgt = e; render(); } }, `${S.cityById[e.to].name} · ${S.nationName(st.cities[e.to].owner)} (${({ land: '육로', river: '수로', sea: '바닷길' })[e.type]})`)));
      body.appendChild(el('div', { class: 'atk-sec' }, el('h4', {}, '공격 목표'), tsel));
      const war = G.atWar(n, ts.owner);
      body.appendChild(el('div', { class: 'atk-intel' },
        el('div', {}, `🏯 ${tc.name} (${S.CITY_TYPES[tc.type].name}) — 성벽 ${U.fmt(ts.wall)} · 추정 병력 ${U.fmt(Math.round(G.troopsTotal(ts) / 500) * 500)} · 수비 보너스 +${Math.round(S.CITY_TYPES[tc.type].defBonus * 100)}%`),
        el('div', {}, `수비 장수: ${G.officersIn(tgt.to).map((i) => S.officerById[i].name).join(', ') || '없음'}`),
        tgt.type !== 'land' ? el('div', { class: 'warn' }, `⚓ ${tgt.type === 'sea' ? '바다' : '하천'} 전투: 수군 외 병종 공격 -20%, 수군 ×1.4`) : null,
        !war ? el('div', { class: 'red' }, `⚠ ${S.nationName(ts.owner)}과(와)는 ${({ peace: '평화', ally: '동맹', truce: '휴전' })[G.getRel(n, ts.owner).status]} 상태 — 출진 시 선전포고(국제 평판 하락)`) : null));
      const tbl = el('div', { class: 'atk-units' });
      picks.forEach((p) => {
        const so = st.officers[p.oid], o = S.officerById[p.oid];
        const groups = avail();
        if (!p.uid || !groups.some(([u]) => u === p.uid)) { const pref = groups.find(([u]) => u === o.u) || groups.find(([u]) => !picks.some((q) => q !== p && q.on && q.uid === u)) || groups[0]; p.uid = pref ? pref[0] : null; }
        const maxT = p.uid ? cs.troops[p.uid] - picks.filter((q) => q !== p && q.on && q.uid === p.uid).reduce((a, q) => a + q.troops, 0) : 0;
        if (!p.troops || p.troops > maxT) p.troops = Math.max(0, Math.floor((maxT * (p.troops ? 1 : 0.8)) / 100) * 100);
        const lab = el('b', {}, U.fmt(p.troops));
        tbl.appendChild(el('div', { class: `au ${p.on ? 'on' : ''}` },
          el('input', { type: 'checkbox', checked: p.on, onchange: (e) => { if (e.target.checked && picks.filter((q) => q.on).length >= 3) { e.target.checked = false; return UI.toast('최대 3부대'); } p.on = e.target.checked; render(); } }),
          el('div', { class: 'aup', html: A.portrait(p.oid, 38) }),
          el('div', { class: 'aun' }, el('div', {}, o.name), el('div', { class: 'muted small' }, so.s.map((v, i) => `${STAT_NAMES[i][0]}${v}`).join(' '))),
          el('select', { disabled: !p.on, onchange: (e) => { p.uid = e.target.value; p.troops = 0; render(); } }, groups.map(([u, v]) => el('option', { value: u, selected: u === p.uid }, `${S.UNITS[u].name} (${U.fmt(v)})`))),
          el('input', { type: 'range', min: 0, max: Math.max(0, maxT), step: 100, value: p.troops, disabled: !p.on, oninput: (e) => { p.troops = +e.target.value; lab.textContent = U.fmt(p.troops); upd(); } }), lab));
      });
      body.appendChild(el('div', { class: 'atk-sec' }, el('h4', {}, '출진 부대 (최대 3)'), tbl));
      const links = S.LINKS.filter((l) => { const ids = picks.filter((p) => p.on).map((p) => p.oid); return l.members.filter((m) => ids.includes(m)).length >= (l.min || l.members.length); });
      if (links.length) body.appendChild(el('div', { class: 'atk-links' }, links.map((l) => el('span', { class: `link-tag ${l.neg ? 'neg' : ''}` }, `🔗 ${l.name} (${l.type}) ${l.bonus > 0 ? '+' : ''}${Math.round(l.bonus * 100)}%${l.card ? ' · 합격기' : ''}`))));
      const foodEl = el('div', { class: 'atk-food' });
      body.appendChild(foodEl);
      const upd = () => { const tot = picks.filter((p) => p.on).reduce((a, p) => a + p.troops, 0); const f = G.expeditionFood(tot, tgt.type, n, cid); foodEl.innerHTML = `총 ${U.fmt(tot)}명 · 군량 소모 🌾${U.fmt(f)} (보유 ${U.fmt(st.nations[n].food)})`; foodEl.classList.toggle('red', f > st.nations[n].food); };
      upd();
    };
    render();
    const go = async (auto) => {
      const army = picks.filter((p) => p.on && p.uid && p.troops >= 100).map((p) => ({ oid: p.oid, uid: p.uid, troops: p.troops }));
      if (!army.length) { UI.toast('출진 병력이 없습니다.'); return false; }
      const tot = army.reduce((a, u) => a + u.troops, 0);
      const food = G.expeditionFood(tot, tgt.type, n, cid);
      if (food > st.nations[n].food) { UI.toast('군량이 부족합니다.'); return false; }
      if ((cs.ap || 0) < G.AP_COST.attack) { UI.toast(`${S.cityById[cid].name}의 행동력이 부족합니다. (출진 ⚡${G.AP_COST.attack})`); return false; }
      cs.ap -= G.AP_COST.attack;
      const ts = st.cities[tgt.to];
      if (!G.atWar(n, ts.owner)) G.declareWar(n, ts.owner);
      st.nations[n].food -= food;
      army.forEach((u) => (cs.troops[u.uid] -= u.troops));
      setTimeout(() => UI.launchBattle({ from: cid, to: tgt.to, att: army, attNation: n, edgeType: tgt.type }, auto));
    };
    await UI.modal({ title: `출진 — ${S.cityById[cid].name}`, body, wide: true, buttons: [{ label: `⚔ 직접 지휘 (카드 전투) ⚡${G.AP_COST.attack}`, cls: 'gold', fn: () => go(false) }, { label: '자동 전투', fn: () => go(true) }, { label: '취소' }] });
  };
  UI.launchBattle = async (info, auto) => {
    const res = await S.BattleUI.run(info, { auto, playerSide: info.attNation === S.state.player ? 'a' : 'd' });
    const out = G.applyBattle(info, res);
    if (out.captured.length) await UI.prisonerPrompt(out.captured, info.attNation);
    UI.refresh();
    const end = G.checkEnd();
    if (end.end) await UI.gameEnd(end);
    return res;
  };
  UI.prisonerPrompt = async (list, captor) => {
    if (captor !== S.state.player) {
      for (const pid of list) { if (!G.handlePrisoner(pid, captor, 'hire') && Math.random() < 0.4) G.handlePrisoner(pid, captor, 'release'); }
      return;
    }
    for (const pid of list) {
      const o = S.officerById[pid];
      const so = S.state.officers[pid];
      await UI.modal({ title: `포로 — ${o.name}`, closable: false, body: el('div', { class: 'found' }, el('div', { html: A.portrait(pid, 110) }), el('div', {}, el('h3', {}, `${o.name} (${S.nationName(so.nation)})`), el('p', {}, `충성 ${so.loyalty} · ${so.s.map((v, i) => `${STAT_NAMES[i]} ${v}`).join(' · ')}`), el('p', { class: 'muted' }, o.note || ''))),
        buttons: [
          { label: '등용 시도', cls: 'gold', fn: () => { const ok = G.handlePrisoner(pid, captor, 'hire'); UI.toast(ok ? `${o.name}이(가) 투항했다!` : `${o.name}: "두 임금을 섬길 수 없다." (포로로 남음)`, ok ? 'good' : 'bad'); } },
          { label: '석방', fn: () => { G.handlePrisoner(pid, captor, 'release'); UI.toast(`${o.name}을(를) 돌려보냈다. (우호도 +5)`); } },
          { label: '처형', cls: 'red', fn: () => { G.handlePrisoner(pid, captor, 'execute'); } }] });
    }
  };

  /* ───────── 인물 ───────── */
  UI.officerDetail = async (id) => {
    const o = S.officerById[id], so = S.state.officers[id];
    const sp = S.SPECIALS_AB[o.sp];
    const nat = so.nation;
    const age = S.state.year - o.b;
    const links = S.LINKS.filter((l) => l.members.includes(id));
    const body = el('div', { class: 'od' },
      el('div', { class: 'od-left' }, el('div', { html: A.portrait(id, 170) }), el('div', { class: 'od-card', html: A.unitCard(id, o.u in S.UNITS ? o.u : 'spear', nat, 0, { w: 150, h: 220 }) })),
      el('div', { class: 'od-right' },
        el('h2', {}, o.name, el('span', { class: 'hj' }, o.hanja), o.legend ? el('span', { class: 'lg-tag' }, '설화·야사') : null, o.fic ? el('span', { class: 'lg-tag fic' }, '가상 인물') : null),
        el('div', { class: 'muted' }, `${S.nationName(nat)} · ${({ king: '군주·왕족', queen: '여왕·왕후', general: '장수', scholar: '문관·책사', monk: '승려', lady: '여인', hwarang: '화랑', legend: '설화 인물' })[o.role]} · ${age}세(추정, ${o.b}~${o.d || '?'}) · 충성 ${so.loyalty} · ${({ active: '현역', free: '재야', prisoner: '포로', dead: '사망', future: '미등장', none: '미등장' })[so.status]}`),
        el('div', { class: 'od-stats' }, so.s.map((v, i) => el('div', { class: 'srow' }, el('span', { class: 'sl' }, STAT_NAMES[i]), bar(v, 100, ['#a3242a', '#c4562a', '#2b6ca3', '#3a8a4a'][i]), el('b', { class: 'sv' }, v), o.s0 && o.s0[i] !== v ? el('span', { class: 'muted small s0' }, '원래 ' + o.s0[i]) : null))),
        el('div', { class: 'od-legend muted small' }, '통솔: 병력·지휘력·방어막 / 무력: 공격·방어 / 지력: 책략·외교 / 정치: 내정·회복', o.s0 ? ' · 「원래」는 나라 간 보정 전 값' : ''),
        sp ? el('div', { class: 'od-sp' }, el('div', { class: 'spt' }, `★ 특수능력 — ${sp.name}`), el('div', {}, passiveText(sp.passive)), sp.card ? cardEl(Object.assign({ owner: '' }, sp.card), true) : null) : null,
        o.note ? el('p', { class: 'od-note' }, o.note) : null,
        el('div', { class: 'muted small' }, `출전: ${o.src}`),
        links.length ? el('div', { class: 'od-links' }, el('div', { class: 'spt' }, '🔗 인물 연계'), links.map((l) => el('div', { class: `ol ${l.neg ? 'neg' : ''}` }, el('b', {}, `${l.name}`), ` (${l.type}) — ${l.members.filter((m) => m !== id).map((m) => S.officerById[m].name).join('·')} · ${l.bonus > 0 ? '+' : ''}${Math.round(l.bonus * 100)}%${l.card ? ' · 합격기 「' + l.card.name + '」' : ''}`, el('div', { class: 'muted small' }, l.desc)))) : null));
    await UI.modal({ title: '인물 정보', body, wide: true });
  };
  const passiveText = (p) => {
    const N = { morale: '전투 사기', order: '민심/턴', atk: '공격', def: '방어', tactic: '책략', lead: '통솔 효과', pol: '정치 효과', int: '지력 효과', war: '무력 효과', cav: '기병', bow: '궁병', naval: '수상전', siege: '공성', recruit: '징병', comm: '상업', tech: '기술', agri: '농업', diplomacy: '외교', supply: '보급', exp: '성장' };
    const parts = Object.keys(p || {}).map((k) => `${N[k] || k} ${p[k] > 0 ? '+' : ''}${p[k] < 1 && p[k] > -1 ? Math.round(p[k] * 100) + '%' : p[k]}`);
    return parts.length ? `상시: ${parts.join(', ')}` : '';
  };
  UI.officerList = async () => {
    const st = S.state;
    let tab = 'mine', q = '', kind = 'all', sortK = 'sum';
    const body = el('div', {});
    const render = () => {
      body.innerHTML = '';
      const tabs = el('div', { class: 'tabs' }, [['mine', '아군'], ['free', '재야'], ['prisoner', '포로'], ['others', '타국'], ['dead', '사망']].map(([k, l]) => el('button', { class: `btn sm ${tab === k ? 'on' : ''}`, onclick: () => { tab = k; render(); } }, l)),
        el('input', { class: 'osearch', placeholder: '이름 검색', value: q, oninput: (e) => { q = e.target.value; const pos = e.target.selectionStart; render(); const i = body.querySelector('.osearch'); i.focus(); i.setSelectionRange(pos, pos); } }),
        el('select', { onchange: (e) => { kind = e.target.value; render(); } }, [['all', '전체'], ['real', '정사 인물'], ['legend', '설화·야사'], ['fic', '가상 인물']].map(([v, l]) => el('option', { value: v, selected: kind === v }, l))));
      body.appendChild(tabs);
      let ids = Object.keys(st.officers).filter((id) => {
        const so = st.officers[id];
        const o = S.officerById[id];
        if (q && !o.name.includes(q) && !o.hanja.includes(q)) return false;
        if (kind === 'real' && (o.legend || o.fic)) return false;
        if (kind === 'legend' && !o.legend) return false;
        if (kind === 'fic' && !o.fic) return false;
        if (tab === 'free') return so.status === 'free' && so.city && st.cities[so.city] && !(st.inactive || {})[so.city];
        if (tab === 'mine') return so.status === 'active' && so.nation === st.player;
        if (tab === 'prisoner') return so.status === 'prisoner' && so.captor === st.player;
        if (tab === 'others') return so.status === 'active' && so.nation !== st.player;
        if (tab === 'dead') return so.status === 'dead';
      });
      const SK = { lead: 0, war: 1, int: 2, pol: 3 };
      ids.sort((a, b) => (sortK === 'sum' ? st.officers[b].s.reduce((x, y) => x + y) - st.officers[a].s.reduce((x, y) => x + y) : st.officers[b].s[SK[sortK]] - st.officers[a].s[SK[sortK]]));
      const H = [['', null], ['이름', null], ['국가', null], ['소재', null], ['통', 'lead'], ['무', 'war'], ['지', 'int'], ['정', 'pol'], ['합', 'sum'], ['특수능력', null], ['', null]];
      const tbl = el('table', { class: 'otbl' }, el('tr', {}, H.map(([h, k]) => el('th', { class: k ? `sortable ${sortK === k ? 'on' : ''}` : '', onclick: k ? () => { sortK = k; render(); } : null }, h + (k && sortK === k ? ' ▼' : '')))));
      body.appendChild(el('div', { class: 'muted small' }, `${ids.length}명 · 머리글(통·무·지·정·합)을 누르면 정렬`));
      ids.forEach((id) => {
        const so = st.officers[id], o = S.officerById[id];
        tbl.appendChild(el('tr', { onclick: () => UI.officerDetail(id) },
          el('td', { html: A.portrait(id, 28) }), el('td', {}, o.name, o.legend ? ' ✦' : '', o.fic ? ' ◇' : ''), el('td', {}, S.nationName(so.nation)), el('td', {}, so.city ? S.cityById[so.city].name : '-'),
          ...so.s.map((v) => el('td', { class: v >= 90 ? 'hi' : '' }, v)), el('td', {}, so.s.reduce((x, y) => x + y)), el('td', { class: 'small' }, S.SPECIALS_AB[o.sp] ? S.SPECIALS_AB[o.sp].name : ''),
          el('td', {}, tab === 'prisoner' ? el('button', { class: 'btn xs', onclick: (e) => { e.stopPropagation(); const ok = G.handlePrisoner(id, st.player, 'hire'); UI.toast(ok ? '등용 성공' : '거절당했다'); render(); } }, '등용') : so.deathNote ? el('span', { class: 'small muted' }, so.deathNote) : '')));
      });
      body.appendChild(el('div', { class: 'otbl-wrap' }, tbl));
    };
    render();
    await UI.modal({ title: '인물 목록', body, wide: true });
  };

  /* ───────── 외교·목표·기록·저장 ───────── */
  UI.diplomacy = async () => {
    const st = S.state, n = st.player;
    const body = el('div', {});
    const render = () => {
      body.innerHTML = '';
      const cap = G.capitalOf(n);
      const free = cap ? G.officersIn(cap).filter((id) => !st.officers[id].done).length : 0;
      body.appendChild(el('div', { class: 'hint' }, `외교는 수도(${cap ? S.cityById[cap].name : '-'})의 행동 가능한 장수가 사절로 나섭니다. (가능 ${free}명) · 지력·정치가 높을수록 성공률 상승`));
      Object.keys(st.nations).filter((m) => m !== n && m !== 'neutral' && st.nations[m].alive).forEach((m) => {
        const r = G.getRel(n, m);
        const stt = ({ war: '⚔ 전쟁', peace: '평화', ally: '🤝 동맹', truce: '휴전' })[r.status];
        body.appendChild(el('div', { class: 'dip' }, el('span', { html: A.emblem(m, 38) }),
          el('div', { class: 'dn' }, el('b', {}, S.nationName(m)), el('div', { class: 'muted small' }, `${stt}${r.until ? ` (~${Math.floor(r.until / 4)}년)` : ''} · 도시 ${G.citiesOf(m).length} · 병력 ${U.fmt(Math.round(G.nationTroopTotal(m) / 1000))}천`)),
          el('div', { class: 'dv' }, bar(r.val, 100, r.val > 60 ? '#3a8a4a' : r.val > 30 ? '#c79a1e' : '#a3242a'), el('span', {}, `우호 ${Math.round(r.val)}`)),
          el('div', { class: 'db' },
            el('button', { class: 'btn xs', disabled: !free, onclick: () => { UI.toast(G.diplo(n, m, 'gift')); render(); UI.refresh(); } }, '친선(🪙400)'),
            el('button', { class: 'btn xs', disabled: !free || r.status !== 'war', onclick: () => { UI.toast(G.diplo(n, m, 'truce')); render(); UI.refresh(); } }, '휴전'),
            el('button', { class: 'btn xs', disabled: !free || r.status === 'war' || r.status === 'ally', onclick: () => { UI.toast(G.diplo(n, m, 'ally')); render(); UI.refresh(); } }, '동맹'),
            el('button', { class: 'btn xs red', disabled: !free || r.status === 'war', onclick: () => { UI.toast(G.diplo(n, m, 'war')); render(); UI.refresh(); } }, '선전포고'))));
      });
    };
    render();
    await UI.modal({ title: '외교', body, wide: true });
  };
  UI.goals = async () => {
    const st = S.state, sc = S.scenarioById[st.scenario];
    const gs = G.goalStatus(st.player);
    await UI.modal({ title: `목표 — ${sc.title}`, body: el('div', {}, el('p', {}, sc.desc), el('ul', { class: 'goals' }, gs.map((g) => el('li', { class: g.ok ? 'ok' : g.failed ? 'fail' : '' }, `${g.ok ? '✅' : g.failed ? '❌' : '⬜'} ${g.desc} — ${g.prog}`))), el('p', { class: 'muted' }, `시나리오 종료: ${sc.endYear}년 겨울 · 현재 점수 ${U.fmt(G.score())}`), el('p', { class: 'muted small' }, '고구려·백제·신라 중 나머지 두 나라를 모두 멸망시키면 「삼한일통」 즉시 승리.')) });
  };
  UI.logModal = async () => {
    await UI.modal({ title: '연대기', wide: true, body: el('div', { class: 'logfull' }, S.state.log.map((l) => el('div', { class: `tk ${l.kind}` }, el('span', { class: 't' }, l.t), ' ', l.msg))) });
  };
  UI.saveMenu = async () => {
    const body = el('div', { class: 'slots' }, [1, 2, 3].map((i) => { const m = G.saveMeta(i); return el('button', { class: 'btn slot', onclick: () => { G.save(i); UI.toast(`슬롯 ${i}에 저장했습니다.`, 'good'); $('.modal-bg').remove(); } }, `슬롯 ${i} · ${m ? `${m.sc} · ${m.n} · ${m.d}` : '(비어 있음)'}`); }));
    await UI.modal({ title: '저장', body });
  };

  /* ───────── 이벤트 ───────── */
  UI.runEvents = async () => {
    const evs = G.pendingEvents();
    for (const ev of evs) {
      if (S.state.fired[ev.id]) continue;
      let ok = false; try { ok = ev.cond(G.E); } catch (e) { ok = false; }
      if (!ok) continue;
      if (!G.eventInvolvesPlayer(ev)) { G.fireEvent(ev, ev.choices[0]); continue; }
      const choices = G.eventChoices(ev);
      if (!choices.length) { G.fireEvent(ev, ev.choices[0]); UI.toast(`[소식] ${ev.title}`); continue; }
      await UI.eventModal(ev, choices);
    }
    UI.refresh();
  };
  UI.eventModal = (ev, choices) => new Promise((resolve) => {
    const sp = ev.speaker;
    const body = el('div', { class: `ev ${ev.kind}` },
      el('div', { class: 'ev-art', html: eventArt(ev) }),
      el('div', { class: 'ev-main' },
        sp ? el('div', { class: 'ev-sp', html: A.portrait(sp, 96) }) : null,
        el('div', { class: 'ev-text' }, ev.text.map((p) => el('p', {}, p)), el('div', { class: 'ev-src' }, `${ev.kind === 'legend' ? '✦ 설화·야사' : '📜 정사'} · ${ev.src}`))));
    UI.modal({ title: `${ev.kind === 'legend' ? '【설화】' : '【역사】'} ${ev.title}`, body, wide: true, closable: false,
      buttons: choices.map((c) => ({ label: c.label.replace(/^\(.+?\)\s*/, ''), cls: 'gold', fn: () => { G.fireEvent(ev, c); } })) }).then(resolve);
  });
  const eventArt = (ev) => {
    const kind = ev.kind === 'legend' ? '#5a3b7a' : '#5a2a22';
    return `<svg viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="eva" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${kind}"/><stop offset="1" stop-color="#1a1210"/></linearGradient></defs><rect width="600" height="120" fill="url(#eva)"/>
      <path d="M0 90 L80 60 L150 80 L240 40 L330 78 L420 50 L520 80 L600 55 V120 H0Z" fill="#000" opacity=".35"/>
      <text x="300" y="72" text-anchor="middle" font-size="44" fill="#f6dc8a" opacity=".22" font-family="serif" letter-spacing="14">${ev.kind === 'legend' ? '說話' : '史記'}</text></svg>`;
  };

  /* ───────── 턴 종료 ───────── */
  UI.endTurn = async () => {
    const st = S.state;
    const btn = $('.endturn'); if (btn) btn.disabled = true;
    const ov = el('div', { class: 'busy' }, el('div', { class: 'busy-box' }, el('div', { class: 'spinner' }), el('div', { id: 'busytxt' }, '다른 나라들이 움직이고 있습니다…')));
    document.body.appendChild(ov);
    await U.sleep(60);
    const order = U.shuffle(Object.keys(st.nations).filter((n) => n !== st.player && n !== 'neutral' && st.nations[n].alive));
    const playerDefense = [];
    for (const n of order) {
      $('#busytxt').textContent = `${S.nationName(n)}이(가) 행동 중…`;
      await U.sleep(30);
      const atks = G.aiTurn(n);
      for (const a of atks) {
        if (st.cities[a.to].owner === st.player) playerDefense.push(a);
        else if (st.cities[a.to].owner !== a.attNation) {
          const b = new S.Battle(a);
          const res = b.autoResolve();
          const out = G.applyBattle(a, res);
          await UI.prisonerPrompt(out.captured, a.attNation);
        } else { /* 이미 점령됨: 병력 반환 */ a.att.forEach((u) => (st.cities[a.from].troops[u.uid] = (st.cities[a.from].troops[u.uid] || 0) + u.troops)); }
      }
    }
    ov.remove();
    UI.renderMap();
    for (const a of playerDefense) {
      if (st.cities[a.to].owner !== st.player) { a.att.forEach((u) => (st.cities[a.from].troops[u.uid] = (st.cities[a.from].troops[u.uid] || 0) + u.troops)); continue; }
      UI.centerOn(a.to, 1);
      const choice = await UI.modal({ title: '⚠ 적군 내습!', closable: false, body: el('div', { class: 'invade' }, el('span', { html: A.emblem(a.attNation, 60) }), el('div', {}, el('h3', {}, `${S.nationName(a.attNation)}군이 ${S.cityById[a.to].name}을(를) 공격해 왔습니다!`), el('p', {}, `출발: ${S.cityById[a.from].name} · 병력 ${U.fmt(a.att.reduce((x, u) => x + u.troops, 0))} · 장수 ${a.att.map((u) => S.officerById[u.oid].name).join(', ')}`))),
        buttons: [{ label: '⚔ 직접 지휘', cls: 'gold', value: 'manual' }, { label: '자동 전투', value: 'auto' }] });
      await UI.launchBattle(a, choice === 'auto');
    }
    /* 계절 진행 */
    G.advance();
    G.lifeCycle();
    const rep = G.income();
    for (const n in st.nations) G.checkAlive(n);
    UI.refresh();
    UI.toast(`${U.dateStr(st.year, st.season)} — 수입: 🪙${U.fmt(rep.gold)} 🌾${U.fmt(rep.food - rep.upkeep)} ⛓${U.fmt(rep.iron)} 🪵${U.fmt(rep.wood)}`, 'good');
    if (st.season === 2) UI.toast('가을 추수! 식량 수입이 크게 늘었습니다.', 'good');
    await UI.runEvents();
    const end = G.checkEnd();
    if (end.end) await UI.gameEnd(end);
    if (btn) btn.disabled = false;
    G.save(0);
  };
  UI.gameEnd = async (end) => {
    if (S.Campaign && S.state.campaign && (await S.Campaign.onEnd(end))) return;
    const sc = S.scenarioById[S.state.scenario];
    await UI.modal({ title: end.win ? '🏆 승리' : end.timeout ? '⏳ 시나리오 종료' : '💀 패배', closable: false, wide: true,
      body: el('div', { class: 'end' }, el('span', { html: A.emblem(S.state.player, 90) }), el('h2', {}, end.msg), el('p', {}, `${sc.title} · ${U.dateStr(S.state.year, S.state.season)} · 점수 ${U.fmt(G.score())}`), el('p', { class: 'muted' }, `도시 ${G.citiesOf(S.state.player).length} · 병력 ${U.fmt(G.nationTroopTotal(S.state.player))} · 장수 ${G.nationOfficers(S.state.player).length} · 전투 ${S.state.battleCount}회`)),
      buttons: [{ label: '계속 플레이', value: 'go' }, { label: '타이틀로', cls: 'gold', fn: () => setTimeout(UI.title) }] });
  };

  /* 카드 DOM (전투·인물 정보 공용) */
  const cardEl = (card, preview) => {
    const kindName = { atk: '공격', tac: '책략', def: '방어', buff: '강화', heal: '회복' }[card.kind];
    return el('div', { class: `bcard k-${card.kind} ${card.special ? 'special' : ''} ${card.link ? 'link' : ''} ${preview ? 'preview' : ''}` },
      el('div', { class: 'cost' }, card.cost),
      el('div', { class: 'cname' }, card.name),
      el('div', { class: 'cicon', html: A.fxIcon(card.fx || 'slash') }),
      el('div', { class: 'ckind' }, `${kindName}${card.pow ? ` · ${card.pow}` : ''}${card.target === 'allEnemy' ? ' · 전체' : card.target === 'allAlly' ? ' · 아군 전체' : ''}`),
      el('div', { class: 'cdesc' }, card.desc || ''));
  };
  UI.cardEl = cardEl;
  S.UI = UI;
})(window.SGK);
