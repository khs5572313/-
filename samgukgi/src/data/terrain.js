// 지형표. move: 병종별 이동 비용 / def: 이 칸에 선 방어측 방어 배율
// atk: 이 칸에서 '공격하는' 쪽 병종 배율 / charge: 이 칸으로 '근접 돌입'하는 병종 배율
export default {
  plains:   { name: '평지', char: '.', color: '#cdd89b', move: { cavalry: 1, spear: 1, archer: 1 }, def: 1.0 },
  hills:    { name: '구릉', char: 'h', color: '#b9aa78', move: { cavalry: 2, spear: 2, archer: 2 }, def: 1.15,
              atk: { archer: 1.15 } },
  mountain: { name: '산악', char: 'm', color: '#8c7d64', move: { cavalry: 4, spear: 3, archer: 3 }, def: 1.3,
              atk: { cavalry: 0.6 }, charge: { cavalry: 0.6 } },
  forest:   { name: '숲', char: 'f', color: '#6f9a5a', move: { cavalry: 2, spear: 2, archer: 2 }, def: 1.15,
              atk: { archer: 0.85 }, charge: { cavalry: 0.8 } },
  marsh:    { name: '습지(요택)', char: 'w', color: '#86ab9f', move: { cavalry: 3, spear: 2, archer: 2 }, def: 0.85,
              atk: { cavalry: 0.7 }, charge: { cavalry: 0.7 } },
  river:    { name: '하천', char: '~', color: '#6aa3d6', move: { cavalry: 3, spear: 3, archer: 3 }, def: 0.8,
              atk: { cavalry: 0.8, spear: 0.8, archer: 0.8 } },
  sea:      { name: '바다', char: 'S', color: '#3d6ea8', move: {}, def: 1.0, impassable: true },
  castle:   { name: '성', char: 'C', color: '#c9a64e', move: { cavalry: 1, spear: 1, archer: 1 }, def: 1.65,
              charge: { cavalry: 0.7 }, supply: 0.025 }, // supply: 자국 성에 있는 부대는 턴마다 최대 병력의 2.5% 회복
};
