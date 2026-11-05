// ───────────────────────────────────────────────────────────────
//  util.js — 결정론적 난수 / 노이즈 / 키프레임 트랙 / 이징
//  (모든 상태는 시간 t의 순수함수 → 어느 프레임으로 seek해도 동일한 그림)
// ───────────────────────────────────────────────────────────────
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (e0, e1, x) => { const u = clamp((x - e0) / (e1 - e0)); return u * u * (3 - 2 * u); };
export const fract = (x) => x - Math.floor(x);

export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f + i * 17.31, y * f - i * 9.17); n += a; f *= 2.03; a *= 0.5; }
  return s / n;
}

// ── 이징: 셀 애니 원화-중간화 감각(소프트웨어식 매끈한 이징 금지 → 단계화와 함께 사용)
export const E = {
  lin: (u) => u,
  hold: (u) => (u < 1 ? 0 : 1),
  io: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  in: (u) => u * u * u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  // 무거운 기계: 오래 버티다 힘이 붙고, 끝에서 살짝 넘쳤다 가라앉음
  heavy: (u) => {
    return u < 0.62 ? Math.pow(u / 0.62, 2.4) * 0.78 : 0.78 + (1 - Math.pow(1 - (u - 0.62) / 0.38, 2)) * 0.22;
  },
  settle: (u) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  snap: (u) => 1 - Math.pow(1 - u, 5),
};

function mixv(a, b, u) {
  if (typeof a === 'number') return a + (b - a) * u;
  const r = new Array(a.length);
  for (let i = 0; i < a.length; i++) r[i] = a[i] + (b[i] - a[i]) * u;
  return r;
}
// keys: [[t, value, easeOfSegmentStartingHere], ...]
export function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (t < b[0]) {
        const u = (t - a[0]) / (b[0] - a[0]);
        return mixv(a[1], b[1], E[a[2] || 'io'](u));
      }
    }
    return keys[keys.length - 1][1];
  };
}
export const q2 = (t) => Math.floor(t * 12 + 1e-6) / 12; // on twos
export const q3 = (t) => Math.floor(t * 8 + 1e-6) / 8;   // on threes
export const q1 = (t) => Math.floor(t * 24 + 1e-6) / 24; // on ones

// Catmull-Rom 경로 (시간 키 포함): pts: [[t,[x,y,z]],...]
export function pathTrack(pts) {
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1].slice();
    const n = pts.length;
    if (t >= pts[n - 1][0]) return pts[n - 1][1].slice();
    let i = 0; while (i < n - 2 && t >= pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)][1], p1 = pts[i][1], p2 = pts[i + 1][1], p3 = pts[Math.min(n - 1, i + 2)][1];
    const u = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
    const u2 = u * u, u3 = u2 * u;
    const r = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      r[k] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
    }
    return r;
  };
}
