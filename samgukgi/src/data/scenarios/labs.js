// 병종 실험실: 무장 능력치를 모두 같게(표준 장수 70·적성 B·특기 없음, 국가 버프 없음) 두고
// 병종 상성·이동력·사거리·지형 효과만 따로 떼어 확인하는 자동 대전 시나리오.
// expect: 설계상 기대 결과 (tests/labs.test.js 가 실제 승률로 검증)
const W = 16;
const plains = () => Array(9).fill('.'.repeat(W));
const std = (nation, type, col, row, extra = {}) =>
  ({ general: 'lab_std', nation, type, troops: 5000, col, row, ...extra });
const base = (o) => ({ territory: [], castles: [], sides: ['lab_a', 'lab_b'], turnLimit: 25, ...o });

export default [
  base({
    id: 'lab-mixed', title: '실험 1 · 혼성 3:3 (평지)',
    desc: '양쪽 모두 기병·창병·궁병 1부대씩. AI가 상성에 맞는 상대를 골라 붙는지 봅니다.',
    expect: { winner: null, text: '대칭 구성이므로 승률 50% 안팎이 정상입니다.' },
    rows: plains(),
    units: [
      std('lab_a', 'cavalry', 2, 2), std('lab_a', 'spear', 2, 4), std('lab_a', 'archer', 1, 6),
      // 짝수 행에서 col → 15−col 이면 헥스 격자에서도 정확한 좌우 대칭
      std('lab_b', 'cavalry', 13, 2), std('lab_b', 'spear', 13, 4), std('lab_b', 'archer', 14, 6),
    ],
  }),
  base({
    id: 'lab-cav-arc', title: '실험 2 · 기병 vs 궁병 (평지)',
    desc: '기병 2 대 궁병 2. 기병은 하루 5칸, 궁병은 3칸. 궁병이 한 번 쏘는 사이 기병이 거리를 좁혀 덮칩니다.',
    expect: { winner: 'lab_a', text: '기병(청군) 우세' },
    rows: plains(),
    units: [
      std('lab_a', 'cavalry', 2, 3), std('lab_a', 'cavalry', 2, 5),
      std('lab_b', 'archer', 13, 3), std('lab_b', 'archer', 13, 5),
    ],
  }),
  base({
    id: 'lab-spr-cav', title: '실험 3 · 창병 vs 기병 (평지)',
    desc: '창병 2 대 기병 2. 기병이 먼저 돌격해 와도 창병의 방어와 반격(×1.2)에 막힙니다.',
    expect: { winner: 'lab_a', text: '창병(청군) 우세' },
    rows: plains(),
    units: [
      std('lab_a', 'spear', 2, 3), std('lab_a', 'spear', 2, 5),
      std('lab_b', 'cavalry', 13, 3), std('lab_b', 'cavalry', 13, 5),
    ],
  }),
  base({
    id: 'lab-arc-spr', title: '실험 4 · 궁병 vs 창병 (평지)',
    desc: '궁병 2 대 창병 2. 둘 다 하루 3칸이라 궁병이 거리 2에서 반격 없이 먼저 쏩니다.',
    expect: { winner: 'lab_a', text: '궁병(청군) 우세' },
    rows: plains(),
    units: [
      std('lab_a', 'archer', 2, 3), std('lab_a', 'archer', 2, 5),
      std('lab_b', 'spear', 13, 3), std('lab_b', 'spear', 13, 5),
    ],
  }),
  base({
    id: 'lab-mountain', title: '실험 5 · 산맥 돌파 (기병의 하마 행군)',
    desc: '청군 기병·창병이 산맥 너머의 궁병을 공격합니다. 기병은 산에서 말을 끌고 걸어 하루 1칸밖에 못 가므로, '
      + '맨 아래 구릉 고개로 크게 돌아가는지 산을 넘는지 지켜보세요. 산 속 하마 기병은 공격 ×0.6, 방어 ×0.8입니다.',
    expect: { winner: null, text: '관찰용. 기병의 우회 경로와 창병의 산길 행군 속도 차이를 확인합니다.' },
    rows: [
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....mmmmm......',
      '.....hhhhh......',
    ],
    units: [
      std('lab_a', 'cavalry', 1, 2), std('lab_a', 'spear', 2, 3),
      std('lab_b', 'archer', 13, 2, { hold: true }), std('lab_b', 'archer', 13, 4, { hold: true }),
    ],
  }),
  base({
    id: 'lab-ford', title: '실험 6 · 도하 전투 (반도이격)',
    desc: '강은 배 없이 건널 수 없고, 가운데 여울 한 곳으로만 건넙니다. 여울에 들어가면 그 턴은 멈추고 '
      + '물속에서 방어 ×0.6이 됩니다. 청군 4부대(2만)가 강을 지키는 적군 3부대(1만5천)를 칩니다. '
      + '먼저 여울에 들어선 부대가 어떻게 되는지, 병력이 많아도 강을 건너는 쪽이 불리한지 지켜보세요.',
    expect: { winner: 'lab_b', text: '수비(적군) 우세. 여울 한 곳으로 몰리면 숫자가 많아도 불리합니다.' },
    rows: [
      '.......~........',
      '.......~........',
      '.......~........',
      '.......~........',
      '.......=........',
      '.......~........',
      '.......~........',
      '.......~........',
      '.......~........',
    ],
    units: [
      std('lab_a', 'spear', 3, 3), std('lab_a', 'spear', 3, 5),
      std('lab_a', 'cavalry', 2, 4), std('lab_a', 'archer', 1, 3),
      // 창병은 여울 출구를 막고, 궁병 둘은 여울을 거리 2에서 겨눈다
      std('lab_b', 'spear', 8, 4, { hold: true }), std('lab_b', 'archer', 8, 2, { hold: true }),
      std('lab_b', 'archer', 8, 6, { hold: true }),
    ],
  }),
  base({
    id: 'lab-highground', title: '실험 7 · 고지의 궁병',
    desc: '적군 궁병 2부대가 산 위에 진을 쳤습니다. 산 위 궁병은 사거리가 3으로 늘고, 산을 오르는 창병은 하루 1칸입니다. '
      + '평지라면 이기는 창병 2부대가 산을 오르며 버틸 수 있을까요?',
    expect: { winner: 'lab_b', text: '고지 궁병(적군) 우세. 평지 상성이 지형으로 뒤집히는지 확인합니다.' },
    rows: [
      '................',
      '..........mm....',
      '.........mmmm...',
      '.........mmmm...',
      '.........mmmm...',
      '..........mm....',
      '................',
      '................',
      '................',
    ],
    units: [
      std('lab_a', 'spear', 2, 2), std('lab_a', 'spear', 2, 6),
      std('lab_b', 'archer', 10, 3, { hold: true }), std('lab_b', 'archer', 11, 4, { hold: true }),
    ],
  }),
];
