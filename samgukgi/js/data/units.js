/* 병종 정의
 * cls: 상성 판정용 기본 계열 (cav 기병 / spear 창병 / bow 궁병 / siege 공성 / navy 수군)
 * 상성: 창병 ▶ 기병 ▶ 궁병 ▶ 창병 (유리 ×1.35 / 불리 ×0.75)
 * cost: 1,000명당 비용 */
SGK.UNITS = {
  cav:   { id: 'cav', name: '기병', hanja: '騎', cls: 'cav', atk: 1.15, def: 0.95, mob: 3,
           cost: { gold: 180, food: 120, iron: 60, wood: 0 }, req: { bld: 'stable' }, nation: null,
           desc: '빠른 돌격. 궁병에 강하고 창병에 약하다.' },
  spear: { id: 'spear', name: '창병', hanja: '槍', cls: 'spear', atk: 1.0, def: 1.15, mob: 2,
           cost: { gold: 80, food: 100, iron: 40, wood: 20 }, req: null, nation: null,
           desc: '창벽으로 기병을 저지. 궁병에 약하다.' },
  bow:   { id: 'bow', name: '궁병', hanja: '弓', cls: 'bow', atk: 1.05, def: 0.85, mob: 2,
           cost: { gold: 100, food: 100, iron: 10, wood: 50 }, req: null, nation: null,
           desc: '원거리 일제사격. 창병에 강하고 기병에 약하다.' },
  siege: { id: 'siege', name: '공성병', hanja: '攻', cls: 'siege', atk: 0.8, def: 0.8, mob: 1,
           cost: { gold: 160, food: 100, iron: 40, wood: 160 }, req: { bld: 'workshop' }, nation: null,
           desc: '충차·운제·투석. 성벽 피해 ×3, 야전에 약하다. (공통 특수병과)' },
  navy:  { id: 'navy', name: '수군', hanja: '水', cls: 'navy', atk: 1.0, def: 1.0, mob: 2,
           cost: { gold: 150, food: 100, iron: 30, wood: 140 }, req: { bld: 'shipyard' }, nation: null,
           desc: '하천·바다 전투 ×1.4, 육지 ×0.8. (공통 특수병과)' },
  xbow:  { id: 'xbow', name: '노병', hanja: '弩', cls: 'bow', atk: 1.15, def: 0.9, mob: 1,
           cost: { gold: 140, food: 100, iron: 60, wood: 60 }, req: { bld: 'workshop', tech: 300 }, nation: null,
           desc: '쇠뇌. 방어 무시 관통 사격. (공통 특수병과 제안)' },

  /* 국가별 특수병과 */
  gaema: { id: 'gaema', name: '개마무사', hanja: '鎧馬', cls: 'cav', atk: 1.4, def: 1.35, mob: 2,
           cost: { gold: 320, food: 160, iron: 180, wood: 0 }, req: { bld: 'stable', tech: 250 }, nation: 'goguryeo',
           desc: '말과 사람 모두 찰갑을 두른 중장기병. 고분벽화(안악3호분·쌍영총)에 묘사.' },
  joui:  { id: 'joui', name: '조의선인', hanja: '皂衣', cls: 'spear', atk: 1.3, def: 1.2, mob: 2,
           cost: { gold: 200, food: 120, iron: 60, wood: 10 }, req: { bld: 'barracks' }, nation: 'goguryeo',
           desc: '검은 옷(皂衣)의 수련 무사단. 사기 저하 면역. ※조직 실체는 학계 논쟁 중.' },
  gyeolsa: { id: 'gyeolsa', name: '결사대', hanja: '決死', cls: 'spear', atk: 1.4, def: 1.0, mob: 2,
           cost: { gold: 160, food: 120, iron: 60, wood: 10 }, req: { bld: 'barracks' }, nation: 'baekje',
           desc: '계백의 5천 결사대에서 착안(게임 병종). 병력이 줄수록 공격력 상승.' },
  gangung: { id: 'gangung', name: '강궁대', hanja: '强弓', cls: 'bow', atk: 1.3, def: 0.9, mob: 2,
           cost: { gold: 170, food: 100, iron: 20, wood: 80 }, req: { bld: 'workshop' }, nation: 'baekje',
           desc: '백제 정예 장궁 부대(게임 창작 병종명). 일제사격 피해 +30%.' },
  hwarang: { id: 'hwarang', name: '화랑 기마대', hanja: '花郞', cls: 'cav', atk: 1.3, def: 1.05, mob: 3,
           cost: { gold: 240, food: 120, iron: 70, wood: 0 }, req: { bld: 'stable' }, nation: 'silla',
           desc: '세속오계로 단련된 화랑·낭도. 아군 사기 +10, 전투마다 경험치 2배.' },
  cheonbo: { id: 'cheonbo', name: '천보노대', hanja: '千步弩', cls: 'bow', atk: 1.35, def: 0.9, mob: 1,
           cost: { gold: 210, food: 100, iron: 80, wood: 70 }, req: { bld: 'workshop', tech: 350 }, nation: 'silla',
           desc: '노사(弩師) 구진천의 천보노(삼국사기 문무왕 9년). 관통 사격, 성벽 위에서 피해 +20%.' },
  bubyeong: { id: 'bubyeong', name: '부병 중보병', hanja: '府兵', cls: 'spear', atk: 1.2, def: 1.3, mob: 2,
           cost: { gold: 150, food: 120, iron: 70, wood: 10 }, req: null, nation: 'sui|tang',
           desc: '수·당의 부병제(府兵制) 정규 보병. 명광개 갑옷.' },
  pocha: { id: 'pocha', name: '포차대', hanja: '抛車', cls: 'siege', atk: 1.1, def: 0.85, mob: 1,
           cost: { gold: 220, food: 100, iron: 50, wood: 200 }, req: { bld: 'workshop' }, nation: 'sui|tang',
           desc: '645년 요동성 공격에 쓰인 투석기(포차). 성벽 피해 ×4.' },
  wanavy: { id: 'wanavy', name: '왜 수군', hanja: '倭船', cls: 'navy', atk: 1.05, def: 0.95, mob: 2,
           cost: { gold: 140, food: 100, iron: 20, wood: 120 }, req: null, nation: 'wa',
           desc: '663년 백강 전투에 파견된 왜의 원군 선단.' },
  mohecav: { id: 'mohecav', name: '말갈 기병', hanja: '靺鞨', cls: 'cav', atk: 1.25, def: 0.95, mob: 3,
           cost: { gold: 150, food: 100, iron: 30, wood: 0 }, req: null, nation: 'mohe|goguryeo',
           desc: '고구려와 연합한 말갈 부족 기병(645년 안시성 원군 15만에 말갈병 포함).' },
};
SGK.UNIT_ORDER = ['cav', 'spear', 'bow', 'siege', 'navy', 'xbow', 'gaema', 'joui', 'gyeolsa', 'gangung', 'hwarang', 'cheonbo', 'bubyeong', 'pocha', 'wanavy', 'mohecav'];
SGK.MATCHUP = { cav: { bow: 1.35, spear: 0.75 }, spear: { cav: 1.35, bow: 0.75 }, bow: { spear: 1.35, cav: 0.75 }, siege: { cav: 0.8, spear: 0.8, bow: 0.8 }, navy: {} };
SGK.unitAvailable = (uid, nation) => {
  const u = SGK.UNITS[uid];
  if (!u.nation) return true;
  return u.nation.split('|').includes(nation);
};

/* ── 전투 카드 ──
 * kind: atk(물리) / tac(책략) / def(방어) / buff(강화) / heal
 * target: enemy | allEnemy | self | allAlly | ally
 * stat: 피해 계산에 쓰는 능력치 (war 무력 / int 지력 / lead 통솔)
 * fx: 모션 이펙트 종류 */
SGK.CARDS = {
  strike:   { name: '일격', cost: 1, kind: 'atk', target: 'enemy', pow: 10, stat: 'war', fx: 'slash', desc: '기본 공격.' },
  charge:   { name: '기병 돌격', cost: 2, kind: 'atk', target: 'enemy', pow: 19, stat: 'war', fx: 'charge', cls: 'cav', desc: '강력한 돌격. 창벽에 막히면 반격당한다.' },
  flank:    { name: '측면 기습', cost: 1, kind: 'atk', target: 'enemy', pow: 11, stat: 'war', fx: 'charge', cls: 'cav', pierce: true, desc: '방어막 무시.' },
  thrust:   { name: '장창 찌르기', cost: 1, kind: 'atk', target: 'enemy', pow: 12, stat: 'war', fx: 'spear', cls: 'spear', desc: '창병의 기본 공격.' },
  pikewall: { name: '창벽', cost: 1, kind: 'def', target: 'self', pow: 12, stat: 'lead', fx: 'shield', cls: 'spear', counter: 'cav', desc: '방어막 + 기병의 공격을 50% 반사.' },
  volley:   { name: '일제사격', cost: 2, kind: 'atk', target: 'allEnemy', pow: 9, stat: 'war', fx: 'arrows', cls: 'bow', desc: '적 전체에 화살비.' },
  aimed:    { name: '조준사격', cost: 1, kind: 'atk', target: 'enemy', pow: 11, stat: 'war', fx: 'arrow', cls: 'bow', desc: '정확한 단일 사격.' },
  catapult: { name: '투석', cost: 2, kind: 'atk', target: 'enemy', pow: 12, stat: 'lead', fx: 'rock', cls: 'siege', wall: 3, desc: '성벽 피해 ×3.' },
  ram:      { name: '충차', cost: 1, kind: 'atk', target: 'enemy', pow: 6, stat: 'lead', fx: 'ram', cls: 'siege', wall: 6, desc: '성문 파괴. 성벽 피해 ×6.' },
  boarding: { name: '선상 돌격', cost: 1, kind: 'atk', target: 'enemy', pow: 12, stat: 'war', fx: 'wave', cls: 'navy', desc: '수상전에서 ×1.4.' },
  fireship: { name: '화선', cost: 2, kind: 'tac', target: 'enemy', pow: 11, stat: 'int', fx: 'fire', cls: 'navy', burn: 2, desc: '불붙은 배. 2턴 화상.' },
  pierce:   { name: '관통 사격', cost: 1, kind: 'atk', target: 'enemy', pow: 13, stat: 'war', fx: 'bolt', cls: 'bow', ignoreDef: true, onlyUnits: ['xbow', 'cheonbo'], desc: '쇠뇌 관통. 방어 무시.' },
  guard:    { name: '방진', cost: 1, kind: 'def', target: 'self', pow: 10, stat: 'lead', fx: 'shield', desc: '방어막 생성.' },
  firetac:  { name: '화공', cost: 2, kind: 'tac', target: 'enemy', pow: 14, stat: 'int', fx: 'fire', burn: 2, desc: '책략. 2턴간 화상 피해.' },
  confuse:  { name: '혼란', cost: 1, kind: 'tac', target: 'enemy', pow: 0, stat: 'int', fx: 'confuse', stun: 1, desc: '책략. 적 부대 1턴 행동 불능(지력 대결).' },
  ambush:   { name: '매복', cost: 2, kind: 'tac', target: 'enemy', pow: 17, stat: 'int', fx: 'ambush', desc: '책략. 지력 기반 강타.' },
  rally:    { name: '고무', cost: 1, kind: 'buff', target: 'allAlly', pow: 0, stat: 'lead', fx: 'buff', morale: 15, atkUp: 0.2, turns: 2, desc: '아군 사기 +15, 2턴 공격 +20%.' },
  regroup:  { name: '재정비', cost: 1, kind: 'heal', target: 'self', pow: 8, stat: 'pol', fx: 'heal', desc: '부상병 복귀(병력 회복).' },
};
/* 병종 계열별 기본 덱 */
SGK.CLASS_DECK = {
  cav: ['charge', 'charge', 'flank', 'strike'],
  spear: ['thrust', 'thrust', 'pikewall', 'strike'],
  bow: ['aimed', 'aimed', 'volley', 'strike'],
  siege: ['catapult', 'ram', 'guard'],
  navy: ['boarding', 'boarding', 'fireship', 'guard'],
};
