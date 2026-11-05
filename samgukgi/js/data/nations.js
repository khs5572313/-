/* 국가 정의
 * major: 플레이 가능 / minor: AI 전용 소세력 */
SGK.NATIONS = {
  goguryeo: { id: 'goguryeo', name: '고구려', hanja: '高句麗', color: '#a3242a', light: '#f0c9c4', dark: '#4a0f12',
    emblem: 'samjogo', major: true, motto: '천손의 나라, 동북아의 패자',
    trait: '산성 방어 +20%, 기병·개마무사 징병비 -15%',
    bonus: { mountainDef: 0.2, cavCost: -0.15 } },
  baekje: { id: 'baekje', name: '백제', hanja: '百濟', color: '#1f4e8c', light: '#c6d6ef', dark: '#0c2246',
    emblem: 'bonghwang', major: true, motto: '바다를 잇는 문화 강국',
    trait: '상업·무역 수입 +20%, 수군 전투력 +10%',
    bonus: { comm: 0.2, naval: 0.1 } },
  silla: { id: 'silla', name: '신라', hanja: '新羅', color: '#c79a1e', light: '#f5e6b8', dark: '#5a4308',
    emblem: 'geumgwan', major: true, motto: '화랑의 기상, 삼한일통',
    trait: '외교 +20%, 장수 성장 +25%(화랑도), 성 수비 +15%(삼년산성·명활산성 등 산성 축조국)',
    bonus: { diplomacy: 0.2, growth: 0.25, cityDef: 0.15 } },
  sui: { id: 'sui', name: '수', hanja: '隋', color: '#5b3f8f', light: '#d9cdee', dark: '#251645',
    emblem: 'dragon', major: true, motto: '백만 대군의 제국',
    trait: '징병량 +30%, 민심 하락 +50% (대운하·원정 피로)',
    bonus: { recruit: 0.3, orderLoss: 0.5 } },
  tang: { id: 'tang', name: '당', hanja: '唐', color: '#2d6a4f', light: '#c7e6d6', dark: '#0e2e20',
    emblem: 'dragon', major: true, motto: '천가한의 세계 제국',
    trait: '공성 +20%, 이민족 기병(돌궐·말갈) 운용',
    bonus: { siege: 0.2 } },
  wa: { id: 'wa', name: '왜', hanja: '倭', color: '#2a7f86', light: '#c3e7ea', dark: '#0d3437',
    emblem: 'sun', major: false, motto: '바다 건너의 동맹', trait: '수군 +15%', bonus: { naval: 0.15 } },
  mohe: { id: 'mohe', name: '말갈', hanja: '靺鞨', color: '#7a5a34', light: '#e8d8c1', dark: '#33240f',
    emblem: 'wolf', major: false, motto: '북방의 기마 부족', trait: '기병 +15%', bonus: { cav: 0.15 } },
  neutral: { id: 'neutral', name: '중립', hanja: '中立', color: '#7d7d7d', light: '#e2e2e2', dark: '#333',
    emblem: 'none', major: false, motto: '', trait: '', bonus: {} },
};
SGK.nationName = (id, st) => {
  const s = st || SGK.state;
  if (s && s.nations && s.nations[id] && s.nations[id].alias) return s.nations[id].alias;
  return SGK.NATIONS[id] ? SGK.NATIONS[id].name : '중립';
};
