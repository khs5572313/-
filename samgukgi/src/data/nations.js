// 국가 전체 버프: 병종을 가리지 않고 그 나라 모든 부대에 적용된다.
// mods 형식은 무장 특기(skills.js)와 같다 → 하나의 수정치 엔진으로 처리.
//   stat: atk | def | counter | move | range | moraleLoss | moraleRegen | moraleFloor | moraleStart | troops
//   cond: unitType | vsUnitType | terrain[] | ownTerritory | role | afterMove | nearWater | troopsBelow
export default {
  // 병종 실험실 전용: 버프 없는 중립 세력
  lab_a: { name: '청군', color: '#3b82c4', buff: null },
  lab_b: { name: '적군', color: '#c4473b', buff: null },
  goguryeo: {
    name: '고구려', color: '#b8392f',
    buff: {
      name: '산성의 나라',
      desc: '자국 영토의 성·산악·구릉에서 방어 +15%, 자국 영토에서 사기 감소 -15%',
      mods: [
        { stat: 'def', value: 0.15, cond: { ownTerritory: true, terrain: ['castle', 'mountain', 'hills'] } },
        { stat: 'moraleLoss', value: -0.15, cond: { ownTerritory: true } },
      ],
    },
  },
  baekje: {
    name: '백제', color: '#2f6fb8',
    buff: {
      name: '해상 왕국',
      desc: '바다·강에 닿은 칸에서 공격 +10%, 이동력 +2MP(평지 1칸) (수군 체계는 M2에서 확장)',
      mods: [
        { stat: 'atk', value: 0.10, cond: { nearWater: true } },
        { stat: 'move', value: 2, cond: { nearWater: true } },
      ],
    },
  },
  silla: {
    name: '신라', color: '#d19a12',
    buff: {
      name: '화랑도',
      desc: '사기가 30 밑으로 떨어지지 않음(사기 붕괴 패주 없음), 턴마다 사기 회복 +3',
      mods: [
        { stat: 'moraleFloor', value: 30 },
        { stat: 'moraleRegen', value: 3 },
      ],
    },
  },
  sui: {
    name: '수', color: '#5d6f80',
    buff: {
      name: '대운하의 대군',
      desc: '병력 +25%, 자국 영토 밖에서 사기 감소 +20% (원정 피로)',
      mods: [
        { stat: 'troops', value: 0.25 },
        { stat: 'moraleLoss', value: 0.20, cond: { ownTerritory: false } },
      ],
    },
  },
  tang: {
    name: '당', color: '#6b3fa0',
    buff: {
      name: '중원의 대군',
      desc: '병력 +20%, 자국 영토 밖에서 사기 감소 +15% (원정 피로)',
      mods: [
        { stat: 'troops', value: 0.20 },
        { stat: 'moraleLoss', value: 0.15, cond: { ownTerritory: false } },
      ],
    },
  },
  wa: {
    name: '왜', color: '#9a4f86',
    buff: {
      name: '바다 건너온 원군',
      desc: '바다·하천에 닿은 칸에서 공격 +8%',
      mods: [{ stat: 'atk', value: 0.08, cond: { nearWater: true } }],
    },
  },
  balhae: { name: '발해', color: '#2f8f8a', buff: null }, // 국가 버프는 M3에서 설계
  mohe: {
    name: '말갈', color: '#4f8a5b',
    buff: {
      name: '백산의 기마',
      desc: '모든 부대 이동력 +2MP(평지 1칸)',
      mods: [{ stat: 'move', value: 2 }],
    },
  },
};
