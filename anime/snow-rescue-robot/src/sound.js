// ───────────────────────────────────────────────────────────────
//  sound.js — WebAudio로 직접 합성하는 사운드 (샘플 파일 0개)
//  눈보라 바람 / 새끼 울음 / 쪼는 소리 / 램프 점등 / 유압 / 눈 폭발 / 균열 / 붕괴 / 음악
// ───────────────────────────────────────────────────────────────
const NOTE = (n) => { const m = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }; const s = n.match(/^([A-G])(#|b)?(\d)$/); const v = m[s[1]] + (s[2] === '#' ? 1 : s[2] === 'b' ? -1 : 0) + (+s[3] + 1) * 12; return 440 * Math.pow(2, (v - 69) / 12); };

export class Sound {
  constructor(dur) { this.dur = dur; this.ctx = null; this.session = null; this.nodes = []; }
  init() {
    if (this.ctx) { this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.master.connect(comp); comp.connect(ctx.destination);
    // 공간감: 짧은 합성 리버브
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.35; this.verbIn.connect(this.verb); this.verb.connect(this.master);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); const d = nb.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    this.noise = nb;
  }
  stop() {
    if (!this.session) return;
    const g = this.session, ctx = this.ctx;
    g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
    const ns = this.nodes; this.nodes = [];
    setTimeout(() => { for (const n of ns) { try { n.stop(); } catch (e) { } } g.disconnect(); }, 250);
    this.session = null;
  }
  start(t0) {
    if (!this.ctx) return;
    this.stop();
    const ctx = this.ctx;
    const out = this.session = ctx.createGain(); out.gain.value = 1; out.connect(this.master);
    const wet = ctx.createGain(); wet.gain.value = 1; wet.connect(this.verbIn); out.connect(wet);
    const base = ctx.currentTime + 0.06;
    const at = (t) => base + (t - t0);
    const live = (t, d = 0) => t + d >= t0;
    const src = (buf, loop = true) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop; this.nodes.push(s); return s; };
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; this.nodes.push(o); return o; };
    const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const filt = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const env = (g, t, a, h, r, v) => { const s = Math.max(ctx.currentTime, at(t)); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v, s + a); g.gain.setValueAtTime(v, s + a + h); g.gain.exponentialRampToValueAtTime(0.0001, s + a + h + r); };

    // ── 바람 (3겹) ───────────────────────────────────────
    const storm = (t) => (t < 60 ? 1 : t < 78 ? 0.85 : t < 81 ? 0.85 - (t - 78) / 3 * 0.35 : t < 84 ? 0.5 - (t - 81) / 3 * 0.42 : 0.08);
    const gusts = [[3.2, 2.6], [9.9, 2.6], [22.55, 1.9], [52.4, 1.6], [80.4, 2.2]];
    const gustK = (t) => { let k = 0; for (const [g, d] of gusts) { const u = (t - g) / d; if (u > 0 && u < 1) k = Math.max(k, Math.sin(u * Math.PI)); } return k; };
    const layers = [{ f: 380, q: 0.7, v: 0.55 }, { f: 1100, q: 2.2, v: 0.22 }, { f: 2600, q: 7, v: 0.06 }];
    layers.forEach((L, i) => {
      const s = src(this.noise); const bp = filt('bandpass', L.f, L.q); const g = gain(0);
      s.connect(bp); bp.connect(g); g.connect(out);
      for (let t = Math.max(0, t0); t < this.dur; t += 0.25) {
        const fade = Math.min(1, t / 2.5) * Math.min(1, (this.dur - t) / 3);
        const v = L.v * fade * (storm(t) * (0.7 + 0.3 * Math.sin(t * 0.7 + i * 2)) + gustK(t) * (0.9 + i * 0.4));
        g.gain.linearRampToValueAtTime(Math.max(0.0001, v), at(t));
        bp.frequency.linearRampToValueAtTime(L.f * (1 + 0.25 * Math.sin(t * 0.43 + i) + gustK(t) * 0.5), at(t));
      }
      s.start(base, (i * 1.3) % 3);
    });

    // ── 새 소리 ──────────────────────────────────────────
    const cheep = (t, f0 = 4200, v = 0.08, d = 0.07) => {
      if (!live(t)) return; const o = osc('sine', f0); const g = gain(0);
      o.frequency.setValueAtTime(f0, at(t)); o.frequency.exponentialRampToValueAtTime(f0 * 1.25, at(t) + d * 0.4); o.frequency.exponentialRampToValueAtTime(f0 * 0.82, at(t) + d);
      o.connect(g); g.connect(out); env(g, t, 0.004, d * 0.4, d * 0.6, v); o.start(at(t)); o.stop(at(t) + d + 0.1);
    };
    const chirp = (t, f = 3000, v = 0.07) => { cheep(t, f, v, 0.05); cheep(t + 0.08, f * 1.3, v * 0.8, 0.06); };
    // 둥지의 불안한 울음, 구덩이 안의 울음
    for (let t = 10.4; t < 11.4; t += 0.18) cheep(t, 4400 + Math.random() * 400, 0.06);
    for (let t = 12; t < 14.4; t += 0.33) cheep(t, 4600, 0.035);
    for (let t = 15.0; t < 40; t += 0.5 + Math.random() * 0.9) { if (Math.random() < 0.8) { cheep(t, 4700 + Math.random() * 500, 0.07); cheep(t + 0.12, 4900, 0.05); } }
    for (let t = 61; t < 66; t += 0.6 + Math.random() * 0.5) cheep(t, 4800, 0.05);
    for (let t = 67.9; t < 68.4; t += 0.16) cheep(t, 5200, 0.05);
    for (const t of [20.9, 21.6, 22.1, 22.95, 23.6, 36.2, 38.6, 39.3, 72.2, 77.7, 84.7, 85.3, 87.6]) chirp(t, 2900 + Math.random() * 600, 0.08);
    for (let t = 87.6; t < 91; t += 0.3) cheep(t, 5000 + Math.random() * 400, 0.04);
    // 날갯짓
    const flutter = (t, d) => { if (!live(t, d)) return; const s = src(this.noise); const bp = filt('bandpass', 900, 1.2); const g = gain(0); s.connect(bp); bp.connect(g); g.connect(out); for (let k = 0; k < d * 12; k++) { const tt = t + k / 12; g.gain.setValueAtTime(0.0001, Math.max(ctx.currentTime, at(tt))); g.gain.linearRampToValueAtTime(0.09, Math.max(ctx.currentTime, at(tt)) + 0.02); g.gain.linearRampToValueAtTime(0.0001, Math.max(ctx.currentTime, at(tt)) + 0.07); } s.start(Math.max(ctx.currentTime, at(t))); s.stop(at(t + d) + 0.2); };
    flutter(19.8, 1.4); flutter(22.3, 1.4); flutter(24.1, 2.4); flutter(36.0, 2.0); flutter(38.4, 1.8); flutter(71.5, 2.2); flutter(76.4, 1.3); flutter(84.1, 0.9); flutter(87.0, 0.4);

    // ── 쪼기 + 램프 깜빡임 ───────────────────────────────
    const tick = (t, v = 0.3) => { if (!live(t)) return; const o = osc('sine', 2400); const g = gain(0); o.frequency.setValueAtTime(2600, at(t)); o.frequency.exponentialRampToValueAtTime(1800, at(t) + 0.05); o.connect(g); g.connect(out); env(g, t, 0.001, 0.005, 0.07, v); o.start(at(t)); o.stop(at(t) + 0.15);
      const s = src(this.noise, false); const hp = filt('highpass', 3000); const g2 = gain(0); s.connect(hp); hp.connect(g2); g2.connect(out); env(g2, t, 0.001, 0.002, 0.03, v * 0.8); s.start(at(t)); s.stop(at(t) + 0.08); };
    const buzz = (t, d, v = 0.05) => { if (!live(t, d)) return; const o = osc('sawtooth', 120); const bp = filt('bandpass', 480, 3); const g = gain(0); o.connect(bp); bp.connect(g); g.connect(out); env(g, t, 0.005, d, 0.05, v); o.start(Math.max(ctx.currentTime, at(t))); o.stop(at(t) + d + 0.2); };
    const relay = (t, v = 0.15) => { if (!live(t)) return; const o = osc('square', 90); const lp = filt('lowpass', 500); const g = gain(0); o.connect(lp); lp.connect(g); g.connect(out); env(g, t, 0.001, 0.01, 0.06, v); o.start(at(t)); o.stop(at(t) + 0.12); };
    tick(28.5); buzz(28.55, 0.15); buzz(28.8, 0.1, 0.03);
    tick(31.8); buzz(31.85, 0.2); buzz(32.15, 0.35); relay(32.9, 0.08);
    tick(35.0); buzz(35.05, 0.15); relay(35.3); buzz(35.3, 0.3);
    // 가슴 램프가 켜진 뒤의 낮은 험
    const hum = (t0h, t1h, f, v) => { if (!live(t0h, t1h - t0h)) return; const o = osc('triangle', f); const o2 = osc('sine', f * 2.01); const lp = filt('lowpass', 600); const g = gain(0); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); const s = Math.max(ctx.currentTime, at(t0h)); g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(v, s + 1.5); g.gain.setValueAtTime(v, Math.max(s + 1.5, at(t1h) - 2)); g.gain.linearRampToValueAtTime(0.0001, at(t1h)); o.start(s); o2.start(s); o.stop(at(t1h) + 0.1); o2.stop(at(t1h) + 0.1); };
    hum(35.6, 96, 55, 0.035);
    // 눈 램프가 차오르는 소리 (상승 톤)
    if (live(40.6, 5)) { const o = osc('sine', 70); const o2 = osc('triangle', 140); const g = gain(0); const lp = filt('lowpass', 900); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out); const s = Math.max(ctx.currentTime, at(40.8)); o.frequency.setValueAtTime(70, s); o.frequency.linearRampToValueAtTime(220, at(45.4)); o2.frequency.setValueAtTime(140, s); o2.frequency.linearRampToValueAtTime(440, at(45.4)); g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.05, at(45.4)); g.gain.linearRampToValueAtTime(0.0001, at(47)); o.start(s); o2.start(s); o.stop(at(47.2)); o2.stop(at(47.2)); }
    for (const t of [40.8, 41.3, 41.6, 42.1]) buzz(t, 0.1, 0.03);

    // ── 유압·금속 (머리 들기, 팔) ─────────────────────────
    const hyd = (t, d, v = 0.12, f = 48) => {
      if (!live(t, d)) return; const s = Math.max(ctx.currentTime, at(t));
      const o = osc('sawtooth', f); const lp = filt('lowpass', 260, 4); const g = gain(0); o.connect(lp); lp.connect(g); g.connect(out);
      o.frequency.setValueAtTime(f, s); o.frequency.linearRampToValueAtTime(f * 1.4, at(t + d));
      lp.frequency.setValueAtTime(180, s); lp.frequency.linearRampToValueAtTime(420, at(t + d * 0.6)); lp.frequency.linearRampToValueAtTime(200, at(t + d));
      env(g, t, 0.08, d * 0.7, d * 0.4, v); o.start(s); o.stop(at(t + d) + 0.6);
      const n = src(this.noise, true); const hp = filt('bandpass', 5000, 1.5); const g2 = gain(0); n.connect(hp); hp.connect(g2); g2.connect(out); env(g2, t + d * 0.6, 0.02, d * 0.2, 0.5, v * 0.25); n.start(s); n.stop(at(t + d) + 1);
      // 삐걱임
      const c = osc('square', 210); const bp = filt('bandpass', 900, 8); const g3 = gain(0); c.connect(bp); bp.connect(g3); g3.connect(out); c.frequency.setValueAtTime(210, s); c.frequency.linearRampToValueAtTime(170, at(t + d)); env(g3, t + 0.05, 0.05, d * 0.5, 0.2, v * 0.12); c.start(s); c.stop(at(t + d) + 0.4);
    };
    hyd(47.0, 0.9); hyd(48.6, 0.9, 0.13); hyd(50.2, 0.9, 0.14, 52);
    hyd(54.6, 2.3, 0.1, 44); hyd(59.6, 1.8, 0.11, 46); hyd(60.5, 1.1, 0.07, 60);
    hyd(66.0, 1.9, 0.06, 40); hyd(68.4, 0.8, 0.05, 50); hyd(71.0, 1.0, 0.07, 46); hyd(74.5, 2.5, 0.07, 42); hyd(78.2, 1.7, 0.08, 40);
    // 눈 미끄러짐
    const slide = (t, d, v = 0.12) => { if (!live(t, d)) return; const n = src(this.noise, true); const lp = filt('lowpass', 1400); const g = gain(0); n.connect(lp); lp.connect(g); g.connect(out); lp.frequency.setValueAtTime(1600, Math.max(ctx.currentTime, at(t))); lp.frequency.linearRampToValueAtTime(400, at(t + d)); env(g, t, 0.05, d * 0.5, d * 0.5, v); n.start(Math.max(ctx.currentTime, at(t))); n.stop(at(t + d) + 0.5); };
    slide(48.3, 0.8, 0.1); slide(50.3, 0.9, 0.12); slide(51.8, 0.8, 0.1);
    // 고드름 부서지는 소리
    for (let k = 0; k < 9; k++) { const t = 48.6 + k * 0.07 + Math.random() * 0.1; if (!live(t)) continue; const o = osc('sine', 3200 + Math.random() * 2500); const g = gain(0); o.connect(g); g.connect(out); env(g, t + 0.4, 0.001, 0.01, 0.25, 0.03); o.start(at(t)); o.stop(at(t) + 0.8); }
    // ── 팔이 눈을 뚫는 폭발 ──────────────────────────────
    const burst = (t, v = 0.5) => { if (!live(t, 1.5)) return; const s = Math.max(ctx.currentTime, at(t));
      const n = src(this.noise, true); const lp = filt('lowpass', 2500); const g = gain(0); n.connect(lp); lp.connect(g); g.connect(out); lp.frequency.setValueAtTime(3000, s); lp.frequency.exponentialRampToValueAtTime(300, s + 1.2); env(g, t, 0.005, 0.08, 1.2, v); n.start(s); n.stop(s + 1.6);
      const o = osc('sine', 70); const g2 = gain(0); o.connect(g2); g2.connect(out); o.frequency.setValueAtTime(90, s); o.frequency.exponentialRampToValueAtTime(35, s + 0.5); env(g2, t, 0.003, 0.05, 0.6, v * 0.9); o.start(s); o.stop(s + 0.8);
      for (let k = 0; k < 10; k++) { const tt = t + 0.4 + Math.random() * 1.1; const o3 = osc('sine', 300 + Math.random() * 400); const g3 = gain(0); const lp3 = filt('lowpass', 800); o3.connect(lp3); lp3.connect(g3); g3.connect(out); env(g3, tt, 0.002, 0.01, 0.08, 0.06); o3.start(at(tt)); o3.stop(at(tt) + 0.15); } };
    burst(53.2); burst(58.0);
    // 탐조등 켜짐
    if (live(61.7)) { relay(61.7, 0.25); const o = osc('sine', 880); const o2 = osc('sine', 1320); const g = gain(0); o.connect(g); o2.connect(g); g.connect(out); env(g, 61.75, 0.3, 9.5, 1.5, 0.018); o.start(Math.max(ctx.currentTime, at(61.75))); o2.start(Math.max(ctx.currentTime, at(61.75))); o.stop(at(73)); o2.stop(at(73)); }
    // 균열
    for (let k = 0; k < 40; k++) { const t = 63.0 + Math.random() * 2.8; if (!live(t)) continue; const n = src(this.noise, false); const bp = filt('bandpass', 1500 + Math.random() * 3000, 4); const g = gain(0); n.connect(bp); bp.connect(g); g.connect(out); env(g, t, 0.001, 0.005, 0.03 + Math.random() * 0.05, 0.12 + Math.random() * 0.15); n.start(at(t), Math.random() * 3); n.stop(at(t) + 0.15); }
    // 붕괴
    if (live(71.6, 3)) { const s = Math.max(ctx.currentTime, at(71.6)); const n = src(this.noise, true); const lp = filt('lowpass', 500, 0.8); const g = gain(0); n.connect(lp); lp.connect(g); g.connect(out); lp.frequency.setValueAtTime(900, s); lp.frequency.linearRampToValueAtTime(220, s + 2.8); env(g, 71.6, 0.15, 0.8, 2.2, 0.6); n.start(s); n.stop(s + 3.5);
      const o = osc('sine', 45); const g2 = gain(0); o.connect(g2); g2.connect(out); env(g2, 71.6, 0.1, 0.6, 1.5, 0.35); o.start(s); o.stop(s + 2.5); }

    // ── 음악 ─────────────────────────────────────────────
    const pad = (t, d, notes, v = 0.022) => {
      if (!live(t, d)) return; const s = Math.max(ctx.currentTime, at(t));
      const lp = filt('lowpass', 1100, 0.5); const g = gain(0); lp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(v, at(t) + Math.min(2.2, d * 0.4) > s ? at(t) + Math.min(2.2, d * 0.4) : s + 0.1); g.gain.setValueAtTime(v, at(t + d * 0.7)); g.gain.linearRampToValueAtTime(0.0001, at(t + d));
      for (const nn of notes) for (const det of [-4, 4]) { const o = osc('triangle', NOTE(nn)); o.detune.value = det; o.connect(lp); o.start(s); o.stop(at(t + d) + 0.1); }
    };
    const bell = (t, nn, v = 0.05, d = 2.4) => {
      if (!live(t)) return; const f = NOTE(nn); const g = gain(0); g.connect(out);
      for (const [m, a] of [[1, 1], [2.0, 0.35], [3.01, 0.12], [4.2, 0.05]]) { const o = osc('sine', f * m); const gg = gain(a); o.connect(gg); gg.connect(g); o.start(at(t)); o.stop(at(t) + d + 0.2); }
      env(g, t, 0.004, 0.02, d, v);
    };
    // 램프가 켜진 뒤 — 조심스러운 화음
    pad(36.0, 6, ['A3', 'E4', 'C5']); pad(41.5, 5.5, ['F3', 'C4', 'A4']); pad(46.5, 6, ['C3', 'G3', 'E4']);
    pad(52.5, 6, ['D3', 'A3', 'F4'], 0.018); pad(58.4, 6, ['E3', 'B3', 'G#4'], 0.02);
    pad(66.0, 5, ['A3', 'E4', 'C5'], 0.022); pad(71.0, 4, ['F3', 'C4', 'A4'], 0.026); pad(74.6, 6, ['C3', 'G3', 'E4', 'C5'], 0.026);
    pad(80.4, 4.5, ['F3', 'A3', 'E4'], 0.024); pad(84.6, 7, ['C3', 'G3', 'E4', 'B4'], 0.028); pad(91.4, 7.4, ['F3', 'C4', 'A4', 'E5'], 0.026);
    // 오르골 같은 선율
    const mel = [[66.3, 'E5'], [67.1, 'D5'], [67.9, 'C5'], [69.2, 'E5'], [70.0, 'G5'], [71.2, 'A5'], [74.8, 'G5'], [75.6, 'E5'], [76.4, 'D5'], [77.4, 'C5'], [78.2, 'D5'], [79.2, 'E5'],
      [84.9, 'G5'], [85.4, 'C6'], [86.2, 'B5'], [87.0, 'G5'], [87.6, 'E5'], [88.6, 'D5'], [89.4, 'E5'], [90.6, 'C5'], [92.0, 'A4'], [93.4, 'E5'], [95.0, 'C5']];
    for (const [t, n] of mel) bell(t, n, 0.045);
    // 동틀 무렵 새 지저귐(멀리)
    for (let t = 83.5; t < 97; t += 0.8 + Math.random() * 1.6) chirp(t, 2400 + Math.random() * 1500, 0.025);
  }
}
