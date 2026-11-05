// 지형표 — 지형은 장식이 아니라 계산 변수다.
//   move     : 병종별 진입 비용(MP). 평지 1칸 = 2MP. 없으면 진입 불가
//   stopOnEnter: 들어가면 그 턴 이동 종료
//   def      : 이 칸에 선 부대의 방어 배율 (defUnit: 병종별 추가 배율)
//   atk      : 이 칸에서 공격하는 병종의 배율
//   charge   : 이 칸으로 근접 돌입하는 병종의 배율
//   cover    : 이 칸을 향한 원거리 사격의 배율(엄폐)
//   rangeBonus: 이 칸에서 쏘는 병종의 사거리 보너스(고지)
//   dismount : 기병이 이 칸에 있으면 말에서 내려 말을 끌고 걷는 상태(하마)
//   supply   : 자국 성에 있는 부대가 턴마다 회복하는 병력 비율
//   navigable: 배가 다닐 수 있는 물 (강·바다·여울)
//   port     : 나루터·포구. 여기서 인접한 물로 나가면 승선
// 공성병기(siege)는 move 키가 없는 지형(산악·습지)에 들어갈 수 없다
export default {
  plains: { name: '평지', char: '.', color: '#c7d39a',
    move: { cavalry: 2, spear: 2, archer: 2, siege: 2 }, def: 1.0,
    note: '기준 지형. 기병이 감점 없이 제 속도(하루 5칸)를 내는 유일한 지형' },
  hills: { name: '구릉', char: 'h', color: '#b8a774',
    move: { cavalry: 4, spear: 3, archer: 3, siege: 4 }, def: 1.15,
    atk: { archer: 1.15 },
    note: '언덕 위 궁병 공격 ×1.15' },
  mountain: { name: '산악', char: 'm', color: '#8a7b62',
    move: { cavalry: 10, spear: 5, archer: 5 }, def: 1.3,
    atk: { cavalry: 0.6 }, charge: { cavalry: 0.6 }, defUnit: { cavalry: 0.8 },
    rangeBonus: { archer: 1 }, dismount: true,
    note: '기병은 말을 끌고 걸어 하루 1칸(하마). 하마 기병 공격 ×0.6·방어 ×0.8. 산 위 궁병 사거리 +1. 공성병기 진입 불가' },
  forest: { name: '숲', char: 'f', color: '#6f9658',
    move: { cavalry: 5, spear: 3, archer: 3, siege: 5 }, def: 1.15,
    atk: { archer: 0.85 }, charge: { cavalry: 0.8 }, cover: 0.75,
    note: '숲 안의 부대를 향한 사격 ×0.75(엄폐). 기병 돌입 ×0.8' },
  marsh: { name: '습지(요택)', char: 'w', color: '#86a99c',
    move: { cavalry: 8, spear: 4, archer: 4 }, def: 0.85,
    atk: { cavalry: 0.7 }, charge: { cavalry: 0.7 },
    note: '말발굽이 빠진다. 기병 이동 4배, 기병 전투 ×0.7. 공성병기 진입 불가' },
  ford: { name: '여울·나루', char: '=', color: '#9cc3d9',
    move: { cavalry: 4, spear: 4, archer: 4, siege: 4 }, def: 0.6, stopOnEnter: true, navigable: true,
    atk: { cavalry: 0.7, spear: 0.7, archer: 0.7 },
    note: '건널 수 있는 얕은 곳. 들어가면 그 턴 이동 종료. 물속 부대 방어 ×0.6·공격 ×0.7 (반도이격). 공성병기는 분해해 운반하며 건넘' },
  river: { name: '강', char: '~', color: '#5b93c9',
    move: {}, def: 1.0, impassable: true, navigable: true,
    note: '걸어서는 못 건넌다. 여울로 돌아가거나, 나루터에서 배를 타거나, 부교를 놓아야 한다' },
  sea: { name: '바다', char: 'S', color: '#36649b',
    move: {}, def: 1.0, impassable: true, navigable: true,
    note: '나루터·포구에서 배를 타야 들어갈 수 있다. 배 위 부대는 방어 ×0.6' },
  port: { name: '나루터·포구', char: 'P', color: '#d7c08a',
    move: { cavalry: 2, spear: 2, archer: 2, siege: 2 }, def: 1.0, port: true,
    note: '여기서 옆 물칸으로 나가면 배에 오른다(승선에 하루). 상륙은 해안 어디서나 가능' },
  bridge: { name: '부교', char: 'B', color: '#a98a5c',
    move: { cavalry: 3, spear: 3, archer: 3, siege: 4 }, def: 0.8, navigable: true,
    note: '강 위에 띄운 임시 다리. 좁아서 방어 ×0.8. 부교를 놓으려면 강가에서 3일(공병 특기 1일)' },
  castle: { name: '성', char: 'C', color: '#c9a64e',
    move: { cavalry: 2, spear: 2, archer: 2, siege: 2 }, def: 3.0,
    charge: { cavalry: 0.7 }, rangeBonus: { archer: 1 }, supply: 0.03,
    note: '성벽이 온전하면 방어 ×3.0, 성벽이 무너질수록 ×1.0까지 내려간다. 성벽 위 궁병 사거리 +1, 기병 돌입 ×0.7, 자국 성 보급 3%/턴' },
};
