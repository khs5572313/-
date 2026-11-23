/* 삼국기 - 게임 데이터 (무장, 전법, 병종, 국가, 스테이지)
 * 브라우저에서는 window.SGK, Node에서는 module.exports 로 노출된다. */
(function (root) {
  'use strict';
  var SGK = (root.SGK = root.SGK || {});

  /* ---------- 국가 ---------- */
  SGK.NATIONS = {
    gogu: { name: '고구려', color: '#c0392b', bonus: '주는 피해 +12%', starter: ['ondal', 'myeongnim', 'gangisik'] },
    baek: { name: '백제', color: '#2e86c1', bonus: '능동 전법 발동률 +8%p', starter: ['seong', 'yunchung', 'jisusin'] },
    silla: { name: '신라', color: '#d4a017', bonus: '받는 피해 -12%', starter: ['isabu', 'gwanchang', 'geochilbu'] }
  };

  /* ---------- 병종 상성: 창병 > 기병 > 궁병 > 창병 ---------- */
  SGK.TROOPS = {
    cav: { name: '기병', icon: '🐎', beats: 'arc' },
    arc: { name: '궁병', icon: '🏹', beats: 'spr' },
    spr: { name: '창병', icon: '🔱', beats: 'cav' }
  };
  SGK.COUNTER_ADV = 1.2;
  SGK.COUNTER_DIS = 0.85;

  SGK.SLOT_NAMES = ['선봉', '중군', '본영'];

  /* ---------- 전법 ----------
   * type: active(능동, 매 행동마다 rate 확률로 발동) / command(지휘, 전투 시작 시 적용) / passive(특수 조건)
   * effects:
   *   dmg    {stat:'str'|'int', coef, target, hits}
   *   status {s:'stun'|'silence'|'burn', dur, chance, target, coef}
   *   buff   {stat:'atk'|'def'|'spd'|'rate', val, dur, target}
   *   heal   {coef, target}
   * target: front(맨 앞 적) leader(적 본영) random random2 all same(직전 피해 대상)
   *         self allies lowest(병력 비율 최저 아군)
   */
  var T = (SGK.TACTICS = {
    /* ===== 고구려 고유 ===== */
    yeongnak: { name: '영락대정', type: 'active', rate: 0.40, desc: '적 전체에 무력 피해(110%)를 주고, 자신의 공격을 2턴간 15% 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.1, target: 'all' }, { k: 'buff', stat: 'atk', val: 0.15, dur: 2, target: 'self' }] },
    salsu: { name: '살수대첩', type: 'active', rate: 0.35, desc: '적 전체에 지력 피해(120%)를 주고, 40% 확률로 1턴간 기절시킨다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 1.2, target: 'all' }, { k: 'status', s: 'stun', dur: 1, chance: 0.4, target: 'same' }] },
    bido: { name: '비도술', type: 'active', rate: 0.45, desc: '무작위 적에게 무력 피해(100%)를 3회 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.0, target: 'random', hits: 3 }] },
    ansi: { name: '안시성 수성', type: 'command', desc: '전투 시작 후 4턴간 아군 전체가 받는 피해를 18% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.18, dur: 4, target: 'allies' }] },
    adan: { name: '아단성 돌격', type: 'active', rate: 0.40, desc: '맨 앞 적에게 무력 피해(200%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 2.0, target: 'front' }] },
    namjin: { name: '남진정책', type: 'command', desc: '전투 내내 아군 전체의 공격을 10% 올린다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.10, dur: 99, target: 'allies' }] },
    jindae: { name: '진대법', type: 'active', rate: 0.40, desc: '병력 비율이 가장 낮은 아군의 병력을 회복시킨다(160%).',
      effects: [{ k: 'heal', coef: 1.6, target: 'lowest' }] },
    cheongya: { name: '청야전술', type: 'active', rate: 0.35, desc: '적 전체에 지력 피해(60%)를 주고, 2턴간 공격을 15% 낮춘다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 0.6, target: 'all' }, { k: 'buff', stat: 'atk', val: -0.15, dur: 2, target: 'same' }] },
    imyu: { name: '임유관 선공', type: 'command', desc: '전투 시작 후 2턴간 자신의 공격을 30% 올린다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.30, dur: 2, target: 'self' }] },

    /* ===== 백제 고유 ===== */
    pyeongyang: { name: '평양성 정벌', type: 'active', rate: 0.40, desc: '적 본영(대장)을 직접 타격해 무력 피해(190%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.9, target: 'leader' }] },
    hwangsan: { name: '황산벌 결사', type: 'passive', special: 'lastStand', desc: '자신의 병력이 50% 이하가 되면 주는 피해 +40%, 받는 피해 -20%.', effects: [] },
    gaengwi: { name: '갱위강국', type: 'active', rate: 0.35, desc: '아군 전체의 병력을 회복(80%)하고, 2턴간 공격을 10% 올린다.',
      effects: [{ k: 'heal', coef: 0.8, target: 'allies' }, { k: 'buff', stat: 'atk', val: 0.10, dur: 2, target: 'allies' }] },
    gwansan: { name: '관산성 진격', type: 'active', rate: 0.40, desc: '맨 앞 적에게 무력 피해(160%)를 주고, 1턴간 침묵시킨다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.6, target: 'front' }, { k: 'status', s: 'silence', dur: 1, chance: 1, target: 'same' }] },
    seodong: { name: '서동의 계책', type: 'active', rate: 0.40, desc: '무작위 적에게 지력 피해(150%)를 주고, 60% 확률로 2턴간 침묵시킨다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 1.5, target: 'random' }, { k: 'status', s: 'silence', dur: 2, chance: 0.6, target: 'same' }] },
    imjon: { name: '임존성 봉기', type: 'active', rate: 0.35, desc: '자신의 병력을 회복(150%)하고, 2턴간 받는 피해를 25% 줄인다.',
      effects: [{ k: 'heal', coef: 1.5, target: 'self' }, { k: 'buff', stat: 'def', val: 0.25, dur: 2, target: 'self' }] },
    daeya: { name: '대야성 함락', type: 'active', rate: 0.35, desc: '맨 앞 적에게 무력 피해(170%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.7, target: 'front' }] },
    juryu: { name: '주류성 항전', type: 'active', rate: 0.35, desc: '2턴간 아군 전체가 받는 피해를 15% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.15, dur: 2, target: 'allies' }] },
    bulgul: { name: '불굴', type: 'command', desc: '전투 내내 자신이 받는 피해를 15% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.15, dur: 99, target: 'self' }] },

    /* ===== 신라 고유 ===== */
    samhan: { name: '삼한일통', type: 'active', rate: 0.40, desc: '맨 앞 적에게 무력 피해(210%)를 주고, 50% 확률로 1턴간 기절시킨다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 2.1, target: 'front' }, { k: 'status', s: 'stun', dur: 1, chance: 0.5, target: 'same' }] },
    jigi: { name: '지기삼사', type: 'command', desc: '전투 시작 후 3턴간 적 전체의 능동 전법 발동률을 15%p 낮춘다.',
      effects: [{ k: 'buff', stat: 'rate', val: -0.15, dur: 3, target: 'all' }] },
    sunsu: { name: '순수비', type: 'active', rate: 0.40, desc: '무작위 적 2명에게 무력 피해(140%)를 주고, 자신의 공격을 2턴간 10% 올린다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.4, target: 'random2' }, { k: 'buff', stat: 'atk', val: 0.10, dur: 2, target: 'self' }] },
    nadang: { name: '나당동맹', type: 'active', rate: 0.35, desc: '2턴간 적 전체의 공격을 12% 낮추고, 아군 전체가 받는 피해를 12% 줄인다.',
      effects: [{ k: 'buff', stat: 'atk', val: -0.12, dur: 2, target: 'all' }, { k: 'buff', stat: 'def', val: 0.12, dur: 2, target: 'allies' }] },
    mogu: { name: '목우사자', type: 'active', rate: 0.40, desc: '적 전체에 지력 피해(90%)를 주고, 35% 확률로 1턴간 기절시킨다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 0.9, target: 'all' }, { k: 'status', s: 'stun', dur: 1, chance: 0.35, target: 'same' }] },
    maeso: { name: '매소성 대첩', type: 'active', rate: 0.40, desc: '적 전체에 무력 피해(100%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.0, target: 'all' }] },
    hwarang: { name: '화랑의 돌격', type: 'active', rate: 0.45, desc: '맨 앞 적에게 무력 피해(180%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.8, target: 'front' }] },
    jeondan: { name: '전단문 기습', type: 'command', desc: '전투 시작 후 2턴간 자신의 속도 +30, 공격 +20%.',
      effects: [{ k: 'buff', stat: 'spd', val: 30, dur: 2, target: 'self' }, { k: 'buff', stat: 'atk', val: 0.20, dur: 2, target: 'self' }] },
    guksa: { name: '국사 편찬', type: 'active', rate: 0.35, desc: '병력 비율이 가장 낮은 아군의 병력을 회복시킨다(140%).',
      effects: [{ k: 'heal', coef: 1.4, target: 'lowest' }] },

    /* ===== 공용 전법 (편성 화면에서 무장마다 1개 장착) ===== */
    c_fire: { name: '화공', common: true, type: 'active', rate: 0.35, desc: '적 전체에 지력 피해(50%)를 주고, 2턴간 화상(턴마다 피해)을 입힌다.',
      effects: [{ k: 'dmg', stat: 'int', coef: 0.5, target: 'all' }, { k: 'status', s: 'burn', dur: 2, chance: 1, coef: 0.4, target: 'same' }] },
    c_ambush: { name: '매복', common: true, type: 'active', rate: 0.35, desc: '적 본영(대장)에게 무력 피해(140%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.4, target: 'leader' }] },
    c_cheer: { name: '독려', common: true, type: 'command', desc: '전투 내내 아군 전체의 공격을 8% 올린다.',
      effects: [{ k: 'buff', stat: 'atk', val: 0.08, dur: 99, target: 'allies' }] },
    c_wall: { name: '철벽', common: true, type: 'command', desc: '전투 내내 자신이 받는 피해를 15% 줄인다.',
      effects: [{ k: 'buff', stat: 'def', val: 0.15, dur: 99, target: 'self' }] },
    c_raid: { name: '기습', common: true, type: 'active', rate: 0.40, desc: '무작위 적에게 무력 피해(150%)를 준다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 1.5, target: 'random' }] },
    c_confuse: { name: '교란', common: true, type: 'active', rate: 0.35, desc: '무작위 적 2명을 70% 확률로 1턴간 침묵시킨다.',
      effects: [{ k: 'status', s: 'silence', dur: 1, chance: 0.7, target: 'random2' }] },
    c_relief: { name: '구휼', common: true, type: 'active', rate: 0.35, desc: '병력 비율이 가장 낮은 아군의 병력을 회복시킨다(120%).',
      effects: [{ k: 'heal', coef: 1.2, target: 'lowest' }] },
    c_swift: { name: '선제', common: true, type: 'command', desc: '전투 내내 자신의 속도를 40 올린다.',
      effects: [{ k: 'buff', stat: 'spd', val: 40, dur: 99, target: 'self' }] },
    c_chain: { name: '연환계', common: true, type: 'active', rate: 0.30, desc: '맨 앞 적에게 무력 피해(80%)를 주고, 80% 확률로 1턴간 기절시킨다.',
      effects: [{ k: 'dmg', stat: 'str', coef: 0.8, target: 'front' }, { k: 'status', s: 'stun', dur: 1, chance: 0.8, target: 'same' }] }
  });
  Object.keys(T).forEach(function (id) { T[id].id = id; });
  SGK.COMMON_TACTICS = Object.keys(T).filter(function (id) { return T[id].common; });

  /* ---------- 무장 ----------
   * str 무력 / int 지력 / lead 통솔(방어) / spd 속도. 기준은 1레벨 수치. */
  function G(id, name, nation, star, troop, str, int, lead, spd, tactic, bio) {
    return { id: id, name: name, nation: nation, star: star, troop: troop, str: str, int: int, lead: lead, spd: spd, tactic: tactic, bio: bio };
  }
  var list = [
    /* 고구려 */
    G('gwanggaeto', '광개토대왕', 'gogu', 5, 'cav', 108, 86, 100, 96, 'yeongnak', '고구려 19대 왕(재위 391~412). 영락 연호를 쓰며 요동과 한강 이북으로 영토를 크게 넓혔다.'),
    G('eulji', '을지문덕', 'gogu', 5, 'arc', 84, 110, 98, 90, 'salsu', '612년 살수에서 수나라 별동대를 크게 무찌른 장수.'),
    G('yeongaesomun', '연개소문', 'gogu', 5, 'spr', 110, 82, 96, 94, 'bido', '642년 정변으로 집권한 대막리지. 당나라의 침입에 맞섰다.'),
    G('yangmanchun', '양만춘', 'gogu', 4, 'arc', 88, 84, 102, 72, 'ansi', '645년 안시성 전투의 성주로 전해지는 인물. 이름은 후대 기록에 전한다.'),
    G('ondal', '온달', 'gogu', 4, 'cav', 100, 60, 90, 92, 'adan', '평원왕의 사위로 전해지는 장수. 아단성에서 전사했다고 한다.'),
    G('jangsu', '장수왕', 'gogu', 4, 'spr', 86, 94, 92, 74, 'namjin', '고구려 20대 왕. 427년 평양으로 천도하고 475년 백제 한성을 함락했다.'),
    G('eulpaso', '을파소', 'gogu', 3, 'arc', 52, 96, 80, 70, 'jindae', '고국천왕 때의 국상. 194년 진대법을 실시했다.'),
    G('myeongnim', '명림답부', 'gogu', 3, 'spr', 76, 88, 78, 62, 'cheongya', '172년 좌원에서 한나라 군을 청야 전술로 물리쳤다고 전하는 국상.'),
    G('gangisik', '강이식', 'gogu', 3, 'cav', 90, 62, 76, 80, 'imyu', '598년 수나라와의 전쟁에서 활약했다고 전해지는 장수.'),

    /* 백제 */
    G('geunchogo', '근초고왕', 'baek', 5, 'cav', 104, 94, 98, 94, 'pyeongyang', '백제 13대 왕. 371년 평양성을 공격해 고구려 고국원왕을 전사시켰다.'),
    G('gyebaek', '계백', 'baek', 5, 'spr', 108, 78, 108, 92, 'hwangsan', '660년 황산벌에서 5천 결사대로 신라군에 맞선 장군.'),
    G('muryeong', '무령왕', 'baek', 5, 'arc', 86, 106, 100, 88, 'gaengwi', '백제 25대 왕. 나라를 다시 일으켜 "다시 강국이 되었다"고 선언했다.'),
    G('seong', '성왕', 'baek', 4, 'arc', 92, 90, 86, 78, 'gwansan', '백제 26대 왕. 538년 사비로 천도했고 554년 관산성에서 전사했다.'),
    G('mu', '무왕', 'baek', 4, 'cav', 80, 100, 84, 84, 'seodong', '백제 30대 왕. 서동 설화의 주인공으로 전하며 신라를 자주 공격했다.'),
    G('heukchi', '흑치상지', 'baek', 4, 'spr', 96, 72, 98, 78, 'imjon', '백제 멸망 후 임존성에서 부흥군을 일으킨 장수.'),
    G('yunchung', '윤충', 'baek', 3, 'spr', 92, 64, 78, 74, 'daeya', '642년 신라 대야성을 함락한 장군.'),
    G('boksin', '복신', 'baek', 3, 'arc', 74, 84, 82, 66, 'juryu', '주류성을 근거지로 부흥 운동을 이끈 왕족.'),
    G('jisusin', '지수신', 'baek', 3, 'cav', 82, 60, 92, 72, 'bulgul', '임존성에서 끝까지 항전한 부흥군 장수.'),

    /* 신라 */
    G('kimyusin', '김유신', 'silla', 5, 'cav', 108, 90, 102, 92, 'samhan', '신라의 삼국 통일 전쟁을 이끈 장군.'),
    G('seondeok', '선덕여왕', 'silla', 5, 'arc', 70, 110, 102, 92, 'jigi', '신라 27대 왕. 앞일을 세 번 내다보았다는 지기삼사 일화가 전한다.'),
    G('jinheung', '진흥왕', 'silla', 5, 'spr', 102, 92, 100, 90, 'sunsu', '신라 24대 왕. 한강 유역을 차지하고 넓힌 영토에 순수비를 세웠다.'),
    G('kimchunchu', '김춘추', 'silla', 4, 'spr', 74, 100, 94, 76, 'nadang', '신라 29대 태종무열왕. 648년 당나라와 동맹을 맺었다.'),
    G('isabu', '이사부', 'silla', 4, 'arc', 86, 96, 88, 78, 'mogu', '512년 나무 사자를 앞세운 계책으로 우산국을 복속시킨 장군.'),
    G('munmu', '문무왕', 'silla', 4, 'cav', 94, 86, 90, 80, 'maeso', '신라 30대 왕. 고구려를 무너뜨리고 당나라 군을 몰아내 통일을 완수했다.'),
    G('gwanchang', '관창', 'silla', 3, 'cav', 94, 58, 70, 88, 'hwarang', '660년 황산벌에서 적진에 뛰어들어 전사한 화랑.'),
    G('sadaham', '사다함', 'silla', 3, 'spr', 86, 66, 76, 82, 'jeondan', '562년 대가야 정벌에서 선봉으로 공을 세운 화랑.'),
    G('geochilbu', '거칠부', 'silla', 3, 'arc', 60, 94, 80, 68, 'guksa', '545년 왕명으로 역사서 "국사"를 편찬한 재상.')
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
    var m = (1 + 0.025 * (lv - 1)) * (1 + 0.04 * (adv || 0));
    return {
      str: Math.round(g.str * m), int: Math.round(g.int * m),
      lead: Math.round(g.lead * m), spd: Math.round(g.spd * m),
      maxTroops: Math.round((6000 + 100 * lv) * (1 + 0.03 * (adv || 0)))
    };
  };

  /* ---------- 스테이지 (역사 속 전장 이름을 빌린 가상 모의전) ----------
   * team 순서: [선봉, 중군, 본영(대장)] */
  function S(name, lv, team, equip) { return { name: name, lv: lv, team: team, equip: equip || {} }; }
  SGK.STAGES = [
    S('국내성 수련전', 1, ['gangisik', 'myeongnim', 'eulpaso']),
    S('위례성 전초전', 3, ['jisusin', 'yunchung', 'boksin']),
    S('서라벌 화랑 대련', 5, ['gwanchang', 'sadaham', 'geochilbu']),
    S('관미성 공방전', 8, ['yunchung', 'mu', 'seong']),
    S('아단성 전투', 10, ['ondal', 'gangisik', 'jangsu']),
    S('관산성 전투', 13, ['gwanchang', 'kimchunchu', 'isabu'], { isabu: 'c_fire' }),
    S('대야성 전투', 16, ['heukchi', 'yunchung', 'mu'], { heukchi: 'c_wall' }),
    S('안시성 전투', 20, ['myeongnim', 'jangsu', 'yangmanchun'], { yangmanchun: 'c_relief' }),
    S('살수 대첩', 24, ['ondal', 'yeongaesomun', 'eulji'], { ondal: 'c_swift' }),
    S('황산벌 전투', 28, ['heukchi', 'seong', 'gyebaek'], { gyebaek: 'c_wall', seong: 'c_raid' }),
    S('삼한일통의 시험', 33, ['jinheung', 'seondeok', 'kimyusin'], { kimyusin: 'c_chain', jinheung: 'c_cheer' }),
    S('영락대제의 시험', 38, ['yeongaesomun', 'eulji', 'gwanggaeto'], { gwanggaeto: 'c_cheer', eulji: 'c_fire', yeongaesomun: 'c_raid' })
  ];
  SGK.stageReward = function (index, firstClear) {
    return { gold: firstClear ? 300 + index * 20 : 60, exp: 80 + 40 * (index + 1) };
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.SGK; }
