// ───────────────────────────────────────────────────────────────
//  world.js — 설원 높이장(눈 더미·작은 눈 구덩이) + 지면 메시
//  ※ 구덩이는 '절벽'이 아니라 바람에 파인 얕은 눈 웅덩이(깊이 ≈ 병아리 키의 4배)로 절제
// ───────────────────────────────────────────────────────────────
import { fbm, vnoise, clamp, smooth } from './util.js';

export const PIT = { x: 0.72, z: 2.62, R: 0.66, D: 0.5 };
export const GS = { armOutR: 0, armOutL: 0, collapse: 0 };

const ARM_R = { x: -2.2, z: 0.95 }, ARM_L = { x: 2.2, z: 0.95 };

function baseH(x, z) {
  const r = Math.hypot(x, z);
  let h = (fbm(x * 0.03 + 3.1, z * 0.03 - 7.3, 4) - 0.5) * 3.2;
  // 바람에 깎인 사스트루기(길게 늘어진 골)
  h += (vnoise(x * 0.22 + 4, z * 1.25) - 0.5) * 0.28;
  h += (vnoise(x * 0.8 + 11, z * 2.9) - 0.5) * 0.07;
  h += Math.max(0, r - 30) * 0.035;
  return h * smooth(2.0, 14, r);
}
function mound(x, z) {
  const sz = z > 0.1 ? 2.75 : 3.3;
  const d = Math.hypot(x / 3.25, (z - 0.1) / sz);
  let m = 2.5 * (1 - smooth(0.08, 1.0, d));
  // 풍하 쪽 꼬리(뒤로 길게 쌓인 눈)
  m += 0.55 * Math.exp(-((x + 0.6) ** 2) / 6 - ((z + 3.2) ** 2) / 5);
  // 덩어리진 표면
  m += (vnoise(x * 1.7 + 2, z * 1.7) - 0.5) * 0.18 * (1 - smooth(0.4, 1.1, d));
  return m;
}
function armDrift(x, z, a, out) {
  const dx = x - a.x, dz = z - a.z;
  const e = Math.exp(-(dx * dx) / 0.75 - (dz * dz) / 1.1);
  const keep = 1.6 * e * (1 - out);
  // 팔이 빠져나간 자리: 움푹 파인 구멍 + 흩어진 둔덕
  const hole = out * (-0.55 * Math.exp(-(dx * dx) / 0.22 - (dz * dz) / 0.3) + 0.35 * e);
  return keep + hole;
}
function pitTerm(x, z, c) {
  const dx = x - PIT.x, dz = z - PIT.z;
  const r = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
  const Rr = PIT.R * (1 + 0.14 * Math.sin(3 * ang + 1.0) + 0.07 * Math.sin(5 * ang + 2.3) + 0.05 * Math.sin(8 * ang));
  const f = clamp(1 - (r / Rr) ** 2);
  const depth = PIT.D * (1 - 0.82 * c) * Math.pow(f, 0.7);
  const lip = 0.08 * (1 - c) * Math.exp(-(((r - Rr) / 0.17) ** 2));
  const fill = c * 0.1 * (vnoise(x * 5 + 3, z * 5) - 0.3) * Math.exp(-((r / (Rr * 1.4)) ** 2));
  const slump = c * 0.12 * Math.exp(-(((r - Rr * 1.1) / 0.3) ** 2));
  return { dh: -depth + lip + fill - slump, depth, rim: Math.exp(-(((r - Rr) / 0.07) ** 2)) * (1 - c * 0.8) };
}
export function heightAt(x, z, s = GS) {
  return baseH(x, z) + mound(x, z) + armDrift(x, z, ARM_R, s.armOutR) + armDrift(x, z, ARM_L, s.armOutL) + pitTerm(x, z, s.collapse).dh;
}
export function pitInfo(x, z, s = GS) { return pitTerm(x, z, s.collapse); }

// 중심부가 촘촘한 가변 격자 지면
export function buildGround(THREE, mat) {
  const N = 400, S = 150, P = 3.0, cx = 0.72, cz = 2.62;
  const geo = new THREE.PlaneGeometry(2, 2, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cnt = pos.count;
  const aPit = new Float32Array(cnt), aRim = new Float32Array(cnt);
  geo.setAttribute('aPit', new THREE.BufferAttribute(aPit, 1));
  geo.setAttribute('aRim', new THREE.BufferAttribute(aRim, 1));
  const nrm = geo.attributes.normal;
  const XZ = new Float32Array(cnt * 2);
  for (let i = 0; i < cnt; i++) {
    const sx = pos.getX(i), sz = pos.getZ(i);
    const x = cx + Math.sign(sx) * Math.pow(Math.abs(sx), P) * S;
    const z = cz + Math.sign(sz) * Math.pow(Math.abs(sz), P) * S;
    XZ[i * 2] = x; XZ[i * 2 + 1] = z;
  }
  const dynamic = [];
  for (let i = 0; i < cnt; i++) {
    const x = XZ[i * 2], z = XZ[i * 2 + 1];
    if (Math.hypot(x - PIT.x, z - PIT.z) < 2.0 || Math.hypot(x - ARM_R.x, z - ARM_R.z) < 2.0 || Math.hypot(x - ARM_L.x, z - ARM_L.z) < 2.0) dynamic.push(i);
  }
  function upd(i, s) {
    const x = XZ[i * 2], z = XZ[i * 2 + 1];
    const h = heightAt(x, z, s);
    const e = 0.04;
    const hx = heightAt(x + e, z, s) - heightAt(x - e, z, s);
    const hz = heightAt(x, z + e, s) - heightAt(x, z - e, s);
    const nx = -hx, ny = 2 * e, nz = -hz, l = Math.hypot(nx, ny, nz);
    pos.setXYZ(i, x, h, z);
    nrm.setXYZ(i, nx / l, ny / l, nz / l);
    const pi = pitTerm(x, z, s.collapse);
    aPit[i] = pi.depth; aRim[i] = pi.rim;
  }
  for (let i = 0; i < cnt; i++) upd(i, GS);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  let last = '';
  mesh.userData.refresh = (s) => {
    const key = s.armOutR.toFixed(3) + s.armOutL.toFixed(3) + s.collapse.toFixed(3);
    if (key === last) return;
    last = key;
    for (const i of dynamic) upd(i, s);
    pos.needsUpdate = true; nrm.needsUpdate = true;
    geo.attributes.aPit.needsUpdate = true; geo.attributes.aRim.needsUpdate = true;
  };
  return mesh;
}
