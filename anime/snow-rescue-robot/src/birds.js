// ───────────────────────────────────────────────────────────────
//  birds.js — 작은 산새 가족 (어미 1 + 새끼 3), 모든 샷에서 동일 모델
// ───────────────────────────────────────────────────────────────
export function makeBirds(THREE, M, ink) {
  const sph = (s = 12) => new THREE.SphereGeometry(1, s, Math.max(8, s * 0.75 | 0));
  function add(parent, geo, mat, id, p = [0, 0, 0], sc = [1, 1, 1], r = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...sc); m.rotation.set(...r);
    parent.add(m); ink(m, id); return m;
  }
  // ── 어미새 (로컬 +z 전방) ─────────────────────────────────
  const parent = new THREE.Group();
  const pBody = new THREE.Group(); parent.add(pBody);
  add(pBody, sph(16), M.birdBody, 0.40, [0, 0.09, 0], [0.085, 0.078, 0.125]);
  add(pBody, sph(14), M.birdBelly, 0.405, [0, 0.072, 0.035], [0.07, 0.06, 0.085]);
  const tail = add(pBody, new THREE.BoxGeometry(1, 1, 1), M.birdDark, 0.41, [0, 0.11, -0.15], [0.055, 0.012, 0.11], [-0.35, 0, 0]);
  const pHead = new THREE.Group(); pHead.position.set(0, 0.165, 0.085); pBody.add(pHead);
  add(pHead, sph(14), M.birdBody, 0.42, [0, 0, 0], [0.062, 0.06, 0.064]);
  add(pHead, sph(12), M.birdDark, 0.421, [0, 0.022, -0.006], [0.064, 0.042, 0.06]);
  add(pHead, sph(10), M.birdBelly, 0.422, [0, -0.025, 0.03], [0.045, 0.03, 0.035]);
  for (const sx of [-1, 1]) {
    add(pHead, sph(8), M.black, 0.423, [sx * 0.045, 0.008, 0.032], [0.012, 0.013, 0.012]);
    add(pHead, sph(6), M.white, 0.424, [sx * 0.054, 0.013, 0.037], [0.004, 0.004, 0.004]);
  }
  const beakG = new THREE.ConeGeometry(1, 1, 7); beakG.rotateX(Math.PI / 2); beakG.translate(0, 0, 0.5);
  add(pHead, beakG, M.beak, 0.425, [0, -0.008, 0.058], [0.016, 0.014, 0.042]);
  // 날개 (얇은 판, 어깨 피벗)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(0.06, 0.05, 0.17, 0.02); wingShape.lineTo(0.2, -0.03);
  wingShape.lineTo(0.15, -0.05); wingShape.lineTo(0.13, -0.08); wingShape.lineTo(0.08, -0.09); wingShape.quadraticCurveTo(0.02, -0.07, 0, -0.04); wingShape.closePath();
  const wingG = new THREE.ExtrudeGeometry(wingShape, { depth: 0.01, bevelEnabled: false });
  wingG.rotateX(-Math.PI / 2); wingG.translate(0, 0, 0);
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.07, 0.125, 0.04); pBody.add(piv);
    const w = add(piv, wingG, M.birdWing, 0.43 + (sx > 0 ? 0.002 : 0), [0, 0, 0], [sx, 1, 1]);
    wings.push({ piv, sx });
  }
  const legG = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 5);
  const legs = [];
  for (const sx of [-1, 1]) legs.push(add(pBody, legG, M.birdDark, 0.44, [sx * 0.03, 0.02, 0.01]));

  function poseParent(o) {
    parent.position.set(...o.p);
    parent.rotation.set(0, o.yaw || 0, 0);
    pBody.rotation.set(o.pitch || 0, 0, o.roll || 0);
    pHead.rotation.set(o.headPitch || 0, o.headYaw || 0, 0);
    pHead.position.z = 0.085 + (o.peck || 0) * 0.05;
    pHead.position.y = 0.165 - (o.peck || 0) * 0.01;
    // 날개 포즈: 0=접힘, 1=위로 펼침, 2=수평, 3=아래로
    const P = [[-0.05, 1.3, 1.45], [0.0, -0.1, 0.25], [0.0, 0.0, -0.45], [0.0, -0.05, -1.05], [0.0, 0.25, 0.6]];
    const wp = P[o.wing || 0];
    for (const w of wings) {
      if ((o.wing || 0) === 0) w.piv.rotation.set(0.15, w.sx * 1.42, w.sx * -0.15, 'YXZ');
      else w.piv.rotation.set(wp[0], w.sx * wp[1], w.sx * -wp[2], 'YXZ');
    }
    tail.rotation.x = -0.35 + (o.tail || 0);
    for (const l of legs) l.visible = !o.fly;
    parent.visible = o.visible !== false;
  }

  // ── 새끼 3마리 (솜뭉치) ──────────────────────────────────
  function makeChick(k) {
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    add(body, sph(14), M.chick, 0.30 + k * 0.01, [0, 0.055, 0], [0.058, 0.055, 0.058]);
    add(body, sph(10), M.chickBelly, 0.301 + k * 0.01, [0, 0.045, 0.022], [0.04, 0.035, 0.04]);
    const tuftG = new THREE.ConeGeometry(0.012, 0.035, 5);
    for (let i = 0; i < 3; i++) add(body, tuftG, M.chick, 0.302 + k * 0.01, [(i - 1) * 0.012, 0.115, -0.005 + i * 0.003], [1, 1, 1], [(i - 1) * -0.1, 0, (i - 1) * 0.5]);
    for (const sx of [-1, 1]) add(body, sph(6), M.black, 0.303 + k * 0.01, [sx * 0.027, 0.07, 0.048], [0.008, 0.009, 0.008]);
    const bu = add(body, beakG, M.gape, 0.304 + k * 0.01, [0, 0.055, 0.052], [0.016, 0.008, 0.026]);
    const bl = add(body, beakG, M.gape, 0.305 + k * 0.01, [0, 0.048, 0.05], [0.014, 0.007, 0.022]);
    const wingsC = [];
    for (const sx of [-1, 1]) wingsC.push(add(body, sph(8), M.chick, 0.306 + k * 0.01, [sx * 0.05, 0.05, -0.005], [0.016, 0.03, 0.035]));
    return { g, body, bu, bl, wingsC };
  }
  const chicks = [0, 1, 2].map(makeChick);
  function poseChick(c, o) {
    c.g.position.set(...o.p);
    c.g.rotation.set(0, o.yaw || 0, 0);
    c.body.rotation.set(o.pitch || 0, 0, o.roll || 0);
    const open = o.open || 0;
    c.bu.rotation.x = -open * 0.5; c.bl.rotation.x = open * 0.6;
    c.bl.position.y = 0.048 - open * 0.006;
    for (let i = 0; i < 2; i++) c.wingsC[i].rotation.z = (i ? -1 : 1) * (o.flap || 0);
    c.body.scale.setScalar(o.squash ? 1 : 1);
    c.body.scale.set(1 + (o.squash || 0) * 0.12, 1 - (o.squash || 0) * 0.15, 1 + (o.squash || 0) * 0.12);
  }
  return { parent, chicks, poseParent, poseChick };
}
