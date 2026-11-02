import type { Rng } from './types.ts';

/** mulberry32: 시드 고정 난수. 같은 시드면 같은 판이 재현된다(버그 재현·회귀 테스트용). */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
