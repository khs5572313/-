// 기본 3병종. 국가별 특수 병종은 두지 않는다
// (국가 색깔 = 국가 전체 버프, 병종 특화 = 무장 특기).
//
// 축척(설계 기준, docs/GDD_M0.md §3.1):  1칸 ≈ 6km,  1턴 ≈ 하루
// 이동력(MP)은 '평지 1칸 = 2MP' 단위. 2MP 단위로 쪼개야 산·숲·습지에서
// 병종별 속도 차이를 정밀하게 표현할 수 있다.
//   보병(창·궁) 6MP → 평지 3칸 ≈ 18km/일   (치중대를 동반한 군대의 통상 행군 속도 범위)
//   기병        10MP → 평지 5칸 ≈ 30km/일   (보병과 함께 작전하는 기병의 지속 속도)
export const units = {
  cavalry: { name: '기병', short: '기', atk: 1.15, def: 0.9, move: 10, range: 1 },
  spear:   { name: '창병', short: '창', atk: 1.0, def: 1.15, move: 6, range: 1 },
  // 궁병: 사거리 2. 거리 2 사격은 반격을 받지 않지만 화력 85%(combat.js RANGED_FALLOFF).
  // 인접(거리 1)하면 근접전에 말려들어 공격력 75%.
  archer:  { name: '궁병', short: '궁', atk: 1.0, def: 0.8, move: 6, range: 2, adjacentMul: 0.75 },
  // 공성병기(충차·포차): 사람에게는 약하고 성벽에 강하다. 하루 2칸, 산·습지·여울 진입 불가
  siege:   { name: '공성병기', short: '공', atk: 0.5, def: 0.6, move: 4, range: 2, adjacentMul: 0.7 },
};

// 성벽 피해: 병력 5000 기준 1회 공격당 성벽 내구도 감소량
export const wallDamage = { cavalry: 1, spear: 3, archer: 1, siege: 20 };

// 배: 승선한 부대의 이동력과 전투 배율
export const ship = {
  move: 8, // 물 1칸 = 2MP → 하루 4칸 ≈ 24km
  atk: { cavalry: 0.4, spear: 0.6, archer: 0.9, siege: 0.3 }, // 배 위에서는 궁병만 제 힘
  def: 0.6,
};

// 상성표 counter[공격 병종][방어 병종]
// 창병 > 기병 > 궁병 > 창병  (1.2 / 0.85: 동일 능력치면 상성이 결정적,
// 무력·통솔 90·적성 S 명장은 역상성에서도 대등 — tools/balance.js로 검증)
export const counter = {
  cavalry: { cavalry: 1.0, spear: 0.85, archer: 1.2, siege: 1.2 },
  spear:   { cavalry: 1.2, spear: 1.0, archer: 0.85, siege: 1.2 },
  archer:  { cavalry: 0.85, spear: 1.2, archer: 1.0, siege: 1.2 },
  siege:   { cavalry: 1.0, spear: 1.0, archer: 1.0, siege: 1.0 },
};
