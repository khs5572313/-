/* 도시 건축물
 * eff: 턴당 효과 키 — food(식량 %), gold(돈 %), iron(철 +), wood(목재 +), agriG/commG/techG(성장 %), order(민심 +),
 *      wallMax(성벽 상한 +), def(수비 %), recruit(징병 %), naval, exp(장수 경험)
 * only: 건설 가능한 도시 유형 / port: 항구 필요 / nation: 국가 전용 / wonder: 국가당 1개 */
SGK.BUILDINGS = {
  field:    { name: '전답', hanja: '田畓', cat: '농업', cost: { gold: 200, wood: 80 }, eff: { food: 0.2, agriG: 0.2 }, desc: '논밭 개간. 식량 +20%, 농업 성장 +20%.' },
  reservoir:{ name: '저수지', hanja: '堤堰', cat: '농업', cost: { gold: 500, wood: 200 }, eff: { food: 0.35 }, only: ['capital', 'plain'], desc: '벽골제·의림지 같은 수리시설. 식량 +35%.' },
  granary:  { name: '창고', hanja: '倉庫', cat: '농업', cost: { gold: 250, wood: 150 }, eff: { food: 0.1, order: 1 }, desc: '곡물 저장. 고구려는 집집마다 작은 창고 「부경(桴京)」을 두었다(삼국지 동이전).', alias: { goguryeo: '부경(桴京)' } },
  market:   { name: '시전', hanja: '市廛', cat: '상업', cost: { gold: 300, wood: 100 }, eff: { gold: 0.25, commG: 0.2 }, desc: '상설 시장. 신라는 509년 경주에 동시(東市)를 설치.' },
  station:  { name: '역참', hanja: '驛站', cat: '상업', cost: { gold: 250, wood: 80 }, eff: { gold: 0.1, supply: 1 }, desc: '역마·보급로. 원정 식량 소모 -20%.' },
  tradehouse:{ name: '무역관', hanja: '客館', cat: '상업', cost: { gold: 400, wood: 150 }, eff: { trade: 0.6 }, port: true, desc: '항구 전용. 특산품 무역 수입 +60%.' },
  smelter:  { name: '야철소', hanja: '冶鐵所', cat: '기술', cost: { gold: 400, wood: 200 }, eff: { iron: 60, techG: 0.1 }, desc: '철 생산 +60/턴.' },
  lumber:   { name: '벌목장', hanja: '伐木場', cat: '기술', cost: { gold: 150 }, eff: { wood: 70 }, desc: '목재 생산 +70/턴.' },
  workshop: { name: '공방', hanja: '工房', cat: '기술', cost: { gold: 350, wood: 150, iron: 50 }, eff: { techG: 0.3 }, desc: '장인 공방. 기술 성장 +30%, 공성병 징병 가능.' },
  shipyard: { name: '조선소', hanja: '造船所', cat: '기술', cost: { gold: 400, wood: 300 }, eff: { naval: 0.1 }, port: true, desc: '항구 전용. 수군 징병 가능, 수상전 +10%.' },
  barracks: { name: '병영', hanja: '兵營', cat: '군사', cost: { gold: 300, wood: 150 }, eff: { recruit: 0.5, train: 3 }, desc: '징병량 +50%, 매 턴 훈련도 +3.' },
  stable:   { name: '목장', hanja: '牧場', cat: '군사', cost: { gold: 350, wood: 100 }, eff: { cavCost: -0.1 }, desc: '군마 사육. 기병·개마무사·화랑 징병 가능.' },
  bowshop:  { name: '궁시방', hanja: '弓矢坊', cat: '군사', cost: { gold: 250, wood: 150 }, eff: { bowAtk: 0.05 }, desc: '활·화살·쇠뇌 제작. 궁병 +5%, 노병 징병 가능.' },
  chi:      { name: '치·옹성', hanja: '雉·甕城', cat: '군사', cost: { gold: 400, wood: 200, iron: 50 }, eff: { wallMax: 300, def: 0.1 }, desc: '성벽에서 돌출한 치(雉)와 성문을 감싼 옹성. 성벽 상한 +300, 수비 +10%. 고구려 산성의 특징.' },
  beacon:   { name: '봉수대', hanja: '烽燧臺', cat: '군사', cost: { gold: 150, wood: 80 }, eff: { def: 0.05, alert: 1 }, desc: '봉화 경보. 수비전 1턴째 지휘력 +1.' },
  temple:   { name: '사찰', hanja: '寺刹', cat: '문화', cost: { gold: 350, wood: 200 }, eff: { order: 3 }, desc: '민심 +3/턴. 승려 인재 탐색 확률 상승.' },
  school:   { name: '학당', hanja: '扃堂', cat: '문화', cost: { gold: 300, wood: 120 }, eff: { exp: 1 }, desc: '고구려 경당(扃堂)·신라 화랑도 수련장. 장수 성장, 조의선인 징병 가능.', alias: { silla: '화랑 수련장', goguryeo: '경당(扃堂)' } },
  /* 국가별 불가사의 (수도 전용, 국가당 1개) */
  w_cheolli:  { name: '천리장성', hanja: '千里長城', cat: '불가사의', wonder: true, nation: 'goguryeo', cost: { gold: 3000, wood: 2500, iron: 300 }, eff: { order: 2, wallAll: 300 }, desc: '631~647년 축조. 요하선 모든 성 성벽 +300. (천리장성 노드 성벽 최대치)' },
  w_hwangnyong:{ name: '황룡사 9층목탑', hanja: '皇龍寺九層木塔', cat: '불가사의', wonder: true, nation: 'silla', cost: { gold: 2800, wood: 3000 }, eff: { order: 5, defAll: 0.1 }, desc: '645년 완공(자장 건의). 9층은 이웃 9개 나라의 복속을 기원. 전국 수비 +10%.' },
  w_cheomseong:{ name: '첨성대', hanja: '瞻星臺', cat: '불가사의', wonder: true, nation: 'silla', cost: { gold: 1500, wood: 300, iron: 100 }, eff: { techAll: 0.15 }, desc: '선덕여왕대 축조. 전국 기술 성장 +15%.' },
  w_mireuk:   { name: '미륵사', hanja: '彌勒寺', cat: '불가사의', wonder: true, nation: 'baekje', cost: { gold: 2600, wood: 2000, iron: 200 }, eff: { order: 4, techAll: 0.15 }, desc: '무왕대 익산 창건. 639년 서탑 사리봉안기 출토. 전국 기술 +15%.' },
  w_jeongnim: { name: '정림사 5층석탑', hanja: '定林寺五層石塔', cat: '불가사의', wonder: true, nation: 'baekje', cost: { gold: 1600, wood: 400, iron: 100 }, eff: { order: 3 }, desc: '사비 도성 중심 사찰. 민심 +3(전국).' },
  w_canal:    { name: '대운하 보급선', hanja: '大運河', cat: '불가사의', wonder: true, nation: 'sui|tang', cost: { gold: 3000, wood: 1500 }, eff: { supplyAll: 1 }, desc: '수 양제가 완성한 영제거(永濟渠)로 탁군까지 군량 수송. 원정 식량 소모 -30%.' },
};
SGK.BUILD_CATS = ['농업', '상업', '기술', '군사', '문화', '불가사의'];
SGK.buildingName = (bid, nation) => {
  const b = SGK.BUILDINGS[bid];
  return (b.alias && b.alias[nation]) || b.name;
};
SGK.canBuild = (bid, city, cityState, nation) => {
  const b = SGK.BUILDINGS[bid];
  const type = city.type;
  if (b.only && !b.only.includes(type)) return '이 유형의 도시에는 건설할 수 없음';
  if (b.port && !city.port) return '항구 도시 전용';
  if (b.nation && !b.nation.split('|').includes(nation)) return '다른 나라 전용';
  if (b.wonder && type !== 'capital') return '수도 전용';
  if (cityState.buildings.includes(bid)) return '이미 건설됨';
  if (b.wonder) {
    const st = SGK.state;
    for (const cid in st.cities) if (st.cities[cid].owner === nation && st.cities[cid].buildings.includes(bid)) return '국가당 1개';
  }
  if (cityState.buildings.length >= SGK.CITY_TYPES[type].slots) return '건물 슬롯 부족';
  if (type === 'wall' || type === 'pass') { if (!['chi', 'beacon', 'barracks', 'granary'].includes(bid) && !b.wonder) return '장성·관문은 군사 시설만 가능'; }
  return null;
};
