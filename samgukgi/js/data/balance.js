/* 나라 간 능력치 보정 (v1.4)
 * 문제: 신라는 승려·여인·순국 화랑이 많아 통솔·무력 하위층이 두텁고(통솔 평균 54 vs 61), 무력 80 이상이 9명(고구려 18, 백제 21)뿐이었다.
 *       반대로 고구려는 가상 책사가 몰려 지력 80 이상이 26명이었다.
 * 방법: 능력치마다 삼국 300명을 합친 공통 분포를 만들고, 각 나라 안의 순위(백분위)를 그 공통 분포에 대응시킨 값과
 *       원래 값을 85:15로 섞는다. → 나라 간 분포는 거의 같아지고, 나라 안 인물 순위는 그대로 유지된다(김유신은 여전히 신라 최고 통솔).
 * 원래 값은 o.s0 에 보관한다(인물 정보 화면에 함께 표시). */
(function () {
  const N3 = ['goguryeo', 'baekje', 'silla'];
  const W = 0.85;
  const list = SGK.OFFICERS.filter((o) => N3.includes(o.nation));
  list.forEach((o) => { o.s0 = o.s.slice(); });
  for (let i = 0; i < 4; i++) {
    const pooled = list.map((o) => o.s0[i]).sort((a, b) => a - b);
    const q = (p) => {
      const x = p * (pooled.length - 1), lo = Math.floor(x), hi = Math.ceil(x);
      return pooled[lo] + (pooled[hi] - pooled[lo]) * (x - lo);
    };
    for (const n of N3) {
      const l = list.filter((o) => o.nation === n).sort((a, b) => a.s0[i] - b.s0[i]);
      const m = l.length;
      /* 같은 값끼리는 같은 목표값(평균 백분위)을 받도록 묶는다 */
      let r = 0;
      while (r < m) {
        let e = r;
        while (e + 1 < m && l[e + 1].s0[i] === l[r].s0[i]) e++;
        const p = m > 1 ? (r + e) / 2 / (m - 1) : 0.5;
        const t = q(p);
        for (let k = r; k <= e; k++) l[k].s[i] = Math.max(1, Math.min(100, Math.round(W * t + (1 - W) * l[k].s0[i])));
        r = e + 1;
      }
    }
  }
  SGK.STAT_BALANCE = { weight: W, note: '나라 간 분포 보정 85% 적용 (원래 값은 인물 정보에 표시)' };
})();
