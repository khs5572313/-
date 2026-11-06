/* 삼국기 — 게임 로직: 상태 생성, 내정, 턴 진행, AI, 외교, 이벤트 API, 저장 */
(function (S) {
  'use strict';
  const U = S.U;
  const G = {};
  const STAT_IDX = { lead: 0, war: 1, int: 2, pol: 3 };
  const T = (y, s) => y * 4 + s;
  const EV_DEATH = ['ondal', 'gwisan', 'chuhang', 'chandeok', 'nulchoe', 'biryeongja', 'geojin', 'hapjeol', 'heumun', 'yepa', 'jeokdeuk', 'boyongna', 'pilbu', 'docheom', 'boksin', 'geonmu', 'gyebaek', 'bangul', 'gwanchang', 'kimyusin', 'haeron', 'geommojam', 'takutsu', 'pumseok', 'gotaso', 'jukjuk', 'bidam', 'gujincheon'];

  const DEV = {
    capital: { pop: 120000, agri: 600, comm: 600, troops: 15000 },
    plain: { pop: 60000, agri: 480, comm: 360, troops: 7000 },
    mountain: { pop: 24000, agri: 200, comm: 120, troops: 6500 },
    port: { pop: 40000, agri: 280, comm: 440, troops: 5000 },
    wall: { pop: 6000, agri: 40, comm: 20, troops: 9000 },
    pass: { pop: 5000, agri: 30, comm: 20, troops: 5000 },
    jin: { pop: 20000, agri: 150, comm: 150, troops: 9000 },
  };
  const TECH0 = { tang: 420, sui: 400, goguryeo: 320, baekje: 360, silla: 300, wa: 220, mohe: 120, neutral: 120 };
  const MIX = {
    goguryeo: { cav: 0.28, spear: 0.36, bow: 0.36 }, baekje: { cav: 0.16, spear: 0.42, bow: 0.42 },
    silla: { cav: 0.28, spear: 0.42, bow: 0.3 }, sui: { cav: 0.3, bubyeong: 0.3, spear: 0.12, bow: 0.2, siege: 0.08 },
    tang: { cav: 0.32, bubyeong: 0.28, spear: 0.1, bow: 0.2, pocha: 0.1 }, wa: { wanavy: 0.45, spear: 0.35, bow: 0.2 },
    mohe: { mohecav: 0.7, bow: 0.3 }, neutral: { spear: 0.6, bow: 0.4 },
  };
  const DEFAULT_BLD = {
    capital: ['field', 'market', 'housing', 'office', 'barracks', 'stable'], plain: ['field', 'market'], mountain: ['chi'],
    port: ['shipyard'], wall: ['chi'], pass: [], jin: ['barracks', 'stable'],
  };

  /* ───────── 상태 생성 ───────── */
  /* 난이도: 보통이 기준(모든 배율 1). 플레이어·AI 자원, AI 병력·공격성에만 작용하고 역사 데이터는 건드리지 않는다 */
  G.DIFF = {
    easy:   { name: '쉬움',   desc: '자원 ×1.5 · 아군 병력 ×1.2 · 적 병력 ×0.85 · 적이 플레이어를 덜 노림', playerRes: 1.5, playerTroops: 1.2, aiTroops: 0.85, aiIncome: 0.9, aggr: 1.2, aiAtt: 0, vsPlayer: 1.2, aiAp: -1 },
    normal: { name: '보통',   desc: '역사 기준 밸런스 (권장)', playerRes: 1, playerTroops: 1, aiTroops: 1, aiIncome: 1, aggr: 1, aiAtt: 0, vsPlayer: 1, aiAp: 0 },
    hard:   { name: '어려움', desc: '자원 ×0.8 · 적 병력 ×1.2 · 적 수입 ×1.15 · 적이 플레이어를 우선 공격', playerRes: 0.8, playerTroops: 1, aiTroops: 1.2, aiIncome: 1.15, aggr: 1, aiAtt: 1, vsPlayer: 0.8, aiAp: 2 },
  };
  /* 요동 서부 전선: 수·당(지도 밖)과 맞닿은 고구려 성들 */
  G.WEST_FRONT = ['buyeo', 'sinseong', 'gaemo', 'yodong', 'baegam', 'ansi', 'geonan', 'bisa', 'ogol', 'bakjak', 'sokmal'];
  G.diff = () => G.DIFF[(S.state && S.state.diff) || 'normal'] || G.DIFF.normal;
  G.newGame = (scId, player, opts = {}) => {
    const sc = S.scenarioById[scId];
    const st = { ver: 1, scenario: scId, year: sc.year, season: sc.season, startT: T(sc.year, sc.season), player, diff: opts.diff || 'normal', campaign: opts.campaign || null,
      nations: {}, rel: {}, cities: {}, officers: {}, fired: {}, flags: {}, log: [], everOwned: {}, turnCount: 0, battleCount: 0 };
    S.state = st;
    for (const nid in S.NATIONS) {
      const base = sc.nations[nid] || { gold: 300, food: 600, iron: 50, wood: 200 };
      st.nations[nid] = { gold: base.gold, food: base.food, iron: base.iron, wood: base.wood, ruler: base.ruler || null,
        alias: base.alias || null, alive: false, morale: { v: 0, t: 0 }, atk: { v: 0, t: 0 } };
    }
    /* 도시 */
    st.inactive = {};
    for (const c of S.CITIES) if (!sc.cities[c.id]) st.inactive[c.id] = true;
    S.rebuildAdj(st.inactive);
    for (const c of S.CITIES) {
      const def = sc.cities[c.id] || ['neutral', 0.5];
      const [owner, mul = 1, ov = {}] = def;
      const d = DEV[c.type];
      const tp = S.CITY_TYPES[c.type];
      const r = 0.88 + Math.random() * 0.24;
      const cs = {
        owner, pop: Math.round(d.pop * r), agri: Math.round(d.agri * r), comm: Math.round(d.comm * r),
        tech: TECH0[owner] || 150, wall: Math.round(300 * tp.wallMul), order: 70, train: 40,
        troops: {}, buildings: (DEFAULT_BLD[c.type] || []).slice(), specialMode: 'trade',
      };
      if (c.port && !cs.buildings.includes('shipyard') && ['capital', 'port'].includes(c.type)) cs.buildings.push('shipyard');
      cs.buildings = cs.buildings.slice(0, tp.slots);
      cs.blv = {};
      if (c.type === 'capital') ['field', 'market'].forEach((b) => cs.buildings.includes(b) && (cs.blv[b] = 2));
      const total = Math.round(d.troops * mul * (owner === 'neutral' ? 0.5 : 1));
      const mix = MIX[owner] || MIX.neutral;
      for (const k in mix) cs.troops[k] = Math.round((total * mix[k]) / 100) * 100;
      if (c.port && owner !== 'wa' && owner !== 'neutral') cs.troops.navy = (cs.troops.navy || 0) + Math.round(total * 0.08 / 100) * 100;
      if (ov.troops) for (const k in ov.troops) cs.troops[k] = (cs.troops[k] || 0) + ov.troops[k];
      if (ov.wall) cs.wall = ov.wall;
      cs.wall = Math.min(cs.wall, G.wallMax(c.id, cs));
      st.cities[c.id] = cs;
      if (owner !== 'neutral' && !st.inactive[c.id]) { st.nations[owner].alive = true; st.everOwned[c.id] = [owner]; }
    }
    /* 관계 */
    const majors = Object.keys(S.NATIONS).filter((n) => n !== 'neutral');
    for (let i = 0; i < majors.length; i++) for (let j = i + 1; j < majors.length; j++) G.setRel(majors[i], majors[j], 'peace', 50);
    for (const [a, b, status, val, untilY] of sc.relations) G.setRel(a, b, status, val, untilY ? T(untilY, 0) : null);
    /* 인물 */
    for (const o of S.OFFICERS) st.officers[o.id] = { nation: o.nation, city: null, status: 'none', loyalty: o.loyal || 70, done: false, s: o.s.slice(), exp: 0 };
    const place = (list, status) => {
      for (const cid in list) for (const ent of list[cid]) {
        const [id, nat] = ent.split('@');
        const so = st.officers[id];
        if (!so) { console.warn('unknown officer', id); continue; }
        so.city = cid; so.status = status; if (nat) so.nation = nat;
        if (status === 'active') so.nation = nat || st.cities[cid].owner;
      }
    };
    place(sc.officers, 'active');
    place(sc.free || {}, 'free');
    /* 자동 배치: 시나리오에 명시되지 않았지만 그 해에 살아 있는 성인 인물 → 자국 도시(수도·국경 우선) */
    const ex = new Set(sc.exclude || []);
    for (const n of ['goguryeo', 'baekje', 'silla']) {
      if (!st.nations[n].alive) continue;
      const cities = G.citiesOf(n);
      const cap = G.capitalOf(n);
      const order = [cap].concat(cities.filter((c) => c !== cap && G.isBorder(c)), cities.filter((c) => c !== cap && !G.isBorder(c)));
      let k = 0;
      for (const o of S.OFFICERS) {
        if (o.nation !== n || ex.has(o.id)) continue;
        const so = st.officers[o.id];
        if (so.status !== 'none') continue;
        if ((o.b || 0) + 16 > sc.year || (o.d && o.d < sc.year)) continue;
        if (o.noAuto) { so.status = 'free'; so.city = cap; continue; }
        so.status = 'active'; so.city = order[k++ % order.length];
      }
    }
    /* 인물 수 균형: 한 나라의 장수가 가장 적은 나라보다 10% 넘게 많으면, 초과분(가상 인물·능력 합 낮은 순)은 자국 도시의 재야로 시작 → 「탐색」으로 등용 */
    if (S.settings.balanceRoster !== false) {
      const placed = new Set(Object.values(sc.officers).flat().map((e) => e.split('@')[0]));
      const act = {};
      for (const n of ['goguryeo', 'baekje', 'silla']) if (st.nations[n].alive) act[n] = G.nationOfficers(n);
      const counts = Object.values(act).map((l) => l.length);
      if (counts.length) {
        const cap = Math.round(Math.min(...counts) * 1.1);
        for (const n in act) {
          const extra = act[n].length - cap;
          if (extra <= 0) continue;
          const cands = act[n].filter((id) => !placed.has(id) && st.nations[n].ruler !== id)
            .sort((a, b) => (S.officerById[b].fic ? 1 : 0) - (S.officerById[a].fic ? 1 : 0) || st.officers[a].s.reduce((x, y) => x + y) - st.officers[b].s.reduce((x, y) => x + y));
          cands.slice(0, extra).forEach((id) => { st.officers[id].status = 'free'; });
        }
      }
    }
    /* 미래 등장: 성인(16세) 도달 */
    for (const o of S.OFFICERS) {
      const so = st.officers[o.id];
      if (so.status !== 'none' || ex.has(o.id)) continue;
      const adult = (o.b || 0) + 16;
      if (adult > sc.year && adult <= sc.endYear && (!o.d || o.d > adult)) { so.status = 'future'; so.spawnY = adult; }
    }
    for (const sp of sc.spawn || []) { const so = st.officers[sp.id]; if (so && so.status !== 'active') { so.status = 'future'; so.spawnY = sp.year; so.spawnCity = sp.city; so.nation = sp.nation; } }
    /* 난이도 적용 */
    const D = G.DIFF[st.diff] || G.DIFF.normal;
    for (const n in st.nations) {
      if (n === 'neutral') continue;
      const N = st.nations[n];
      const rm = n === player ? D.playerRes : 1;
      for (const k of ['gold', 'food', 'iron', 'wood']) N[k] = Math.round(N[k] * rm);
    }
    for (const cid in st.cities) {
      const cs = st.cities[cid];
      if (cs.owner === 'neutral') continue;
      const tm = cs.owner === player ? D.playerTroops : D.aiTroops;
      if (tm !== 1) for (const k in cs.troops) cs.troops[k] = Math.round((cs.troops[k] * tm) / 100) * 100;
    }
    /* 캠페인 계승 보너스 (앞 장의 전공) */
    if (opts.bonus) {
      const N = st.nations[player];
      for (const k of ['gold', 'food', 'iron', 'wood']) N[k] += opts.bonus[k] || 0;
      if (opts.bonus.morale) { N.morale.v = opts.bonus.morale; N.morale.t = 6; }
    }
    G.refreshCityAp(false);
    G.log(`${U.dateStr(st.year, st.season)} — 시나리오 「${sc.title}」 개막. ${S.nationName(player)} 선택 · 난이도 ${D.name}.`);
    return st;
  };

  /* ───────── 조회 유틸 ───────── */
  G.relKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  G.getRel = (a, b) => S.state.rel[G.relKey(a, b)] || { status: 'peace', val: 50 };
  G.setRel = (a, b, status, val, until) => {
    if (a === b) return;
    const k = G.relKey(a, b);
    const cur = S.state.rel[k] || { status: 'peace', val: 50 };
    S.state.rel[k] = { status: status || cur.status, val: val == null ? cur.val : U.clamp(val, 0, 100), until: until == null ? null : until };
  };
  G.atWar = (a, b) => a !== b && (a === 'neutral' || b === 'neutral' ? true : G.getRel(a, b).status === 'war');
  G.isAlly = (a, b) => a !== b && G.getRel(a, b).status === 'ally';
  G.officer = (id) => S.state.officers[id];
  G.ostat = (id) => {
    const so = S.state.officers[id];
    return so ? so.s : [50, 50, 50, 50];
  };
  G.officersIn = (cid, status = 'active') => Object.keys(S.state.officers).filter((id) => {
    const o = S.state.officers[id];
    return o.city === cid && o.status === status && (status !== 'active' || o.nation === S.state.cities[cid].owner);
  });
  G.nationOfficers = (n) => Object.keys(S.state.officers).filter((id) => S.state.officers[id].status === 'active' && S.state.officers[id].nation === n);
  G.citiesOf = (n) => Object.keys(S.state.cities).filter((c) => S.state.cities[c].owner === n);
  G.troopsTotal = (cs) => Object.values(cs.troops).reduce((a, b) => a + b, 0);
  G.nationTroopTotal = (n) => G.citiesOf(n).reduce((a, c) => a + G.troopsTotal(S.state.cities[c]), 0);
  G.capitalOf = (n) => {
    const cs = G.citiesOf(n);
    const cap = cs.find((c) => S.cityById[c].type === 'capital');
    if (cap) return cap;
    const ruler = S.state.nations[n].ruler;
    if (ruler && S.state.officers[ruler] && cs.includes(S.state.officers[ruler].city)) return S.state.officers[ruler].city;
    return cs.sort((a, b) => S.state.cities[b].pop - S.state.cities[a].pop)[0];
  };
  G.wallMax = (cid, cs) => {
    const c = S.cityById[cid];
    cs = cs || S.state.cities[cid];
    let m = Math.round(600 * S.CITY_TYPES[c.type].wallMul);
    m += G.bldEff(cs, 'wallMax');
    if (S.state && S.state.flags && S.state.flags.cheolliBuilt && cs.owner === 'goguryeo' && ['cheolli', 'sinseong', 'gaemo', 'yodong', 'baegam', 'ansi', 'geonan', 'bisa', 'buyeo'].includes(cid)) m += 300;
    return m;
  };
  /* 인구 상한: 도시 유형 기본값 + 민가 */
  G.POP_BASE = { capital: 160000, plain: 100000, port: 80000, mountain: 50000, jin: 50000, wall: 20000, pass: 15000 };
  G.popCap = (cid) => G.POP_BASE[S.cityById[cid].type] + G.bldEff(S.state.cities[cid], 'popCap');
  G.ecoMax = (cid) => Math.round(1000 * S.CITY_TYPES[S.cityById[cid].type].ecoMul);
  G.bldEff = (cs, key) => cs.buildings.reduce((a, b) => {
    const e = S.BUILDINGS[b] && S.BUILDINGS[b].eff[key];
    if (!e) return a;
    const lv = S.bldLevel(cs, b);
    return a + (key === 'cityAp' ? e * lv : e * S.BLD_MUL[lv]);
  }, 0);
  G.wonderEff = (n, key) => {
    let v = 0;
    for (const c of G.citiesOf(n)) for (const b of S.state.cities[c].buildings) if (S.BUILDINGS[b].wonder) v += S.BUILDINGS[b].eff[key] || 0;
    return v;
  };
  G.passive = (id, key) => {
    const o = S.officerById[id];
    if (!o || !o.sp || !S.SPECIALS_AB[o.sp]) return 0;
    return S.SPECIALS_AB[o.sp].passive[key] || 0;
  };
  G.isBorder = (cid) => {
    const own = S.state.cities[cid].owner;
    return S.ADJ[cid].some((e) => { const o2 = S.state.cities[e.to].owner; return o2 !== own && G.atWar(own, o2); });
  };
  G.log = (msg, kind = 'info') => {
    const st = S.state;
    st.log.unshift({ t: U.dateStr(st.year, st.season), msg, kind });
    if (st.log.length > 200) st.log.length = 200;
    if (S.UI && S.UI.refreshLog) S.UI.refreshLog();
  };

  /* ───────── 내정 명령 ───────── */
  G.COMMANDS = {
    agri: { name: '개간', icon: '🌾', cost: { gold: 60 }, stat: 'pol', desc: '농업 +' },
    comm: { name: '상업 투자', icon: '💰', cost: { gold: 80 }, stat: 'pol', desc: '상업 +' },
    tech: { name: '기술 연구', icon: '⚒', cost: { gold: 100, iron: 20 }, stat: 'int', desc: '기술 +' },
    wall: { name: '축성', icon: '🧱', cost: { wood: 90, gold: 30 }, stat: 'lead', desc: '성벽 +' },
    order: { name: '민심 안정', icon: '🙏', cost: { food: 180 }, stat: 'pol', desc: '민심 +' },
    train: { name: '훈련', icon: '⚔', cost: { food: 100 }, stat: 'lead', desc: '훈련도 +' },
  };
  /* ───────── 도시 행동력 ─────────
   * 행동력은 도시마다 따로 있고, 그 도시의 내정 수준으로 정해진다 (1~10):
   *   기본 1 + 인구 5만마다 1(최대 3) + 농업·상업 합 500마다 1(최대 3) + 기술 350마다 1(최대 2)
   *   + 민심 80 이상 1 / 40 미만 -1 + 수도 1 + 요새(산성·장성·관문·군진) 1 + 주둔군 1.5만 이상 1 + 관아 레벨
   * 명령은 그 도시의 행동력을 쓴다(출진=출발 도시, 외교=수도). 남은 1점은 다음 계절로 이월.
   * 같은 장수가 한 계절에 거듭 명령하면 효과가 줄어든다(100% → 75% → 50%) */
  G.AP_COST = { agri: 1, comm: 1, tech: 1, order: 1, train: 1, wall: 1, recruit: 2, build: 2, upgrade: 2, move: 1, transport: 1, search: 1, attack: 2, diplo: 2 };
  G.AP_MULT = [1, 0.75, 0.5];
  G.cityApParts = (cid) => {
    const cs = S.state.cities[cid], c = S.cityById[cid];
    const parts = [
      ['기본', 1],
      ['인구', Math.min(3, Math.floor(cs.pop / 50000))],
      ['경제(농업+상업)', Math.min(3, Math.floor((cs.agri + cs.comm) / 500))],
      ['기술', Math.min(2, Math.floor(cs.tech / 350))],
      ['민심', cs.order >= 80 ? 1 : cs.order < 40 ? -1 : 0],
      ['수도', c.type === 'capital' ? 1 : 0],
      ['요새', ['mountain', 'wall', 'pass', 'jin'].includes(c.type) ? 1 : 0],
      ['주둔군', G.troopsTotal(cs) >= 15000 ? 1 : 0],
      ['관아', Math.round(G.bldEff(cs, 'cityAp'))],
    ];
    if (cs.owner !== S.state.player && cs.owner !== 'neutral') { const d = G.diff().aiAp || 0; if (d) parts.push(['난이도', d > 0 ? 1 : 0]); }
    return parts;
  };
  G.cityApMax = (cid) => U.clamp(G.cityApParts(cid).reduce((a, p) => a + p[1], 0), 1, 10);
  G.nationAp = (n) => G.citiesOf(n).reduce((a, c) => a + (S.state.cities[c].ap || 0), 0);
  G.nationApMax = (n) => G.citiesOf(n).reduce((a, c) => a + G.cityApMax(c), 0);
  G.apCheck = (oid, key, cid) => {
    const so = S.state.officers[oid];
    if (!so) return '장수가 없습니다.';
    if (so.done) return '출진 중인 장수입니다.';
    const cs = S.state.cities[cid || so.city];
    if ((cs.ap || 0) < G.AP_COST[key]) return `${S.cityById[cid || so.city].name}의 행동력이 부족합니다. (필요 ${G.AP_COST[key]})`;
    return null;
  };
  G.apSpend = (oid, key, cid) => {
    const so = S.state.officers[oid];
    S.state.cities[cid || so.city].ap -= G.AP_COST[key];
    const m = G.AP_MULT[Math.min(so.uses || 0, 2)];
    so.uses = (so.uses || 0) + 1;
    return m;
  };
  G.apMultOf = (oid) => G.AP_MULT[Math.min((S.state.officers[oid] || {}).uses || 0, 2)];
  G.refreshCityAp = (carry) => { for (const cid in S.state.cities) { const cs = S.state.cities[cid]; if (cs.owner === 'neutral') { cs.ap = 0; continue; } cs.ap = G.cityApMax(cid) + (carry ? Math.min(1, Math.max(0, cs.ap || 0)) : 0); } };
  G.canPay = (n, cost) => { const N = S.state.nations[n]; return Object.keys(cost).every((k) => N[k] >= cost[k]); };
  G.pay = (n, cost, mul = 1) => { const N = S.state.nations[n]; for (const k in cost) N[k] = Math.max(0, N[k] - Math.round(cost[k] * mul)); };
  /* 명령 효과 계산 (미리보기·실행 공용) */
  G.calcCommand = (oid, cmd, mult = 1) => {
    const so = S.state.officers[oid], cid = so.city, cs = S.state.cities[cid], n = so.nation;
    const s = so.s.map((x) => x * mult);
    const nb = S.NATIONS[n].bonus || {};
    let v = 0;
    if (cmd === 'agri') { v = (s[3] * 0.45 + 8) * (1 + G.bldEff(cs, 'agriG') + G.passive(oid, 'agri')); }
    if (cmd === 'comm') { v = (s[3] * 0.45 + 8) * (1 + G.bldEff(cs, 'commG') + G.passive(oid, 'comm') + (nb.comm || 0) + (cs.specialMode === 'tech' && S.SPECIALS[S.cityById[cid].special] && S.SPECIALS[S.cityById[cid].special].tech === 'comm' ? 0.2 : 0)); }
    if (cmd === 'tech') { const sp = S.SPECIALS[S.cityById[cid].special]; v = (s[2] * 0.4 + 6) * (1 + G.bldEff(cs, 'techG') + G.passive(oid, 'tech') + G.wonderEff(n, 'techAll') + (cs.specialMode === 'tech' && sp && sp.tech === 'tech' ? 0.2 : 0)); }
    if (cmd === 'wall') { v = (s[0] * 0.55 + 15) * (1 + G.passive(oid, 'wall')); }
    if (cmd === 'order') { v = s[3] * 0.12 + 4 + G.passive(oid, 'order') * 2; }
    if (cmd === 'train') { v = s[0] * 0.2 + 5; }
    return Math.round(v * 1.3);
  };
  G.doCommand = (oid, cmd) => {
    const st = S.state, so = st.officers[oid], cid = so.city, cs = st.cities[cid], n = so.nation;
    const C = G.COMMANDS[cmd];
    const bad = G.apCheck(oid, cmd);
    if (bad) return bad;
    if (!G.canPay(n, C.cost)) return '자원이 부족합니다.';
    G.pay(n, C.cost);
    const mult = G.apSpend(oid, cmd);
    const v = G.calcCommand(oid, cmd, mult);
    const cap = { agri: G.ecoMax(cid), comm: G.ecoMax(cid), tech: 999, wall: G.wallMax(cid), order: 100, train: 100 }[cmd];
    cs[cmd] = Math.min(cap, cs[cmd] + v);
    G.gainExp(oid, 6);
    return `${S.officerById[oid].name}: ${C.name} +${Math.round(v)}${mult < 1 ? ` (연속 명령 ${Math.round(mult * 100)}%)` : ''}`;
  };
  G.recruitCost = (n, uid, amount, cid) => {
    const u = S.UNITS[uid];
    const nb = S.NATIONS[n].bonus || {};
    let mul = amount / 1000;
    if (u.cls === 'cav') {
      mul *= 1 + (nb.cavCost || 0) + (cid ? G.bldEff(S.state.cities[cid], 'cavCost') : 0);
      const sp = cid && S.SPECIALS[S.cityById[cid].special];
      if (cid && S.state.cities[cid].specialMode === 'tech' && sp && sp.tech === 'cav') mul *= 0.9;
    }
    const c = {};
    for (const k in u.cost) if (u.cost[k]) c[k] = Math.round(u.cost[k] * mul);
    return c;
  };
  G.unitReqOk = (uid, cid, n) => {
    const u = S.UNITS[uid], cs = S.state.cities[cid];
    if (!S.unitAvailable(uid, n)) return '타국 전용';
    if (!u.req) return null;
    if (u.req.bld && !cs.buildings.includes(u.req.bld)) return `${S.buildingName(u.req.bld, n)} 필요`;
    if (u.req.tech && cs.tech < u.req.tech) return `기술 ${u.req.tech} 필요`;
    return null;
  };
  G.recruitAmount = (oid) => {
    const so = S.state.officers[oid], cs = S.state.cities[so.city], n = so.nation;
    const nb = S.NATIONS[n].bonus || {};
    let a = 1.6 * (900 + so.s[0] * 14) * (1 + G.bldEff(cs, 'recruit') + (nb.recruit || 0) + G.passive(oid, 'recruit') + (S.cityById[so.city].type === 'jin' ? 0.25 : 0));
    a = Math.min(a, cs.pop * 0.12);
    return Math.max(0, Math.floor(a / 100) * 100);
  };
  G.doRecruit = (oid, uid) => {
    const so = S.state.officers[oid], cid = so.city, cs = S.state.cities[cid], n = so.nation;
    const ap = G.apCheck(oid, 'recruit');
    if (ap) return ap;
    const bad = G.unitReqOk(uid, cid, n);
    if (bad) return bad;
    const amt = Math.floor((G.recruitAmount(oid) * G.apMultOf(oid)) / 100) * 100;
    if (amt < 100) return '인구가 부족합니다.';
    const cost = G.recruitCost(n, uid, amt, cid);
    if (!G.canPay(n, cost)) return '자원이 부족합니다.';
    G.pay(n, cost);
    G.apSpend(oid, 'recruit');
    cs.troops[uid] = (cs.troops[uid] || 0) + amt;
    cs.pop -= amt;
    cs.order = Math.max(0, cs.order - 3 * (1 + ((S.NATIONS[n].bonus || {}).orderLoss || 0)));
    cs.train = Math.max(10, cs.train - Math.round((amt / Math.max(1, G.troopsTotal(cs))) * 20));
    G.gainExp(oid, 5);
    return `${S.officerById[oid].name}: ${S.UNITS[uid].name} ${U.fmt(amt)}명 징병`;
  };
  G.doBuild = (oid, bid) => {
    const so = S.state.officers[oid], cid = so.city, cs = S.state.cities[cid], n = so.nation;
    const ap = G.apCheck(oid, 'build');
    if (ap) return ap;
    const why = S.canBuild(bid, S.cityById[cid], cs, n);
    if (why) return why;
    const b = S.BUILDINGS[bid];
    const mul = bid === 'w_mireuk' && S.state.flags.mireukDiscount ? 0.6 : 1;
    const cost = {}; for (const k in b.cost) cost[k] = Math.round(b.cost[k] * mul);
    if (!G.canPay(n, cost)) return '자원이 부족합니다.';
    G.pay(n, cost);
    G.apSpend(oid, 'build');
    cs.buildings.push(bid);
    if (!cs.blv) cs.blv = {};
    cs.blv[bid] = 1;
    G.gainExp(oid, 5);
    if (b.wonder) G.log(`${S.nationName(n)}, 불가사의 「${b.name}」 완공!`, 'great');
    return `${S.buildingName(bid, n)} 건설 완료`;
  };
  G.doDemolish = (cid, bid) => { const cs = S.state.cities[cid]; cs.buildings = cs.buildings.filter((b) => b !== bid); if (cs.blv) delete cs.blv[bid]; };
  G.doUpgrade = (oid, bid) => {
    const so = S.state.officers[oid], cid = so.city, cs = S.state.cities[cid], n = so.nation;
    const ap = G.apCheck(oid, 'upgrade');
    if (ap) return ap;
    const why = S.canUpgrade(bid, cs);
    if (why) return why;
    const lv = S.bldLevel(cs, bid);
    const cost = S.upgradeCost(bid, lv);
    if (!G.canPay(n, cost)) return '자원이 부족합니다.';
    G.pay(n, cost);
    G.apSpend(oid, 'upgrade');
    if (!cs.blv) cs.blv = {};
    cs.blv[bid] = lv + 1;
    G.gainExp(oid, 6);
    return `${S.buildingName(bid, n)} Lv${lv + 1} 완공`;
  };
  /* 무리 이동: 장수 여러 명 + 병력을 한 번에 (출발 도시 행동력 1) */
  G.doMoveGroup = (from, to, oids, troops) => {
    const st = S.state, fs = st.cities[from], ts = st.cities[to];
    if (!S.ADJ[from].some((e) => e.to === to)) return '인접 도시가 아닙니다.';
    if (ts.owner !== fs.owner) return '아군 도시가 아닙니다.';
    const movers = (oids || []).filter((id) => st.officers[id] && st.officers[id].city === from && !st.officers[id].done);
    const tsum = Object.values(troops || {}).reduce((a, v) => a + (v || 0), 0);
    if (!movers.length && !tsum) return '이동할 장수나 병력을 고르세요.';
    if ((fs.ap || 0) < G.AP_COST.move) return `${S.cityById[from].name}의 행동력이 부족합니다.`;
    fs.ap -= G.AP_COST.move;
    movers.forEach((id) => (st.officers[id].city = to));
    for (const k in troops || {}) { const v = Math.min(troops[k] || 0, fs.troops[k] || 0); if (v > 0) { fs.troops[k] -= v; ts.troops[k] = (ts.troops[k] || 0) + v; } }
    return `${S.cityById[to].name}로 이동: 장수 ${movers.length}명${tsum ? ` · 병력 ${U.fmt(tsum)}` : ''}`;
  };
  G.doMove = (oid, to) => {
    const so = S.state.officers[oid];
    const ap = G.apCheck(oid, 'move');
    if (ap) return ap;
    if (!S.ADJ[so.city].some((e) => e.to === to)) return '인접 도시가 아닙니다.';
    if (S.state.cities[to].owner !== so.nation) return '아군 도시가 아닙니다.';
    G.apSpend(oid, 'move');
    so.city = to;
    return `${S.officerById[oid].name} → ${S.cityById[to].name}`;
  };
  G.doTransport = (oid, to, troops) => {
    const so = S.state.officers[oid], from = so.city;
    const ap = G.apCheck(oid, 'transport');
    if (ap) return ap;
    const fs = S.state.cities[from], ts = S.state.cities[to];
    if (ts.owner !== so.nation) return '아군 도시가 아닙니다.';
    G.apSpend(oid, 'transport');
    for (const k in troops) { const v = Math.min(troops[k] || 0, fs.troops[k] || 0); fs.troops[k] -= v; ts.troops[k] = (ts.troops[k] || 0) + v; }
    return '수송 완료';
  };
  G.doSearch = (oid) => {
    const so = S.state.officers[oid], cid = so.city, n = so.nation;
    const ap = G.apCheck(oid, 'search');
    if (ap) return { msg: ap };
    G.apSpend(oid, 'search');
    const frees = G.officersIn(cid, 'free');
    const st = S.state;
    if (frees.length) {
      const fid = frees[0];
      const chance = 0.35 + so.s[2] / 300 + (st.cities[cid].buildings.includes('temple') ? 0.1 : 0);
      if (Math.random() < chance) return { found: fid, msg: `재야의 인재 ${S.officerById[fid].name}을(를) 찾았다!` };
      return { msg: '소문은 들리지만 찾지 못했다.' };
    }
    const r = Math.random();
    if (r < 0.3) { const g = U.ri(150, 400); st.nations[n].gold += g; return { msg: `숨은 재물을 발견했다. (돈 +${g})` }; }
    if (r < 0.5) { const f = U.ri(200, 600); st.nations[n].food += f; return { msg: `버려진 곡식을 거두었다. (식량 +${f})` }; }
    return { msg: '아무것도 찾지 못했다.' };
  };
  G.doHire = (oid, fid) => {
    const so = S.state.officers[oid], fo = S.state.officers[fid];
    const chance = 0.45 + so.s[3] / 250 + so.s[2] / 400 - (fo.loyalty > 90 && fo.nation !== so.nation ? 0.4 : 0);
    if (Math.random() < chance) { fo.status = 'active'; fo.nation = so.nation; fo.city = so.city; fo.loyalty = U.ri(70, 90); fo.uses = 1; return true; }
    return false;
  };
  G.gainExp = (oid, v) => {
    const so = S.state.officers[oid];
    if (!so) return;
    const mult = so.nation === 'silla' ? 1.25 : 1;
    so.exp += v * mult;
    while (so.exp >= 100) { so.exp -= 100; const i = U.ri(0, 3); so.s[i] = Math.min(100, so.s[i] + 1); }
  };

  /* ───────── 외교 ───────── */
  G.diplo = (n, target, kind) => {
    const st = S.state, N = st.nations[n];
    const cap = G.capitalOf(n);
    const envoys = cap ? G.officersIn(cap).filter((id) => !st.officers[id].done) : [];
    if (!envoys.length) return '수도에 사절로 보낼 장수가 없습니다.';
    if ((st.cities[cap].ap || 0) < G.AP_COST.diplo) return `수도의 행동력이 부족합니다. (필요 ${G.AP_COST.diplo})`;
    const eid = envoys.sort((a, b) => st.officers[b].s[2] + st.officers[b].s[3] - st.officers[a].s[2] - st.officers[a].s[3])[0];
    const es = st.officers[eid].s;
    const bonus = ((S.NATIONS[n].bonus || {}).diplomacy || 0) + G.passive(eid, 'diplomacy');
    const r = G.getRel(n, target);
    let msg = '';
    if (kind === 'gift') {
      if (N.gold < 400) return '돈 400이 필요합니다.';
      N.gold -= 400;
      const inc = Math.round((6 + es[2] * 0.08 + es[3] * 0.06) * (1 + bonus) + U.ri(0, 4));
      G.setRel(n, target, r.status, r.val + inc, r.until);
      msg = `${S.nationName(target)}과의 우호도 +${inc} (사절: ${S.officerById[eid].name})`;
    } else if (kind === 'truce') {
      if (r.status !== 'war') return '전쟁 중이 아닙니다.';
      const p = (r.val / 100) * 0.9 + es[2] / 500 + bonus * 0.3 - (G.nationTroopTotal(target) > G.nationTroopTotal(n) * 1.8 ? 0.25 : 0);
      if (Math.random() < p) { G.setRel(n, target, 'truce', r.val + 5, T(st.year, st.season) + 8); msg = `${S.nationName(target)}과 휴전(2년) 성립!`; }
      else { G.setRel(n, target, r.status, r.val - 3); msg = `${S.nationName(target)}이(가) 휴전을 거절했다.`; }
    } else if (kind === 'ally') {
      if (r.status === 'war') return '전쟁 중인 나라와는 동맹할 수 없습니다.';
      if (r.val < 65) return '우호도 65 이상 필요';
      const p = (r.val - 50) / 60 + bonus * 0.3 + es[2] / 600;
      if (Math.random() < p) { G.setRel(n, target, 'ally', r.val + 5); msg = `${S.nationName(target)}과 동맹 체결!`; }
      else { G.setRel(n, target, r.status, r.val - 5, r.until); msg = `${S.nationName(target)}이(가) 동맹을 거절했다.`; }
    } else if (kind === 'war') {
      G.declareWar(n, target);
      msg = `${S.nationName(target)}에 선전포고!`;
    }
    G.apSpend(eid, 'diplo');
    G.gainExp(eid, 6);
    G.log(msg, 'diplo');
    return msg;
  };
  G.declareWar = (a, b) => {
    const r = G.getRel(a, b);
    if (r.status === 'ally' || r.status === 'truce') {
      for (const n in S.state.nations) if (n !== a && n !== b && S.state.nations[n].alive) { const rr = G.getRel(a, n); G.setRel(a, n, rr.status, rr.val - 8, rr.until); }
    }
    G.setRel(a, b, 'war', Math.min(r.val, 20) - 10);
  };

  /* ───────── 출진 ───────── */
  G.attackTargets = (cid) => {
    const own = S.state.cities[cid].owner;
    const cityPort = S.cityById[cid].port;
    return S.ADJ[cid].filter((e) => {
      const tgt = S.state.cities[e.to];
      if (tgt.owner === own) return false;
      if (e.type !== 'land' && (!cityPort || !S.cityById[e.to].port)) return false;
      return true;
    });
  };
  G.expeditionFood = (troops, edgeType, n, cid) => {
    let f = troops * 0.08 * (edgeType === 'sea' ? 1.5 : 1);
    const cs = S.state.cities[cid];
    if (cs && cs.buildings.includes('market')) f *= 0.8;
    if (G.wonderEff(n, 'supplyAll')) f *= 0.7;
    return Math.round(f);
  };
  /* 수비 편성: 병종별 병력 상위 3개 그룹에 장수 배정 */
  G.defenseArmy = (cid) => {
    const cs = S.state.cities[cid];
    const groups = Object.entries(cs.troops).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const top = groups.slice(0, 3);
    const rest = groups.slice(3);
    /* 남는 병종은 가장 큰 그룹에 합산 */
    const units = top.map(([uid, v]) => ({ uid, troops: v, merged: {} }));
    if (units.length) rest.forEach(([k, v]) => { units[0].merged[k] = v; units[0].troops += v; });
    const offs = G.officersIn(cid).sort((a, b) => S.state.officers[b].s[0] - S.state.officers[a].s[0]);
    return units.map((u, i) => ({ oid: offs[i] || null, uid: u.uid, troops: u.troops, merged: u.merged }));
  };

  /* 전투 결과 적용 */
  G.applyBattle = (info, res) => {
    const st = S.state;
    const { from, to, att, attNation, edgeType } = info;
    const fs = st.cities[from], ts = st.cities[to];
    const defNation = ts.owner;
    st.battleCount++;
    st.flags['battle_' + to] = (st.flags['battle_' + to] || 0) + 1;
    /* 성벽 피해 */
    ts.wall = Math.max(0, ts.wall - Math.round(res.wallDmg || 0));
    const attOffs = att.map((u) => u.oid).filter(Boolean);
    const defOffs = G.officersIn(to);
    if (res.winner === 'a') {
      /* 수비군 소멸, 공격군 생존자 입성 */
      ts.troops = {};
      res.attUnits.forEach((u) => { ts.troops[u.uid] = (ts.troops[u.uid] || 0) + Math.max(0, Math.round(u.troops)); });
      const captured = [];
      const fled = [];
      for (const oid of defOffs) {
        const so = st.officers[oid];
        const escape = S.ADJ[to].map((e) => e.to).filter((c) => st.cities[c].owner === defNation);
        if (escape.length && Math.random() < 0.55) { so.city = U.pick(escape); fled.push(oid); }
        else { so.status = 'prisoner'; so.captor = attNation; so.city = to; captured.push(oid); }
      }
      ts.owner = attNation;
      ts.order = Math.max(10, ts.order - 20);
      if (!st.everOwned[to]) st.everOwned[to] = [];
      if (!st.everOwned[to].includes(attNation)) st.everOwned[to].push(attNation);
      for (const oid of attOffs) { st.officers[oid].city = to; st.officers[oid].done = true; G.gainExp(oid, 25); }
      if (S.cityById[to].type === 'capital') {
        G.E.cityAll(defNation, { order: -20 });
        G.log(`${S.nationName(defNation)}의 수도 ${S.cityById[to].name} 함락!`, 'great');
      }
      G.log(`${S.nationName(attNation)}, ${S.cityById[to].name} 점령${captured.length ? ` (포로: ${captured.map((i) => S.officerById[i].name).join(', ')})` : ''}`, 'war');
      G.checkAlive(defNation);
      return { captured, fled };
    }
    /* 수비 성공 */
    ts.troops = {};
    res.defUnits.forEach((u) => {
      const tot = u.troops0 || 1;
      const ratio = Math.max(0, u.troops) / tot;
      ts.troops[u.uid] = (ts.troops[u.uid] || 0) + Math.round((u.troops0 - Object.values(u.merged || {}).reduce((a, b) => a + b, 0)) * ratio);
      for (const k in u.merged || {}) ts.troops[k] = (ts.troops[k] || 0) + Math.round(u.merged[k] * ratio);
    });
    res.attUnits.forEach((u) => { fs.troops[u.uid] = (fs.troops[u.uid] || 0) + Math.max(0, Math.round(u.troops * 0.9)); });
    for (const oid of attOffs) { st.officers[oid].done = true; G.gainExp(oid, 10); }
    for (const oid of defOffs) G.gainExp(oid, 20);
    G.log(`${S.cityById[to].name} 공방전: ${S.nationName(defNation)} 수성 성공`, 'war');
    return { captured: [], fled: [] };
  };
  G.checkAlive = (n) => {
    if (n === 'neutral') return;
    const st = S.state;
    if (G.citiesOf(n).length === 0 && st.nations[n].alive) {
      st.nations[n].alive = false;
      for (const id of Object.keys(st.officers)) { const o = st.officers[id]; if (o.nation === n && o.status === 'active') { o.status = 'free'; } }
      G.log(`${S.nationName(n)} 멸망.`, 'great');
    } else if (st.nations[n].ruler && st.officers[st.nations[n].ruler] && st.officers[st.nations[n].ruler].status !== 'active') {
      G.succession(n);
    }
  };
  G.succession = (n) => {
    const st = S.state;
    const cands = G.nationOfficers(n);
    if (!cands.length) { st.nations[n].ruler = null; return; }
    const pick = cands.sort((a, b) => {
      const ra = ['king', 'queen'].includes(S.officerById[a].role) ? 60 : 0, rb = ['king', 'queen'].includes(S.officerById[b].role) ? 60 : 0;
      return rb + st.officers[b].s[0] + st.officers[b].s[3] - (ra + st.officers[a].s[0] + st.officers[a].s[3]);
    })[0];
    st.nations[n].ruler = pick;
    G.log(`${S.nationName(n)}의 새 군주: ${S.officerById[pick].name}`, 'great');
  };
  G.handlePrisoner = (pid, captor, action) => {
    const st = S.state, so = st.officers[pid];
    if (action === 'hire') {
      const p = U.clamp((100 - so.loyalty) / 110 + 0.12, 0.05, 0.9);
      if (Math.random() < p) { so.status = 'active'; so.nation = captor; so.loyalty = U.ri(55, 80); so.captor = null; return true; }
      return false;
    }
    if (action === 'release') {
      const home = G.capitalOf(so.nation);
      if (home && st.nations[so.nation].alive) { so.status = 'active'; so.city = home; } else so.status = 'free';
      so.captor = null;
      const r = G.getRel(captor, so.nation); G.setRel(captor, so.nation, r.status, r.val + 5, r.until);
      return true;
    }
    if (action === 'execute') { G.killOfficer(pid, '처형됨'); return true; }
  };
  G.killOfficer = (id, reason) => {
    const so = S.state.officers[id];
    if (!so || so.status === 'dead') return;
    const was = so.status;
    so.status = 'dead'; so.deathNote = reason;
    if (was === 'active') G.log(`${S.officerById[id].name} 사망 — ${reason}`, 'death');
    for (const n in S.state.nations) if (S.state.nations[n].ruler === id) G.succession(n);
  };

  /* ───────── 턴 진행 ───────── */
  G.income = () => {
    const st = S.state;
    const autumn = st.season === 2;
    const rep = {};
    for (const n in st.nations) rep[n] = { gold: 0, food: 0, iron: 0, wood: 0, upkeep: 0 };
    for (const cid in st.cities) {
      const cs = st.cities[cid], n = cs.owner;
      if (n === 'neutral') continue;
      const c = S.cityById[cid];
      const nb = S.NATIONS[n].bonus || {};
      const of = cs.order / 100;
      const sp = S.SPECIALS[c.special];
      let gold = cs.comm * 0.18 * of * (1 + G.bldEff(cs, 'gold') + (nb.comm || 0)) + cs.pop / 5000;
      if (sp && cs.specialMode === 'trade') gold += sp.trade * 0.6 * (1 + G.bldEff(cs, 'trade')) * (c.port ? 1.25 : 1) * of;
      let foodMul = 1 + G.bldEff(cs, 'food') + (sp && cs.specialMode === 'tech' && sp.tech === 'food' ? 0.18 : 0);
      let food = cs.agri * (autumn ? 3.6 : 0.5) * of * foodMul;
      let iron = 4 + G.bldEff(cs, 'iron') + cs.tech / 60 + (sp && cs.specialMode === 'tech' && sp.tech === 'iron' ? 60 : 0);
      let wood = 12 + G.bldEff(cs, 'wood') + (c.type === 'mountain' ? 12 : 0);
      const up = G.troopsTotal(cs) * 0.02;
      rep[n].gold += gold; rep[n].food += food; rep[n].iron += iron; rep[n].wood += wood; rep[n].upkeep += up;
      /* 성장 */
      cs.pop = Math.round(Math.min(G.popCap(cid), cs.pop * (1 + (0.004 + G.bldEff(cs, 'popG')) * of)));
      const ordDelta = G.bldEff(cs, 'order') + G.wonderEff(n, 'order') * 0.5 + (cs.order < 55 ? 1 : cs.order > 80 ? -0.6 : 0) + (st.season === 3 && sp && cs.specialMode === 'tech' && sp.name === '담비가죽' ? 1 : 0);
      cs.order = U.clamp(cs.order + ordDelta, 0, 100);
      cs.train = Math.min(100, cs.train + G.bldEff(cs, 'train'));
      if (cs.wall < G.wallMax(cid)) cs.wall = Math.min(G.wallMax(cid), cs.wall + 4);
    }
    /* 총동원령(역전 장치): 도시 5곳 이하로 몰린 삼국은 수도에서 매 계절 비상 징병 */
    for (const n of ['goguryeo', 'baekje', 'silla']) {
      if (!st.nations[n] || !st.nations[n].alive) continue;
      const cs = G.citiesOf(n);
      if (cs.length > 5) continue;
      const cap = G.capitalOf(n);
      if (!cap) continue;
      const k = (6 - cs.length) * 1200;
      const t = st.cities[cap].troops;
      t.spear = (t.spear || 0) + k; t.bow = (t.bow || 0) + Math.round(k * 0.6);
      rep[n].food += 400;
      if (n === st.player) G.log(`총동원령! 수도에 의용병 ${U.fmt(k * 1.6)}명이 모였다.`, 'warn');
    }
    /* 지도 밖 세력의 압박(시나리오 설정): 매 계절 병력 감소 */
    const OFF = (S.scenarioById[st.scenario] || {}).offmap || {};
    for (const n in OFF) if (st.nations[n] && st.nations[n].alive && OFF[n].drain) for (const c of G.citiesOf(n)) { const t = st.cities[c].troops; for (const k in t) t[k] = Math.round(t[k] * (1 - OFF[n].drain)); }
    /* 수·당: 지도 밖 중원 본토의 보급 (대운하·관중) */
    for (const n of ['sui', 'tang']) if (st.nations[n] && st.nations[n].alive) { rep[n].gold += 450; rep[n].food += 1600; rep[n].iron += 80; rep[n].wood += 100; }
    for (const n in rep) {
      if (!st.nations[n].alive) continue;
      const N = st.nations[n], r = rep[n];
      if (n !== st.player) { const m = G.diff().aiIncome; r.gold *= m; r.food *= m; }
      N.gold += Math.round(r.gold); N.food += Math.round(r.food - r.upkeep); N.iron += Math.round(r.iron); N.wood += Math.round(r.wood);
      if (N.food < 0) {
        /* 군량 부족: 탈영 */
        N.food = 0;
        for (const c of G.citiesOf(n)) { const cs = st.cities[c]; for (const k in cs.troops) cs.troops[k] = Math.round(cs.troops[k] * 0.92); cs.order = Math.max(0, cs.order - 5); }
        if (n === st.player) G.log('군량이 바닥나 병사들이 탈영하고 있습니다! (병력 -8%)', 'warn');
      }
    }
    return rep[st.player];
  };
  G.lifeCycle = () => {
    const st = S.state;
    const ys = T(st.year, st.season);
    for (const id in st.officers) {
      const so = st.officers[id], o = S.officerById[id];
      if (so.status === 'future' && so.spawnY && st.year >= so.spawnY) {
        const n = so.nation;
        if (!st.nations[n] || !st.nations[n].alive) { so.status = 'none'; continue; }
        let city = so.spawnCity && st.cities[so.spawnCity].owner === n ? so.spawnCity : G.capitalOf(n);
        if (!city) { so.status = 'none'; continue; }
        so.status = 'active'; so.city = city;
        G.log(`${S.nationName(n)}에 ${o.name}이(가) 등장했다. (${S.cityById[city].name})`, 'info');
      }
      /* 이벤트로 최후를 맞는 인물은 이벤트가 비켜가면 가상 역사로 15년 더 산다 */
      const dY = o.d ? (EV_DEATH.includes(id) ? o.d + 15 : o.d) : null;
      if (S.settings.historicalDeath && dY && ['active', 'free', 'prisoner'].includes(so.status) && (st.year > dY || (st.year === dY && st.season === 3))) G.killOfficer(id, '천수를 다함');
    }
    /* 휴전 만료 */
    for (const k in st.rel) { const r = st.rel[k]; if (r.until && ys >= r.until) { if (r.status === 'truce') { r.status = 'war'; const [a, b] = k.split('|'); G.log(`${S.nationName(a)}·${S.nationName(b)} 휴전 만료 — 전쟁 재개`, 'diplo'); } r.until = null; } }
    /* 일시 효과 감소 */
    for (const n in st.nations) { const N = st.nations[n]; if (N.morale.t > 0 && --N.morale.t === 0) N.morale.v = 0; if (N.atk.t > 0 && --N.atk.t === 0) N.atk.v = 0; }
  };
  G.advance = () => {
    const st = S.state;
    st.season++;
    if (st.season > 3) { st.season = 0; st.year++; }
    st.turnCount++;
    for (const id in st.officers) { st.officers[id].done = false; st.officers[id].uses = 0; }
    /* 도시 행동력 회복: 남은 행동력은 1까지 이월 */
    G.refreshCityAp(true);
  };

  /* ───────── AI ───────── */
  G.aiTurn = (n) => {
    const st = S.state, N = st.nations[n];
    if (!N.alive || n === st.player) return [];
    const myCities = G.citiesOf(n);
    const attacks = [];
    const offA = (((S.scenarioById[st.scenario] || {}).offmap || {})[n] || {}).aggr || 1;
    const aggressive = (n === 'sui' || n === 'tang' ? 1.05 : S.NATIONS[n].major ? 1.3 : 1.8) * G.diff().aggr * offA;
    /* 내정: 도시마다 자기 행동력 안에서 처리. 적과 맞닿은 도시는 출진용 2점을 남겨 둔다 */
    const best = (cid, si) => G.officersIn(cid).filter((id) => !st.officers[id].done).sort((x, y) => (st.officers[x].uses || 0) - (st.officers[y].uses || 0) || st.officers[y].s[si] - st.officers[x].s[si])[0];
    const cityAction = (cid, reserve) => {
      const cs = st.cities[cid];
      const free = () => (cs.ap || 0) - reserve;
      const border = G.isBorder(cid);
      const tt = G.troopsTotal(cs);
      const threat = border ? Math.max(...S.ADJ[cid].map((e) => (G.atWar(n, st.cities[e.to].owner) ? G.troopsTotal(st.cities[e.to]) : 0))) : 0;
      const tryRecruit = (list) => { const oid = best(cid, 0); if (!oid) return false; for (const u of list) { const before = cs.ap; G.doRecruit(oid, u); if (cs.ap < before) return true; } return false; };
      if (border && tt < threat * 0.9 && N.gold > 300 && free() >= 2) {
        const opts = S.UNIT_ORDER.filter((u) => !G.unitReqOk(u, cid, n) && u !== 'siege' && u !== 'navy');
        if (tryRecruit(opts.filter((u) => S.UNITS[u].nation).concat(opts))) return true;
      }
      if (border && N.gold > 1800 && tt < 30000 && free() >= 2 && tryRecruit(U.shuffle(S.UNIT_ORDER.filter((u) => !G.unitReqOk(u, cid, n) && u !== 'navy')))) return true;
      const doCmd = (cmd, si) => { if (free() < 1) return false; const oid = best(cid, si); if (!oid) return false; const before = cs.ap; G.doCommand(oid, cmd); return cs.ap < before; };
      if (border && cs.wall < G.wallMax(cid) * 0.7 && N.wood > 200 && doCmd('wall', 0)) return true;
      if (N.gold > 700 && free() >= 2) {
        const oid = best(cid, 3);
        if (oid && cs.buildings.length < S.CITY_TYPES[S.cityById[cid].type].slots) {
          const pri = ['field', 'market', 'housing', 'office', 'barracks', 'mine', 'stable', 'chi', 'workshop', 'temple', 'shipyard'];
          const bid = pri.find((x) => !S.canBuild(x, S.cityById[cid], cs, n));
          if (bid) { const before = cs.ap; G.doBuild(oid, bid); if (cs.ap < before) return true; }
        } else if (oid && N.gold > 1500) {
          const up = ['office', 'field', 'market', 'housing', 'barracks', 'chi', 'mine'].find((x) => cs.buildings.includes(x) && !S.canUpgrade(x, cs) && G.canPay(n, S.upgradeCost(x, S.bldLevel(cs, x))));
          if (up) { const before = cs.ap; G.doUpgrade(oid, up); if (cs.ap < before) return true; }
        }
      }
      if (cs.order < 50 && doCmd('order', 3)) return true;
      if (tt < 4000 && N.gold > 200 && free() >= 2 && tryRecruit(['spear', 'bow', 'cav'].filter((u) => !G.unitReqOk(u, cid, n)))) return true;
      const pick = U.pick(['agri', 'comm', 'comm', 'tech', 'train']);
      return doCmd(pick, pick === 'tech' ? 2 : pick === 'train' ? 0 : 3);
    };
    for (const cid of myCities) {
      const reserve = G.isBorder(cid) ? G.AP_COST.attack : 0;
      let guard = 0;
      while ((st.cities[cid].ap || 0) > reserve && guard++ < 10) { if (!cityAction(cid, reserve)) break; }
    }
    /* 내지 → 전선 병력 이동: 전선까지의 거리(BFS)를 구해 한 칸씩 전선 쪽으로 옮긴다 (요동처럼 먼 후방의 병력도 내려온다) */
    const OFFM = ((S.scenarioById[st.scenario] || {}).offmap || {})[n] || {};
    const dist = {};
    const q = myCities.filter((c) => G.isBorder(c));
    q.forEach((c) => (dist[c] = 0));
    for (let i = 0; i < q.length; i++) for (const e of S.ADJ[q[i]]) if (st.cities[e.to].owner === n && dist[e.to] == null) { dist[e.to] = dist[q[i]] + 1; q.push(e.to); }
    for (const cid of myCities.slice().sort((a, b) => (dist[b] || 0) - (dist[a] || 0))) {
      const cs = st.cities[cid];
      if (!dist[cid]) continue; /* 전선 도시이거나 고립된 도시 */
      const west = OFFM.holdWest && G.WEST_FRONT.includes(cid); /* 지도 밖 수·당에 맞서 요동은 수비대 8천 이상 유지, 한 계절 최대 30%만 남하 */
      const tt = G.troopsTotal(cs);
      const light = OFFM.holdWest === 'light';
      const keep = west ? (light ? 3000 : 8000) : S.cityById[cid].type === 'capital' ? 9000 : 4000;
      if (tt < keep + 2000) continue;
      const nb = S.ADJ[cid].map((e) => e.to).filter((c) => st.cities[c].owner === n && dist[c] != null && dist[c] < dist[cid]);
      if (!nb.length) continue;
      const to = nb.sort((a, b) => G.troopsTotal(st.cities[a]) - G.troopsTotal(st.cities[b]))[0];
      const ratio = Math.min(west ? (light ? 0.45 : 0.3) : 0.6, (tt - keep) / tt);
      for (const k in cs.troops) { const v = Math.floor(cs.troops[k] * ratio); cs.troops[k] -= v; st.cities[to].troops[k] = (st.cities[to].troops[k] || 0) + v; }
      const movers = G.officersIn(cid).filter((id) => st.officers[id].nation === n && id !== N.ruler);
      if (movers.length > 1) st.officers[movers[movers.length - 1]].city = to;
    }
    /* 공격 결정 */
    let maxAtt = (S.NATIONS[n].major ? 2 : 1) + G.diff().aiAtt;
    for (const cid of U.shuffle(myCities)) {
      if (maxAtt <= 0) break;
      const cs = st.cities[cid];
      const offs = G.officersIn(cid).filter((id) => !st.officers[id].done || true);
      const tt = G.troopsTotal(cs);
      if (tt < 5000 || !offs.length) continue;
      const fav = st.focus || st.player; /* 난이도 기준이 되는 나라(플레이어, 시뮬레이션에서는 주인공) */
      const D = G.diff();
      let tgts = U.shuffle(G.attackTargets(cid));
      if (D.vsPlayer < 1) tgts.sort((a, b) => (st.cities[b.to].owner === fav ? 1 : 0) - (st.cities[a.to].owner === fav ? 1 : 0));
      for (const e of tgts) {
        const ts = st.cities[e.to];
        if (!G.atWar(n, ts.owner)) continue;
        if (ts.owner === 'neutral' && Math.random() < 0.6) continue;
        const defPow = G.troopsTotal(ts) * (1 + ts.wall / 1500) * (1 + S.CITY_TYPES[S.cityById[e.to].type].defBonus * 0.6) + 800;
        const myPow = tt * 0.75 * (1 + (N.morale.v || 0) / 100);
        const food = G.expeditionFood(tt * 0.75, e.type, n, cid);
        if (myPow > defPow * aggressive * (ts.owner === fav ? D.vsPlayer : 1) && N.food > food) {
          if ((cs.ap || 0) < G.AP_COST.attack) continue;
          const army = G.aiArmy(cid, 0.75);
          if (!army.length) continue;
          cs.ap -= G.AP_COST.attack;
          N.food -= food;
          attacks.push({ from: cid, to: e.to, att: army, attNation: n, edgeType: e.type });
          maxAtt--;
          break;
        }
      }
    }
    /* 외교 AI: 열세 시 휴전 시도 */
    for (const m in st.nations) {
      if (m === n || !st.nations[m].alive || m === 'neutral') continue;
      const r = G.getRel(n, m);
      if (r.status === 'peace' && r.val < 18 && G.nationTroopTotal(n) > G.nationTroopTotal(m) * 1.6 && Math.random() < 0.08 && m !== st.player) { G.declareWar(n, m); G.log(`${S.nationName(n)}이(가) ${S.nationName(m)}에 선전포고`, 'diplo'); }
      if (r.status === 'peace' && r.val < 15 && m === st.player && Math.random() < 0.05 && G.nationTroopTotal(n) > G.nationTroopTotal(m) * 1.3) { G.declareWar(n, m); G.log(`${S.nationName(n)}이(가) 우리에게 선전포고했다!`, 'warn'); }
      if (r.status === 'war' && m !== st.player && G.nationTroopTotal(n) < G.nationTroopTotal(m) * 0.5 && Math.random() < 0.06) { G.setRel(n, m, 'truce', r.val + 10, T(st.year, st.season) + 6); G.log(`${S.nationName(n)}·${S.nationName(m)} 휴전`, 'diplo'); }
    }
    return attacks;
  };
  /* AI 출진 편성: 상위 장수 3명 + 병종 상위 3개 */
  G.aiArmy = (cid, ratio) => {
    const st = S.state, cs = st.cities[cid];
    const offs = G.officersIn(cid).sort((a, b) => st.officers[b].s[0] + st.officers[b].s[1] - st.officers[a].s[0] - st.officers[a].s[1]).slice(0, 3);
    const groups = Object.entries(cs.troops).filter(([, v]) => v >= 500).sort((a, b) => b[1] - a[1]);
    const army = [];
    offs.forEach((oid, i) => {
      const pref = S.officerById[oid].u;
      let g = groups.find(([u]) => u === pref && !army.some((a) => a.uid === u)) || groups.find(([u]) => !army.some((a) => a.uid === u)) || groups[i % Math.max(1, groups.length)];
      if (!g) return;
      const uid = g[0];
      const amt = Math.floor((cs.troops[uid] * ratio) / 100) * 100;
      if (amt < 300) return;
      cs.troops[uid] -= amt;
      army.push({ oid, uid, troops: amt });
    });
    return army;
  };

  /* ───────── 승리 판정 ───────── */
  G.goalStatus = (n) => {
    const st = S.state, sc = S.scenarioById[st.scenario];
    const goals = (sc.goals && sc.goals[n]) || [{ type: 'count', n: 20, desc: '도시 20개 이상 확보' }];
    return goals.map((g) => {
      let ok = false, prog = '';
      if (g.type === 'capture') { const have = g.cities.filter((c) => st.cities[c].owner === n).length; ok = have === g.cities.length; prog = `${have}/${g.cities.length}`; }
      if (g.type === 'count') { const have = G.citiesOf(n).length; ok = have >= g.n; prog = `${have}/${g.n}`; }
      if (g.type === 'hold') { const held = g.cities.every((c) => st.cities[c].owner === n); ok = held && (st.year > g.until); prog = held ? `사수 중 (${g.until}년까지)` : '함락됨'; g.failed = !held; }
      if (g.type === 'destroy') { ok = !st.nations[g.nation].alive; prog = ok ? '멸망' : '존속'; }
      return { desc: g.desc, ok, prog, failed: g.type === 'hold' && !g.cities.every((c) => st.cities[c].owner === n) };
    });
  };
  G.checkEnd = () => {
    const st = S.state, sc = S.scenarioById[st.scenario], n = st.player;
    if (!st.nations[n].alive) return { end: true, win: false, msg: `${S.nationName(n)}은(는) 역사 속으로 사라졌다.` };
    const gs = G.goalStatus(n);
    if (gs.every((g) => g.ok)) return { end: true, win: true, msg: '시나리오 목표를 달성했다!' };
    const majors = ['goguryeo', 'baekje', 'silla'].filter((m) => m !== n);
    if (majors.every((m) => !st.nations[m].alive || st.cities[G.capitalOf(m) || 'x'] === undefined)) return { end: true, win: true, msg: '삼한일통! 삼국을 하나로 통일했다.' };
    if (st.year > sc.endYear) return { end: true, win: false, timeout: true, msg: `${sc.endYear}년이 지났다. 시나리오 종료.` };
    return { end: false };
  };
  G.score = () => {
    const st = S.state, n = st.player;
    const cities = G.citiesOf(n).length;
    const troops = G.nationTroopTotal(n);
    return Math.round(cities * 1000 + troops / 20 + st.nations[n].gold / 5 + G.nationOfficers(n).length * 150);
  };

  /* ───────── 이벤트 API ───────── */
  const E = {
    alive: (id, n) => { const so = S.state.officers[id]; return !!so && so.status === 'active' && (!n || so.nation === n); },
    isDead: (id) => { const so = S.state.officers[id]; return !!so && so.status === 'dead'; },
    atWar: (a, b) => G.atWar(a, b) && S.state.nations[a].alive && S.state.nations[b].alive,
    allied: (a, b) => G.isAlly(a, b),
    owner: (c) => S.state.cities[c].owner,
    exists: (n) => !!S.state.nations[n] && S.state.nations[n].alive,
    fired: (id) => !!S.state.fired[id],
    freeAt: (id, c) => { const so = S.state.officers[id]; return !!so && so.status === 'free' && so.city === c; },
    flag: (k, v) => { S.state.flags[k] = v; },
    flagv: (k) => S.state.flags[k],
    morale: (n, v, t) => { const N = S.state.nations[n]; if (!N) return; N.morale.v = U.clamp((N.morale.v || 0) + v, -50, 50); N.morale.t = Math.max(N.morale.t, t); },
    buffAtk: (n, v, t) => { const N = S.state.nations[n]; N.atk.v = v; N.atk.t = t; },
    addTroops: (c, type, n) => { const cs = S.state.cities[c]; cs.troops[type] = Math.max(0, (cs.troops[type] || 0) + n); },
    nationTroops: (n, pct) => { for (const c of G.citiesOf(n)) { const cs = S.state.cities[c]; for (const k in cs.troops) cs.troops[k] = Math.round(cs.troops[k] * (1 + pct)); } },
    cityTroops: (c, pct) => { const cs = S.state.cities[c]; for (const k in cs.troops) cs.troops[k] = Math.round(cs.troops[k] * (1 + pct)); },
    addRes: (n, o) => { const N = S.state.nations[n]; for (const k in o) N[k] = Math.max(0, N[k] + o[k]); },
    city: (c, o) => { const cs = S.state.cities[c]; for (const k in o) { if (k === 'wall') cs.wall = U.clamp(cs.wall + o[k], 0, G.wallMax(c)); else if (k === 'order') cs.order = U.clamp(cs.order + o[k], 0, 100); else cs[k] = Math.max(0, cs[k] + o[k]); } },
    cityAll: (n, o) => { for (const c of G.citiesOf(n)) E.city(c, o); },
    rel: (a, b, d) => { const r = G.getRel(a, b); G.setRel(a, b, r.status, r.val + d, r.until); },
    truce: (a, b, turns) => { const r = G.getRel(a, b); G.setRel(a, b, 'truce', r.val + 10, T(S.state.year, S.state.season) + turns); },
    war: (a, b) => G.declareWar(a, b),
    ally: (a, b) => { const r = G.getRel(a, b); G.setRel(a, b, 'ally', Math.max(r.val, 75)); G.log(`${S.nationName(a)}·${S.nationName(b)} 동맹`, 'diplo'); },
    stat: (id, k, d) => { const so = S.state.officers[id]; if (so) so.s[STAT_IDX[k]] = U.clamp(so.s[STAT_IDX[k]] + d, 1, 100); },
    loyal: (id, v) => { const so = S.state.officers[id]; if (so) so.loyalty = v; },
    recruit: (id, n, c) => { const so = S.state.officers[id]; so.status = 'active'; so.nation = n; so.city = c; so.loyalty = 85; G.log(`${S.officerById[id].name} 등용`, 'info'); },
    kill: (id, reason) => G.killOfficer(id, reason),
    setOwner: (c, n) => { const old = S.state.cities[c].owner; S.state.cities[c].owner = n; for (const oid of Object.keys(S.state.officers)) { const so = S.state.officers[oid]; if (so.city === c && so.status === 'active' && so.nation === old) { const esc = S.ADJ[c].map((e) => e.to).find((x) => S.state.cities[x].owner === old); if (esc) so.city = esc; else so.status = 'prisoner'; } } if (!S.state.everOwned[c]) S.state.everOwned[c] = []; S.state.everOwned[c].push(n); G.checkAlive(old); },
    setRuler: (n, id) => { S.state.nations[n].ruler = id; G.log(`${S.nationName(n)}의 새 군주: ${S.officerById[id].name}`, 'great'); },
    hasBuilding: (c, b) => S.state.cities[c].buildings.includes(b),
    addBuilding: (c, b) => { const cs = S.state.cities[c]; if (!cs.buildings.includes(b)) { if (cs.buildings.length >= S.CITY_TYPES[S.cityById[c].type].slots) cs.buildings.shift(); cs.buildings.push(b); } },
    nearEnemy: (c, n) => S.ADJ[c].some((e) => S.state.cities[e.to].owner === n),
    wallLine: (v) => { ['cheolli', 'sinseong', 'gaemo', 'yodong', 'baegam', 'ansi', 'geonan', 'bisa', 'buyeo'].forEach((c) => { if (S.state.cities[c].owner === 'goguryeo') S.state.cities[c].wall = Math.min(G.wallMax(c), S.state.cities[c].wall + v); }); },
    moveOfficer: (id, c) => { S.state.officers[id].city = c; },
    spawn: (id, c, n) => { const so = S.state.officers[id]; if (!so || so.status === 'dead' || so.status === 'active') return; if (S.state.cities[c].owner !== n) c = G.capitalOf(n); if (!c) return; so.status = 'active'; so.nation = n; so.city = c; G.log(`${S.officerById[id].name}이(가) ${S.cityById[c].name}에 도착했다.`, 'info'); },
    wasOwner: (c, n) => (S.state.everOwned[c] || []).includes(n),
    defectCity: (c, n, offs) => { const old = S.state.cities[c].owner; S.state.cities[c].owner = n; (offs || []).forEach((id) => { const so = S.state.officers[id]; if (so) { so.nation = n; so.city = c; so.status = 'active'; } }); G.log(`${S.cityById[c].name}이(가) ${S.nationName(n)}에 투항했다.`, 'war'); G.checkAlive(old); },
    mergeNation: (from, to, city) => { for (const c of G.citiesOf(from)) S.state.cities[c].owner = to; for (const id of G.nationOfficers(from)) { S.state.officers[id].nation = to; S.state.officers[id].city = city && S.state.cities[city].owner === to ? city : G.capitalOf(to); } G.checkAlive(from); G.log(`${S.nationName(from)}이(가) ${S.nationName(to)}에 합류했다.`, 'great'); },
    transformNation: (from, to, spawns) => {
      const st = S.state;
      for (const c of G.citiesOf(from)) st.cities[c].owner = to;
      st.nations[to].alive = true;
      for (const k of ['gold', 'food', 'iron', 'wood']) st.nations[to][k] += Math.round(st.nations[from][k] * 0.5);
      for (const id of G.nationOfficers(from)) { const so = st.officers[id]; if (['yangje', 'umunhwageup'].includes(id)) G.killOfficer(id, '수 멸망'); else so.status = 'free'; }
      for (const m in st.nations) if (m !== from && m !== to) { const r = G.getRel(from, m); G.setRel(to, m, r.status === 'war' ? 'peace' : r.status, 50); }
      if (st.player === from) st.player = to;
      const cap = G.capitalOf(to);
      for (const id of spawns) { const so = st.officers[id]; if (so && so.status !== 'dead') { so.status = 'active'; so.nation = to; so.city = cap; } }
      st.nations[from].alive = false;
      const tz = spawns.find((id) => st.officers[id] && st.officers[id].status === 'active');
      st.nations[to].ruler = tz || null;
      G.log('수가 멸망하고 당이 건국되었다.', 'great');
    },
    news: (t) => G.log(t, 'event'),
  };
  G.E = E;
  G.pendingEvents = () => {
    const st = S.state, now = T(st.year, st.season);
    const out = [];
    for (const ev of S.EVENTS) {
      if (st.fired[ev.id]) continue;
      const start = T(ev.when.y, ev.when.s == null ? 0 : ev.when.s);
      const end = T(ev.when.to == null ? ev.when.y : ev.when.to, 3);
      if (now < start || now > end) continue;
      let ok = false;
      try { ok = ev.cond(E); } catch (e) { console.warn('event cond', ev.id, e); }
      if (ok) out.push(ev);
    }
    return out;
  };
  G.eventChoices = (ev) => {
    const pn = S.nationName(S.state.player);
    const tagged = ev.choices.filter((c) => /^\(.+?\)/.test(c.label));
    if (!tagged.length) return ev.choices;
    return ev.choices.filter((c) => c.label.startsWith(`(${pn})`) || (S.state.player === 'goguryeo' && c.label.startsWith('(고구려')) || (c.label.startsWith('(백제·왜)') && ['baekje', 'wa'].includes(S.state.player)));
  };
  G.eventInvolvesPlayer = (ev) => ev.who.includes('all') || ev.who.includes(S.state.player);
  G.fireEvent = (ev, choice) => {
    S.state.fired[ev.id] = true;
    try { choice.fn(E); } catch (e) { console.error('event fn', ev.id, e); }
    G.log(`[${ev.kind === 'legend' ? '설화' : '역사'}] ${ev.title}`, 'event');
  };

  /* ───────── 저장 ───────── */
  G.save = (slot = 1) => { S.store.set(`samgukgi_save_${slot}`, JSON.stringify(S.state)); S.store.set(`samgukgi_meta_${slot}`, JSON.stringify({ t: Date.now(), d: U.dateStr(S.state.year, S.state.season), n: S.nationName(S.state.player), sc: S.scenarioById[S.state.scenario].title })); };
  G.load = (slot = 1) => { const s = S.store.get(`samgukgi_save_${slot}`); if (!s) return false; try { S.state = JSON.parse(s); } catch (e) { return false; } if (!S.state.scenario || !S.scenarioById[S.state.scenario]) return false; S.rebuildAdj(S.state.inactive || {}); for (const c in S.state.cities) S.state.cities[c].buildings = S.state.cities[c].buildings.filter((b) => S.BUILDINGS[b]); for (const c in S.state.cities) { const cs = S.state.cities[c]; if (!cs.blv) cs.blv = {}; if (cs.ap == null) cs.ap = G.cityApMax(c); } return true; };
  G.saveMeta = (slot) => { try { return JSON.parse(S.store.get(`samgukgi_meta_${slot}`)); } catch (e) { return null; } };

  S.G = G;
})(window.SGK);
