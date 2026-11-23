/* 삼국기 - 게임 데이터 (장수, 전법, 병종, 국가, 역할, 관직, 기술, 전장)
 * 브라우저에서는 window.SGK, Node에서는 module.exports 로 노출된다. */
(function (root) {
  'use strict';
  var SGK = (root.SGK = root.SGK || {});

  /* ---------- 능력치 4종 ---------- */
  SGK.STAT_NAMES = { lead: '통솔', str: '무력', int: '지력', pol: '정치' };
  SGK.STAT_KEYS = ['lead', 'str', 'int', 'pol'];

  /* ---------- 부대의 4자리: 자리마다 능력치 하나를 쓴다 ---------- */
  SGK.ROLES = [
    { key: 'cmd', name: '지휘', title: '대장', stat: 'lead', use: '방어', desc: '부대가 받는 일반 공격 피해를 줄인다. 부대 병종은 대장의 병종을 따른다.' },
    { key: 'atk', name: '전투', title: '선봉장', stat: 'str', use: '공격', desc: '부대가 주는 일반 공격·무력 전법 피해를 높인다.' },
    { key: 'tac', name: '책략', title: '군사', stat: 'int', use: '전법', desc: '전법 발동률과 책략 피해를 높이고, 적 책략 피해를 줄인다.' },
    { key: 'sup', name: '병참', title: '군수관', stat: 'pol', use: '사기', desc: '시작 사기와 턴마다 회복하는 사기를 높이고, 사기가 덜 깎이게 한다.' }
  ];
  SGK.ROLE_KEYS = SGK.ROLES.map(function (r) { return r.key; });

  /* ---------- 성의 4관직: 관직마다 능력치 하나를 쓴다 ---------- */
  SGK.POSTS = [
    { key: 'gov', name: '성주', stat: 'lead', use: '민심 · 징병', desc: '민심을 끌어올리고, 매달 모이는 병력을 늘린다.' },
    { key: 'guard', name: '수비대장', stat: 'str', use: '치안 · 성 방어', desc: '치안을 높여 생산 손실을 줄이고, 적 습격을 막는 성 방어력을 높인다.' },
    { key: 'sage', name: '책사', stat: 'int', use: '외교 · 기술', desc: '외교로 출전 때 원군을 얻고, 기술 연구 속도를 높인다.' },
    { key: 'steward', name: '재정관', stat: 'pol', use: '농업 · 상업', desc: '매달 거두는 군량(농업)과 금화(상업)를 늘린다.' }
  ];
  SGK.POST_KEYS = SGK.POSTS.map(function (p) { return p.key; });
  SGK.EMPTY_STAT = 30; /* 자리가 비었을 때 적용되는 능력치 */

  /* ---------- 국가 ---------- */
  SGK.NATIONS = {
    gogu: { name: '고구려', color: '#c0392b', bonus: '주는 피해 +12%', starter: ['ondal', 'gangisik', 'myeongnim', 'eulpaso'] },
    baek: { name: '백제', color: '#2e86c1', bonus: '전법 발동률 +8%p', starter: ['heukchi', 'yunchung', 'boksin', 'jisusin'] },
    silla: { name: '신라', color: '#d4a017', bonus: '받는 피해 -12%', starter: ['isabu', 'gwanchang', 'sadaham', 'geochilbu'] }
  };

  /* ---------- 병종 상성: 창병 > 기병 > 궁병 > 창병 ---------- */
  SGK.TROOPS = {
    cav: { name: '기병', icon: '🐎', beats: 'arc' },
    arc: { name: '궁병', icon: '🏹', beats: 'spr' },
    spr: { name: '창병', icon: '🔱', beats: 'cav' }
  };
  SGK.COUNTER_ADV = 1.2;
  SGK.COUNTER_DIS = 0.85;

  /* ---------- 전법 ----------
   * type: active(능동, 매 턴 rate 확률로 발동) / command(지휘, 전투 시작 시 적용) / passive(특수 조건)
   * effects (부대 대 부대 전투이므로 대상은 아군 부대 self 또는 적 부대 enemy):
   *   dmg    {stat:'str'|'int', coef}             적 병력 피해 (str=무력 전법, int=책략)
   *   morale {val, to}                            사기 증감
   *   buff   {stat:'atk'|'def'|'rate', val, dur, to}  공격 / 받는 피해 감소 / 전법 발동률
   *   heal   {coef}                               아군 병력 회복
   *   status {s:'confuse'|'silence'|'burn', dur, chance, coef}  혼란(일반 공격 불가) / 책략 봉쇄 / 화상
   */
  var T = (SGK.TACTICS = {
    /* ===== 고구려 ===== */
    yeongnak: { name: '영락대정', type: 'active', rate: 0.35, desc: '무력 피해(150%)를 주고, 2턴간 아군 공격을 12% 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.5 }, { k: 'buff', stat: 'atk', val: 0.12, dur: 2, to: 'self' }] },
    salsu: { name: '살수대첩', type: 'active', rate: 0.30, desc: '책략 피해(170%)를 주고, 50% 확률로 1턴간 혼란에 빠뜨린다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 1.7 }, { k: 'status', s: 'confuse', dur: 1, chance: 0.5 }] },
    bido: { name: '비도술', type: 'active', rate: 0.40, desc: '무력 피해(130%)를 주고, 적 사기를 6 깎는다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.3 }, { k: 'morale', val: -6, to: 'enemy' }] },
    ansi: { name: '안시성 수성', type: 'command', desc: '전투 시작 후 4턴간 받는 피해를 18% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.18, dur: 4, to: 'self' }] },
    adan: { name: '아단성 돌격', type: 'active', rate: 0.35, desc: '무력 피해(160%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.6 }] },
    namjin: { name: '남진정책', type: 'command', desc: '전투 내내 아군 공격을 8% 올리고, 시작 사기를 5 올린다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.08, dur: 99, to: 'self' }, { k: 'morale', val: 5, to: 'self' }] },
    jindae: { name: '진대법', type: 'active', rate: 0.35, desc: '아군 병력을 회복(120%)하고, 사기를 4 올린다.',
      effects: [{ k: 'heal', coef: 1.2 }, { k: 'morale', val: 4, to: 'self' }] },
    cheongya: { name: '청야전술', type: 'active', rate: 0.30, desc: '적 사기를 10 깎고, 2턴간 적 공격을 12% 낮춘다.',
      effects: [{ k: 'morale', val: -10, to: 'enemy' }, { k: 'buff', stat: 'atk', val: -0.12, dur: 2, to: 'enemy' }] },
    imyu: { name: '임유관 선공', type: 'command', desc: '전투 시작 후 2턴간 아군 공격을 25% 올린다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.25, dur: 2, to: 'self' }] },

    /* ===== 백제 ===== */
    pyeongyang: { name: '평양성 정벌', type: 'active', rate: 0.35, desc: '무력 피해(170%)를 주고, 적 사기를 5 깎는다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.7 }, { k: 'morale', val: -5, to: 'enemy' }] },
    hwangsan: { name: '황산벌 결사', type: 'passive', special: 'lastStand', desc: '병력이 50% 이하가 되면 주는 피해 +35%, 사기가 절반만 깎인다.', effects: [] },
    gaengwi: { name: '갱위강국', type: 'active', rate: 0.30, desc: '아군 병력을 회복(100%)하고, 사기를 8 올린다.',
      effects: [{ k: 'heal', coef: 1.0 }, { k: 'morale', val: 8, to: 'self' }] },
    gwansan: { name: '관산성 진격', type: 'active', rate: 0.35, desc: '무력 피해(140%)를 주고, 60% 확률로 1턴간 적 책략을 봉쇄한다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.4 }, { k: 'status', s: 'silence', dur: 1, chance: 0.6 }] },
    seodong: { name: '서동의 계책', type: 'active', rate: 0.35, desc: '책략 피해(140%)를 주고, 60% 확률로 1턴간 적 책략을 봉쇄한다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 1.4 }, { k: 'status', s: 'silence', dur: 1, chance: 0.6 }] },
    imjon: { name: '임존성 봉기', type: 'active', rate: 0.30, desc: '아군 병력을 회복(90%)하고, 2턴간 받는 피해를 20% 줄인다.',
      effects: [{ k: 'heal', coef: 0.9 }, { k: 'buff', stat: 'def', val: 0.20, dur: 2, to: 'self' }] },
    daeya: { name: '대야성 함락', type: 'active', rate: 0.35, desc: '무력 피해(150%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.5 }] },
    juryu: { name: '주류성 항전', type: 'active', rate: 0.30, desc: '2턴간 받는 피해를 15% 줄이고, 사기를 5 올린다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.15, dur: 2, to: 'self' }, { k: 'morale', val: 5, to: 'self' }] },
    bulgul: { name: '불굴', type: 'command', desc: '전투 내내 받는 피해를 8% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.08, dur: 99, to: 'self' }] },

    /* ===== 신라 ===== */
    samhan: { name: '삼한일통', type: 'active', rate: 0.35, desc: '무력 피해(160%)를 주고, 40% 확률로 1턴간 혼란에 빠뜨린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.6 }, { k: 'status', s: 'confuse', dur: 1, chance: 0.4 }] },
    jigi: { name: '지기삼사', type: 'command', desc: '전투 시작 후 3턴간 적의 전법 발동률을 12%p 낮춘다.',
      effects: [{ k: 'buff', stat: 'rate', val: -0.12, dur: 3, to: 'enemy' }] },
    sunsu: { name: '순수비', type: 'active', rate: 0.35, desc: '무력 피해(140%)를 주고, 아군 사기를 6 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.4 }, { k: 'morale', val: 6, to: 'self' }] },
    nadang: { name: '나당동맹', type: 'active', rate: 0.30, desc: '2턴간 적 공격을 12% 낮추고, 아군이 받는 피해를 12% 줄인다.',
      effects: [{ k: 'buff', stat: 'atk', val: -0.12, dur: 2, to: 'enemy' }, { k: 'buff', stat: 'def', val: 0.12, dur: 2, to: 'self' }] },
    mogu: { name: '목우사자', type: 'active', rate: 0.35, desc: '책략 피해(130%)를 주고, 적 사기를 8 깎는다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 1.3 }, { k: 'morale', val: -8, to: 'enemy' }] },
    maeso: { name: '매소성 대첩', type: 'active', rate: 0.35, desc: '무력 피해(150%)를 주고, 아군 사기를 4 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.5 }, { k: 'morale', val: 4, to: 'self' }] },
    hwarang: { name: '화랑의 돌격', type: 'active', rate: 0.40, desc: '무력 피해(150%)를 주고, 아군 사기를 3 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.5 }, { k: 'morale', val: 3, to: 'self' }] },
    jeondan: { name: '전단문 기습', type: 'command', desc: '전투 시작 후 2턴간 아군 공격을 20% 올리고, 적 사기를 5 깎는다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.20, dur: 2, to: 'self' }, { k: 'morale', val: -5, to: 'enemy' }] },
    guksa: { name: '국사 편찬', type: 'active', rate: 0.30, desc: '아군 병력을 회복(110%)한다.',
      effects: [{ k: 'heal', coef: 1.1 }] }
  });
  Object.keys(T).forEach(function (id) { T[id].id = id; });

  /* ---------- 장수 ----------
   * lead 통솔 / str 무력 / int 지력 / pol 정치. 기준은 1레벨 수치. */
  function G(id, name, nation, star, troop, lead, str, int, pol, tactic, bio) {
    return { id: id, name: name, nation: nation, star: star, troop: troop, lead: lead, str: str, int: int, pol: pol, tactic: tactic, bio: bio };
  }
  var list = [
    /* 고구려 */
    G('gwanggaeto', '광개토대왕', 'gogu', 5, 'cav', 98, 92, 84, 82, 'yeongnak', '고구려 19대 왕(재위 391~412). 영락 연호를 쓰며 요동과 한강 이북으로 영토를 크게 넓혔다.'),
    G('eulji', '을지문덕', 'gogu', 5, 'arc', 92, 78, 97, 80, 'salsu', '612년 살수에서 수나라 별동대를 크게 무찌른 장수.'),
    G('yeongaesomun', '연개소문', 'gogu', 5, 'spr', 90, 96, 78, 70, 'bido', '642년 정변으로 집권한 대막리지. 당나라의 침입에 맞섰다.'),
    G('yangmanchun', '양만춘', 'gogu', 4, 'arc', 93, 80, 78, 62, 'ansi', '645년 안시성 전투의 성주로 전해지는 인물. 이름은 후대 기록에 전한다.'),
    G('ondal', '온달', 'gogu', 4, 'cav', 76, 93, 52, 40, 'adan', '평원왕의 사위로 전해지는 장수. 아단성에서 전사했다고 한다.'),
    G('jangsu', '장수왕', 'gogu', 4, 'spr', 84, 70, 88, 94, 'namjin', '고구려 20대 왕. 427년 평양으로 천도하고 475년 백제 한성을 함락했다.'),
    G('eulpaso', '을파소', 'gogu', 3, 'arc', 58, 34, 88, 96, 'jindae', '고국천왕 때의 국상. 194년 진대법을 실시했다.'),
    G('myeongnim', '명림답부', 'gogu', 3, 'spr', 78, 70, 84, 82, 'cheongya', '172년 좌원에서 한나라 군을 청야 전술로 물리쳤다고 전하는 국상.'),
    G('gangisik', '강이식', 'gogu', 3, 'cav', 80, 84, 60, 48, 'imyu', '598년 수나라와의 전쟁에서 활약했다고 전해지는 장수.'),

    /* 백제 */
    G('geunchogo', '근초고왕', 'baek', 5, 'cav', 95, 88, 86, 90, 'pyeongyang', '백제 13대 왕. 371년 평양성을 공격해 고구려 고국원왕을 전사시켰다.'),
    G('gyebaek', '계백', 'baek', 5, 'spr', 94, 95, 74, 58, 'hwangsan', '660년 황산벌에서 5천 결사대로 신라군에 맞선 장군.'),
    G('muryeong', '무령왕', 'baek', 5, 'arc', 84, 72, 90, 97, 'gaengwi', '백제 25대 왕. 나라를 다시 일으켜 "다시 강국이 되었다"고 선언했다.'),
    G('seong', '성왕', 'baek', 4, 'arc', 82, 76, 84, 88, 'gwansan', '백제 26대 왕. 538년 사비로 천도했고 554년 관산성에서 전사했다.'),
    G('mu', '무왕', 'baek', 4, 'cav', 80, 74, 88, 82, 'seodong', '백제 30대 왕. 서동 설화의 주인공으로 전하며 신라를 자주 공격했다.'),
    G('heukchi', '흑치상지', 'baek', 4, 'spr', 90, 90, 70, 50, 'imjon', '백제 멸망 후 임존성에서 부흥군을 일으킨 장수.'),
    G('yunchung', '윤충', 'baek', 3, 'spr', 78, 86, 62, 44, 'daeya', '642년 신라 대야성을 함락한 장군.'),
    G('boksin', '복신', 'baek', 3, 'arc', 76, 70, 78, 72, 'juryu', '주류성을 근거지로 부흥 운동을 이끈 왕족.'),
    G('jisusin', '지수신', 'baek', 3, 'cav', 80, 78, 56, 46, 'bulgul', '임존성에서 끝까지 항전한 부흥군 장수.'),

    /* 신라 */
    G('kimyusin', '김유신', 'silla', 5, 'cav', 98, 90, 88, 78, 'samhan', '신라의 삼국 통일 전쟁을 이끈 장군.'),
    G('seondeok', '선덕여왕', 'silla', 5, 'arc', 80, 40, 95, 96, 'jigi', '신라 27대 왕. 앞일을 세 번 내다보았다는 지기삼사 일화가 전한다.'),
    G('jinheung', '진흥왕', 'silla', 5, 'spr', 92, 82, 86, 94, 'sunsu', '신라 24대 왕. 한강 유역을 차지하고 넓힌 영토에 순수비를 세웠다.'),
    G('kimchunchu', '김춘추', 'silla', 4, 'spr', 78, 62, 94, 98, 'nadang', '신라 29대 태종무열왕. 648년 당나라와 동맹을 맺었다.'),
    G('isabu', '이사부', 'silla', 4, 'arc', 88, 80, 90, 74, 'mogu', '512년 나무 사자를 앞세운 계책으로 우산국을 복속시킨 장군.'),
    G('munmu', '문무왕', 'silla', 4, 'cav', 88, 82, 84, 90, 'maeso', '신라 30대 왕. 고구려를 무너뜨리고 당나라 군을 몰아내 통일을 완수했다.'),
    G('gwanchang', '관창', 'silla', 3, 'cav', 62, 88, 50, 34, 'hwarang', '660년 황산벌에서 적진에 뛰어들어 전사한 화랑.'),
    G('sadaham', '사다함', 'silla', 3, 'spr', 74, 86, 64, 50, 'jeondan', '562년 대가야 정벌에서 선봉으로 공을 세운 화랑.'),
    G('geochilbu', '거칠부', 'silla', 3, 'arc', 66, 48, 90, 92, 'guksa', '545년 왕명으로 역사서 "국사"를 편찬한 재상.')
  ];
  SGK.GENERALS = {};
  list.forEach(function (g) { SGK.GENERALS[g.id] = g; });
  SGK.GENERAL_IDS = list.map(function (g) { return g.id; });

  /* ---------- 성장 규칙 ---------- */
  SGK.MAX_LV = 40;
  SGK.MAX_ADV = 5;
  SGK.expNeed = function (lv) { return 60 + 30 * lv; };
  SGK.calcStats = function (id, lv, adv) {
    var g = SGK.GENERALS[id];
    var m = (1 + 0.02 * ((lv || 1) - 1)) * (1 + 0.04 * (adv || 0));
    return { lead: Math.round(g.lead * m), str: Math.round(g.str * m), int: Math.round(g.int * m), pol: Math.round(g.pol * m) };
  };
  /* 부대가 거느릴 수 있는 병력. 장수 4명의 평균 레벨로 정해진다. */
  SGK.armyCapacity = function (avgLv) { return Math.round(8000 + 150 * avgLv); };

  /* ---------- 기술 ---------- */
  SGK.TECHS = [
    { key: 'weapon', name: '무기', per: '주는 피해 +4%' },
    { key: 'armor', name: '갑주', per: '받는 피해 -3%' },
    { key: 'farm', name: '농법', per: '군량·금화 생산 +10%' },
    { key: 'wall', name: '성벽', per: '성 방어 +25%' }
  ];
  SGK.TECH_MAX = 5;
  SGK.techCost = function (lv) { return 100 * (lv + 1); }; /* lv → lv+1 에 필요한 연구 점수 */

  /* ---------- 전장 (역사 속 전장 이름을 빌린 가상 모의전) ----------
   * team 순서: [지휘, 전투, 책략, 병참] */
  function S(name, lv, team) { return { name: name, lv: lv, team: team }; }
  SGK.STAGES = [
    S('국내성 수련전', 1, ['jisusin', 'gangisik', 'boksin', 'eulpaso']),
    S('위례성 전초전', 3, ['jisusin', 'yunchung', 'boksin', 'geochilbu']),
    S('서라벌 화랑 대련', 5, ['sadaham', 'gwanchang', 'geochilbu', 'eulpaso']),
    S('관미성 공방전', 8, ['heukchi', 'yunchung', 'mu', 'seong']),
    S('아단성 전투', 10, ['yangmanchun', 'ondal', 'myeongnim', 'jangsu']),
    S('관산성 전투', 13, ['munmu', 'gwanchang', 'isabu', 'kimchunchu']),
    S('대야성 전투', 16, ['jisusin', 'heukchi', 'mu', 'seong']),
    S('안시성 전투', 20, ['yangmanchun', 'yeongaesomun', 'myeongnim', 'eulpaso']),
    S('살수 대첩', 24, ['eulji', 'ondal', 'myeongnim', 'jangsu']),
    S('황산벌 전투', 28, ['gyebaek', 'heukchi', 'seong', 'muryeong']),
    S('삼한일통의 시험', 33, ['kimyusin', 'munmu', 'isabu', 'kimchunchu']),
    S('영락대제의 시험', 38, ['gwanggaeto', 'yeongaesomun', 'eulji', 'jangsu'])
  ];
  SGK.stageReward = function (index, firstClear) {
    return { gold: firstClear ? 300 + index * 20 : 60, food: firstClear ? 600 + index * 100 : 150, exp: 80 + 40 * (index + 1) };
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK; }
