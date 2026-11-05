// ───────────────────────────────────────────────────────────────
//  main.js — 「눈 속의 등불」 : 셀 애니메이션 룩 three.js 단편
//  3D는 레이아웃·원근·조명 계산에만 쓰고, 최종 프레임은 셀 페인트 + 잉크 선화 +
//  포스터컬러 배경 + 손그림 이펙트 + 필름 마감으로 출력한다.
// ───────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clamp, lerp, smooth, rng, track, q1, q2, q3, pathTrack, fract, E } from './util.js';
import { paintSky, paintMountains, paintSnowBrush, paintPaper, paintGlow } from './paint.js';
import * as S from './shaders.js';
import { PIT, GS, heightAt, buildGround } from './world.js';
import { makeRobot } from './robot.js';
import { makeBirds } from './birds.js';
import { Sound } from './sound.js';

THREE.ColorManagement.enabled = false;
const V3 = THREE.Vector3;
const C = (h) => new THREE.Color(h);
export const DUR = 99;

// ═══ 렌더러 / 타깃 ════════════════════════════════════════════
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const camera = new THREE.PerspectiveCamera(36, 1.85, 0.05, 900);
let W = 1600, H = 865;
let rtScene, rtNrm, rtInk, rtB1, rtB2;
const fxCanvas = document.createElement('canvas');
const fx = fxCanvas.getContext('2d');
const fxTex = new THREE.CanvasTexture(fxCanvas);
fxTex.minFilter = THREE.LinearFilter; fxTex.generateMipmaps = false;

function makeTargets() {
  for (const r of [rtScene, rtNrm, rtInk, rtB1, rtB2]) r && r.dispose();
  rtScene = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  rtNrm = new THREE.WebGLRenderTarget(W, H, { depthTexture: new THREE.DepthTexture(W, H), minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  rtInk = new THREE.WebGLRenderTarget(W, H);
  const bw = Math.max(64, W >> 2), bh = Math.max(36, H >> 2);
  rtB1 = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
  rtB2 = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
}
function resize() {
  const ar = 1.85, ww = innerWidth, wh = innerHeight;
  let cw = ww, ch = ww / ar; if (ch > wh) { ch = wh; cw = wh * ar; }
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const q = new URLSearchParams(location.search);
  W = Math.round(Math.min(cw * dpr, +(q.get('maxw') || 1920))); H = Math.round(W / ar);
  renderer.setSize(W, H, false);
  fxCanvas.width = W; fxCanvas.height = H;
  makeTargets();
  for (const m of [inkMat, finalMat]) m.uniforms.uRes.value.set(W, H);
  blurH.uniforms.uDir.value.set(1 / (W >> 2), 0); blurV.uniforms.uDir.value.set(0, 1 / (H >> 2));
  camera.aspect = ar; camera.updateProjectionMatrix();
  holdKey = null;
}

// ═══ 공용 조명 유니폼 ═════════════════════════════════════════
const LU = {
  uKeyDir: { value: new V3(-0.45, 0.8, 0.4) }, uKeyCol: { value: new V3(0.55, 0.6, 0.88) },
  uLP: { value: [new V3(), new V3(), new V3()] }, uLC: { value: [new V3(1, 0.66, 0.32), new V3(1, 0.93, 0.8), new V3(1, 1, 1)] },
  uLI: { value: [0, 0, 0] }, uLR: { value: [3.2, 2.6, 1] },
  uSpP: { value: new V3() }, uSpD: { value: new V3(0, -1, 0) }, uSpI: { value: 0 }, uSpCos: { value: 0.97 },
  uDawn: { value: 0 },
};
function toon(base, s1, s2, o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: S.TOON_VS, fragmentShader: S.TOON_FS, side: o.side || THREE.FrontSide,
    uniforms: {
      ...LU, uBase: { value: C(base) }, uS1: { value: C(s1) }, uS2: { value: C(s2) },
      uFrost: { value: o.frost || 0 }, uWear: { value: o.wear || 0 }, uWob: { value: o.wob ?? 0.14 },
      uFrostCol: { value: C(o.fc || '#eef0fb') }, uFrostS: { value: C(o.fs || '#a7aad6') },
      uEmis: { value: 0 }, uEmisCol: { value: C('#ffffff') },
    },
  });
}
const M = {
  armor: toon('#dfe0e8', '#9396b8', '#565a84', { frost: 0.8, wear: 0.8 }),
  frame: toon('#363847', '#22232f', '#121320', { frost: 0.35, wob: 0.1 }),
  stripe: toon('#cf7a4c', '#8f4d40', '#53303a', { frost: 0.5, wear: 0.5 }),
  steel: toon('#aeb3c6', '#646a88', '#343956', { frost: 0.3 }),
  hose: toon('#45404c', '#2c2834', '#18151f', { frost: 0.2 }),
  snowCel: toon('#eceaf7', '#b0afd9', '#7376b0', { wob: 0.3 }),
  ice: toon('#d8e6f6', '#8fa4cc', '#566a9a', { wob: 0 }),
  nest: toon('#7a5a45', '#523a33', '#2e2124', { frost: 0.4 }),
  nestIn: toon('#3a2a28', '#2a1e20', '#1a1216', {}),
  birdBody: toon('#8f7a6c', '#61504c', '#3a2e33', {}),
  birdBelly: toon('#e2d2bf', '#a8988f', '#6e6170', {}),
  birdDark: toon('#463c42', '#2f282e', '#1c171c', {}),
  birdWing: toon('#7a6658', '#544440', '#33292e', { side: THREE.DoubleSide }),
  beak: toon('#4e3e36', '#352a26', '#221a18', {}),
  black: toon('#121016', '#0c0a10', '#08070a', { wob: 0 }),
  white: toon('#ffffff', '#ffffff', '#e0e0f0', { wob: 0 }),
  chick: toon('#d6d0cc', '#9c96a6', '#646078', { wob: 0.2 }),
  chickBelly: toon('#ece6dc', '#b4aab0', '#7a7288', {}),
  gape: toon('#efc160', '#b2803e', '#6e4a36', {}),
};
const lampU = (hot, warm, edge) => ({
  uLevel: { value: 0 }, uFill: { value: 1 }, uOff: { value: C('#353b56') }, uOffS: { value: C('#1d2136') },
  uHot: { value: C(hot) }, uWarm: { value: C(warm) }, uEdge: { value: C(edge) }, uKeyCol: LU.uKeyCol,
});
M.chestLamp = new THREE.ShaderMaterial({ vertexShader: S.LAMP_VS, fragmentShader: S.LAMP_FS, uniforms: lampU('#fff3d2', '#ffc46e', '#e8873e') });
M.eyeLamp = new THREE.ShaderMaterial({ vertexShader: S.LAMP_VS, fragmentShader: S.LAMP_FS, uniforms: lampU('#ffffff', '#fff1c8', '#ffc77a') });

// ═══ 씬 ═══════════════════════════════════════════════════════
const scene = new THREE.Scene();
const inkList = [];      // 선화 대상 (노멀/ID 패스에 그려짐)
const noNrm = [];        // 노멀 패스에서 숨김
const nrmCache = new Map();
function ink(mesh, id) {
  let m = nrmCache.get(id);
  if (!m) { m = new THREE.ShaderMaterial({ vertexShader: S.NRM_VS, fragmentShader: S.NRM_FS, uniforms: { uId: { value: id } }, side: THREE.DoubleSide }); nrmCache.set(id, m); }
  mesh.userData.nrm = m; inkList.push(mesh);
}

// 배경 미술
const skyN = new THREE.CanvasTexture(paintSky(false)), skyD = new THREE.CanvasTexture(paintSky(true));
for (const t of [skyN, skyD]) { t.wrapS = THREE.RepeatWrapping; }
const skyMat = new THREE.ShaderMaterial({ vertexShader: S.SKY_VS, fragmentShader: S.SKY_FS, side: THREE.BackSide, depthWrite: false, uniforms: { tNight: { value: skyN }, tDawn: { value: skyD }, uDawn: LU.uDawn, uRot: { value: 0 }, uExpo: { value: 1 } } });
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), skyMat); sky.renderOrder = -10; scene.add(sky); noNrm.push(sky);
const mtN = new THREE.CanvasTexture(paintMountains(false)), mtD = new THREE.CanvasTexture(paintMountains(true));
for (const t of [mtN, mtD]) { t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; }
const mtnMat = new THREE.ShaderMaterial({ vertexShader: S.MTN_VS, fragmentShader: S.MTN_FS, side: THREE.BackSide, transparent: true, depthWrite: false, uniforms: { tNight: { value: mtN }, tDawn: { value: mtD }, uDawn: LU.uDawn, uExpo: { value: 1 } } });
const mtn = new THREE.Mesh(new THREE.CylinderGeometry(190, 190, 64, 96, 1, true), mtnMat); mtn.position.y = 7; mtn.renderOrder = -9; mtn.rotation.y = 1.2; scene.add(mtn); noNrm.push(mtn);

const brushTex = new THREE.CanvasTexture(paintSnowBrush()); brushTex.wrapS = brushTex.wrapT = THREE.RepeatWrapping;
function groundMat(usePit) {
  return new THREE.ShaderMaterial({
    vertexShader: S.GROUND_VS, fragmentShader: S.GROUND_FS,
    uniforms: {
      ...LU, tBrush: { value: brushTex }, uUsePit: { value: usePit },
      uFogCol: { value: C('#32366e') }, uFogNear: { value: 30 }, uFogFar: { value: 175 },
      uLit: { value: C('#dcdcf6') }, uMid: { value: C('#9c9dd2') }, uDeep: { value: C('#5e60a2') }, uPitCol: { value: C('#40458c') },
      uLitD: { value: C('#f6e0d6') }, uMidD: { value: C('#d6bccd') }, uDeepD: { value: C('#9a8ab8') }, uPitColD: { value: C('#6a5e96') },
    },
  });
}
const gMat = groundMat(1), lumpMat = groundMat(0);
const ground = buildGround(THREE, gMat); scene.add(ground); ink(ground, 0.2);

// 매몰감을 만드는 눈 덩어리(몸통/팔과 맞닿는 곳에 쌓인 눈)
function lumpGeo(sx, sy, sz, seed) {
  const g = new THREE.SphereGeometry(1, 20, 14);
  const p = g.attributes.position; const R = rng(seed);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 0.5) * 0.12 + (R() - 0.5) * 0.02;
    if (y < 0) y *= 0.3;
    p.setXYZ(i, x * sx * (1 + n), y * sy * (1 + n), z * sz * (1 + n));
  }
  g.computeVertexNormals();
  const c = p.count; g.setAttribute('aPit', new THREE.BufferAttribute(new Float32Array(c), 1)); g.setAttribute('aRim', new THREE.BufferAttribute(new Float32Array(c), 1));
  return g;
}
const lumps = [];
function addLump(x, z, sx, sy, sz, ry, seed, tag) {
  const m = new THREE.Mesh(lumpGeo(sx, sy, sz, seed), lumpMat);
  m.position.set(x, heightAt(x, z) - sy * 0.45, z); m.rotation.y = ry; scene.add(m); ink(m, 0.21);
  m.userData.tag = tag; lumps.push(m); return m;
}
// 가슴 앞 눈 처마 (가슴까지 파묻힘)
addLump(-0.7, 0.92, 0.75, 0.32, 0.38, 0.1, 1, 'chest');
addLump(0.65, 0.95, 0.7, 0.3, 0.36, -0.2, 2, 'chest');
addLump(0.0, 1.0, 0.5, 0.26, 0.34, 0.0, 3, 'chest');
addLump(-1.45, 0.5, 0.55, 0.35, 0.6, 0.3, 4, 'chest');
addLump(1.45, 0.5, 0.55, 0.35, 0.6, -0.3, 5, 'chest');
addLump(-1.3, -1.2, 0.9, 0.5, 0.7, 0.4, 6, 'chest');
addLump(1.2, -1.3, 0.9, 0.45, 0.7, -0.4, 7, 'chest');
// 팔이 묻힌 자리
addLump(-2.15, 1.0, 0.6, 0.32, 0.6, 0.2, 8, 'R'); addLump(-2.0, 0.55, 0.45, 0.25, 0.45, 0.6, 9, 'R');
addLump(2.15, 1.0, 0.6, 0.32, 0.6, -0.2, 10, 'L'); addLump(2.0, 0.55, 0.45, 0.25, 0.45, -0.6, 11, 'L');
// 주변 설원의 바람 조각(반복 없는 개별 형태)
{
  const R = rng(321);
  for (let i = 0; i < 0; i++) {
    const a = R() * Math.PI * 2, r = 5 + R() * 28;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - PIT.x, z - PIT.z) < 4) continue;
    addLump(x, z, 0.8 + R() * 2.2, 0.25 + R() * 0.5, 0.5 + R() * 1.2, R() * 3, 100 + i, 'field');
  }
}

const robot = makeRobot(THREE, M, ink); scene.add(robot.root);
const birds = makeBirds(THREE, M, ink); scene.add(birds.parent); for (const c of birds.chicks) scene.add(c.g);

// 떨어지는 눈덩이/고드름 복제본(월드 공간)
const fallers = [];
for (const it of [...robot.caps, ...robot.icicles]) {
  const fm = it.m.clone(); fm.visible = false; scene.add(fm); ink(fm, it.m.userData.nrm.uniforms.uId.value);
  fallers.push({ it, fm, rel: null });
}

// 램프 글로우(칠한 글로우 셀) + 탐조등
const glowW = new THREE.CanvasTexture(paintGlow(true)), glowC = new THREE.CanvasTexture(paintGlow(false));
const chestGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowW, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowC, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
scene.add(chestGlow, eyeGlow); noNrm.push(chestGlow, eyeGlow);
const beamGeo = new THREE.CylinderGeometry(0.16, 1.05, 1, 28, 1, true); beamGeo.translate(0, -0.5, 0); beamGeo.rotateX(-Math.PI / 2);
const beamMat = new THREE.ShaderMaterial({ vertexShader: S.BEAM_VS, fragmentShader: S.BEAM_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 0 }, uFrame: { value: 0 } } });
const beam = new THREE.Mesh(beamGeo, beamMat); scene.add(beam); noNrm.push(beam);

// ═══ 포스트 패스 ═══════════════════════════════════════════════
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsScene = new THREE.Scene();
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); fsScene.add(fsQuad);
function pass(mat, target) { fsQuad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); }
const paperTex = new THREE.CanvasTexture(paintPaper()); paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
const inkMat = new THREE.ShaderMaterial({ vertexShader: S.FS_VS, fragmentShader: S.INK_FS, uniforms: { tCol: { value: null }, tNrm: { value: null }, tDep: { value: null }, tFx: { value: fxTex }, uRes: { value: new THREE.Vector2() }, uNear: { value: 0.05 }, uFar: { value: 900 }, uSeed: { value: 0 }, uLine: { value: 1 }, uDawn: LU.uDawn } });
const brightMat = new THREE.ShaderMaterial({ vertexShader: S.FS_VS, fragmentShader: S.BRIGHT_FS, uniforms: { tSrc: { value: null } } });
const blurH = new THREE.ShaderMaterial({ vertexShader: S.FS_VS, fragmentShader: S.BLUR_FS, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } } });
const blurV = new THREE.ShaderMaterial({ vertexShader: S.FS_VS, fragmentShader: S.BLUR_FS, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } } });
const finalMat = new THREE.ShaderMaterial({ vertexShader: S.FS_VS, fragmentShader: S.FINAL_FS, uniforms: { tInk: { value: null }, tBloom: { value: null }, tPaper: { value: paperTex }, uRes: { value: new THREE.Vector2() }, uWeave: { value: new THREE.Vector2() }, uFrame: { value: 0 }, uPaint: { value: 0 }, uFade: { value: 1 }, uHal: { value: 0.9 }, uFlash: { value: 0 } } });

// ═══ 타임라인: 로봇 연기 ═══════════════════════════════════════
// (로봇은 무겁게 2·3코마, 새는 1코마 — 의도적 대비)
const NEST_SLOT = [[-0.085, 0.07, -0.02], [0.075, 0.07, -0.06], [0.07, 0.07, 0.085]];
const tr = {
  lean: track([[0, 0.05], [59.4, 0.05, 'heavy'], [61.4, 0.2], [65.9, 0.2, 'heavy'], [67.9, 0.27], [71.0, 0.27, 'io'], [72.2, 0.17], [74.5, 0.17, 'heavy'], [77.0, 0.1], [78.2, 0.1, 'heavy'], [79.9, 0.2]]),
  headPitch: track([[0, 0.2], [47.0, 0.2, 'heavy'], [47.9, 0.1], [48.6, 0.1, 'heavy'], [49.5, -0.02], [50.2, -0.02, 'heavy'], [51.1, -0.14], [55.0, -0.14, 'io'], [56.2, 0.2], [57.6, 0.2, 'io'], [59.0, 0.32], [60.5, 0.32, 'heavy'], [61.6, 0.78], [71.0, 0.78, 'io'], [72.4, 0.55], [74.5, 0.55, 'io'], [77.0, 0.45], [78.2, 0.45, 'heavy'], [79.9, 0.52]]),
  headYaw: track([[0, 0.03], [53.8, 0.03, 'io'], [55.0, -0.22], [56.2, -0.1], [57.6, -0.1, 'io'], [59.0, 0.16], [72.4, 0.16, 'io'], [74.5, 0.1], [77.0, 0.03]]),
  headRoll: track([[0, 0.05], [47.0, 0.05, 'heavy'], [48.6, 0.02], [51.1, 0.0], [79.9, 0.0, 'heavy'], [81, 0.04]]),
  neckUp: track([[0, 0], [47.0, 0, 'heavy'], [47.9, 0.03], [49.5, 0.06], [51.1, 0.08], [78.2, 0.08, 'io'], [79.9, 0.0]]),
  neckFwd: track([[0, 0.0], [60.5, 0.0, 'heavy'], [61.6, 0.12], [72.4, 0.12, 'io'], [74.0, 0.05], [78.2, 0.05, 'heavy'], [79.9, 0.17]]),
  R: {
    p: track([[0, [-2.3, 0.3, 1.1]], [53.2, [-2.3, 0.3, 1.1], 'snap'], [53.9, [-2.6, 2.05, 1.6]], [54.6, [-2.55, 2.0, 1.62], 'heavy'], [56.9, [-0.62, 3.12, 1.42]], [79.0, [-0.62, 3.12, 1.42], 'io'], [80.0, [-0.55, 3.15, 1.5]]]),
    f: track([[0, [0, -0.7, 0.7]], [53.2, [0, -0.7, 0.7], 'snap'], [53.9, [-0.2, 0.35, 1]], [54.6, [-0.2, 0.35, 1], 'heavy'], [56.9, [1, 0.08, -0.2]]]),
    pl: track([[0, [0, -0.7, -0.7]], [53.2, [0, -0.7, -0.7], 'snap'], [53.9, [0.25, -1, 0.3]], [54.6, [0.25, -1, 0.3], 'heavy'], [56.9, [0, 1, 0.05]]]),
    curl: track([[0, [0.6, 0.6, 0.6, 0.5]], [53.2, [0.6, 0.6, 0.6, 0.5], 'out'], [54.2, [0.15, 0.1, 0.1, 0.2]], [55.6, [0.15, 0.1, 0.1, 0.2], 'io'], [56.9, [0.42, 0.4, 0.38, 0.4]]]),
    pole: [-0.9, -0.75, -0.35],
  },
  L: {
    p: track([[0, [2.3, 0.3, 1.1]], [58.0, [2.3, 0.3, 1.1], 'snap'], [58.7, [2.65, 2.15, 1.75]], [59.6, [2.6, 2.1, 1.78], 'heavy'], [61.4, [1.45, 1.55, 2.6]], [66.0, [1.45, 1.55, 2.6], 'heavy'], [67.9, [1.2, 0.62, 2.62]], [68.4, [1.2, 0.62, 2.62], 'io'], [69.2, [1.32, 0.05, 2.56]], [71.0, [1.32, 0.05, 2.56], 'io'], [72.0, [1.45, 1.35, 2.45]], [74.5, [1.45, 1.4, 2.4], 'heavy'], [77.0, [1.02, 3.42, 1.55]], [77.8, [1.02, 3.42, 1.55], 'io'], [79.2, [0.72, 3.12, 1.6]]]),
    f: track([[0, [0, -0.7, 0.7]], [58.0, [0, -0.7, 0.7], 'snap'], [58.7, [0.2, 0.35, 1]], [59.6, [0.2, 0.35, 1], 'heavy'], [61.4, [-0.35, -0.6, 0.35]], [66.0, [-0.35, -0.6, 0.35], 'heavy'], [67.9, [-0.25, -0.9, 0.12]], [68.4, [-0.25, -0.9, 0.12], 'io'], [69.2, [-1, -0.3, 0.02]], [71.0, [-1, -0.3, 0.02], 'io'], [72.0, [-0.95, 0.05, 0.05]], [74.5, [-0.95, 0.05, 0.05], 'heavy'], [77.0, [-0.85, 0.12, -0.45]], [77.8, [-0.85, 0.12, -0.45], 'io'], [79.2, [-0.3, 0.12, 0.95]]]),
    pl: track([[0, [0, -0.7, -0.7]], [58.0, [0, -0.7, -0.7], 'snap'], [58.7, [-0.25, -1, 0.3]], [59.6, [-0.25, -1, 0.3], 'heavy'], [61.4, [-0.2, -0.6, -0.8]], [66.0, [-0.2, -0.6, -0.8], 'io'], [67.9, [-0.1, -0.2, -1]], [68.4, [-0.1, -0.2, -1], 'io'], [69.2, [0, 1, 0.1]]]),
    curl: track([[0, [0.6, 0.6, 0.6, 0.5]], [58.0, [0.6, 0.6, 0.6, 0.5], 'out'], [59.0, [0.15, 0.1, 0.1, 0.2]], [59.6, [0.15, 0.1, 0.1, 0.2], 'heavy'], [61.4, [1.0, 0.95, 0.04, 0.8]], [68.4, [1.0, 0.95, 0.04, 0.8], 'io'], [69.2, [0.12, 0.1, 0.1, 0.3]], [71.0, [0.12, 0.1, 0.1, 0.3], 'io'], [72.0, [0.4, 0.38, 0.35, 0.4]], [77.8, [0.4, 0.38, 0.35, 0.4], 'io'], [79.2, [0.35, 0.3, 0.06, 0.4]]]),
    pole: [0.9, -0.75, -0.35],
  },
};
// 램프: 깜빡임은 1코마 단위의 '홀드' 키
const stepTrack = (keys) => track(keys.map(([t, v]) => [t, v, 'hold']));
const chestT = stepTrack([[0, 0], [28.55, 0.22], [28.7, 0], [28.8, 0.12], [28.92, 0],
  [31.85, 0.38], [32.05, 0.1], [32.15, 0.42], [32.5, 0.22], [32.62, 0.35], [32.9, 0]]);
function chestLevel(t) {
  if (t < 35.0) return chestT(t);
  if (t < 35.7) return stepTrack([[35.0, 0.0], [35.05, 0.3], [35.2, 0.12], [35.3, 0.52], [35.45, 0.35], [35.58, 0.62]])(t);
  if (t < 37.5) return lerp(0.66, 0.8, smooth(35.7, 37.5, q2(t)));
  if (t < 77.6) return 0.82;
  if (t < 79.0) return lerp(0.82, 1.3, E.io(clamp((q2(t) - 77.6) / 1.4)));
  if (t < 84) return 1.3;
  return lerp(1.3, 0.9, smooth(84, 90, t));
}
const eyeFlick = stepTrack([[0, 0], [40.8, 0.14], [40.95, 0], [41.3, 0.24], [41.45, 0.08], [41.6, 0.3], [41.9, 0.18], [42.1, 0.32]]);
function eyeState(t) {
  if (t < 42.1) return { level: eyeFlick(t), fill: 0.32 };
  if (t < 45.4) { const u = clamp((q2(t) - 42.1) / 3.3); return { level: lerp(0.4, 1.0, u), fill: lerp(0.32, 1.0, Math.pow(u, 0.8)) }; }
  if (t < 61.7) return { level: 1.0, fill: 1 };
  if (t < 72.6) { const u = clamp((q1(t) - 61.7) / 0.35); return { level: lerp(1.0, 1.7, u), fill: 1, beam: u < 0.3 ? 0.4 : (t > 72.3 ? 0.5 : 1) }; }
  if (t < 90.5) return { level: 1.0, fill: 1 };
  if (t < 96.5) { const u = clamp((q3(t) - 90.5) / 5.5); const fl = (t > 93.6 && t < 93.75) ? -0.15 : 0; return { level: Math.max(0, 1 - u + fl), fill: Math.max(0.05, 1 - u * 0.9) }; }
  return { level: 0, fill: 0.05 };
}
function robotState(t) {
  const t2 = q2(t), t3 = q3(t);
  const headT = (t > 46.5 && t < 52) ? t3 : t2; // 머리 들기는 3코마
  const s = {
    lean: tr.lean(t2), headPitch: tr.headPitch(headT), headYaw: tr.headYaw(t2), headRoll: tr.headRoll(headT),
    neckUp: tr.neckUp(headT), neckFwd: tr.neckFwd(t2), hoseSwing: 0.2,
  };
  for (const k of ['R', 'L']) {
    const a = tr[k];
    const sx = k === 'L' ? 1 : -1; const pd = t2 >= 74.5 ? smooth(74.5, 77.5, t2) : 0;
    s[k] = { p: a.p(t2), f: a.f(t2), pl: a.pl(t2), curl: a.curl(t2), pole: [lerp(a.pole[0], sx * 0.35, pd), lerp(a.pole[1], -1, pd), lerp(a.pole[2], -0.05, pd)] };
  }
  // 정지 상태의 미세한 '숨'은 넣지 않는다(떠다니는 부품 금지) — 대신 깨어난 뒤 유압 떨림 1~2코마
  if (t > 53.2 && t < 53.4) s.lean += 0.012;
  if (t > 58.0 && t < 58.2) s.lean += 0.012;
  return s;
}

// ═══ 타임라인: 새들 ═══════════════════════════════════════════
function rimPoint(ang, out = 0) {
  const Rr = PIT.R * (1 + 0.14 * Math.sin(3 * ang + 1.0) + 0.07 * Math.sin(5 * ang + 2.3) + 0.05 * Math.sin(8 * ang)) + out;
  const x = PIT.x + Math.cos(ang) * Rr, z = PIT.z + Math.sin(ang) * Rr;
  return [x, heightAt(x, z, { armOutR: 0, armOutL: 0, collapse: 0 }), z];
}
const pitBottom = () => [PIT.x, heightAt(PIT.x, PIT.z, { armOutR: 0, armOutL: 0, collapse: 0 }), PIT.z];
const RIM_CAM = rimPoint(Math.atan2(0.45, -0.48), 0.03);     // 카메라 쪽 테두리
const RIM_BOT = rimPoint(Math.atan2(-0.96, -0.26), 0.03);    // 로봇 쪽 테두리
const RIM_SIDE = rimPoint(Math.PI * 0.86, 0.06);
const wingCycle = (t, rate = 1) => [1, 2, 3, 4][Math.floor(t * 24 * rate) % 4];

let parentPath = null;
function buildParentPath() {
  const up = (p, y) => [p[0], p[1] + y, p[2]];
  parentPath = pathTrack([
    [19.6, [-3.6, 4.6, 7.8]], [20.4, [-1.6, 2.4, 5.2]], [21.1, up(RIM_CAM, 0.25)], [21.35, RIM_CAM],
    [22.2, RIM_CAM], [22.5, [PIT.x - 0.1, 0.55, PIT.z + 0.15]], [22.85, [PIT.x, 0.35, PIT.z + 0.05]],
    [23.3, [PIT.x - 0.7, 0.95, PIT.z + 0.9]], [23.7, up(RIM_CAM, 0.2)], [23.9, RIM_CAM],
    [24.1, RIM_CAM], [24.7, [0.45, 1.3, 2.4]], [25.6, [0.55, 2.1, 1.8]], [26.4, [0.42, 2.45, 1.35]], [26.7, [0.36, 2.37, 1.2]],
  ]);
}
function parentState(t, chestPos, tipPos, nestTop) {
  const t1 = q1(t);
  if (t < 19.6) return { visible: false, p: [0, -50, 0] };
  if (t < 26.7) {
    const p = parentPath(t1);
    const p2 = parentPath(t1 + 0.04);
    const yaw = Math.atan2(p2[0] - p[0], p2[2] - p[2]);
    const onRim = (t > 21.35 && t < 22.2) || (t > 23.9 && t < 24.1);
    const hover = t > 22.5 && t < 23.0;
    const gust = t > 22.85 && t < 23.4;
    if (onRim) {
      const peer = t > 21.5 && t < 22.15;
      return { p, yaw: 2.6, pitch: peer ? 0.35 : 0.1, headPitch: peer ? 0.55 : 0, wing: 0, tail: Math.floor(t * 6) % 2 ? 0.15 : 0 };
    }
    return { p, yaw: hover ? 2.4 : yaw, pitch: gust ? -0.5 : -0.1, roll: gust ? 0.6 : 0, wing: gust ? wingCycle(t, 1.4) : wingCycle(t), fly: true };
  }
  // 램프에 매달려 쪼기
  const cling = [chestPos.x + 0.36, chestPos.y - 0.27, chestPos.z + 0.1];
  if (t < 36.0) {
    let peck = 0;
    for (const pt of [28.5, 31.8, 35.0]) { const u = t1 - pt; if (u >= 0 && u < 0.25) peck = u < 0.125 ? 1 : 0.4; else if (u >= -0.25 && u < 0) peck = -0.35; }
    const flap = t < 27.2 ? wingCycle(t) : ((t > 28.5 && t < 28.65) || (t > 31.8 && t < 31.95) || (t > 35.0 && t < 35.15) ? 2 : 0);
    return { p: cling, yaw: -Math.PI / 2 - 0.25, pitch: -0.55, headPitch: 0.25 - peck * 0.15, peck: Math.max(0, peck), wing: flap, tail: 0.3 };
  }
  // 놀라 물러섰다가 구덩이로 길 안내
  if (t < 41.0) {
    const path = pathTrack([[36.0, cling], [36.4, [cling[0] + 0.35, cling[1] + 0.3, cling[2] + 0.3]], [37.3, [cling[0] + 0.4, cling[1] + 0.35, cling[2] + 0.45]], [38.4, [PIT.x + 0.2, 1.0, PIT.z - 0.3]], [40.3, [PIT.x, 0.85, PIT.z + 0.05]], [40.8, up3(RIM_BOT, 0.2)], [41.0, RIM_BOT]]);
    const p = path(t1); const p2 = path(t1 + 0.04);
    const startle = t < 36.4;
    const hov = t > 38.4 && t < 40.3;
    const yaw = hov ? Math.PI * 0.95 : Math.atan2(p2[0] - p[0], p2[2] - p[2]);
    return { p, yaw, pitch: startle ? 0.4 : -0.15, wing: startle ? 1 : wingCycle(t, hov ? 1.3 : 1), fly: true, headPitch: hov ? -0.3 : 0 };
  }
  if (t < 59.4) return { p: RIM_BOT, yaw: Math.PI + 0.25, pitch: 0.05, headPitch: t > 47 && t < 52 ? -0.5 : 0.1, wing: 0, tail: Math.floor(t * 4) % 3 === 0 ? 0.12 : 0 };
  if (t < 59.9) { const u = (q1(t) - 59.4) / 0.5; const p = [lerp(RIM_BOT[0], RIM_SIDE[0], u), lerp(RIM_BOT[1], RIM_SIDE[1], u) + Math.sin(u * Math.PI) * 0.18, lerp(RIM_BOT[2], RIM_SIDE[2], u)]; return { p, yaw: -2.0, wing: wingCycle(t), fly: true }; }
  if (t < 71.45) {
    const flinch = (t > 63.0 && t < 63.3) || (t > 64.4 && t < 64.6);
    return { p: RIM_SIDE, yaw: 1.1, pitch: flinch ? -0.25 : 0.12, headPitch: t > 66 ? 0.35 : 0.1, wing: flinch ? 1 : 0 };
  }
  if (t < 78.0) {
    const path = pathTrack([[71.45, RIM_SIDE], [72.4, [PIT.x - 0.6, 1.7, PIT.z + 0.4]], [74.5, [1.6, 2.3, 2.6]], [76.6, [1.0, 3.6, 2.0]], [77.6, [nestTop.x - 0.25, nestTop.y + 0.12, nestTop.z - 0.02]], [78.0, [nestTop.x - 0.06, nestTop.y + 0.02, nestTop.z - 0.02]]]);
    const p = path(t1), p2 = path(t1 + 0.04);
    return { p, yaw: Math.atan2(p2[0] - p[0], p2[2] - p[2]), pitch: -0.1, wing: t > 77.6 ? 2 : wingCycle(t), fly: t < 77.6 };
  }
  if (t < 80.6) return { p: [nestTop.x - 0.04, nestTop.y + 0.035, nestTop.z - 0.02], yaw: 0.4, pitch: 0.05, wing: 0, headPitch: 0.15 };
  if (t < 84.0) return { visible: false, p: [0, -50, 0] };
  // 새벽: 손가락 끝에 내려앉고, 둥지로 폴짝
  if (t < 87.0) {
    const path = pathTrack([[84.0, [tipPos.x - 2.8, tipPos.y + 2.4, tipPos.z + 3.0]], [84.6, [tipPos.x - 0.9, tipPos.y + 0.6, tipPos.z + 0.9]], [84.95, [tipPos.x, tipPos.y + 0.12, tipPos.z]], [85.1, [tipPos.x, tipPos.y + 0.01, tipPos.z]]]);
    const p = path(t1), p2 = path(Math.min(t1 + 0.04, 85.1));
    if (t < 85.1) return { p, yaw: Math.atan2(p2[0] - p[0], p2[2] - p[2]) || 0.5, wing: t > 84.9 ? 1 : wingCycle(t), fly: true, pitch: -0.15 };
    const look = t > 85.6 && t < 86.4;
    return { p: [tipPos.x, tipPos.y + 0.01, tipPos.z], yaw: -2.2, pitch: 0.05, headPitch: look ? -0.35 : 0.1, headYaw: look ? 0.4 : 0, wing: t < 85.25 ? 2 : 0, tail: t < 85.35 ? 0.3 : 0 };
  }
  if (t < 87.45) { const u = (q1(t) - 87.0) / 0.45; const a = [tipPos.x, tipPos.y, tipPos.z], b = [nestTop.x + 0.02, nestTop.y + 0.03, nestTop.z + 0.03]; return { p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * 0.16, lerp(a[2], b[2], u)], yaw: -2.0, wing: u < 0.6 ? 2 : 0, pitch: -0.2 }; }
  return { p: [nestTop.x + 0.02, nestTop.y + 0.03, nestTop.z + 0.03], yaw: 0.2, pitch: 0.06, wing: 0, headPitch: Math.floor(t * 3) % 4 === 0 ? 0.3 : 0.05 };
}
function up3(p, y) { return [p[0], p[1] + y, p[2]]; }

function fallenChick(t, nestSlotW, palm, nestW2) {
  const t1 = q1(t), t2 = q2(t);
  const B = pitBottom();
  if (t < 11.0) {
    const wob = t > 10.3 ? Math.sin(t1 * 40) * 0.12 * smooth(10.3, 10.9, t) : 0;
    return { p: [nestSlotW.x, nestSlotW.y, nestSlotW.z], yaw: 0.3, roll: wob, pitch: t > 10.7 ? 0.25 : 0, open: t > 10.4 && Math.floor(t * 8) % 2 ? 0.6 : 0, flap: t > 10.5 ? (Math.floor(t * 24) % 2 ? 0.8 : 0.2) : 0 };
  }
  if (t < 11.6) {
    const u = (t1 - 11.0) / 0.6;
    const x = lerp(nestSlotW.x, 0.32, u), z = lerp(nestSlotW.z, 1.55, u);
    const y0 = nestSlotW.y, y1 = heightAt(0.32, 1.55) + 0.0;
    const y = lerp(y0, y1, u * u) + Math.sin(u * Math.PI) * 0.15;
    return { p: [x, y, z], pitch: u * 6, roll: u * 2, flap: Math.floor(t * 24) % 2 ? 1 : 0.2, open: 0.8 };
  }
  if (t < 14.1) {
    // 눈 더미 사면을 구르며 내려옴 (2코마)
    const u = E.in(clamp((t2 - 11.6) / 2.5)) * 0.85 + clamp((t2 - 11.6) / 2.5) * 0.15;
    const st = [0.32, 1.55], en = [0.6, 2.08];
    const x = lerp(st[0], en[0], u), z = lerp(st[1], en[1], u);
    const bounce = Math.abs(Math.sin(u * Math.PI * 4)) * 0.05 * (1 - u * 0.5);
    return { p: [x, heightAt(x, z, { armOutR: 0, armOutL: 0, collapse: 0 }) + bounce, z], pitch: u * 18, roll: Math.sin(u * 9) * 0.4, yaw: 0.4, open: 0.4, squash: bounce < 0.01 ? 0.6 : 0 };
  }
  if (t < 14.55) {
    const u = (t1 - 14.1) / 0.45;
    const a = [0.6, heightAt(0.6, 2.08), 2.08];
    return { p: [lerp(a[0], B[0], u), lerp(a[1], B[1], u * u) + Math.sin(u * Math.PI) * 0.06, lerp(a[2], B[2], u)], pitch: 18 + u * 3, roll: 0.3, open: 0.5 };
  }
  if (t < 69.2) {
    const cryOn = (t > 15.0 && t < 40.0) || (t > 61 && t < 66) || (t > 67.9 && t < 68.4);
    const open = cryOn && (Math.floor(t * 12) % 3 !== 0) && (Math.floor(t * 1.4) % 3 !== 2) ? 1 : 0;
    const shiver = (Math.floor(t * 24) % 2 ? 1 : -1) * 0.03;
    const look = t > 66.5 ? 1.25 : 0.3;
    const squash = t < 14.75 ? 0.7 : 0;
    return { p: [B[0], B[1] + 0.005, B[2]], yaw: look, pitch: -0.35 + (open ? -0.08 : 0), roll: shiver, open, squash, flap: open ? (Math.floor(t * 24) % 2 ? 0.7 : 0.25) : 0.1 };
  }
  if (t < 70.0) {
    // 두 번 폴짝 — 손바닥 위로
    const hops = [[69.2, [B[0], B[1], B[2]]], [69.6, [lerp(B[0], palm.x, 0.5), lerp(B[1], palm.y, 0.6), lerp(B[2], palm.z, 0.5)]], [70.0, [palm.x, palm.y, palm.z]]];
    const i = t1 < 69.6 ? 0 : 1; const a = hops[i][1], b = hops[i + 1][1]; const u = (t1 - hops[i][0]) / 0.4;
    return { p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(u * Math.PI) * 0.1, lerp(a[2], b[2], u)], yaw: 1.3, pitch: 0.15, flap: 0.8, open: 0, squash: u > 0.85 ? 0.5 : 0 };
  }
  if (t < 77.2) {
    const open = t > 72.5 && t < 73.0 ? 1 : 0;
    return { p: [palm.x, palm.y, palm.z], yaw: t > 74.5 ? -0.9 : 1.4, pitch: 0.05, open, flap: t < 72 && t > 71.1 ? 0.6 : 0.1, squash: t < 70.15 ? 0.5 : 0 };
  }
  if (t < 77.6) {
    const u = (t1 - 77.2) / 0.4;
    return { p: [lerp(palm.x, nestW2.x, u), lerp(palm.y, nestW2.y, u) + Math.sin(u * Math.PI) * 0.12, lerp(palm.z, nestW2.z, u)], yaw: -1.2, flap: 0.8, squash: u > 0.9 ? 0.5 : 0 };
  }
  return { p: [nestW2.x, nestW2.y, nestW2.z], yaw: 0.6, pitch: 0.1, open: (t > 87.5 && Math.floor(t * 10) % 2) ? 1 : 0, squash: t < 77.8 ? 0.4 : 0 };
}

// ═══ 샷 (카메라) ══════════════════════════════════════════════
// p: 카메라 위치, l: 주시점, f: 화각 / 카메라 스탠드 느낌의 단순한 팬·트랙
const SHOTS = [
  { t: 0, a: { p: [-9.6, 1.25, 15.2], l: [0, 2.3, 0], f: 36 }, b: { p: [-8.9, 1.3, 13.9], l: [0, 2.35, 0], f: 36 }, wind: 2.75, line: 0.75 },
  { t: 7.5, a: { p: [0.78, 3.95, 2.05], l: [0.02, 3.62, 0.98], f: 30 }, b: { p: [0.74, 3.93, 1.98], l: [0.02, 3.62, 0.98], f: 29 }, wind: 2.6, line: 1.0 },
  { t: 11.5, a: { p: [1.75, 2.45, 2.55], l: [0.3, 2.0, 1.5], f: 36 }, b: { p: [1.9, 1.05, 3.45], l: [0.62, 0.1, 2.3], f: 36 }, ease: 'io', wind: 2.8, line: 0.9 },
  { t: 15.4, a: { p: [0.92, 1.75, 3.1], l: [0.72, -0.45, 2.62], f: 36 }, b: { p: [0.9, 1.6, 3.05], l: [0.72, -0.45, 2.62], f: 34 }, wind: 1.9, line: 1.0 },
  { t: 19.6, a: { p: [-2.4, 0.95, 6.3], l: [0.4, 1.3, 2.2], f: 42 }, b: { p: [-2.3, 0.95, 6.1], l: [0.4, 1.3, 2.2], f: 42 }, wind: 2.9, line: 0.85 },
  { t: 24.0, a: { p: [-2.3, 2.4, 5.0], l: [0.3, 1.9, 1.8], f: 38 }, b: { p: [-2.2, 2.6, 4.6], l: [0.2, 2.5, 1.2], f: 36 }, wind: 2.8, line: 0.9 },
  { t: 26.6, a: { p: [0.85, 2.72, 2.45], l: [0.16, 2.58, 1.1], f: 30 }, b: { p: [0.83, 2.72, 2.37], l: [0.16, 2.58, 1.1], f: 29 }, wind: 2.6, line: 1.0 },
  { t: 37.6, a: { p: [0.85, 0.75, 4.5], l: [0.2, 3.2, 0.6], f: 42 }, b: { p: [0.85, 0.8, 4.4], l: [0.2, 3.3, 0.6], f: 41 }, wind: 2.2, line: 0.95 },
  { t: 40.0, a: { p: [0.14, 3.86, 2.05], l: [0.0, 3.8, 0.75], f: 20 }, b: { p: [0.13, 3.85, 1.85], l: [0.0, 3.8, 0.75], f: 19 }, wind: 2.5, line: 1.15 },
  { t: 46.9, a: { p: [1.4, 1.75, 6.9], l: [0, 3.25, 0.2], f: 38 }, b: { p: [1.35, 1.7, 6.6], l: [0, 3.4, 0.2], f: 38 }, wind: 2.7, line: 0.9 },
  { t: 52.6, a: { p: [-4.9, 1.7, 5.2], l: [-1.7, 1.7, 1.1], f: 38 }, b: { p: [-4.6, 2.1, 5.0], l: [-1.4, 2.6, 1.1], f: 38 }, wind: 2.9, line: 0.9, ease: 'io' },
  { t: 57.5, a: { p: [5.2, 1.5, 5.4], l: [1.8, 1.5, 1.6], f: 38 }, b: { p: [4.4, 1.9, 5.6], l: [1.3, 1.3, 2.3], f: 40 }, wind: 2.6, line: 0.9, ease: 'io' },
  { t: 61.5, a: { p: [3.9, 4.5, 4.9], l: [0.55, 1.2, 2.0], f: 40 }, b: { p: [3.7, 4.3, 4.7], l: [0.6, 0.9, 2.2], f: 38 }, wind: 1.6, line: 0.9 },
  { t: 66.0, a: { p: [1.55, 1.05, 4.0], l: [0.8, -0.3, 2.65], f: 32 }, b: { p: [1.5, 1.0, 3.9], l: [0.8, -0.3, 2.65], f: 31 }, wind: 2.4, line: 1.05 },
  { t: 71.0, a: { p: [-3.3, 1.5, 6.8], l: [0.6, 0.9, 2.5], f: 38 }, b: { p: [-3.3, 1.55, 6.8], l: [0.6, 1.0, 2.5], f: 38 }, wind: 2.8, line: 0.85 },
  { t: 74.5, a: { p: [2.9, 3.0, 5.0], l: [0.7, 2.6, 1.7], f: 36 }, b: { p: [2.2, 3.5, 4.7], l: [0.25, 3.4, 1.2], f: 33 }, wind: 2.6, line: 0.95, ease: 'io' },
  { t: 80.4, a: { p: [-8.2, 1.35, 12.6], l: [0, 2.4, 0], f: 34 }, b: { p: [-7.9, 1.35, 12.2], l: [0, 2.45, 0], f: 34 }, wind: 2.7, line: 0.75 },
  { t: 84.0, a: { p: [-2.4, 4.0, 5.0], l: [0.35, 3.4, 1.5], f: 30 }, b: { p: [-2.35, 4.0, 4.9], l: [0.35, 3.4, 1.5], f: 29 }, wind: 2.5, line: 1.0 },
  { t: 88.6, a: { p: [-7.4, 1.25, 11.6], l: [0, 2.6, 0], f: 34 }, b: { p: [-8.6, 1.4, 13.6], l: [0, 2.75, 0], f: 34 }, wind: 2.7, line: 0.72 },
];
for (let i = 0; i < SHOTS.length; i++) SHOTS[i].t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t : DUR;
function shotAt(t) { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].t) i++; return i; }
const HOLDS = [[45.35, 46.85], [70.1, 71.0], [85.5, 86.7]];
const SHAKES = [[53.2, 0.3, 0.06], [58.0, 0.3, 0.06], [71.6, 1.0, 0.04], [47.9, 0.12, 0.02], [49.5, 0.12, 0.02], [51.1, 0.12, 0.02]];
const GUSTS = [[3.2, 2.6], [9.9, 2.6], [22.55, 1.9], [52.4, 1.6], [80.4, 2.2]];
function storm(t) { if (t < 60) return 1; if (t < 78) return 0.85; if (t < 81) return lerp(0.85, 0.5, (t - 78) / 3); if (t < 84) return lerp(0.5, 0.07, (t - 81) / 3); return 0.07; }
const dawnT = track([[0, 0], [80.9, 0, 'io'], [84.0, 1]]);

// ═══ 손그림 이펙트(오버레이 셀) ══════════════════════════════════
const _v = new V3();
function P(x, y, z) { _v.set(x, y, z).project(camera); return [(_v.x * 0.5 + 0.5) * W, (1 - (_v.y * 0.5 + 0.5)) * H, _v.z]; }
function pxSize(x, y, z, s) { const d = camera.position.distanceTo(_v.set(x, y, z)); return s * H / (2 * Math.tan(camera.fov * Math.PI / 360) * d); }

function drawSnow(t, si, wind, k, dawn) {
  const tq = q2(t);
  const sc = W / 1600;
  const layers = [{ n: 1000, len: 7, w: 1.1, a: 0.5, sp: 0.55 }, { n: 420, len: 15, w: 1.8, a: 0.62, sp: 0.95 }, { n: 80, len: 32, w: 3.6, a: 0.5, sp: 1.6 }];
  const ca = Math.cos(wind), sa = Math.sin(wind);
  fx.lineCap = 'round';
  for (let L = 0; L < 3; L++) {
    const ly = layers[L]; const R = rng(1000 + L * 77 + si * 13);
    const n = Math.floor(ly.n * k * (W * H) / (1600 * 865));
    const col = dawn > 0.5 ? (L === 2 ? '255,236,228' : '250,226,232') : (L === 0 ? '170,176,230' : '214,218,252');
    for (let i = 0; i < n; i++) {
      const x0 = R(), y0 = R(), sv = 0.7 + R() * 0.6, ph = R() * 6.28, wob = R();
      const sp = ly.sp * sv * (dawn > 0.5 ? 0.18 : 1);
      let x = fract(x0 + ca * sp * tq * 0.22 + Math.sin(tq * 1.7 + ph) * 0.006 * wob) * (W + 120) - 60;
      let y = fract(y0 - sa * sp * tq * 0.22 * -1 + (dawn > 0.5 ? tq * 0.01 * sv : 0)) * (H + 120) - 60;
      const len = ly.len * sv * sc * (dawn > 0.5 ? 0.25 : 1);
      fx.globalAlpha = ly.a * (0.6 + R() * 0.4);
      fx.strokeStyle = `rgb(${col})`;
      if (L === 2) {
        fx.fillStyle = `rgb(${col})`;
        fx.beginPath(); fx.ellipse(x, y, Math.max(1.5, len * 0.22), ly.w * sc * 0.8, wind, 0, 6.283); fx.fill();
      } else {
        fx.lineWidth = ly.w * sc;
        fx.beginPath(); fx.moveTo(x, y); fx.lineTo(x - ca * len, y + sa * len * -1); fx.stroke();
      }
    }
  }
  fx.globalAlpha = 1;
}
function drawGusts(t, wind) {
  for (const [g0, dur] of GUSTS) {
    const u = (q2(t) - g0) / dur; if (u < 0 || u > 1) continue;
    const env = Math.sin(u * Math.PI);
    const R = rng(Math.floor(g0 * 100));
    for (let b = 0; b < 6; b++) {
      const yb = H * (0.55 + b * 0.075 + (R() - 0.5) * 0.05);
      const x0 = W * (1.3 - u * 1.9) + (R() - 0.5) * W * 0.4;
      for (let s = 0; s < 34; s++) {
        const xs = x0 + (R() - 0.5) * W * 0.6, ys = yb + (R() - 0.5) * H * 0.08;
        const l = (80 + R() * 260) * W / 1600;
        fx.globalAlpha = env * (0.05 + R() * 0.09);
        fx.strokeStyle = R() < 0.5 ? '#c9ccf4' : '#9ea2dc';
        fx.lineWidth = (4 + R() * 18) * W / 1600;
        fx.beginPath(); fx.moveTo(xs, ys); fx.quadraticCurveTo(xs - l * 0.5, ys - 10 - R() * 30, xs - l, ys + (R() - 0.5) * 20); fx.stroke();
      }
    }
  }
  fx.globalAlpha = 1;
}
// 덩어리 + 연기(퍼프): 시작 시각 기준 결정론적 탄도
function makeBurst(seed, n, spread, up, out, sizeA, sizeB) {
  const R = rng(seed); const parts = [];
  for (let i = 0; i < n; i++) parts.push({ o: [(R() - 0.5) * spread, R() * 0.2, (R() - 0.5) * spread], v: [(R() - 0.5) * out, up * (0.5 + R() * 0.8), (R() - 0.5) * out + out * 0.2], s: sizeA + R() * (sizeB - sizeA), rot: R() * 6, vr: (R() - 0.5) * 8, sides: 5 + (R() * 3 | 0), jit: [R(), R(), R(), R(), R(), R(), R(), R()] });
  return parts;
}
const BURSTS = [
  { t: 53.2, at: [-2.25, 0.9, 1.15], chunks: makeBurst(11, 30, 0.9, 4.2, 2.2, 0.06, 0.24), puffs: makeBurst(12, 14, 1.0, 1.1, 0.8, 0.25, 0.55) },
  { t: 58.0, at: [2.25, 0.9, 1.15], chunks: makeBurst(21, 30, 0.9, 4.2, 2.2, 0.06, 0.24), puffs: makeBurst(22, 14, 1.0, 1.1, 0.8, 0.25, 0.55) },
];
function drawChunk(x, y, r, rot, sides, jit, smear, dirx, diry) {
  fx.beginPath();
  for (let k = 0; k < sides; k++) {
    const a = rot + k / sides * 6.283; const rr = r * (0.7 + jit[k % 8] * 0.5);
    let px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (smear && (Math.cos(a) * dirx + Math.sin(a) * diry) < 0) { px -= dirx * r * 2.5; py -= diry * r * 2.5; }
    k ? fx.lineTo(px, py) : fx.moveTo(px, py);
  }
  fx.closePath();
}
function drawBursts(t, dawn) {
  for (const b of BURSTS) {
    const dt = q2(t) - b.t; if (dt < 0 || dt > 3) continue;
    for (const c of b.chunks) {
      const x = b.at[0] + c.o[0] + c.v[0] * dt, z = b.at[2] + c.o[2] + c.v[2] * dt;
      const y = b.at[1] + c.o[1] + c.v[1] * dt - 4.9 * dt * dt;
      if (y < heightAt(x, z) - 0.05) continue;
      const [sx, sy, sz] = P(x, y, z); if (sz > 1) continue;
      const r = pxSize(x, y, z, c.s);
      const vy = c.v[1] - 9.8 * dt;
      const [qx, qy] = P(x + c.v[0] * 0.03, y + vy * 0.03, z + c.v[2] * 0.03);
      let dx = qx - sx, dy = qy - sy; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const smear = dt < 0.17;
      drawChunk(sx, sy, r, c.rot + c.vr * q2(dt), c.sides, c.jit, smear, dx, dy);
      fx.fillStyle = '#e8e8fa'; fx.fill();
      fx.save(); fx.clip();
      fx.fillStyle = '#9a9cd4'; fx.fillRect(sx - r * 2, sy + r * 0.1, r * 4, r * 3);
      fx.restore();
      fx.lineWidth = Math.max(1, r * 0.12); fx.strokeStyle = '#2a2d62'; fx.stroke();
    }
    for (const p of b.puffs) {
      const u = dt / 2.2; if (u > 1) continue;
      const x = b.at[0] + p.o[0] + p.v[0] * dt * 0.6, z = b.at[2] + p.o[2] + p.v[2] * dt * 0.6, y = b.at[1] + 0.2 + p.v[1] * dt * 0.7;
      const [sx, sy, sz] = P(x, y, z); if (sz > 1) continue;
      const r = pxSize(x, y, z, p.s * (0.5 + u * 1.4));
      puff(sx, sy, r * (u > 0.65 ? (1 - u) / 0.35 : 1), 1, p.jit);
    }
  }
}
function puff(x, y, r, a, jit) {
  fx.globalAlpha = Math.min(1, a * 1.25);
  fx.beginPath();
  for (let k = 0; k < 6; k++) { const ang = k / 6 * 6.283 + jit[k]; const rr = r * (0.45 + jit[(k + 2) % 8] * 0.3); fx.moveTo(x + Math.cos(ang) * r * 0.5 + rr, y + Math.sin(ang) * r * 0.45); fx.arc(x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.45, rr, 0, 6.283); }
  fx.lineWidth = Math.max(1.5, r * 0.07); fx.strokeStyle = '#4a4e8a'; fx.stroke();
  fx.fillStyle = '#d4d6f4'; fx.fill();
  fx.save(); fx.clip(); fx.fillStyle = '#9fa2d6'; fx.beginPath(); fx.ellipse(x + r * 0.1, y + r * 0.55, r * 1.2, r * 0.6, 0, 0, 6.283); fx.fill(); fx.restore();
  fx.globalAlpha = 1;
}
// 테두리의 균열(잉크 선)
const CRACKS = (() => {
  const R = rng(555); const out = [];
  const angs = [0.3, 1.1, 1.9, 2.6, 3.4, 4.3, 5.1, 5.8];
  angs.forEach((a0, i) => {
    let a = a0 + (R() - 0.5) * 0.3; const st = rimPoint(a, -0.02); const pts = [[st[0], st[2]]];
    let x = st[0], z = st[2]; let dir = a + (R() - 0.5) * 1.2;
    const n = 9 + (R() * 8 | 0);
    for (let k = 0; k < n; k++) { dir += (R() - 0.5) * 1.1; const l = 0.045 + R() * 0.05; x += Math.cos(dir) * l; z += Math.sin(dir) * l; pts.push([x, z]); }
    out.push({ pts, t0: 63.0 + i * 0.28 + R() * 0.2, dur: 0.9 + R() * 0.6 });
  });
  return out;
})();
function drawCracks(t) {
  if (t < 63 || t > 72.0) return;
  const tq = q2(t);
  for (const c of CRACKS) {
    const u = clamp((tq - c.t0) / c.dur); if (u <= 0) continue;
    const m = Math.max(2, Math.ceil(u * c.pts.length));
    const pts = c.pts.slice(0, m).map(([x, z]) => P(x, heightAt(x, z) + 0.012, z));
    for (let k = 1; k < pts.length; k++) {
      const w = lerp(2.8, 0.7, k / c.pts.length) * W / 1600;
      fx.strokeStyle = '#141838'; fx.lineWidth = w; fx.lineCap = 'round';
      fx.beginPath(); fx.moveTo(pts[k - 1][0], pts[k - 1][1]); fx.lineTo(pts[k][0], pts[k][1]); fx.stroke();
      fx.strokeStyle = 'rgba(236,236,255,0.6)'; fx.lineWidth = w * 0.6;
      fx.beginPath(); fx.moveTo(pts[k - 1][0], pts[k - 1][1] - w * 1.4); fx.lineTo(pts[k][0], pts[k][1] - w * 1.4); fx.stroke();
    }
  }
}
const COLLAPSE = makeBurst(777, 34, 1.5, 1.0, 1.1, 0.25, 0.6);
const COLLAPSE_CH = makeBurst(778, 24, 1.3, 1.6, 0.6, 0.05, 0.16);
function drawCollapse(t) {
  const dt = q2(t) - 71.6; if (dt < 0 || dt > 3.2) return;
  for (const c of COLLAPSE_CH) {
    const x = PIT.x + c.o[0] * 0.9, z = PIT.z + c.o[2] * 0.9;
    const y = heightAt(PIT.x, PIT.z) + 0.3 + c.v[1] * dt * 0.5 - 4.9 * dt * dt;
    if (y < heightAt(x, z) - 0.1 || dt > 1.2) continue;
    const [sx, sy, sz] = P(x, y, z); if (sz > 1) continue;
    const r = pxSize(x, y, z, c.s);
    drawChunk(sx, sy, r, c.rot + c.vr * dt, c.sides, c.jit, false, 0, 1);
    fx.fillStyle = '#d8d9f4'; fx.fill(); fx.lineWidth = Math.max(1, r * 0.12); fx.strokeStyle = '#2a2d62'; fx.stroke();
  }
  const ps = COLLAPSE.map((p) => {
    const u = dt / 3.2;
    const x = PIT.x + p.o[0] * (0.6 + u), z = PIT.z + p.o[2] * (0.6 + u), y = heightAt(PIT.x, PIT.z) + 0.25 + p.v[1] * Math.sqrt(dt) * 0.9;
    return { x, y, z, p, u };
  }).sort((a, b) => camera.position.distanceTo(_v.set(b.x, b.y, b.z)) - camera.position.distanceTo(_v.set(a.x, a.y, a.z)));
  for (const q of ps) {
    const [sx, sy, sz] = P(q.x, q.y, q.z); if (sz > 1) continue;
    const r = pxSize(q.x, q.y, q.z, q.p.s * (0.6 + q.u * 1.8));
    puff(sx, sy, r * (q.u > 0.6 ? (1 - q.u) / 0.4 : 1), 1, q.p.jit);
  }
}
function drawCapPuffs(t) {
  for (const f of fallers) {
    if (!f.rel || !f.landT) continue;
    const dt = q2(t) - f.landT; if (dt < 0 || dt > 1.2) continue;
    const p = f.landP; const [sx, sy, sz] = P(p.x, p.y + 0.1, p.z); if (sz > 1) continue;
    const r = pxSize(p.x, p.y, p.z, f.it.len ? 0.08 : 0.3) * (0.6 + dt);
    puff(sx, sy, r * (1 - dt / 1.2), 1, [0.1, 0.5, 0.3, 0.9, 0.2, 0.7, 0.4, 0.6]);
  }
}
function drawGlints(t, dawn) {
  if (dawn < 0.6) return;
  const R = rng(9090); const tq = q2(t);
  for (let i = 0; i < 46; i++) {
    const a = R() * 6.283, r = 1.5 + R() * 9; const x = Math.cos(a) * r, z = Math.sin(a) * r + 1;
    const ph = R();
    if (fract(tq * 0.5 + ph) > 0.22) continue;
    const [sx, sy, sz] = P(x, heightAt(x, z) + 0.02, z); if (sz > 1 || sx < 0 || sx > W) continue;
    const s = (3 + R() * 4) * W / 1600;
    fx.fillStyle = 'rgba(255,248,226,0.9)';
    fx.beginPath(); fx.moveTo(sx, sy - s); fx.lineTo(sx + s * 0.25, sy); fx.lineTo(sx, sy + s); fx.lineTo(sx - s * 0.25, sy); fx.closePath(); fx.fill();
    fx.beginPath(); fx.moveTo(sx - s, sy); fx.lineTo(sx, sy + s * 0.25); fx.lineTo(sx + s, sy); fx.lineTo(sx, sy - s * 0.25); fx.closePath(); fx.fill();
  }
}

// ═══ 프레임 갱신 ══════════════════════════════════════════════
const relCache = new Map();
function update(t) {
  // 지면 상태
  GS.armOutR = t >= 53.25 ? clamp((q2(t) - 53.2) / 0.35) : 0;
  GS.armOutL = t >= 58.05 ? clamp((q2(t) - 58.0) / 0.35) : 0;
  GS.collapse = t >= 71.6 ? E.out(clamp((q2(t) - 71.6) / 1.5)) : 0;
  ground.userData.refresh(GS);
  for (const l of lumps) { if (l.userData.tag === 'R') l.visible = t < 53.25; if (l.userData.tag === 'L') l.visible = t < 58.05; }

  // 로봇
  const rs = robotState(t);
  robot.apply(rs, t);

  // 떨어지는 눈덩이/고드름
  for (const f of fallers) {
    const it = f.it;
    if (t < it.release) { it.m.visible = true; f.fm.visible = false; continue; }
    if (!f.rel) {
      robot.apply(robotState(it.release), it.release);
      it.m.updateMatrixWorld(true);
      const m = it.m.matrixWorld.clone();
      const pos = new V3(), q = new THREE.Quaternion(), sc = new V3(); m.decompose(pos, q, sc);
      f.rel = { pos, q, sc };
      // 착지 시각 계산
      const vx = (it.len ? 0 : (rng(Math.floor(it.release * 10))() - 0.5) * 1.2), vz = it.len ? 0.1 : 0.6;
      f.v = [vx, it.len ? 0 : 0.6, vz];
      let tt = 0; for (; tt < 3; tt += 0.02) { const y = pos.y + f.v[1] * tt - 4.9 * tt * tt; if (y < heightAt(pos.x + f.v[0] * tt, pos.z + f.v[2] * tt)) break; }
      f.landT = it.release + tt; f.landP = new V3(pos.x + f.v[0] * tt, heightAt(pos.x + f.v[0] * tt, pos.z + f.v[2] * tt), pos.z + f.v[2] * tt);
      robot.apply(rs, t);
    }
    it.m.visible = false;
    const dt = q2(t) - it.release;
    if (t > f.landT) { f.fm.visible = false; continue; }
    f.fm.visible = true;
    f.fm.position.set(f.rel.pos.x + f.v[0] * dt, f.rel.pos.y + f.v[1] * dt - 4.9 * dt * dt, f.rel.pos.z + f.v[2] * dt);
    f.fm.quaternion.copy(f.rel.q); f.fm.scale.copy(f.rel.sc);
    f.fm.rotateX(dt * (it.len ? 2 : 1.4)); f.fm.rotateZ(dt * 0.8);
  }

  // 새
  const chestW = robot.chestWorld();
  const tipW = robot.out.tip.L, palmW = robot.out.palm.L;
  const nestTop = robot.nestWorld(0, 0.07, 0);
  birds.poseParent(parentState(t, chestW, tipW, nestTop));
  const slotW = NEST_SLOT.map((s) => robot.nestWorld(...s));
  const fc = fallenChick(t, slotW[2], palmW.clone().add(new V3(0, 0.0, 0)), slotW[2]);
  birds.poseChick(birds.chicks[2], fc);
  for (let i = 0; i < 2; i++) {
    const s = slotW[i]; const tt = q2(t);
    const alarmed = t > 10.2 && t < 40;
    const feed = t > 87.4 && t < 92 && Math.floor(t * 10 + i) % 2;
    birds.poseChick(birds.chicks[i], { p: [s.x, s.y, s.z], yaw: i ? -0.5 : 0.7, pitch: alarmed ? -0.15 : (Math.floor(tt * 0.7 + i) % 3 === 0 ? 0.1 : 0.0), open: feed ? 1 : (alarmed && Math.floor(t * 5 + i * 2) % 4 === 0 ? 1 : 0), roll: (t < 12 && t > 10) ? Math.sin(q1(t) * 30 + i) * 0.08 : 0 });
  }

  // 카메라
  const si = shotAt(t); const sh = SHOTS[si];
  const u = (E[sh.ease || 'lin'])(clamp((t - sh.t) / (sh.t1 - sh.t)));
  const cp = sh.a.p.map((v, i) => lerp(v, sh.b.p[i], u)), cl2 = sh.a.l.map((v, i) => lerp(v, sh.b.l[i], u));
  camera.position.set(...cp); camera.fov = lerp(sh.a.f, sh.b.f, u);
  let shx = 0, shy = 0;
  for (const [s0, d, amp] of SHAKES) { const dt = t - s0; if (dt >= 0 && dt < d) { const f = Math.floor(dt * 24); const k = 1 - dt / d; shx += (f % 2 ? 1 : -1) * amp * k; shy += ((f >> 1) % 2 ? 1 : -1) * amp * 0.6 * k; } }
  camera.up.set(0, 1, 0);
  camera.lookAt(cl2[0] + shx, cl2[1] + shy, cl2[2]);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  sky.position.copy(camera.position);
  skyMat.uniforms.uRot.value = q2(t) * 0.0006;
  inkMat.uniforms.uLine.value = sh.line * (W / 1600);

  // 램프 & 조명
  const dawn = dawnT(q2(t)); LU.uDawn.value = dawn;
  const key0 = new V3(-0.45, 0.8, 0.4).normalize(), key1 = new V3(0.72, 0.42, 0.55).normalize();
  LU.uKeyDir.value.copy(key0).lerp(key1, dawn).normalize();
  const kc0 = new V3(0.55, 0.6, 0.88), kc1 = new V3(0.9, 0.79, 0.76);
  LU.uKeyCol.value.copy(kc0).lerp(kc1, dawn);
  const cl = chestLevel(t), es = eyeState(t);
  M.chestLamp.uniforms.uLevel.value = cl; M.chestLamp.uniforms.uFill.value = 1;
  M.eyeLamp.uniforms.uLevel.value = es.level; M.eyeLamp.uniforms.uFill.value = es.fill;
  const eyeW = robot.eyeWorld(), eyeD = robot.eyeDir();
  LU.uLP.value[0].copy(chestW).addScaledVector(new V3(0, 0, 1).transformDirection(robot.torso.matrixWorld), 0.35);
  LU.uLI.value[0] = Math.min(0.95, cl * 0.85) * (1 - dawn * 0.45); LU.uLR.value[0] = 1.5 + cl * 0.55;
  LU.uLP.value[1].copy(eyeW).addScaledVector(eyeD, 0.3);
  LU.uLI.value[1] = Math.min(0.8, es.level * 0.55) * (1 - dawn * 0.5); LU.uLR.value[1] = 1.5;
  LU.uLI.value[2] = 0;
  chestGlow.position.copy(chestW).addScaledVector(new V3(0, 0, 1).transformDirection(robot.torso.matrixWorld), 0.08);
  chestGlow.scale.setScalar((0.2 + cl * 0.75) * Math.min(1, chestGlow.position.distanceTo(camera.position) / 3.5)); chestGlow.material.opacity = Math.min(1, cl * 1.1) * (1 - dawn * 0.4);
  eyeGlow.position.copy(eyeW).addScaledVector(eyeD, 0.06);
  eyeGlow.scale.setScalar((0.15 + es.level * 0.6) * Math.min(1, eyeGlow.position.distanceTo(camera.position) / 4) * 0.8); eyeGlow.material.opacity = Math.min(1, es.level) * (1 - dawn * 0.4);
  const bi = es.beam || 0;
  beam.visible = bi > 0; beamMat.uniforms.uI.value = bi;
  if (bi > 0) {
    beam.position.copy(eyeW).addScaledVector(eyeD, 0.04);
    beam.lookAt(eyeW.clone().addScaledVector(eyeD, -1));
    const len = Math.max(1, (eyeW.y - heightAt(PIT.x, PIT.z) + 0.3) / Math.max(0.3, -eyeD.y));
    beam.scale.set(1, 1, len);
    LU.uSpP.value.copy(eyeW); LU.uSpD.value.copy(eyeD); LU.uSpI.value = bi; LU.uSpCos.value = Math.cos(Math.atan(1.05 / len) * 0.92);
  } else LU.uSpI.value = 0;

  // 이펙트 오버레이
  fx.clearRect(0, 0, W, H);
  drawCapPuffs(t);
  drawCracks(t);
  drawBursts(t, dawn);
  drawCollapse(t);
  drawGlints(t, dawn);
  drawSnow(t, si, sh.wind, storm(t), dawn);
  if (dawn < 0.5) drawGusts(t, sh.wind);
  fxTex.needsUpdate = true;
  return { si, dawn };
}

let holdKey = null;
export function renderAt(t) {
  t = clamp(t, 0, DUR - 0.001);
  const hold = HOLDS.find((h) => t >= h[0] && t < h[1]);
  const te = hold ? hold[0] : t;
  const frame = Math.floor(t * 24);
  const key = hold ? 'h' + hold[0] : null;
  if (!hold || holdKey !== key) {
    update(te);
    inkMat.uniforms.uSeed.value = Math.floor(te * 12) * 0.37;
    beamMat.uniforms.uFrame.value = frame;
    renderer.setRenderTarget(rtScene); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
    // 노멀/ID 패스
    for (const o of noNrm) o.userData._v = o.visible, o.visible = false;
    for (const m of inkList) { m.userData._m = m.material; m.material = m.userData.nrm; }
    renderer.setRenderTarget(rtNrm); renderer.setClearColor(0x8080ff, 0); renderer.clear(); renderer.render(scene, camera);
    for (const m of inkList) m.material = m.userData._m;
    for (const o of noNrm) o.visible = o.userData._v;
    renderer.setClearColor(0x000000, 1);
    inkMat.uniforms.tCol.value = rtScene.texture; inkMat.uniforms.tNrm.value = rtNrm.texture; inkMat.uniforms.tDep.value = rtNrm.depthTexture;
    pass(inkMat, rtInk);
    brightMat.uniforms.tSrc.value = rtInk.texture; pass(brightMat, rtB1);
    for (let i = 0; i < 2; i++) { blurH.uniforms.tSrc.value = rtB1.texture; pass(blurH, rtB2); blurV.uniforms.tSrc.value = rtB2.texture; pass(blurV, rtB1); }
    holdKey = key;
  }
  const fu = finalMat.uniforms;
  fu.tInk.value = rtInk.texture; fu.tBloom.value = rtB1.texture;
  fu.uFrame.value = frame % 997;
  fu.uWeave.value.set((Math.sin(frame * 0.37) * 0.5 + Math.sin(frame * 0.11 + 1) * 0.5) * 0.7 * (W / 1600), (Math.sin(frame * 0.23 + 2) * 0.6 + Math.sin(frame * 0.07) * 0.4) * 0.9 * (W / 1600));
  fu.uPaint.value = hold ? 1 : 0;
  fu.uHal.value = 0.85;
  fu.uFade.value = Math.min(smooth(0, 2.6, t), 1 - smooth(DUR - 3.2, DUR - 0.4, t));
  // 장면 전환(밤 → 새벽)은 오버랩으로
  fu.uFlash.value = 0;
  pass(finalMat, null);
}

// ═══ 재생 제어 ═════════════════════════════════════════════════
const sound = new Sound(DUR);
let playing = false, tBase = 0, perf0 = 0, cur = 0, lastFrame = -1;
const q = new URLSearchParams(location.search);
cur = +(q.get('t') || 0);
const ui = document.getElementById('ui'), bar = document.getElementById('bar'), startBtn = document.getElementById('start');
function now() { return playing ? tBase + (performance.now() - perf0) / 1000 : cur; }
function play(from) {
  cur = from ?? cur; if (cur >= DUR - 0.05) cur = 0;
  tBase = cur; perf0 = performance.now(); playing = true; sound.start(cur);
}
function pause() { cur = now(); playing = false; sound.stop(); }
function seek(t) { const wasP = playing; if (wasP) pause(); cur = clamp(t, 0, DUR - 0.05); lastFrame = -1; if (wasP) play(); }
function loop() {
  const t = now();
  if (playing && t >= DUR) { playing = false; cur = DUR - 0.001; sound.stop(); ui.classList.add('end'); }
  const f = Math.floor(t * 24);
  if (f !== lastFrame) { renderAt(t); lastFrame = f; }
  bar.style.width = (100 * t / DUR) + '%';
  requestAnimationFrame(loop);
}
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  if (e.code === 'ArrowRight') seek(now() + 5);
  if (e.code === 'ArrowLeft') seek(now() - 5);
  if (e.code === 'KeyR') { seek(0); if (!playing) play(0); }
});
document.getElementById('prog').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * DUR); });
startBtn.addEventListener('click', () => { sound.init(); ui.classList.add('on'); play(cur); });
canvas.addEventListener('click', () => { if (ui.classList.contains('on')) playing ? pause() : play(); });
addEventListener('resize', () => { resize(); lastFrame = -1; });

buildParentPath();
resize();
renderAt(cur);
window.__renderAt = (t) => { renderAt(t); return true; };
window.__ready = true;
document.body.classList.add('ready');
if (!q.has('still')) requestAnimationFrame(loop); else ui.style.display = 'none';
