// ───────────────────────────────────────────────────────────────
//  robot.js — 네모네모한 구형 구조 로봇 (오리지널 디자인)
//  흰 장갑판(모따기 모서리) + 검은 기계 프레임 + 노출 유압 실린더/호스
//  낮은 사각 센서 헤드, 둥근 단안 램프, 가슴 원형 램프, 바랜 주황 구조 스트라이프
// ───────────────────────────────────────────────────────────────
import { vnoise, rng } from './util.js';

export function makeRobot(THREE, M, ink) {
  const V = THREE.Vector3;
  // 모따기 박스 (모든 모서리 chamfer)
  function cbox(w, h, d, c = 0.06, dent = 0.012, seed = 0) {
    c = Math.min(c, w * 0.3, h * 0.3, d * 0.3);
    const iw = w / 2 - c, ih = h / 2 - c, k = c * 0.9;
    const s = new THREE.Shape();
    s.moveTo(-iw + k, -ih); s.lineTo(iw - k, -ih); s.lineTo(iw, -ih + k); s.lineTo(iw, ih - k);
    s.lineTo(iw - k, ih); s.lineTo(-iw + k, ih); s.lineTo(-iw, ih - k); s.lineTo(-iw, -ih + k); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelOffset: 0, bevelSegments: 1, curveSegments: 1 });
    g.translate(0, 0, -(d - 2 * c) / 2);
    if (dent > 0) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n1 = vnoise(x * 3.1 + seed + 10, y * 3.1 + z * 2.3) - 0.5, n2 = vnoise(y * 3.3 + seed, z * 3.1 - x * 1.7 + 5) - 0.5, n3 = vnoise(z * 2.9 + seed + 3, x * 3.3 + y * 1.3) - 0.5;
        p.setXYZ(i, x + n1 * dent, y + n2 * dent, z + n3 * dent);
      }
    }
    g.computeVertexNormals();
    return g;
  }
  const cyl = (r, h, seg = 14) => new THREE.CylinderGeometry(r, r, h, seg, 1);
  function add(parent, geo, mat, id, p = [0, 0, 0], r = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p[0], p[1], p[2]); m.rotation.set(r[0], r[1], r[2]);
    parent.add(m); ink(m, id); return m;
  }
  const mW = M.armor, mK = M.frame, mO = M.stripe, mS = M.steel, mH = M.hose;

  const root = new THREE.Group();
  // ── 몸통 (힙 피벗: 월드 y=1.0) ────────────────────────────
  const torso = new THREE.Group(); torso.position.set(0, 1.0, 0); root.add(torso);
  add(torso, cbox(2.3, 2.0, 1.4, 0.05, 0.0), mK, 0.50, [0, 1.4, -0.05]);
  add(torso, cbox(2.55, 1.28, 0.36, 0.09, 0.016, 1), mW, 0.52, [0, 1.84, 0.62]);   // 상부 가슴판
  add(torso, cbox(2.35, 0.85, 0.3, 0.07, 0.014, 2), mW, 0.53, [0, 0.95, 0.6]);     // 하부 가슴판(대부분 매몰)
  for (const sx of [-1, 1]) {
    add(torso, cbox(0.32, 1.65, 1.35, 0.06, 0.012, 3 + sx), mW, 0.54, [sx * 1.24, 1.5, -0.05]);
    // 측면 리벳 패널 라인
    add(torso, cbox(0.06, 0.9, 0.9, 0.02, 0), mK, 0.55, [sx * 1.405, 1.55, -0.05]);
  }
  add(torso, cbox(2.05, 1.55, 0.85, 0.08, 0.016, 7), mW, 0.56, [0, 1.62, -1.05]);    // 등 배낭
  add(torso, cbox(1.4, 0.5, 0.25, 0.04, 0), mK, 0.57, [0, 2.0, -1.55]);               // 배기구
  for (let i = 0; i < 4; i++) add(torso, cbox(1.2, 0.05, 0.08, 0.01, 0), mS, 0.571, [0, 1.84 + i * 0.1, -1.68]);
  // 주황 구조 스트라이프 (로고·문자 없음)
  add(torso, cbox(2.58, 0.15, 0.37, 0.03, 0.01, 8), mO, 0.58, [0, 2.3, 0.625]);
  add(torso, cbox(0.34, 0.16, 1.37, 0.03, 0.0), mO, 0.581, [-1.24, 2.05, -0.05]);
  add(torso, cbox(0.34, 0.16, 1.37, 0.03, 0.0), mO, 0.581, [1.24, 2.05, -0.05]);
  // 가슴 위 선반(둥지 받침) — 턱 아래
  add(torso, cbox(1.5, 0.12, 0.55, 0.03, 0.006, 9), mK, 0.59, [0, 2.5, 0.92]);
  add(torso, cbox(0.1, 0.25, 0.42, 0.02, 0), mK, 0.591, [-0.62, 2.37, 0.95]);
  add(torso, cbox(0.1, 0.25, 0.42, 0.02, 0), mK, 0.591, [0.62, 2.37, 0.95]);
  // 가슴 램프 (사각 베젤 + 원형 하우징 + 유리)
  const chestY = 1.66;
  add(torso, cbox(0.8, 0.8, 0.12, 0.05, 0.004), mK, 0.60, [0, chestY, 0.84]);
  const chHousing = add(torso, cyl(0.33, 0.12, 20), mS, 0.61, [0, chestY, 0.92], [Math.PI / 2, 0, 0]);
  const chestGlass = new THREE.Mesh(new THREE.CircleGeometry(0.27, 28), M.chestLamp);
  chestGlass.position.set(0, chestY, 0.985); torso.add(chestGlass); ink(chestGlass, 0.62);
  for (const [x, y] of [[-0.31, 0.31], [0.31, 0.31], [-0.31, -0.31], [0.31, -0.31]]) add(torso, cyl(0.035, 0.05, 8), mS, 0.6, [x, chestY + y, 0.91], [Math.PI / 2, 0, 0]);
  // 어깨 블록
  const shoulders = {};
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 1.66, 2.15, 0); torso.add(g);
    add(g, cbox(0.98, 0.92, 1.05, 0.1, 0.018, 11 + sx), mW, 0.63 + sx * 0.002, [0, 0, 0]);
    add(g, cbox(1.0, 0.18, 1.07, 0.04, 0.0), mO, 0.64, [0, 0.2, 0]);
    add(g, cyl(0.28, 0.2, 16), mK, 0.65, [sx * 0.52, -0.1, 0], [0, 0, Math.PI / 2]);
    shoulders[sx] = g;
  }
  // 목 프레임 + 피스톤
  add(torso, cbox(0.6, 0.38, 0.55, 0.04, 0), mK, 0.66, [0, 2.55, -0.25]);
  for (const sx of [-1, 1]) {
    add(torso, cyl(0.06, 0.45, 10), mS, 0.67, [sx * 0.42, 2.6, -0.05], [0.35, 0, 0]);
    add(torso, cyl(0.09, 0.3, 10), mK, 0.671, [sx * 0.42, 2.48, -0.1], [0.35, 0, 0]);
  }

  // ── 머리 (낮은 사각 센서 헤드) ─────────────────────────────
  const head = new THREE.Group(); head.position.set(0, 2.62, -0.2); torso.add(head);
  add(head, cbox(1.6, 0.84, 1.28, 0.1, 0.018, 21), mW, 0.70, [0, 0.43, 0.2]);
  add(head, cbox(1.3, 0.52, 0.08, 0.04, 0.0), mK, 0.71, [0, 0.4, 0.85]);        // 얼굴 패널(검정 리세스)
  add(head, cbox(1.66, 0.13, 0.36, 0.03, 0.008, 22), mW, 0.72, [0, 0.8, 0.74]);  // 이마 바이저
  add(head, cbox(1.62, 0.07, 0.1, 0.02, 0), mO, 0.73, [0, 0.885, 0.62]);         // 머리 위 주황선
  for (const sx of [-1, 1]) {
    add(head, cbox(0.16, 0.4, 0.5, 0.03, 0.0), mK, 0.74, [sx * 0.86, 0.42, 0.25]); // 측면 센서
    add(head, cyl(0.07, 0.06, 12), mS, 0.741, [sx * 0.95, 0.42, 0.25], [0, 0, Math.PI / 2]);
  }
  add(head, cbox(0.12, 0.12, 0.12, 0.02, 0), mK, 0.75, [-0.55, 0.93, -0.15]);    // 안테나 받침
  add(head, cyl(0.022, 0.42, 6), mS, 0.751, [-0.55, 1.18, -0.15]);
  // 단안 램프
  add(head, cyl(0.27, 0.14, 22), mS, 0.76, [0.0, 0.4, 0.87], [Math.PI / 2, 0, 0]);
  const eyeGlass = new THREE.Mesh(new THREE.CircleGeometry(0.205, 28), M.eyeLamp);
  eyeGlass.position.set(0.0, 0.4, 0.945); head.add(eyeGlass); ink(eyeGlass, 0.77);
  add(head, cbox(0.1, 0.04, 0.06, 0.01, 0), mS, 0.761, [0.42, 0.4, 0.88]);       // 작은 보조 렌즈 대신 볼트 줄
  add(head, cbox(0.1, 0.04, 0.06, 0.01, 0), mS, 0.761, [0.42, 0.33, 0.88]);
  add(head, cbox(0.1, 0.04, 0.06, 0.01, 0), mS, 0.761, [-0.42, 0.4, 0.88]);
  add(head, cbox(0.1, 0.04, 0.06, 0.01, 0), mS, 0.761, [-0.42, 0.33, 0.88]);

  // ── 팔 (IK, 월드 공간) ────────────────────────────────────
  const L1 = 1.8, L2 = 1.95;
  function makeArm(sx) {
    const up = new THREE.Group(), fo = new THREE.Group(), hand = new THREE.Group();
    root.add(up); root.add(fo); root.add(hand);
    const b = 0.8 + (sx > 0 ? 0.01 : 0);
    add(up, cbox(0.4, L1, 0.66, 0.04, 0), mK, b, [0, -L1 / 2, 0]);
    add(up, cbox(0.56, L1 - 0.35, 0.5, 0.08, 0.014, 31 + sx), mW, b + 0.002, [0, -L1 / 2 - 0.05, 0]);
    add(up, cyl(0.085, L1 * 0.62, 12), mK, b + 0.003, [0, -L1 * 0.42, 0.36]);
    add(up, cyl(0.045, L1 * 0.5, 10), mS, b + 0.004, [0, -L1 * 0.78, 0.36]);
    add(up, cbox(0.62, 0.62, 0.62, 0.08, 0.0), mK, b + 0.005, [0, -L1, 0]);       // 팔꿈치
    add(up, cyl(0.2, 0.7, 14), mS, b + 0.006, [0, -L1, 0], [0, 0, Math.PI / 2]);
    add(fo, cbox(0.7, L2 - 0.3, 0.7, 0.1, 0.016, 41 + sx), mW, b + 0.02, [0, -L2 / 2 - 0.05, 0]);
    add(fo, cbox(0.72, 0.17, 0.72, 0.03, 0), mO, b + 0.021, [0, -L2 + 0.42, 0]);
    add(fo, cbox(0.72, 0.17, 0.72, 0.03, 0), mO, b + 0.021, [0, -L2 + 0.7, 0]);
    add(fo, cbox(0.44, 0.28, 0.44, 0.04, 0), mK, b + 0.022, [0, -L2 + 0.02, 0]);    // 손목
    add(fo, cyl(0.07, L2 * 0.5, 10), mK, b + 0.023, [0, -L2 * 0.45, -0.4]);
    // 손: 로컬 z=손가락 방향, -y=손바닥
    add(hand, cbox(0.64, 0.24, 0.56, 0.05, 0.008, 51 + sx), mK, b + 0.03, [0, 0, 0.3]);
    add(hand, cbox(0.62, 0.09, 0.5, 0.03, 0.008, 52 + sx), mW, b + 0.031, [0, 0.15, 0.28]);
    const fingers = [];
    const fx = [-0.21, 0, 0.21];
    for (let i = 0; i < 3; i++) {
      const j1 = new THREE.Group(); j1.position.set(fx[i] * -sx, -0.02, 0.6); hand.add(j1);
      add(j1, cbox(0.17, 0.17, 0.24, 0.035, 0.0), mK, b + 0.04, [0, 0, 0.12]);
      add(j1, cbox(0.18, 0.06, 0.2, 0.02, 0.0), mW, b + 0.041, [0, 0.09, 0.12]);
      const j2 = new THREE.Group(); j2.position.set(0, 0, 0.25); j1.add(j2);
      add(j2, cbox(0.15, 0.15, 0.22, 0.04, 0.0), mK, b + 0.042, [0, 0, 0.11]);
      fingers.push([j1, j2]);
    }
    const t1 = new THREE.Group(); t1.position.set(0.36 * -sx, -0.04, 0.22); hand.add(t1);
    add(t1, cbox(0.17, 0.17, 0.3, 0.04, 0.0), mK, b + 0.045, [0, 0, 0.15]);
    fingers.push([t1, null]);
    return { up, fo, hand, fingers, sx };
  }
  const arms = { R: makeArm(-1), L: makeArm(1) };

  // ── 호스 (2코마마다 다시 그림) ─────────────────────────────
  const hoses = [];
  function makeHose(r) { const m = new THREE.Mesh(new THREE.BufferGeometry(), mH); root.add(m); ink(m, 0.9 + hoses.length * 0.005); const h = { m, r }; hoses.push(h); return h; }
  for (let i = 0; i < 4; i++) makeHose(0.055);
  makeHose(0.05); makeHose(0.05);

  // ── 눈 덮개 / 고드름 ──────────────────────────────────────
  function lump(sx, sy, sz, seed) {
    const g = new THREE.SphereGeometry(1, 18, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = vnoise(x * 2.2 + seed, z * 2.2 + y * 1.3) - 0.5;
      if (y < 0) y *= 0.25;
      const k = 1 + n * 0.35;
      p.setXYZ(i, x * sx * k, y * sy * k, z * sz * k);
    }
    g.computeVertexNormals(); return g;
  }
  const caps = [];
  function cap(parent, geo, pos, rot, id, release, slide) {
    const m = add(parent, geo, M.snowCel, id, pos, rot);
    caps.push({ m, parent, release, slide, home: m.position.clone(), homeQ: m.quaternion.clone() });
    return m;
  }
  cap(head, lump(0.62, 0.22, 0.5, 1), [-0.25, 0.86, 0.05], [0, 0.2, 0], 0.95, 50.25);
  cap(head, lump(0.5, 0.2, 0.46, 2), [0.38, 0.85, 0.3], [0, -0.3, 0], 0.951, 51.75);
  cap(head, lump(0.42, 0.16, 0.25, 3), [0.1, 0.84, -0.35], [0, 0.1, 0], 0.952, 50.25);
  cap(shoulders[-1], lump(0.5, 0.2, 0.52, 4), [0, 0.46, 0], [0, 0.4, 0], 0.953, 999);
  cap(shoulders[1], lump(0.48, 0.22, 0.5, 5), [0, 0.46, 0.02], [0, -0.2, 0], 0.954, 999);
  cap(torso, lump(0.9, 0.18, 0.4, 6), [0, 2.45, -1.0], [0, 0, 0], 0.955, 999);
  const icicles = [];
  const R = rng(99);
  const icG = new THREE.ConeGeometry(1, 1, 7, 1);
  icG.translate(0, -0.5, 0); icG.rotateX(Math.PI);
  for (let i = 0; i < 9; i++) {
    const x = -0.72 + i * 0.18 + (R() - 0.5) * 0.05, len = 0.06 + R() * 0.17;
    const m = add(head, icG, M.ice, 0.96 + i * 0.001, [x, 0.73, 0.9], [0, 0, 0]);
    m.scale.set(0.014 + R() * 0.01, -len, 0.014 + R() * 0.01);
    icicles.push({ m, parent: head, release: 48.3 + R() * 0.25, home: m.position.clone(), homeQ: m.quaternion.clone(), len });
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    const m = add(shoulders[sx], icG, M.ice, 0.97 + i * 0.001, [-0.35 + i * 0.22, -0.43, 0.53], [0, 0, 0]);
    const len = 0.06 + R() * 0.15;
    m.scale.set(0.013 + R() * 0.01, -len, 0.013 + R() * 0.01);
    icicles.push({ m, parent: shoulders[sx], release: sx < 0 ? 53.25 : 58.1, home: m.position.clone(), homeQ: m.quaternion.clone(), len });
  }

  // ── 둥지 (가슴 선반 위, 턱 아래) ──────────────────────────
  const nest = new THREE.Group(); nest.position.set(0, 2.56, 0.95); torso.add(nest);
  {
    const ring = new THREE.TorusGeometry(0.2, 0.075, 8, 22); ring.rotateX(Math.PI / 2);
    const p = ring.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = vnoise(x * 12, z * 12 + y * 5) - 0.5; p.setXYZ(i, x * (1 + n * 0.12), y * (1 + n * 0.5) + 0.06, z * (1 + n * 0.12)); }
    ring.computeVertexNormals();
    add(nest, ring, M.nest, 0.85);
    add(nest, new THREE.CylinderGeometry(0.17, 0.12, 0.06, 14), M.nestIn, 0.851, [0, 0.03, 0]);
    const tw = new THREE.CylinderGeometry(0.008, 0.008, 1, 4);
    const RR = rng(7);
    for (let i = 0; i < 26; i++) {
      const a = RR() * Math.PI * 2, r = 0.2 + (RR() - 0.5) * 0.08;
      const m = add(nest, tw, M.nest, 0.852, [Math.cos(a) * r, 0.04 + RR() * 0.08, Math.sin(a) * r], [Math.PI / 2 + (RR() - 0.5) * 0.6, a + Math.PI / 2 + (RR() - 0.5) * 0.4, (RR() - 0.5) * 0.5]);
      m.scale.set(1, 0.18 + RR() * 0.16, 1);
    }
  }

  // ── 포즈 적용 ─────────────────────────────────────────────
  const tmpM = new THREE.Matrix4();
  const shoulderLocal = { R: new V(-1.72, 2.15, 0.0), L: new V(1.72, 2.15, 0.0) };
  const hoseAnchor = { R: [new V(-0.9, 2.3, -1.3), new V(-1.1, 1.9, -1.25)], L: [new V(0.9, 2.3, -1.3), new V(1.1, 1.9, -1.25)] };
  function basisQuat(x, y, z) { tmpM.makeBasis(x, y, z); return new THREE.Quaternion().setFromRotationMatrix(tmpM); }
  function placeSeg(g, A, B, hinge) {
    const dir = B.clone().sub(A).normalize();
    const y = dir.clone().negate();
    const x = hinge.clone().sub(y.clone().multiplyScalar(hinge.dot(y))).normalize();
    const z = new V().crossVectors(x, y).normalize();
    g.position.copy(A); g.quaternion.copy(basisQuat(x, y, z));
  }
  const out = { shoulderW: {}, wrist: {}, palm: {}, tip: {} };
  function apply(s, t) {
    torso.rotation.set(s.lean, 0, s.leanRoll || 0);
    head.position.set(0, 2.62 + (s.neckUp || 0), -0.2 + (s.neckFwd || 0));
    head.rotation.set(s.headPitch, s.headYaw, s.headRoll, 'YXZ');
    root.updateMatrixWorld(true);
    for (const k of ['R', 'L']) {
      const A = arms[k], st = s[k];
      const S = shoulderLocal[k].clone().applyMatrix4(torso.matrixWorld);
      const T = new V(...st.p);
      const pole = new V(...(st.pole || [A.sx * 1.0, -0.3, -0.7])).normalize();
      const d = T.clone().sub(S); let len = d.length();
      const dir = d.normalize();
      len = Math.min(len, (L1 + L2) * 0.995);
      const ca = (L1 * L1 + len * len - L2 * L2) / (2 * L1 * len);
      const a = Math.acos(Math.max(-1, Math.min(1, ca)));
      const pv = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      const E = S.clone().add(dir.clone().multiplyScalar(Math.cos(a) * L1)).add(pv.clone().multiplyScalar(Math.sin(a) * L1));
      const Tc = S.clone().add(dir.clone().multiplyScalar(len));
      const hinge = new V().crossVectors(dir, pv).normalize();
      placeSeg(A.up, S, E, hinge);
      placeSeg(A.fo, E, Tc, hinge);
      // 손 방향
      const f = new V(...st.f).normalize();
      let pdn = new V(...st.pl).normalize();
      pdn.sub(f.clone().multiplyScalar(pdn.dot(f))).normalize();
      const y = pdn.clone().negate();
      const x = new V().crossVectors(y, f).normalize();
      A.hand.position.copy(Tc); A.hand.quaternion.copy(basisQuat(x, y, f));
      const c = st.curl || [0.3, 0.3, 0.3, 0.3];
      for (let i = 0; i < 4; i++) {
        const [j1, j2] = A.fingers[i];
        if (i < 3) { j1.rotation.set(c[i] * 0.9, 0, 0); j2.rotation.set(c[i] * 1.1, 0, 0); }
        else j1.rotation.set(0.2 + c[3] * 0.6, -A.sx * (0.5 - c[3] * 0.3), 0);
      }
      A.hand.updateMatrixWorld(true);
      out.shoulderW[k] = S; out.wrist[k] = Tc;
      out.palm[k] = new V(0, -0.14, 0.42).applyMatrix4(A.hand.matrixWorld);
      // 집게(검지)손가락 끝
      const tipLocal = new V(0, 0, 0.24);
      const j2 = A.fingers[A.sx > 0 ? 2 : 2][1];
      j2.updateMatrixWorld(true);
      out.tip[k] = tipLocal.applyMatrix4(j2.matrixWorld);
      // 호스: 등 배낭 → 위팔
      for (let h = 0; h < 2; h++) {
        const hs = hoses[(k === 'R' ? 0 : 2) + h];
        const P0 = hoseAnchor[k][h].clone().applyMatrix4(torso.matrixWorld);
        const P3 = new V(0, -0.5 - h * 0.35, -0.3).applyMatrix4(A.up.matrixWorld);
        const mid = P0.clone().lerp(P3, 0.5);
        const sway = Math.sin(t * 2.1 + h * 1.7 + (k === 'R' ? 0 : 2)) * 0.04 * (s.hoseSwing || 0.2);
        mid.y -= 0.35 + h * 0.1; mid.x += sway; mid.z += sway * 0.5 - 0.15;
        const curve = new THREE.CatmullRomCurve3([P0, P0.clone().lerp(mid, 0.6).add(new V(0, -0.05, -0.1)), mid, P3]);
        hs.m.geometry.dispose(); hs.m.geometry = new THREE.TubeGeometry(curve, 16, hs.r, 7, false);
      }
    }
    for (let h = 0; h < 2; h++) {
      const hs = hoses[4 + h];
      const sx = h ? 1 : -1;
      const P0 = new V(sx * 0.35, 2.45, -0.55).applyMatrix4(torso.matrixWorld);
      const P3 = new V(sx * 0.62, 0.25, -0.35).applyMatrix4(head.matrixWorld);
      const mid = P0.clone().lerp(P3, 0.5).add(new V(sx * 0.12, -0.08, -0.12));
      const curve = new THREE.CatmullRomCurve3([P0, mid, P3]);
      hs.m.geometry.dispose(); hs.m.geometry = new THREE.TubeGeometry(curve, 10, hs.r, 6, false);
    }
    root.updateMatrixWorld(true);
  }

  return {
    root, torso, head, arms, nest, caps, icicles, apply, out, chestGlass, eyeGlass,
    eyeWorld: () => new V(0, 0.4, 0.95).applyMatrix4(head.matrixWorld),
    eyeDir: () => new V(0, 0, 1).transformDirection(head.matrixWorld),
    chestWorld: () => new V(0, chestY, 0.99).applyMatrix4(torso.matrixWorld),
    nestWorld: (lx = 0, ly = 0, lz = 0) => new V(lx, ly, lz).applyMatrix4(nest.matrixWorld),
  };
}
