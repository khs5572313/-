// 인물 명단과 근거를 ROSTER.md 로 뽑는다.  node tools/roster-md.js
const fs = require('fs'), D = require('../js/data.js');
const L = ['# 삼국기 인물 명단과 배분 근거 (7개 진영 × 40인 = 280인)', '',
  '- 모든 인물의 능력치는 **S 1개 · A 2개 · B 1개**이며 같은 등급은 같은 수치(S 95 / A 85 / B 70)다.',
  '- 표의 능력치 순서는 **통솔·무력·지력·정치**. 계략은 이름만 인물 고유이고 효과는 유형별로 같다(유형표는 아래).',
  '- 출전과 근거는 작성자의 사료 지식에 기반해 정리한 것으로, **원문 대조 검수는 아직 하지 않았다.** 설화·후대 기록·논쟁이 있는 경우 근거 칸에 적었다.', '',
  '## 계략 유형표', '', '| 유형 | 기준 능력치 | 재사용 | 효과 |', '|---|---|---:|---|'];
Object.values(D.ARCH).forEach((a) => L.push(`| ${a.label} | ${D.STATS[a.scale].name} | ${a.cd}턴 | ${a.desc} |`));
for (const n of Object.keys(D.ROSTER)) {
  for (const cls of ['m', 'c']) {
    L.push('', `## ${D.NATIONS[n].name} — ${cls === 'm' ? '무인' : '문인'} 20`, '', '| 인물 | 병종 | 통·무·지·정 | 계략 (유형) | 출전 | 배분 근거 |', '|---|---|---|---|---|---|');
    D.ROSTER[n].map((id) => D.GENERALS[id]).filter((g) => g.cls === cls).forEach((g) =>
      L.push(`| **${g.name}** ${g.hanja} | ${D.UNITS[g.unit].name} | ${g.stats.lead}·${g.stats.war}·${g.stats.int}·${g.stats.pol} | ${g.skill.name} (${D.ARCH[g.skill.arch].label}) | ${g.src} | ${g.why} |`));
  }
}
fs.writeFileSync(__dirname + '/../ROSTER.md', L.join('\n') + '\n');
console.log('ROSTER.md', L.length, '줄');
