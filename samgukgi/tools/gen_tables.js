/* 게임 데이터 → 기획서용 마크다운 표 생성기
 * 사용: node tools/gen_tables.js > docs/데이터표.md */
const fs = require('fs');
const path = require('path');
global.window = {};
const root = path.join(__dirname, '..', 'js');
const files = ['core.js', 'data/nations.js', 'data/map.js', 'data/units.js', 'data/buildings.js', 'data/specials.js', 'data/officers.js', 'data/scenarios.js', 'data/events.js'];
global.SGK = window.SGK = {};
for (const f of files) eval(fs.readFileSync(path.join(root, f), 'utf8'));
const S = window.SGK;
const out = [];
const P = (s) => out.push(s);
const NAT = (n) => (S.NATIONS[n] ? S.NATIONS[n].name : n);

P('# 삼국기 데이터표 (자동 생성)\n');
P('> `node tools/gen_tables.js > docs/데이터표.md` 로 재생성. 게임 데이터(js/data)가 원본이다.\n');

P('## 1. 도시 (' + S.CITIES.length + '곳)\n');
P('| 도시 | 한자 | 유형 | 항구 | 특산품 | 비고 |');
P('|---|---|---|---|---|---|');
for (const c of S.CITIES) P(`| ${c.name} | ${c.hanja} | ${S.CITY_TYPES[c.type].name} | ${({ '': '-', river: '하천', sea: '바다', both: '바다·하천' })[c.port]} | ${c.special ? S.SPECIALS[c.special].name : '-'} | ${c.note} |`);

P('\n## 2. 병종\n');
P('| 병종 | 한자 | 계열 | 공 | 방 | 전용 | 비용(1,000명) | 조건 | 설명 |');
P('|---|---|---|---|---|---|---|---|---|');
for (const id of S.UNIT_ORDER) {
  const u = S.UNITS[id];
  const cost = Object.entries(u.cost).filter(([, v]) => v).map(([k, v]) => `${({ gold: '돈', food: '식량', iron: '철', wood: '목재' })[k]}${v}`).join(' ');
  const req = u.req ? [u.req.bld ? S.BUILDINGS[u.req.bld].name : '', u.req.tech ? `기술${u.req.tech}` : ''].filter(Boolean).join('+') : '-';
  P(`| ${u.name} | ${u.hanja} | ${({ cav: '기병', spear: '창병', bow: '궁병', siege: '공성', navy: '수군' })[u.cls]} | ${Math.round(u.atk * 100)} | ${Math.round(u.def * 100)} | ${u.nation ? u.nation.split('|').map(NAT).join('·') : '공통'} | ${cost} | ${req} | ${u.desc} |`);
}

P('\n## 3. 건축물\n');
P('| 분류 | 건물 | 한자 | 비용 | 효과·설명 | 제한 |');
P('|---|---|---|---|---|---|');
for (const [id, b] of Object.entries(S.BUILDINGS)) {
  const cost = Object.entries(b.cost).map(([k, v]) => `${({ gold: '돈', food: '식량', iron: '철', wood: '목재' })[k]}${v}`).join(' ');
  const lim = [b.only ? b.only.map((t) => S.CITY_TYPES[t].name).join('·') + ' 전용' : '', b.port ? '항구 전용' : '', b.nation ? b.nation.split('|').map(NAT).join('·') + ' 전용' : '', b.wonder ? '수도·국가당 1개' : ''].filter(Boolean).join(', ') || '-';
  P(`| ${b.cat} | ${b.name}${b.alias ? ` (${Object.entries(b.alias).map(([n, a]) => `${NAT(n)}: ${a}`).join(', ')})` : ''} | ${b.hanja} | ${cost} | ${b.desc} | ${lim} |`);
}

P('\n## 4. 인물 (' + S.OFFICERS.length + '명)\n');
P('★ = 설화·야사 인물. 능력치 순서: 통솔/무력/지력/정치.\n');
for (const n of ['goguryeo', 'baekje', 'silla', 'sui', 'tang', 'wa', 'mohe']) {
  const list = S.OFFICERS.filter((o) => o.nation === n);
  P(`\n### ${NAT(n)} (${list.length}명)\n`);
  P('| 인물 | 한자 | 생몰(추정) | 통 | 무 | 지 | 정 | 특수능력 | 전용 카드 | 출전 |');
  P('|---|---|---|---|---|---|---|---|---|---|');
  for (const o of list) {
    const sp = S.SPECIALS_AB[o.sp];
    P(`| ${o.legend ? '★' : ''}${o.name} | ${o.hanja} | ${o.b}~${o.d} | ${o.s.join(' | ')} | ${sp ? sp.name : '-'} | ${sp && sp.card ? `「${sp.card.name}」 ${sp.card.desc}` : '-'} | ${o.src} |`);
  }
}

P('\n## 5. 인물 연계 (' + S.LINKS.length + '종)\n');
P('| 연계 | 관계 | 인물 | 효과 | 합격기 | 근거 |');
P('|---|---|---|---|---|---|');
for (const l of S.LINKS) P(`| ${l.legend ? '★' : ''}${l.name} | ${l.type} | ${l.members.map((m) => S.officerById[m].name).join(' · ')} | ${l.bonus > 0 ? '+' : ''}${Math.round(l.bonus * 100)}%${l.neg ? ' (불화)' : ''} | ${l.card ? `「${l.card.name}」` : '-'} | ${l.src} — ${l.desc} |`);

P('\n## 6. 이벤트 (' + S.EVENTS.length + '종)\n');
P('| 시기 | 이벤트 | 구분 | 관련국 | 선택지 | 출전 |');
P('|---|---|---|---|---|---|');
for (const e of S.EVENTS) P(`| ${e.when.y}${e.when.to && e.when.to !== e.when.y ? `~${e.when.to}` : ''} | ${e.title} | ${e.kind === 'legend' ? '설화·야사' : '정사'} | ${e.who.map((w) => (w === 'all' ? '전체' : NAT(w))).join('·')} | ${e.choices.map((c) => c.label).join(' / ')} | ${e.src} |`);

P('\n## 7. 시나리오\n');
for (const sc of S.SCENARIOS) {
  P(`\n### 제${sc.no}장 ${sc.year}년 「${sc.title}」 — ${sc.sub}\n`);
  P(sc.desc + '\n');
  P(`- 사료: ${sc.hist}`);
  P(`- 플레이 가능: ${sc.playable.map(NAT).join(', ')} / 종료: ${sc.endYear}년`);
  for (const n of sc.playable) P(`- ${NAT(n)} 승리 조건: ${(sc.goals[n] || []).map((g) => g.desc).join(', ')}`);
}
console.log(out.join('\n'));
