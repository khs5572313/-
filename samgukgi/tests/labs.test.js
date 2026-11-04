// 병종 실험실이 설계 기대대로 나오는지 검증 (표준 장수·버프 없음 → 병종과 지형만의 효과)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/index.js';
import labs from '../src/data/scenarios/labs.js';
import { runMany } from '../src/sim.js';

const N = 20;
for (const lab of labs) {
  test(`${lab.title}`, () => {
    const r = runMany(lab, data, N, 500);
    const a = r.lab_a ?? 0;
    if (lab.expect.winner === 'lab_a') assert.ok(a >= 0.7, `청군 승률 ${a}`);
    else if (lab.expect.winner === 'lab_b') assert.ok(a <= 0.3, `청군 승률 ${a}`);
    else if (lab.id === 'lab-mixed') assert.ok(a >= 0.25 && a <= 0.75, `대칭전 청군 승률 ${a}`);
  });
}
