// 기본 3병종. 국가별 특수 병종은 두지 않는다
// (국가 색깔 = 국가 전체 버프, 병종 특화 = 무장 특기).
export const units = {
  cavalry: { name: '기병', short: '기', atk: 1.15, def: 0.9, move: 5, range: 1 },
  spear:   { name: '창병', short: '창', atk: 1.0, def: 1.15, move: 3, range: 1 },
  archer:  { name: '궁병', short: '궁', atk: 1.0, def: 0.8, move: 3, range: 2, adjacentMul: 0.75 },
};

// 상성표 counter[공격 병종][방어 병종]
// 창병 > 기병 > 궁병 > 창병  (1.2 / 0.85: 동일 능력치면 상성이 결정적,
// 무력·통솔 90·적성 S 명장은 역상성에서도 약 45% — tools/balance.js로 검증)
export const counter = {
  cavalry: { cavalry: 1.0, spear: 0.85, archer: 1.2 },
  spear:   { cavalry: 1.2, spear: 1.0, archer: 0.85 },
  archer:  { cavalry: 0.85, spear: 1.2, archer: 1.0 },
};
