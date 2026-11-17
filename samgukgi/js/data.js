/* 삼국기(三國記) — 게임 데이터
 * 등급/능력치/스킬 수치는 모두 "게임 밸런스용 설정값"이며 사료상의 평가가 아니다.
 * 브라우저(전역 SGData)와 Node(require) 양쪽에서 쓰도록 UMD 형태로 작성. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SGData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── 등급표: 같은 등급이면 누구든 같은 수치를 낸다 ──────────────────────
  const GRADES = {
    S: { value: 95, pt: 4, label: 'S' },
    A: { value: 85, pt: 3, label: 'A' },
    B: { value: 70, pt: 2, label: 'B' },
    C: { value: 55, pt: 1, label: 'C' },
    D: { value: 40, pt: 0, label: 'D' },
  };

  // ── 능력치 4종 (표시 이름은 여기 한 곳만 고치면 전체에 반영) ──────────────
  const STATS = {
    lead: { name: '통솔', short: '통', desc: '병력(체력)과 피해 감소. 내정에서는 통치·치안.' },
    war:  { name: '무력', short: '무', desc: '일반 공격 피해.' },
    int:  { name: '지력', short: '지', desc: '계략 위력과 계략 저항.' },
    pol:  { name: '정치', short: '정', desc: '출전 시 아군 사기 상승. 내정·외교의 핵심 능력.' },
  };

  // ── 병종 3종과 상성: 기병 ▶ 궁병 ▶ 창병 ▶ 기병 ─────────────────────────
  const UNITS = {
    cav: { name: '기병', hanja: '騎', beats: 'arc', order: 1,
           trait: '돌격 — 배치한 턴에 바로 공격. 본진 공격 피해 +25%.' },
    spr: { name: '창병', hanja: '槍', beats: 'cav', order: 2,
           trait: '방진 — 받는 피해 10% 감소. 기병에게 맞으면 피해의 30%를 되돌려 준다.' },
    arc: { name: '궁병', hanja: '弓', beats: 'spr', order: 0,
           trait: '선제 사격 — 매 턴 가장 먼저 공격한다.' },
  };

  const NATIONS = {
    goguryeo: { name: '고구려', hanja: '高句麗', color: '#8b1a1a', color2: '#e0b04c' },
    baekje:   { name: '백제',   hanja: '百濟',   color: '#1e3a8a', color2: '#d9c27a' },
    silla:    { name: '신라',   hanja: '新羅',   color: '#9a6b08', color2: '#f3dc8b' },
    sui:      { name: '수',     hanja: '隋',     color: '#5b21b6', color2: '#d6c08a' },
    tang:     { name: '당',     hanja: '唐',     color: '#0f6a63', color2: '#e8cf8f' },
    turk:     { name: '동돌궐', hanja: '東突厥', color: '#4d5d23', color2: '#d2c08a' },
    wa:       { name: '왜',     hanja: '倭',     color: '#475569', color2: '#e58b8b' },
  };

  // 스킬 효과 타입: nuke_all, nuke_one, buff_atk, buff_def, heal, stun, morale, hq_repair
  const S = (name, cd, desc, fx) => ({ name, cd, desc, fx });
  const G = (id, nation, name, hanja, role, unit, lead, war, int, pol, skill, note) =>
    ({ id, nation, name, hanja, role, unit, stats: { lead, war, int, pol }, skill, note: note || '' });

  const LIST = [
    // ── 고구려 ──
    G('eulji', 'goguryeo', '을지문덕', '乙支文德', 'general', 'cav', 'S', 'B', 'S', 'B',
      S('살수대첩', 3, '적 전체에 수공 피해.', [{ type: 'nuke_all', power: 240 }]), '612년 살수에서 수의 별동대를 격파.'),
    G('yeon', 'goguryeo', '연개소문', '淵蓋蘇文', 'general', 'cav', 'A', 'S', 'A', 'B',
      S('막리지의 호령', 3, '아군 전체 공격력 +30% (2턴).', [{ type: 'buff_atk', power: 30, turns: 2 }]), '642년 정변으로 집권한 대막리지.'),
    G('yang', 'goguryeo', '양만춘', '楊萬春', 'general', 'arc', 'S', 'A', 'A', 'C',
      S('안시성 수성', 3, '아군 전체 받는 피해 -35% (2턴), 본진 수리.', [{ type: 'buff_def', power: 35, turns: 2 }, { type: 'hq_repair', power: 150 }]), '645년 안시성주. 이름은 후대 기록에만 전한다.'),
    G('ondal', 'goguryeo', '온달', '溫達', 'general', 'cav', 'B', 'S', 'D', 'D',
      S('아단성 돌격', 2, '맞은편 적에게 강력한 일격.', [{ type: 'nuke_one', power: 300 }]), '삼국사기 열전의 설화적 인물.'),
    G('kang', 'goguryeo', '강이식', '姜以式', 'general', 'spr', 'A', 'A', 'B', 'C',
      S('임유관 요격', 3, '맞은편 적을 1턴 혼란에 빠뜨린다.', [{ type: 'stun' }]), '삼국사기에는 없고 후대 문헌에 전하는 인물.'),
    G('yeongyang', 'goguryeo', '영양왕', '嬰陽王', 'king', 'spr', 'A', 'B', 'B', 'A',
      S('요서 선제공격', 3, '아군 사기 +25.', [{ type: 'morale', power: 25 }]), '598년 요서를 선공, 수의 침공을 네 차례 막아냈다.'),
    G('gg_cav', 'goguryeo', '개마무사', '鎧馬武士', 'soldier', 'cav', 'C', 'B', 'D', 'D', null),
    G('gg_arc', 'goguryeo', '맥궁 사수', '貊弓手', 'soldier', 'arc', 'C', 'C', 'D', 'D', null),
    G('gg_spr', 'goguryeo', '고구려 창수', '槍手', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),

    // ── 백제 ──
    G('gyebaek', 'baekje', '계백', '階伯', 'general', 'spr', 'A', 'S', 'B', 'C',
      S('오천 결사대', 3, '아군 전체 공격력 +40% (2턴).', [{ type: 'buff_atk', power: 40, turns: 2 }]), '660년 황산벌에서 5천 결사대를 이끌었다.'),
    G('seong', 'baekje', '성왕', '聖王', 'king', 'spr', 'A', 'B', 'A', 'S',
      S('한강 수복', 3, '아군 전체 병력 회복, 사기 +10.', [{ type: 'heal', power: 180 }, { type: 'morale', power: 10 }]), '사비 천도. 554년 관산성에서 전사.'),
    G('uija', 'baekje', '의자왕', '義慈王', 'king', 'cav', 'A', 'A', 'B', 'B',
      S('사십여 성 공략', 3, '맞은편 적에게 강력한 일격.', [{ type: 'nuke_one', power: 280 }]), '642년 신라 서쪽 40여 성을 빼앗았다.'),
    G('heukchi', 'baekje', '흑치상지', '黑齒常之', 'general', 'arc', 'A', 'A', 'A', 'C',
      S('임존성 항전', 3, '아군 전체 받는 피해 -35% (2턴).', [{ type: 'buff_def', power: 35, turns: 2 }]), '백제 부흥군을 이끌다 이후 당의 장수가 되었다.'),
    G('yunchung', 'baekje', '윤충', '允忠', 'general', 'cav', 'B', 'A', 'B', 'D',
      S('대야성 함락', 2, '맞은편 적에게 일격.', [{ type: 'nuke_one', power: 240 }]), '642년 대야성을 함락.'),
    G('boksin', 'baekje', '복신', '福信', 'general', 'arc', 'A', 'B', 'A', 'C',
      S('주류성 봉기', 3, '아군 전체 병력 회복, 사기 +15.', [{ type: 'heal', power: 160 }, { type: 'morale', power: 15 }]), '660년 이후 백제 부흥 운동을 이끌었다.'),
    G('bj_cav', 'baekje', '백제 기병', '騎兵', 'soldier', 'cav', 'C', 'C', 'D', 'D', null),
    G('bj_arc', 'baekje', '백제 궁수', '弓手', 'soldier', 'arc', 'C', 'C', 'D', 'D', null),
    G('bj_spr', 'baekje', '백제 창병', '槍兵', 'soldier', 'spr', 'C', 'B', 'D', 'D', null),

    // ── 신라 ──
    G('yusin', 'silla', '김유신', '金庾信', 'general', 'cav', 'S', 'A', 'A', 'A',
      S('삼한일통', 3, '아군 전체 공격력 +30% (2턴), 사기 +10.', [{ type: 'buff_atk', power: 30, turns: 2 }, { type: 'morale', power: 10 }]), '신라 통일 전쟁의 총사령관.'),
    G('chunchu', 'silla', '김춘추', '金春秋', 'king', 'arc', 'B', 'C', 'S', 'S',
      S('나당 동맹', 3, '아군 전체 병력 회복.', [{ type: 'heal', power: 220 }]), '648년 당과 동맹을 맺었다. 태종무열왕.'),
    G('isabu', 'silla', '이사부', '異斯夫', 'general', 'spr', 'A', 'A', 'S', 'B',
      S('목우사자', 3, '맞은편 적을 1턴 혼란에 빠뜨리고 피해.', [{ type: 'stun' }, { type: 'nuke_one', power: 120 }]), '512년 우산국 복속, 562년 대가야 정벌.'),
    G('gwanchang', 'silla', '관창', '官昌', 'hwarang', 'cav', 'C', 'A', 'D', 'D',
      S('화랑의 순국', 2, '아군 사기 +30.', [{ type: 'morale', power: 30 }]), '660년 황산벌에서 전사한 화랑.'),
    G('geochilbu', 'silla', '거칠부', '居柒夫', 'general', 'arc', 'A', 'B', 'A', 'A',
      S('죽령 이북 공취', 4, '적 전체에 피해.', [{ type: 'nuke_all', power: 190 }]), '551년 고구려의 10개 군을 빼앗았다.'),
    G('jinheung', 'silla', '진흥왕', '眞興王', 'king', 'spr', 'S', 'B', 'A', 'S',
      S('순수척경', 3, '아군 전체 받는 피해 -30% (2턴), 사기 +10.', [{ type: 'buff_def', power: 30, turns: 2 }, { type: 'morale', power: 10 }]), '한강 유역 장악, 순수비 건립.'),
    G('sl_cav', 'silla', '서당 기병', '誓幢騎', 'soldier', 'cav', 'C', 'C', 'D', 'D', null),
    G('sl_arc', 'silla', '노당 사수', '弩幢', 'soldier', 'arc', 'C', 'B', 'D', 'D', null),
    G('sl_spr', 'silla', '장창당', '長槍幢', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),

    // ── 수 ──
    G('yangsu', 'sui', '양소', '楊素', 'general', 'cav', 'S', 'A', 'A', 'A',
      S('강남 평정', 3, '아군 전체 공격력 +30% (2턴).', [{ type: 'buff_atk', power: 30, turns: 2 }]), '수의 통일 전쟁을 이끈 재상·명장(606년 사망).'),
    G('yangdi', 'sui', '수 양제', '隋煬帝', 'king', 'spr', 'B', 'C', 'B', 'D',
      S('백만 대군', 3, '아군 전체 병력 대량 보충.', [{ type: 'heal', power: 300 }]), '612~614년 세 차례 고구려를 침공.'),
    G('ujungmun', 'sui', '우중문', '于仲文', 'general', 'cav', 'A', 'B', 'A', 'C',
      S('평양 직공', 2, '맞은편 적에게 일격.', [{ type: 'nuke_one', power: 250 }]), '612년 별동대 지휘관.'),
    G('umunsul', 'sui', '우문술', '宇文述', 'general', 'spr', 'A', 'A', 'C', 'C',
      S('별동대 진격', 3, '아군 전체 공격력 +25% (2턴).', [{ type: 'buff_atk', power: 25, turns: 2 }]), '612년 30만 별동대를 이끌었다.'),
    G('naehoa', 'sui', '내호아', '來護兒', 'general', 'arc', 'B', 'A', 'C', 'D',
      S('수군 상륙', 3, '적 전체에 피해.', [{ type: 'nuke_all', power: 190 }]), '수군을 이끌고 평양 부근에 상륙.'),
    G('maekcheol', 'sui', '맥철장', '麥鐵杖', 'general', 'spr', 'B', 'S', 'D', 'D',
      S('요하 도하', 2, '맞은편 적에게 강력한 일격.', [{ type: 'nuke_one', power: 300 }]), '612년 요하 도하 선봉에 섰다가 전사.'),
    G('su_cav', 'sui', '효과 기병', '驍果', 'soldier', 'cav', 'C', 'B', 'D', 'D', null),
    G('su_arc', 'sui', '수 노수', '弩手', 'soldier', 'arc', 'C', 'C', 'D', 'D', null),
    G('su_spr', 'sui', '수 장창병', '長槍兵', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),

    // ── 당 ──
    G('taizong', 'tang', '당 태종', '唐太宗', 'king', 'cav', 'S', 'A', 'A', 'S',
      S('황제 친정', 3, '아군 전체 공격력 +30% (2턴), 사기 +10.', [{ type: 'buff_atk', power: 30, turns: 2 }, { type: 'morale', power: 10 }]), '645년 고구려 친정.'),
    G('lijing', 'tang', '이정', '李靖', 'general', 'cav', 'A', 'A', 'S', 'B',
      S('음산 야습', 3, '적 전체에 피해.', [{ type: 'nuke_all', power: 240 }]), '630년 동돌궐을 멸망시켰다.'),
    G('liji', 'tang', '이세적', '李世勣', 'general', 'spr', 'A', 'A', 'A', 'B',
      S('요동성 함락', 3, '맞은편 적에게 강력한 일격, 본진 수리.', [{ type: 'nuke_one', power: 260 }, { type: 'hq_repair', power: 100 }]), '645년 요동도 행군대총관, 668년 평양 함락.'),
    G('sujeongbang', 'tang', '소정방', '蘇定方', 'general', 'cav', 'A', 'S', 'B', 'C',
      S('기습 돌파', 2, '맞은편 적에게 강력한 일격.', [{ type: 'nuke_one', power: 300 }]), '660년 백제 원정군 사령관.'),
    G('seolingwi', 'tang', '설인귀', '薛仁貴', 'general', 'arc', 'C', 'S', 'C', 'C',
      S('세 화살', 2, '맞은편 적에게 일격, 1턴 혼란.', [{ type: 'nuke_one', power: 200 }, { type: 'stun' }]), '활 솜씨로 이름난 장수.'),
    G('yuingwe', 'tang', '유인궤', '劉仁軌', 'general', 'arc', 'B', 'B', 'A', 'A',
      S('백강 화공', 3, '적 전체에 화공 피해.', [{ type: 'nuke_all', power: 210 }]), '663년 백강에서 왜 수군을 격파.'),
    G('tg_cav', 'tang', '현갑 기병', '玄甲騎', 'soldier', 'cav', 'C', 'B', 'D', 'D', null),
    G('tg_arc', 'tang', '당 궁노수', '弓弩手', 'soldier', 'arc', 'C', 'C', 'D', 'D', null),
    G('tg_spr', 'tang', '당 장창병', '長槍兵', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),

    // ── 동돌궐 ──
    G('sibi', 'turk', '시필 카간', '始畢可汗', 'king', 'cav', 'S', 'A', 'B', 'B',
      S('안문 포위', 3, '적 전체에 피해.', [{ type: 'nuke_all', power: 200 }]), '615년 안문에서 수 양제를 포위.'),
    G('illig', 'turk', '힐리 카간', '頡利可汗', 'king', 'cav', 'A', 'A', 'C', 'C',
      S('위수 진군', 3, '아군 전체 공격력 +35% (2턴).', [{ type: 'buff_atk', power: 35, turns: 2 }]), '626년 장안 근교 위수까지 진군, 630년 당에 패망.'),
    G('gyemin', 'turk', '계민 카간', '啓民可汗', 'king', 'arc', 'B', 'B', 'B', 'A',
      S('화친의 맹약', 3, '아군 전체 병력 회복, 사기 +10.', [{ type: 'heal', power: 180 }, { type: 'morale', power: 10 }]), '수와 화친해 세력을 유지.'),
    G('tolis', 'turk', '돌리 카간', '突利可汗', 'general', 'arc', 'B', 'A', 'C', 'C',
      S('기사 일제사격', 2, '맞은편 적에게 일격.', [{ type: 'nuke_one', power: 240 }]), '동돌궐 동부를 다스린 소(小)카간.'),
    G('ashina', 'turk', '아사나 사이', '阿史那社爾', 'general', 'spr', 'A', 'A', 'B', 'C',
      S('초원의 매복', 3, '맞은편 적을 1턴 혼란에 빠뜨린다.', [{ type: 'stun' }]), '돌궐 왕족. 뒤에 당에 귀부해 장수로 활약.'),
    G('jipsil', 'turk', '집실사력', '執失思力', 'general', 'cav', 'B', 'A', 'B', 'B',
      S('초원 유격', 3, '맞은편 적을 1턴 혼란에 빠뜨리고 피해.', [{ type: 'stun' }, { type: 'nuke_one', power: 120 }]), '힐리 카간의 사신·장수. 뒤에 당에 귀부.'),
    G('tk_cav', 'turk', '낭기', '狼騎', 'soldier', 'cav', 'C', 'B', 'D', 'D', null),
    G('tk_arc', 'turk', '기사 궁수', '騎射', 'soldier', 'arc', 'C', 'B', 'D', 'D', null),
    G('tk_spr', 'turk', '부락 보졸', '步卒', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),

    // ── 왜 ──
    G('shotoku', 'wa', '쇼토쿠 태자', '聖德太子', 'king', 'arc', 'B', 'C', 'S', 'S',
      S('헌법 십칠조', 3, '아군 전체 병력 회복, 사기 +15.', [{ type: 'heal', power: 200 }, { type: 'morale', power: 15 }]), '스이코 조의 섭정. 실제 업적 범위는 학계 논쟁이 있다.'),
    G('umako', 'wa', '소가노 우마코', '蘇我馬子', 'general', 'spr', 'A', 'C', 'A', 'S',
      S('조정 장악', 3, '맞은편 적을 1턴 혼란에 빠뜨린다.', [{ type: 'stun' }]), '587년 모노노베씨를 멸하고 실권 장악.'),
    G('nakanooe', 'wa', '나카노오에 황자', '中大兄皇子', 'king', 'cav', 'A', 'B', 'A', 'A',
      S('백제 구원군', 3, '아군 전체 공격력 +25% (2턴).', [{ type: 'buff_atk', power: 25, turns: 2 }]), '뒤의 덴지 천황. 백제 부흥군 파병을 주도.'),
    G('hirafu', 'wa', '아베노 히라후', '阿倍比羅夫', 'general', 'arc', 'A', 'A', 'B', 'C',
      S('수군 원정', 3, '적 전체에 피해.', [{ type: 'nuke_all', power: 180 }]), '북방 원정과 백강 전투에 참전한 수군 장수.'),
    G('takutsu', 'wa', '에치노 다쿠쓰', '朴市田來津', 'general', 'spr', 'A', 'A', 'C', 'D',
      S('백강 돌격', 2, '맞은편 적에게 일격.', [{ type: 'nuke_one', power: 250 }]), '663년 백강에서 분전하다 전사.'),
    G('moriya', 'wa', '모노노베노 모리야', '物部守屋', 'general', 'arc', 'A', 'A', 'C', 'C',
      S('나무 위의 사격', 2, '맞은편 적에게 일격.', [{ type: 'nuke_one', power: 260 }]), '587년 소가씨와 싸우다 패사한 군사 씨족의 수장.'),
    G('wa_cav', 'wa', '왜 기병', '騎兵', 'soldier', 'cav', 'C', 'C', 'D', 'D', null),
    G('wa_arc', 'wa', '왜 궁수', '弓手', 'soldier', 'arc', 'C', 'B', 'D', 'D', null),
    G('wa_spr', 'wa', '왜 창병', '槍兵', 'soldier', 'spr', 'C', 'C', 'D', 'D', null),
  ];

  const GENERALS = {};
  LIST.forEach((g) => { GENERALS[g.id] = g; });

  function deckOf(nation) {
    return LIST.filter((g) => g.nation === nation).map((g) => g.id);
  }

  // 시나리오: sides[0], sides[1] 중 플레이어가 진영을 고른다. hqMul = 본진 내구 배율.
  const SCENARIOS = [
    { id: 'gwansan', year: 554, name: '관산성 전투', sides: [{ nation: 'baekje', hqMul: 1 }, { nation: 'silla', hqMul: 1 }],
      desc: '한강 유역을 빼앗긴 백제 성왕이 신라를 친다.' },
    { id: 'salsu', year: 612, name: '살수대첩', sides: [{ nation: 'goguryeo', hqMul: 1 }, { nation: 'sui', hqMul: 1.15 }],
      desc: '수의 별동대 30만이 평양으로 향한다.' },
    { id: 'anmun', year: 615, name: '안문의 포위', sides: [{ nation: 'turk', hqMul: 1 }, { nation: 'sui', hqMul: 1.15 }],
      desc: '시필 카간의 기병이 순행 중인 수 양제를 에워싼다.' },
    { id: 'ansi', year: 645, name: '안시성 전투', sides: [{ nation: 'goguryeo', hqMul: 1.25 }, { nation: 'tang', hqMul: 1 }],
      desc: '당 태종의 친정군을 안시성이 막아선다.' },
    { id: 'hwangsan', year: 660, name: '황산벌 전투', sides: [{ nation: 'baekje', hqMul: 0.9 }, { nation: 'silla', hqMul: 1.1 }],
      desc: '계백의 5천 결사대와 김유신의 5만 대군.' },
    { id: 'baekgang', year: 663, name: '백강 전투', sides: [{ nation: 'wa', hqMul: 1.25 }, { nation: 'tang', hqMul: 1 }],
      desc: '백제 부흥을 도우러 온 왜 수군과 당 수군의 결전.' },
  ];

  return { GRADES, STATS, UNITS, NATIONS, GENERALS, LIST, SCENARIOS, deckOf };
});
