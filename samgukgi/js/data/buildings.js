/* 도시 건축물 — 9종 + 국가별 불가사의 1종 (v1.4에서 23종 → 12종으로 통합)
 * eff 키: food·gold(생산 %), iron·wood(+/턴), agriG·commG·techG(성장 %), order(민심/턴), wallMax, def(수비 %),
 *        recruit(징병 %), train(훈련/턴), trade(특산품 무역 %), supply(원정 식량 절감), naval, cavCost, bowAtk, alert, exp
 * only: 건설 가능한 도시 유형 / port: 항구 필요 / nation: 국가 전용 / wonder: 국가당 1개 */
SGK.BUILDINGS = {
  field:    { name: '전답', hanja: '田畓', cat: '내정', cost: { gold: 250, wood: 100 }, eff: { food: 0.3, agriG: 0.2 }, desc: '논밭과 저수지(벽골제·의림지 같은 수리시설). 식량 +30%, 농업 성장 +20%.' },
  market:   { name: '시전', hanja: '市廛', cat: '내정', cost: { gold: 300, wood: 100 }, eff: { gold: 0.25, commG: 0.2, trade: 0.4, supply: 1 }, desc: '상설 시장과 역참. 돈 +25%, 특산품 무역 +40%, 원정 식량 -20%. (신라 동시 509년)' },
  mine:     { name: '광산·벌목장', hanja: '鑛山', cat: '내정', cost: { gold: 300, wood: 50 }, eff: { iron: 50, wood: 60, techG: 0.05 }, desc: '철 +50/턴, 목재 +60/턴.' },
  workshop: { name: '공방', hanja: '工房', cat: '기술', cost: { gold: 350, wood: 150, iron: 50 }, eff: { techG: 0.3, bowAtk: 0.05 }, desc: '장인 공방·궁시방. 기술 성장 +30%, 궁병 +5%. 공성병·노병·강궁대·천보노대 징병 가능.' },
  shipyard: { name: '조선소', hanja: '造船所', cat: '기술', cost: { gold: 400, wood: 300 }, eff: { naval: 0.1 }, port: true, desc: '항구 전용. 수군 징병 가능, 수상전 +10%.' },
  barracks: { name: '병영', hanja: '兵營', cat: '군사', cost: { gold: 300, wood: 150 }, eff: { recruit: 0.5, train: 3, exp: 1 }, desc: '징병량 +50%, 매 턴 훈련도 +3, 장수 성장. 결사대·조의선인 징병 가능.', alias: { goguryeo: '병영·경당', silla: '병영·화랑 수련장' } },
  stable:   { name: '목장', hanja: '牧場', cat: '군사', cost: { gold: 350, wood: 100 }, eff: { cavCost: -0.1 }, desc: '군마 사육. 기병·개마무사·화랑 기마대 징병 가능, 기병 비용 -10%.' },
  chi:      { name: '성곽', hanja: '雉·甕城', cat: '군사', cost: { gold: 400, wood: 200, iron: 50 }, eff: { wallMax: 300, def: 0.12, alert: 1 }, desc: '치(雉)·옹성·봉수대. 성벽 상한 +300, 수비 +12%, 수비전 1턴째 지휘력 +1.' },
  temple:   { name: '사찰', hanja: '寺刹', cat: '문화', cost: { gold: 350, wood: 200 }, eff: { order: 3 }, desc: '민심 +3/턴. 승려 인재 탐색 확률 상승.' },
  /* 국가별 불가사의 (수도 전용, 국가당 1개) */
  w_cheolli:   { name: '천리장성', hanja: '千里長城', cat: '불가사의', wonder: true, nation: 'goguryeo', cost: { gold: 3000, wood: 2500, iron: 300 }, eff: { order: 2, defAll: 0.1 }, desc: '631~647년 축조된 부여성~비사성 장성. 전국 수비 +10%.' },
  w_hwangnyong:{ name: '황룡사 9층목탑', hanja: '皇龍寺九層木塔', cat: '불가사의', wonder: true, nation: 'silla', cost: { gold: 2800, wood: 3000 }, eff: { order: 5, defAll: 0.1 }, desc: '645년 완공(자장 건의). 9층은 이웃 9개 나라의 복속을 기원. 전국 수비 +10%, 민심 +5.' },
  w_mireuk:    { name: '미륵사', hanja: '彌勒寺', cat: '불가사의', wonder: true, nation: 'baekje', cost: { gold: 2600, wood: 2000, iron: 200 }, eff: { order: 4, techAll: 0.15 }, desc: '무왕대 익산 창건. 639년 서탑 사리봉안기 출토. 전국 기술 +15%, 민심 +4.' },
  w_canal:     { name: '대운하 보급선', hanja: '大運河', cat: '불가사의', wonder: true, nation: 'sui|tang', cost: { gold: 3000, wood: 1500 }, eff: { supplyAll: 1 }, desc: '(확장판) 수 양제의 영제거. 원정 식량 -30%.' },
};
SGK.BUILD_CATS = ['내정', '기술', '군사', '문화', '불가사의'];
SGK.buildingName = (bid, nation) => {
  const b = SGK.BUILDINGS[bid];
  if (!b) return bid;
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
  if ((type === 'wall' || type === 'pass') && !['chi', 'barracks', 'mine'].includes(bid) && !b.wonder) return '장성·관문은 군사 시설만 가능';
  return null;
};
