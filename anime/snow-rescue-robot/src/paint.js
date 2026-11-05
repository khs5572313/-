// ───────────────────────────────────────────────────────────────
//  paint.js — 배경 미술(포스터컬러) 절차적 "손 붓질" 페인팅
//  하늘·산맥·설면 붓결·종이결·램프 글로우를 Canvas2D 붓 스트로크로 직접 그린다.
// ───────────────────────────────────────────────────────────────
import { rng, fbm, vnoise, clamp, lerp } from './util.js';

const TAU = Math.PI * 2;
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mixc(a, b, u) { return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; }
function css(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
// 원통 위에서 이음매 없는 노이즈
function cyl(x, W, y, sx, sy, oct = 4, seed = 0) {
  const ang = (x / W) * TAU, r = (W / TAU) / sx;
  return fbm(Math.cos(ang) * r + seed * 13.1, Math.sin(ang) * r + y / sy + seed * 7.7, oct);
}

// 강모(bristle)가 보이는 붓 한 획
function brush(ctx, x0, y0, x1, y1, w, col, alpha, R, bristles = 7, bend = 0.35) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bow = (R() - 0.5) * len * bend;
  ctx.lineCap = 'round';
  for (let b = 0; b < bristles; b++) {
    const off = (R() - 0.5) * w;
    const j = (R() - 0.5) * 18;
    ctx.strokeStyle = css([col[0] + j, col[1] + j, col[2] + j * 1.2]);
    ctx.globalAlpha = alpha * (0.45 + R() * 0.7);
    ctx.lineWidth = (w / bristles) * (1.3 + R() * 1.6);
    const s = R() * 0.12, e = 1 - R() * 0.15;
    ctx.beginPath();
    ctx.moveTo(x0 + dx * s + nx * off, y0 + dy * s + ny * off);
    ctx.quadraticCurveTo((x0 + x1) / 2 + nx * (off + bow), (y0 + y1) / 2 + ny * (off + bow), x0 + dx * e + nx * off * 0.7, y0 + dy * e + ny * off * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function wrapBrush(ctx, W, x0, y0, x1, y1, w, col, a, R, br, bend) {
  const seedState = R();
  for (const o of [-W, 0, W]) {
    const minx = Math.min(x0, x1) + o - w, maxx = Math.max(x0, x1) + o + w;
    if (maxx < 0 || minx > W) continue;
    const RR = (function (s) { let k = s * 1e9 | 0; return () => { k = (k * 1664525 + 1013904223) >>> 0; return k / 4294967296; }; })(seedState);
    brush(ctx, x0 + o, y0, x1 + o, y1, w, col, a, RR, br, bend);
  }
}

// ── 하늘 (밤 폭풍 / 새벽) ─────────────────────────────────────
export function paintSky(dawn) {
  const W = 2048, H = 1024;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const R = rng(dawn ? 77 : 33);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (!dawn) {
    g.addColorStop(0, '#070b1f'); g.addColorStop(0.35, '#0f1638'); g.addColorStop(0.7, '#1f2552'); g.addColorStop(0.86, '#33366a'); g.addColorStop(1, '#3d3c72');
  } else {
    g.addColorStop(0, '#2a3468'); g.addColorStop(0.3, '#55548a'); g.addColorStop(0.55, '#a17ea6'); g.addColorStop(0.72, '#e2a3a0'); g.addColorStop(0.86, '#f6c98f'); g.addColorStop(1, '#fbe2ad');
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 수평 붓결로 그라데이션을 '칠한' 느낌으로
  const base = ctx.getImageData(0, 0, W, H).data;
  for (let i = 0; i < 2600; i++) {
    const y = R() * H, x = R() * W;
    const o = ((Math.min(H - 1, y | 0)) * W + Math.min(W - 1, x | 0)) * 4;
    const c = [base[o], base[o + 1], base[o + 2]];
    const col = [c[0] + (R() - 0.5) * 14, c[1] + (R() - 0.5) * 14, c[2] + (R() - 0.5) * 18];
    const l = 60 + R() * 220;
    wrapBrush(ctx, W, x, y, x + l, y + (R() - 0.5) * 14, 6 + R() * 18, col, 0.18, R, 5, 0.2);
  }
  // 새벽 태양 글로우(지평선 근처, u≈0.64)
  if (dawn) {
    const cx = W * 0.64, cy = H * 0.97;
    for (let k = 0; k < 3; k++) {
      const gg = ctx.createRadialGradient(cx + (k - 1) * W, cy, 10, cx + (k - 1) * W, cy, H * 0.75);
      gg.addColorStop(0, 'rgba(255,240,200,0.85)'); gg.addColorStop(0.25, 'rgba(255,205,150,0.45)'); gg.addColorStop(1, 'rgba(255,180,160,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
    }
  }
  // 구름 덩어리: 밀도장 위에서 붓 터치를 쌓는다 (상단 가장자리는 밝게, 아래는 어둡게)
  const cDark = hex(dawn ? '#6d5a86' : '#141a3e'), cMid = hex(dawn ? '#b6879f' : '#262c5c'), cLite = hex(dawn ? '#ffd2a8' : '#4a4f8a'), cRim = hex(dawn ? '#fff0c8' : '#6b6fa8');
  const N = dawn ? 9000 : 12000;
  for (let i = 0; i < N; i++) {
    const x = R() * W, y = R() * H * (dawn ? 0.78 : 0.92);
    const d = cyl(x, W, y, 340, 150, 5, dawn ? 3 : 1);
    const thr = dawn ? 0.56 : 0.5;
    if (d < thr) continue;
    const up = cyl(x, W, y - 26, 340, 150, 5, dawn ? 3 : 1);
    const edge = clamp((d - up) * 9 + 0.5);
    let col = mixc(cDark, cMid, clamp((d - thr) * 5));
    if (edge > 0.55) col = mixc(col, cLite, (edge - 0.55) * 2.2);
    if (edge > 0.82 && d < thr + 0.06) col = mixc(col, cRim, 0.8);
    // 지평선 쪽 구름은 대기 원근으로 하늘색에 녹아든다
    const hz = clamp((y / H - 0.55) * 2.2);
    const skyc = dawn ? hex('#e8b0a0') : hex('#2c3062');
    col = mixc(col, skyc, hz * 0.55);
    const ang = -0.12 + (R() - 0.5) * 0.25;
    const l = 30 + R() * 120 * (1 + (d - thr) * 3);
    wrapBrush(ctx, W, x, y, x + Math.cos(ang) * l, y + Math.sin(ang) * l, 8 + R() * 22, col, dawn ? 0.33 : 0.38, R, 6, 0.5);
  }
  return cv;
}

// ── 원경 산맥 (알파 포함) ───────────────────────────────────────
export function paintMountains(dawn) {
  const W = 4096, H = 640;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const R = rng(dawn ? 1201 : 1101);
  const ranges = [
    { base: 0.52, amp: 0.4, sx: 260, col: dawn ? '#b49ac0' : '#2a2f62', lit: dawn ? '#f3c7b0' : '#4a4f88', dark: dawn ? '#8a7aa8' : '#1c2150', seed: 1 },
    { base: 0.66, amp: 0.3, sx: 170, col: dawn ? '#9a86b4' : '#232858', lit: dawn ? '#f7d3b4' : '#5d62a0', dark: dawn ? '#6e6496' : '#151a44', seed: 2 },
    { base: 0.8, amp: 0.16, sx: 120, col: dawn ? '#8c80b0' : '#1f2452', lit: dawn ? '#efd0c4' : '#6a6eaa', dark: dawn ? '#5c568a' : '#12163c', seed: 3 },
  ];
  for (const r of ranges) {
    const ridge = new Float32Array(W);
    for (let x = 0; x < W; x++) {
      const n = cyl(x, W, 0, r.sx, 1, 5, r.seed);
      const rr = 1 - Math.abs(n * 2 - 1);
      ridge[x] = H * (r.base - r.amp * Math.pow(rr, 1.6) - (cyl(x, W, 50, r.sx * 3, 1, 3, r.seed + 9) - 0.5) * 0.18);
    }
    ctx.fillStyle = r.col;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x < W; x += 2) ctx.lineTo(x, ridge[x]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // 경사면 붓 터치: 왼쪽 위에서 빛 → 오른쪽으로 내려가는 사면이 밝은 눈 사면
    const lit = hex(r.lit), dark = hex(r.dark), base = hex(r.col);
    for (let i = 0; i < 5200; i++) {
      const x = (R() * W) | 0;
      const top = ridge[x];
      const y = top + R() * (H - top) * 0.75;
      const slope = (ridge[(x + 6) % W] - ridge[(x - 6 + W) % W]);
      const isLit = slope > 0 ? (R() < 0.85) : (R() < 0.12);
      const col = isLit ? mixc(lit, base, R() * 0.35) : mixc(dark, base, R() * 0.5);
      const ang = Math.PI / 2 + (slope > 0 ? -0.6 : 0.6) + (R() - 0.5) * 0.5;
      const l = 8 + R() * 40;
      const yy = Math.max(y, top + 2);
      wrapBrush(ctx, W, x, yy, x + Math.cos(ang) * l, yy + Math.sin(ang) * l, 2 + R() * 6, col, 0.6, R, 3, 0.3);
    }
    // 능선 하이라이트(설선)
    ctx.globalAlpha = 0.7;
    for (let x = 0; x < W; x += 3) {
      const slope = ridge[(x + 4) % W] - ridge[(x - 4 + W) % W];
      if (slope > 1.2 && R() < 0.7) { ctx.fillStyle = css(lit); ctx.fillRect(x, ridge[x], 3, 1.5 + R() * 2.5); }
    }
    ctx.globalAlpha = 1;
  }
  // 하단 설원 띠(지면과 이어지는 부분)
  const g = ctx.createLinearGradient(0, H * 0.8, 0, H);
  g.addColorStop(0, dawn ? 'rgba(214,180,200,0)' : 'rgba(40,44,96,0)');
  g.addColorStop(0.6, dawn ? 'rgba(220,186,200,0.9)' : 'rgba(46,50,104,0.9)');
  g.addColorStop(1, dawn ? 'rgba(226,192,204,1)' : 'rgba(50,54,110,1)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.8, W, H * 0.2);
  // 산 아래 대기 안개 띠
  for (let i = 0; i < 900; i++) {
    const x = R() * W, y = H * (0.72 + R() * 0.2);
    wrapBrush(ctx, W, x, y, x + 80 + R() * 200, y + (R() - 0.5) * 6, 6 + R() * 10, hex(dawn ? '#e9c4c6' : '#3a3f7a'), 0.12, R, 4, 0.1);
  }
  return cv;
}

// ── 설면 붓결 텍스처 (그레이스케일, 타일) ──────────────────────
export function paintSnowBrush() {
  const W = 1024;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, W);
  const R = rng(4242);
  for (let i = 0; i < 6500; i++) {
    const x = R() * W, y = R() * W;
    const v = 128 + (R() - 0.5) * 70;
    const ang = 0.15 + (R() - 0.5) * 0.5 + Math.sin(y / 90) * 0.25;
    const l = 20 + R() * 90;
    for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
      if (x + ox < -120 || x + ox > W + 120 || y + oy < -120 || y + oy > W + 120) continue;
      const RR = rng(i * 7 + 3);
      brush(ctx, x + ox, y + oy, x + ox + Math.cos(ang) * l, y + oy + Math.sin(ang) * l, 4 + R() * 12, [v, v, v], 0.22, RR, 5, 0.4);
    }
  }
  return cv;
}

// ── 종이/셀 결 텍스처 ─────────────────────────────────────────
export function paintPaper() {
  const W = 1024;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x / 6, y / 6, 3) * 0.5 + fbm(x / 40, y / 40, 3) * 0.5;
    const fiber = Math.pow(Math.abs(Math.sin((x * 0.31 + vnoise(x / 9, y / 3) * 22))), 40) * 0.25;
    const v = clamp(n + fiber) * 255;
    const i = (y * W + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// ── 램프 글로우 (손으로 에어브러시 없이 칠한 동심 글로우) ───────
export function paintGlow(warm) {
  const W = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = W;
  const ctx = cv.getContext('2d');
  const c = W / 2;
  const R = rng(warm ? 5 : 6);
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  if (warm) { g.addColorStop(0, 'rgba(255,236,190,1)'); g.addColorStop(0.18, 'rgba(255,190,110,0.75)'); g.addColorStop(0.45, 'rgba(240,140,70,0.25)'); g.addColorStop(1, 'rgba(200,90,60,0)'); }
  else { g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(0.2, 'rgba(235,240,255,0.7)'); g.addColorStop(0.5, 'rgba(170,190,255,0.22)'); g.addColorStop(1, 'rgba(120,140,255,0)'); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  // 손으로 그린 광선 줄기(아주 약하게)
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const a = R() * TAU, l = c * (0.5 + R() * 0.5);
    ctx.strokeStyle = warm ? 'rgba(255,200,130,0.06)' : 'rgba(220,230,255,0.06)';
    ctx.lineWidth = 2 + R() * 5;
    ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(a) * l, c + Math.sin(a) * l); ctx.stroke();
  }
  return cv;
}
