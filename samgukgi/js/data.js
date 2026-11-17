/* 삼국기(三國記) — 게임 데이터 (v0.2)
 * 인물 명단은 js/roster/<진영>.js 에 있고, 여기서는 규칙표(등급·병종·계략 유형)를 정의한다.
 * 브라우저(전역 SGData)와 Node(require) 양쪽에서 동작. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(true);
  else root.SGData = factory(false);
})(typeof self !== 'undefined' ? self : this, function (isNode) {
  'use strict';

  // ── 등급표: 같은 등급이면 누구든 같은 수치. 모든 인물은 S 1개 · A 2개 · B 1개 ──
  const GRADES = {
    S: { value: 95, pt: 4 }, A: { value: 85, pt: 3 }, B: { value: 70, pt: 2 },
    C: { value: 55, pt: 1 }, D: { value: 40, pt: 0 },
  };

  const STATS = {
    lead: { name: '통솔', short: '통', desc: '병력(체력), 일반 공격 피해 감소, 호령·철벽 계열 계략의 위력.' },
    war:  { name: '무력', short: '무', desc: '일반 공격 피해, 맹공·돌파 계열 계략의 위력.' },
    int:  { name: '지력', short: '지', desc: '수공·화계·매복 계열 계략과 화공의 위력, 적 계략 저항, 간파(지력이 낮은 적의 공격 피해 감소).' },
    pol:  { name: '정치', short: '정', desc: '구휼·원군·개혁 계열 계략의 위력, 출전 시 사기 상승, 보급(매 턴 병력 회복: S 3% · A 1.5%).' },
  };
  const STAT_KEYS = ['lead', 'war', 'int', 'pol'];

  // ── 병종: 상성 + 고유 특성(상시) + 전법(군령 1을 써서 발동) ──
  const UNITS = {
    cav: { name: '기병', hanja: '騎', beats: 'arc', order: 1,
           trait: '기동 — 배치한 턴에 바로 공격(그 턴은 위력 70%). 본진 공격 피해 +25%.',
           tactic: { key: 'charge', name: '돌격', desc: '이번 턴 공격 피해 +50%. 적을 격파하면 남은 피해가 본진까지 꿰뚫는다.' } },
    spr: { name: '창병', hanja: '槍', beats: 'cav', order: 2,
           trait: '장창 — 받는 피해 20% 감소. 기병에게 맞으면 피해의 45%를 되돌려 준다.',
           tactic: { key: 'guard', name: '방진', desc: '이번 턴 받는 피해 절반. 근접 공격을 받으면 병종과 무관하게 30% 반격.' } },
    arc: { name: '궁병', hanja: '弓', beats: 'spr', order: 0,
           trait: '선제 사격 — 매 턴 가장 먼저 공격한다.',
           tactic: { key: 'fire', name: '화공', desc: '맞은편 적에게 2턴 동안 화상(지력 비례, 방어 무시). 화상 중인 적은 공격 피해 -15%.' } },
  };

  const NATIONS = {
    goguryeo: { name: '고구려', hanja: '高句麗', color: '#8b1a1a', color2: '#e0b04c' },
    baekje:   { name: '백제',   hanja: '百濟',   color: '#1e3a8a', color2: '#d9c27a' },
    silla:    { name: '신라',   hanja: '新羅',   color: '#9a6b08', color2: '#f3dc8b' },
    sui:      { name: '수',     hanja: '隋',     color: '#5b21b6', color2: '#d6c08a' },
    tang:     { name: '당',     hanja: '唐',     color: '#0f6a63', color2: '#e8cf8f' },
    turk:     { name: '돌궐',   hanja: '突厥',   color: '#4d5d23', color2: '#d2c08a' },
    wa:       { name: '왜',     hanja: '倭',     color: '#475569', color2: '#e58b8b' },
  };

  // ── 계략 유형: 같은 유형이면 효과가 같고(능력치 등급으로만 위력 차이), 이름과 사료 근거만 인물마다 다르다 ──
  // scale = 위력을 정하는 능력치, vis = 연출 종류
  const ARCH = {
    // 무력 계열
    strike:    { label: '맹공', scale: 'war',  cd: 3, vis: 'slash',  desc: '맞은편 적에게 큰 피해(비어 있으면 본진).', fx: [{ type: 'nuke_one', power: 285 }] },
    pierce:    { label: '돌파', scale: 'war',  cd: 3, vis: 'charge', desc: '맞은편 적에게 피해를 주고 본진까지 꿰뚫는다.', fx: [{ type: 'nuke_one', power: 170 }, { type: 'hq_dmg', power: 100 }] },
    fury:      { label: '분전', scale: 'war',  cd: 3, vis: 'rage',   desc: '자신의 공격 +66%(2턴), 병력 일부 회복.', fx: [{ type: 'self_atk', power: 66, turns: 2 }, { type: 'self_heal', power: 150 }] },
    laststand: { label: '결사', scale: 'war',  cd: 3, vis: 'rage',   desc: '아군 전체 공격 +50%(2턴), 사기 +10. 자신은 병력 5%를 잃는다.', fx: [{ type: 'buff_atk', power: 50, turns: 2 }, { type: 'morale', power: 10 }, { type: 'self_cost', power: 5 }] },
    volley:    { label: '난사', scale: 'war',  cd: 3, vis: 'arrows', desc: '적 전체에 화살 세례.', fx: [{ type: 'nuke_all', power: 150 }] },
    // 통솔 계열
    rally:     { label: '호령', scale: 'lead', cd: 3, vis: 'banner', desc: '아군 전체 공격 +45%(2턴).', fx: [{ type: 'buff_atk', power: 45, turns: 2 }] },
    wall:      { label: '철벽', scale: 'lead', cd: 3, vis: 'shield', desc: '아군 전체 받는 피해 -42%(2턴).', fx: [{ type: 'buff_def', power: 42, turns: 2 }] },
    // 지력 계열
    flood:     { label: '수공', scale: 'int',  cd: 3, vis: 'water',  desc: '적 전체에 계략 피해(통솔 방어 무시).', fx: [{ type: 'nuke_all', power: 215 }] },
    scheme:    { label: '기책', scale: 'int',  cd: 3, vis: 'thunder', desc: '적 전체에 계략 피해(통솔 방어 무시).', fx: [{ type: 'nuke_all', power: 215 }] },
    fire:      { label: '화계', scale: 'int',  cd: 3, vis: 'fire',   desc: '적 전체에 피해를 주고 2턴 동안 화상.', fx: [{ type: 'nuke_all', power: 85 }, { type: 'burn_all', power: 80, turns: 2 }] },
    ambush:    { label: '매복', scale: 'int',  cd: 3, vis: 'ambush', desc: '맞은편 적에게 계략 피해 + 혼란 1턴.', fx: [{ type: 'nuke_one', power: 310 }, { type: 'stun', bonus: 0 }] },
    discord:   { label: '이간', scale: 'int',  cd: 3, vis: 'swirl',  desc: '맞은편 적을 혼란에 빠뜨리고(성공률 높음) 계략 피해, 적 사기 -15.', fx: [{ type: 'stun', bonus: 0.2 }, { type: 'nuke_one', power: 255 }, { type: 'foe_morale', power: 15 }] },
    feint:     { label: '허실', scale: 'int',  cd: 3, vis: 'fog',    desc: '적 전체 공격 -52%(2턴).', fx: [{ type: 'debuff_atk', power: 52, turns: 2 }] },
    // 정치 계열
    relief:    { label: '구휼', scale: 'pol',  cd: 3, vis: 'heal',   desc: '아군 전체 병력 회복.', fx: [{ type: 'heal', power: 215 }] },
    inspire:   { label: '고무', scale: 'pol',  cd: 3, vis: 'banner', desc: '사기 +35, 아군 전체 공격 +52%(2턴).', fx: [{ type: 'morale', power: 35 }, { type: 'buff_atk', power: 52, turns: 2 }] },
    reinforce: { label: '원군', scale: 'pol',  cd: 3, vis: 'heal',   desc: '아군 전체 병력 회복 + 본진 수리.', fx: [{ type: 'heal', power: 150 }, { type: 'hq_repair', power: 190 }] },
    build:     { label: '축성', scale: 'pol',  cd: 3, vis: 'hammer', desc: '본진 대폭 수리, 아군 받는 피해 -36%(2턴).', fx: [{ type: 'hq_repair', power: 330 }, { type: 'buff_def', power: 36, turns: 2 }] },
    reform:    { label: '개혁', scale: 'pol',  cd: 3, vis: 'scroll', desc: '군령 +2, 사기 +20, 아군 전체 병력 소폭 회복.', fx: [{ type: 'cmd', power: 2 }, { type: 'morale', power: 20 }, { type: 'heal', power: 200 }] },
  };

  const GENERALS = {};
  const ROSTER = {};   // nation → [id…]
  const ROLE = { g: 'general', k: 'king', q: 'woman', b: 'monk' };

  function addRoster(nation, rows) {
    ROSTER[nation] = [];
    rows.forEach((r) => {
      const [id, name, hanja, cls, unit, st, role, skillName, arch, src, why] = r;
      if (GENERALS[id]) throw new Error('중복 id: ' + id);
      if (st.split('').sort().join('') !== 'AABS') throw new Error(name + ': 능력치는 S1·A2·B1 이어야 함 → ' + st);
      if (!ARCH[arch]) throw new Error(name + ': 알 수 없는 계략 유형 ' + arch);
      if (!UNITS[unit]) throw new Error(name + ': 병종 오류');
      GENERALS[id] = {
        id, nation, name, hanja, cls, unit, role: ROLE[role] || 'general',
        stats: { lead: st[0], war: st[1], int: st[2], pol: st[3] },
        skill: { name: skillName, arch }, src, why,
      };
      ROSTER[nation].push(id);
    });
  }

  const SCENARIOS = [
    { id: 'gwansan', year: 554, name: '관산성 전투', sides: ['baekje', 'silla'], desc: '한강 유역을 빼앗긴 백제 성왕이 신라를 친다.' },
    { id: 'salsu', year: 612, name: '살수대첩', sides: ['goguryeo', 'sui'], lanes: 5, desc: '수의 별동대 30만이 평양으로 향한다.' },
    { id: 'anmun', year: 615, name: '안문의 포위', sides: ['turk', 'sui'], desc: '시필 카간의 기병이 순행 중인 수 양제를 에워싼다.' },
    { id: 'ansi', year: 645, name: '안시성 전투', sides: ['goguryeo', 'tang'], lanes: 5, desc: '당 태종의 친정군을 안시성이 막아선다.' },
    { id: 'hwangsan', year: 660, name: '황산벌 전투', sides: ['baekje', 'silla'], desc: '계백의 5천 결사대와 김유신의 5만 대군.' },
    { id: 'baekgang', year: 663, name: '백강 전투', sides: ['wa', 'tang'], lanes: 5, desc: '백제 부흥을 도우러 온 왜 수군과 당 수군의 결전.' },
    { id: 'maeso', year: 675, name: '매소성 전투', sides: ['silla', 'tang'], desc: '나당전쟁의 분수령.' },
  ];

  const api = { GRADES, STATS, STAT_KEYS, UNITS, NATIONS, ARCH, GENERALS, ROSTER, SCENARIOS, addRoster };
  if (isNode) Object.keys(NATIONS).forEach((n) => require('./roster/' + n + '.js')(api));
  return api;
});
