import data from '../src/data/index.js';
import scenario645 from '../src/data/scenarios/liaodong645.js';
import labs from '../src/data/scenarios/labs.js';
import fullmap from '../src/data/maps/fullmap.js';
import scenario645full from '../src/data/scenarios/liaodong645full.js';
import epochs from '../src/data/epochs.js';
import { applyEpoch } from '../src/territory.js';
import { buildMap, bridgeSites, buildBridge } from '../src/game.js';
import {
  createGame, moveRange, attackTargets, moveUnit, attack, waitUnit, endTurn, unitAt, activeNation, findPath,
} from '../src/game.js';
import { actUnit, aiOrder } from '../src/ai.js';
import { computeDamage, canCounter, generalOf, unitRange, isDismounted } from '../src/combat.js';
import { getMods, tileAt } from '../src/modifiers.js';
import { runMany } from '../src/sim.js';
import { toPixel, key, distance, neighbors } from '../src/hex.js';

const FULLMAP = {
  id: 'fullmap', viewer: true, title: '전체 지도 · 실측 고도 (요서~규슈)',
  desc: `공개 고도 데이터로 자동 생성한 ${fullmap.rows[0].length}×${fullmap.rows.length}칸 지도입니다(1칸 ≈ 6km). `
    + '산·구릉은 고도와 기복으로, 강은 빗물이 실제로 흘러가는 길을 계산해 그렸습니다. 큰 강(진한 파랑)은 걸어서 못 건너고 여울(옅은 파랑)로만 건넙니다. '
    + '마우스 휠이나 +/− 버튼으로 확대하고, 끌어서 움직이세요.',
  expect: { text: '해안선은 현대 기준이고, 역사 지점 좌표는 추정입니다(점선 테두리 = 위치 논쟁 있음). 고증 후 수정이 필요합니다.' },
};
const SCENARIOS = [
  FULLMAP,
  { ...scenario645full, expect: { text: 'AI 대 AI 기준 요동성은 거의 함락되고, 안시성은 반반 버팁니다(역사: 요동성 함락, 안시성 방어 성공).' } },
  ...labs,
  { ...scenario645, title: '645 안시성 · 축소판', expect: { text: 'AI 대 AI 기준 당과 고구려가 대략 반반이 되도록 맞췄습니다.' } },
];
const $ = (id) => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
const PAD = 14;

let scen, state, size, selected = null, reach = null, hover = null, fx = null;
let auto = false, busy = false, gen = 0;

// ── 시작 ─────────────────────────────────────────
function fillSelectors() {
  $('scenario').innerHTML = SCENARIOS.map((s, i) => `<option value="${i}">${s.title}</option>`).join('');
}

function fillSides() {
  $('side').innerHTML = '<option value="none">관전 (AI 대 AI)</option>'
    + scen.sides.map((n) => `<option value="${n}">${data.nations[n].name} 직접 조종</option>`).join('');
}

function load(index) {
  scen = SCENARIOS[index];
  const viewer = !!scen.viewer;
  for (const id of ['auto', 'step', 'restart', 'sim']) $(id).hidden = viewer;
  $('side').parentElement.hidden = viewer; $('speed').parentElement.hidden = viewer;
  $('epochCtl').hidden = !viewer;
  if (viewer) { $('zoomCtl').hidden = false; openViewer(); return; }
  viewerState = null;
  fillSides();
  restart();
  $('simout').textContent = '아직 측정하지 않았습니다.';
  $('simbar').hidden = true;
}

function restart() {
  gen++;
  auto = false; busy = false;
  state = createGame(scen, data, (Math.random() * 1e9) | 0);
  selected = null; reach = null; fx = null;
  $('b-title').textContent = scen.title;
  $('b-desc').textContent = scen.desc;
  $('b-expect').textContent = scen.expect ? `기대 결과: ${scen.expect.text}` : '';
  $('info').innerHTML = '<h3>부대</h3><div class="muted">부대에 마우스를 올리거나 누르세요.</div>';
  $('tile').innerHTML = '<h3>지형</h3><div class="muted">칸에 마우스를 올리면 병종별 이동·전투 효과가 나옵니다.</div>';
  resize();
  updateButtons();
  render();
  if (player() !== 'none' && activeNation(state) !== player()) playAiTurn(gen);
}

// 카메라: 작은 지도는 화면에 꼭 맞추고(고정), 큰 지도는 확대·이동한다.
let cam = { s: 1, ox: 0, oy: 0, free: false };
function resize() {
  const w0 = Math.sqrt(3) * (state.map.w + 0.5);
  const h0 = 1.5 * (state.map.h - 1) + 2;
  const fit = 900 / w0;
  let w, h;
  if (fit >= 18) {
    size = Math.min(34, fit);
    w = size * w0 + PAD * 2; h = size * h0 + PAD * 2;
    cam = { s: 1, ox: 0, oy: 0, free: false };
  } else {
    size = 22;
    w = 900; h = 620;
    cam = { s: 1, ox: 0, oy: 0, free: true, worldW: size * w0 + PAD * 2, worldH: size * h0 + PAD * 2 };
  }
  $('zoomCtl').hidden = !cam.free;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  canvas._w = w; canvas._h = h; canvas._dpr = dpr;
  if (cam.free) {
    // 처음에는 먼저 움직이는 진영의 부대들 가운데를 비춘다
    const us = state.units.filter((u) => u.nation === state.sides[0] && !u.embarked);
    const cx = us.reduce((a, u) => a + center(u.col, u.row).x, 0) / us.length;
    const cy = us.reduce((a, u) => a + center(u.col, u.row).y, 0) / us.length;
    cam.s = 0.75; lookAt(cx, cy);
  }
}

function lookAt(x, y) {
  cam.ox = canvas._w / 2 - x * cam.s;
  cam.oy = canvas._h / 2 - y * cam.s;
}

function camZoom(f, sx = canvas._w / 2, sy = canvas._h / 2) {
  const ns = Math.min(2.5, Math.max(canvas._w / cam.worldW, cam.s * f));
  cam.ox = sx - (sx - cam.ox) * (ns / cam.s);
  cam.oy = sy - (sy - cam.oy) * (ns / cam.s);
  cam.s = ns;
  render();
}

// 자동 진행 중 행동하는 부대가 화면 밖이면 카메라를 옮긴다
function follow(u) {
  if (!cam.free || !u) return;
  const c = center(u.col, u.row);
  const sx = c.x * cam.s + cam.ox, sy = c.y * cam.s + cam.oy;
  if (sx < 60 || sy < 60 || sx > canvas._w - 60 || sy > canvas._h - 60) lookAt(c.x, c.y);
}

const player = () => $('side').value;

// ── 자동 진행 ────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const delay = () => Number($('speed').value);

async function playAiTurn(g) {
  busy = true; updateButtons();
  for (const u of aiOrder(state, data)) {
    if (g !== gen || state.winner) break;
    if (u.dead || u.acted) continue;
    fx = actUnit(state, data, u);
    follow(fx.unit);
    render();
    await sleep(delay());
  }
  if (g !== gen) return;
  fx = null;
  endTurn(state, data);
  busy = false;
  render(); updateButtons();
  // 사람이 조종하는 진영이 아니면 계속 AI
  if (!state.winner && !state.timeout && player() !== 'none' && activeNation(state) !== player()) {
    await sleep(delay());
    if (g === gen) playAiTurn(g);
  }
}

async function runAuto() {
  const g = gen;
  while (auto && g === gen && !state.winner && !state.timeout) {
    await playAiTurn(g);
    await sleep(delay() / 2);
  }
  auto = false; updateButtons();
}

function updateButtons() {
  const human = player() !== 'none';
  const over = !!(state.winner || state.timeout);
  $('auto').textContent = auto ? '⏸ 멈춤' : '▶ 자동 진행';
  $('auto').disabled = human || over;
  $('step').disabled = human || over || busy;
}

// ── 그리기 ───────────────────────────────────────
const center = (col, row) => {
  const p = toPixel(col, row, size);
  return { x: p.x + PAD + size * Math.sqrt(3) / 2, y: p.y + PAD + size };
};

function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 180 * (60 * i - 30);
    const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function glyph(t, x, y) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = Math.round(size * 0.5);
  ctx.font = `${fs}px sans-serif`;
  if (t.terrain === 'mountain') { ctx.fillStyle = 'rgba(40,28,15,.45)'; ctx.fillText('▲', x, y); }
  if (t.terrain === 'hills') { ctx.fillStyle = 'rgba(60,45,20,.35)'; ctx.fillText('⌒', x, y + 2); }
  if (t.terrain === 'forest') { ctx.fillStyle = 'rgba(10,45,10,.5)'; ctx.fillText('♣', x, y); }
  if (t.terrain === 'marsh') { ctx.fillStyle = 'rgba(20,60,60,.5)'; ctx.fillText('≈', x, y); }
  if (t.terrain === 'river' || t.terrain === 'sea') { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillText('〰', x, y); }
  if (t.terrain === 'ford') {
    ctx.strokeStyle = 'rgba(30,60,90,.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x - size * .5, y); ctx.lineTo(x + size * .5, y); ctx.stroke(); ctx.setLineDash([]);
  }
}

function arrow(from, to, color, dashed, head = true) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  ctx.setLineDash([]);
  if (head) {
    const a = Math.atan2(to.y - from.y, to.x - from.x), l = 10;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - l * Math.cos(a - 0.45), to.y - l * Math.sin(a - 0.45));
    ctx.lineTo(to.x - l * Math.cos(a + 0.45), to.y - l * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function render() {
  const dpr = canvas._dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0d1320'; ctx.fillRect(0, 0, canvas._w, canvas._h);
  ctx.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.ox, dpr * cam.oy);
  // 화면에 보이는 범위(월드 좌표)만 그린다
  const vx0 = -cam.ox / cam.s - size * 2, vy0 = -cam.oy / cam.s - size * 2;
  const vx1 = (canvas._w - cam.ox) / cam.s + size * 2, vy1 = (canvas._h - cam.oy) / cam.s + size * 2;
  const targets = selected && !selected.acted ? new Set(attackTargets(state, data, selected).map((u) => u.id)) : new Set();
  for (const t of state.map.tiles) {
    const { x, y } = center(t.col, t.row);
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    hexPath(x, y, size);
    ctx.fillStyle = data.terrain[t.terrain].color; ctx.fill();
    if (t.owner && data.nations[t.owner] && !data.terrain[t.terrain].impassable) {
      ctx.fillStyle = data.nations[t.owner].color + '1f'; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 1; ctx.stroke();
    glyph(t, x, y);
    if (reach && reach.has(key(t.col, t.row))) {
      hexPath(x, y, size - 2); ctx.fillStyle = 'rgba(80,150,255,.35)'; ctx.fill();
    }
    if (t.castle) {
      ctx.fillStyle = data.nations[t.owner]?.color ?? '#777';
      ctx.fillRect(x - size * .38, y - size * .38, size * .76, size * .6);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(size * .42)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('城', x, y - size * .08);
      ctx.fillStyle = '#10151f'; ctx.font = `bold ${Math.round(size * .42)}px sans-serif`;
      ctx.fillText(t.castle, x, y - size * .78);
      // 성벽 내구도 막대
      const wr = t.wall / t.wallMax, bw = size * 1.2;
      ctx.fillStyle = '#10151f'; ctx.fillRect(x - bw / 2, y - size * 1.2, bw, 5);
      ctx.fillStyle = wr > 0.5 ? '#d6b25e' : wr > 0.2 ? '#f2c14e' : '#ef6a5a';
      ctx.fillRect(x - bw / 2, y - size * 1.2, bw * wr, 5);
    }
    if (t.bridgeWork) {
      ctx.fillStyle = '#10151f'; ctx.font = `bold ${Math.round(size * .38)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.fillText(`부교 ${t.bridgeWork}/3`, x, y);
    }
    if (selected && bridgeSites(state, data, selected).includes(t)) {
      hexPath(x, y, size - 3); ctx.strokeStyle = '#d6b25e'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // 행동 연출
  if (fx?.path && fx.path.length > 1) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
    ctx.beginPath();
    fx.path.forEach((p, i) => { const c = center(p.col, p.row); i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y); });
    ctx.stroke(); ctx.restore();
  }
  for (const u of state.units) drawUnit(u, targets);
  if (fx?.target) {
    const a = center(fx.unit.col, fx.unit.row), b = center(fx.target.col, fx.target.row);
    arrow(a, b, fx.ranged ? '#ffa23a' : '#ff4d3d', fx.ranged);
    if (fx.res) {
      ctx.font = `bold ${Math.round(size * .55)}px ${getComputedStyle(document.body).fontFamily}`;
      ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#10151f';
      const txt = `${fx.res.crit ? '전법! ' : ''}-${fx.res.dmg}`;
      ctx.strokeText(txt, b.x, b.y - size * .95); ctx.fillStyle = fx.res.crit ? '#ffd34d' : '#fff';
      ctx.fillText(txt, b.x, b.y - size * .95);
      if (fx.res.counterDmg) {
        ctx.strokeText(`반격 -${fx.res.counterDmg}`, a.x, a.y + size * 1.15);
        ctx.fillStyle = '#ffb0a8'; ctx.fillText(`반격 -${fx.res.counterDmg}`, a.x, a.y + size * 1.15);
      }
    }
  }
  if (cam.free) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(233,226,207,.85)';
    ctx.fillText('휠·＋/− 확대 · 끌어서 이동 · 행동하는 부대를 카메라가 따라갑니다', 10, canvas._h - 10);
  }
  renderPanels();
}

function drawUnit(u, targets) {
  if (u.dead) return;
  const { x, y } = center(u.col, u.row);
  const r = size * 0.56;
  if (u.embarked) { // 배
    ctx.beginPath();
    ctx.moveTo(x - r * 1.35, y + r * 0.35); ctx.lineTo(x + r * 1.35, y + r * 0.35);
    ctx.lineTo(x + r * 0.9, y + r * 0.95); ctx.lineTo(x - r * 0.9, y + r * 0.95); ctx.closePath();
    ctx.fillStyle = '#7a5a36'; ctx.fill(); ctx.strokeStyle = '#2a1d10'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = data.nations[u.nation].color; ctx.fill();
  ctx.lineWidth = u === selected ? 3 : targets.has(u.id) ? 3 : 1.5;
  ctx.strokeStyle = u === selected ? '#fff' : targets.has(u.id) ? '#ff3b30' : fx?.unit === u ? '#ffd34d' : '#0b0f18';
  ctx.stroke();
  if (u.acted && u.nation === activeNation(state)) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fill(); }
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(size * .5)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(data.units[u.type].short, x, y + 1);
  // 병력 막대
  const ratio = u.troops / u.maxTroops, bw = size * 1.1;
  ctx.fillStyle = '#0b0f18'; ctx.fillRect(x - bw / 2, y + r + 2, bw, 4);
  ctx.fillStyle = ratio > 0.5 ? '#6fcf8e' : ratio > 0.25 ? '#f2c14e' : '#ef6a5a';
  ctx.fillRect(x - bw / 2, y + r + 2, bw * ratio, 4);
  // 상태 표시: 하마, 도하
  const t = tileAt(state.map, u.col, u.row);
  const badge = u.embarked ? '승선' : isDismounted(state, data, u) ? '하마' : t.terrain === 'ford' ? '도하' : null;
  if (badge) {
    ctx.font = `bold ${Math.round(size * .36)}px sans-serif`;
    const bwid = ctx.measureText(badge).width + 6;
    ctx.fillStyle = '#f2c14e'; ctx.fillRect(x - bwid / 2, y - r - size * .42, bwid, size * .4);
    ctx.fillStyle = '#10151f'; ctx.fillText(badge, x, y - r - size * .22);
  }
}

// ── 패널 ─────────────────────────────────────────
const APT_COLOR = { S: '#ffd34d', A: '#6fcf8e', B: '#e9e2cf', C: '#97a3ba', D: '#7a859b' };

function unitCard(u) {
  const g = generalOf(u, data), n = data.nations[u.nation], m = getMods(state, data, u, {});
  const mp = data.units[u.type].move + m.move;
  const status = [];
  if (u.embarked) status.push('<span class="chip alert">배 위 — 방어 ×0.6, 궁병 외 공격 약화</span>');
  if (isDismounted(state, data, u)) status.push('<span class="chip alert">하마 — 말을 끌고 걷는 중 (공격 ×0.6, 방어 ×0.8)</span>');
  if (tileAt(state.map, u.col, u.row).terrain === 'ford') status.push('<span class="chip alert">도하 중 — 방어 ×0.6, 공격 ×0.7</span>');
  const skills = g.skills.map((s) => `<span class="chip" title="${data.skills[s].desc}">${data.skills[s].name}</span>`).join('');
  return `<h3>부대</h3>
    <div><b>${g.name}</b> <span class="muted">${g.hanja || ''}</span> · ${n.name} ${data.units[u.type].name}</div>
    <div class="muted" style="font-size:12.5px">${g.note ?? ''}</div>
    <div class="num" style="font-size:13px;margin-top:4px">통솔 ${g.lead} · 무력 ${g.war} · 지력 ${g.int}</div>
    <div style="font-size:13px">적성 ${Object.keys(data.units).map((t) => { const a = g.aptitude[t] ?? 'B'; return `${data.units[t].name} <b style="color:${APT_COLOR[a]}">${a}</b>`; }).join(' · ')}</div>
    ${skills ? `<div>${skills}</div>` : ''}
    ${n.buff ? `<div><span class="chip" title="${n.buff.desc}">국가 버프: ${n.buff.name}</span></div>` : ''}
    ${status.join('')}
    <div class="num" style="margin-top:6px">병력 ${u.troops.toLocaleString()} / ${u.maxTroops.toLocaleString()}</div>
    <div class="bar"><i style="width:${u.troops / u.maxTroops * 100}%;background:var(--good)"></i></div>
    <div class="num">사기 ${Math.round(u.morale)}</div>
    <div class="bar"><i style="width:${u.morale}%;background:var(--celadon)"></i></div>
    <div class="muted num" style="font-size:12.5px">이동력 ${mp} (평지 ${Math.floor(mp / 2)}칸) · 사거리 ${unitRange(state, data, u)}${u.hold ? ' · 진지 고수' : ''}</div>`;
}

function tileCard(t) {
  const terr = data.terrain[t.terrain];
  const rows = Object.entries(data.units).map(([id, ut]) => `<div>${ut.name}: ${moveText(terr, id, ut).replace(/<[^>]+>/g, '')}</div>`).join('');
  const wallLine = t.castle ? `<div class="num" style="font-size:13px">성벽 ${t.wall} / ${t.wallMax} → 현재 방어 ×${(1 + (terr.def - 1) * t.wall / t.wallMax).toFixed(2)}</div>` : '';
  return `<h3>지형</h3><div><b>${t.castle ? `${t.castle} (성)` : terr.name}</b> · 방어 ×${terr.def}</div>${wallLine}
    <div style="font-size:13px">${rows}</div>
    <div class="muted" style="font-size:12.5px;margin-top:4px">${terr.note ?? ''}</div>`;
}

function renderPanels() {
  const n = activeNation(state);
  if (state.winner) $('turn').innerHTML = `<span class="winner">승리 · ${data.nations[state.winner].name}</span>`;
  else if (state.timeout) $('turn').innerHTML = '<span class="winner">제한 턴 종료</span>';
  else {
    const lim = scen.victory?.find((v) => v.type === 'survive')?.turns ?? scen.turnLimit;
    $('turn').innerHTML = `${state.turn}턴 / ${lim}턴 · <b style="color:${data.nations[n].color}">${data.nations[n].name}</b> 차례`;
  }
  const shown = hover?.unit ?? selected ?? fx?.unit;
  if (shown) $('info').innerHTML = unitCard(shown);
  if (selected && hover?.unit && hover.unit.nation !== selected.nation && !selected.acted) {
    const t = hover.unit;
    const dmg = computeDamage(state, data, selected, t, { role: 'attack' });
    const ctr = dmg < t.troops && canCounter(state, data, t, selected)
      ? computeDamage(state, data, t, selected, { role: 'counter', moved: false, attTroops: t.troops - dmg }) : 0;
    $('info').innerHTML += `<div style="margin-top:8px;border-top:1px solid var(--rule);padding-top:6px">
      <b>교전 예측</b> → ${generalOf(t, data).name}<br>예상 피해 <b class="num">${dmg}</b> · 예상 반격 <b class="num">${ctr}</b>
      <span class="muted">(±25%, 전법 1.5배)</span></div>`;
  }
  if (hover?.tile) $('tile').innerHTML = tileCard(hover.tile);
  const log = $('log');
  log.textContent = state.log.slice(-80).join('\n') || '아직 교전이 없습니다.';
  log.scrollTop = log.scrollHeight;
}

// ── 표 (데이터에서 생성) ──────────────────────────
function moveText(terr, id, ut) {
  if (terr.impassable || terr.move[id] === undefined) return '<span class="no">배 필요 · 진입 불가</span>';
  const cost = terr.move[id];
  const per = Math.floor(ut.move / cost);
  let s = `<b>${per}</b>칸/일`;
  if (terr.stopOnEnter) s = '<b>1</b>칸 후 정지';
  if (terr.dismount && id === 'cavalry') s += ' · 하마(말을 끌고 걸음)';
  return s;
}

function effectText(terr, id) {
  const out = [];
  const pct = (v) => (v >= 1 ? `<span class="up">×${v}</span>` : `<span class="down">×${v}</span>`);
  if (terr.atk?.[id]) out.push(`공격 ${pct(terr.atk[id])}`);
  if (terr.charge?.[id]) out.push(`이 칸으로 돌입 ${pct(terr.charge[id])}`);
  const def = (terr.def ?? 1) * (terr.defUnit?.[id] ?? 1);
  if (!terr.impassable && def !== 1) out.push(`방어 ${pct(Math.round(def * 100) / 100)}`);
  if (terr.rangeBonus?.[id]) out.push(`<span class="up">사거리 +${terr.rangeBonus[id]}</span>`);
  if (terr.cover) out.push(`받는 사격 ${pct(terr.cover)}`);
  return out.join(' · ');
}

function buildTables() {
  const U = data.units;
  const mtn = data.terrain.mountain;
  $('unitTable').innerHTML = `<tr><th>병종</th><th>이동력</th><th>평지 하루</th><th>산 하루</th><th>사거리</th><th>공격·방어</th><th>강한 상대 / 약한 상대</th></tr>`
    + Object.entries(U).map(([id, u]) => {
      const strong = Object.entries(data.counter[id]).filter(([, v]) => v > 1).map(([k]) => U[k].name).join(', ');
      const weak = Object.entries(data.counter[id]).filter(([, v]) => v < 1).map(([k]) => U[k].name).join(', ');
      const rangeNote = u.range > 1 ? `${u.range} (거리 2 사격 ×0.85·반격 없음, 붙으면 ×${u.adjacentMul})` : '1 (근접)';
      return `<tr><td>${u.name}</td><td class="num">${u.move}</td><td class="num">${Math.floor(u.move / 2)}칸 ≈ ${Math.floor(u.move / 2) * 6}km</td>
        <td>${mtn.move[id] ? `${Math.floor(u.move / mtn.move[id])}칸${id === 'cavalry' ? ' (하마)' : ''}` : '<span style="color:var(--bad)">진입 불가</span>'}</td><td>${rangeNote}</td>
        <td class="num">${u.atk} / ${u.def}</td><td>${id === 'siege' ? `성벽 피해 ${data.wallDamage.siege} (창병 ${data.wallDamage.spear}) · 모든 병종에 ×1.2로 당함` : `${strong} ×1.2 / ${weak || '-'} ×0.85`}</td></tr>`;
    }).join('');
  $('terrainTable').innerHTML = `<tr><th>지형</th>${Object.values(U).map((u) => `<th>${u.name}</th>`).join('')}<th>설명</th></tr>`
    + Object.values(data.terrain).map((t) => `<tr><td><span class="sw" style="background:${t.color}"></span>${t.name}</td>
      ${Object.entries(U).map(([id, u]) => `<td class="cell">${moveText(t, id, u)}<br><span class="muted" style="font-size:12.5px">${effectText(t, id)}</span></td>`).join('')}
      <td class="muted" style="font-size:12.5px;min-width:200px">${t.note ?? ''}</td></tr>`).join('');
}

// ── 100판 시뮬레이션 ─────────────────────────────
async function simulate() {
  const n = scen.id === 'liaodong645' ? 40 : 100;
  const g = gen;
  $('sim').disabled = true;
  const total = {};
  const chunk = 5;
  for (let i = 0; i < n; i += chunk) {
    if (g !== gen) break;
    const r = runMany(scen, data, chunk, 1000 + i * 7);
    for (const [k, v] of Object.entries(r)) total[k] = (total[k] || 0) + v * chunk;
    $('simout').textContent = `측정 중… ${Math.min(i + chunk, n)} / ${n}판`;
    await sleep(0);
  }
  $('sim').disabled = false;
  if (g !== gen) return;
  const parts = scen.sides.map((s) => ({ s, p: (total[s] || 0) / n }));
  $('simout').innerHTML = parts.map(({ s, p }) => `<span style="color:${data.nations[s].color}">■</span> ${data.nations[s].name} ${(p * 100).toFixed(0)}%`).join(' · ') + ` <span class="muted">(${n}판)</span>`;
  $('simbar').hidden = false;
  $('simbar').innerHTML = parts.map(({ s, p }) => `<i style="width:${p * 100}%;background:${data.nations[s].color}"></i>`).join('');
}

// ── 전체 지도 보기 ───────────────────────────────
let viewerState = null;
const VS = 5; // 오프스크린 헥스 크기(px)

function openViewer() {
  gen++;
  $('b-title').textContent = scen.title;
  $('b-desc').textContent = scen.desc;
  $('b-expect').textContent = scen.expect.text;
  $('turn').textContent = `${fullmap.rows[0].length} × ${fullmap.rows.length}칸 · 역사 지점 ${fullmap.sites.length}곳`;
  $('simout').textContent = ''; $('simbar').hidden = true;
  const map = buildMap({ rows: fullmap.rows, castles: [], territory: [] }, data);
  const epoch = epochs.find((e) => e.id === $('epoch').value);
  if (epoch) applyEpoch(map, data, fullmap.meta, fullmap.sites, epoch);
  const off = document.createElement('canvas');
  const ow = Math.ceil(VS * Math.sqrt(3) * (map.w + 0.5)), oh = Math.ceil(VS * (1.5 * map.h + 0.5));
  off.width = ow; off.height = oh;
  const o = off.getContext('2d');
  for (const t of map.tiles) {
    const p = toPixel(t.col, t.row, VS);
    const x = p.x + VS * Math.sqrt(3) / 2, y = p.y + VS;
    o.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 30);
      const px = x + (VS + 0.4) * Math.cos(a), py = y + (VS + 0.4) * Math.sin(a);
      i ? o.lineTo(px, py) : o.moveTo(px, py);
    }
    o.fillStyle = data.terrain[t.terrain].color; o.fill();
    if (t.owner && data.nations[t.owner] && t.terrain !== 'sea') { o.fillStyle = data.nations[t.owner].color + (t.frontier ? '3a' : '99'); o.fill(); }
  }
  // 국경선: 주인이 다른 이웃과 맞닿은 변
  if (epoch) {
    o.strokeStyle = 'rgba(20,16,10,.85)'; o.lineWidth = 1.2;
    for (const t of map.tiles) {
      if (!t.owner || t.terrain === 'sea') continue;
      const p = toPixel(t.col, t.row, VS);
      const x = p.x + VS * Math.sqrt(3) / 2, y = p.y + VS;
      neighbors(t.col, t.row).forEach((n, i) => {
        const nt = tileAt(map, n.col, n.row);
        if (!nt || nt.terrain === 'sea' || nt.owner === t.owner) return;
        // 이웃 방향 i(동, 북동, 북서, 서, 남서, 남동)와 맞닿은 변의 두 꼭짓점 각도 (뾰족한 위 헥스, y축 아래)
        const [d0, d1] = EDGE_ANGLES[i];
        const r = Math.PI / 180;
        o.beginPath();
        o.moveTo(x + VS * Math.cos(d0 * r), y + VS * Math.sin(d0 * r));
        o.lineTo(x + VS * Math.cos(d1 * r), y + VS * Math.sin(d1 * r));
        o.stroke();
      });
    }
  }
  // 화면 크기
  const w = 900, h = Math.round(900 * oh / ow);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.aspectRatio = `${w} / ${h}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = w; canvas._h = h;
  viewerState = { map, off, ow, oh, scale: w / ow, ox: 0, oy: 0, hover: null, epoch };
  renderViewer();
  const counts = {};
  for (const t of map.tiles) if (t.owner) counts[t.owner] = (counts[t.owner] || 0) + 1;
  const legend = epoch ? `<h3>${epoch.title}</h3><div style="font-size:13px">${epoch.note}</div>`
    + `<div style="margin:6px 0">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([n, c]) =>
      `<span class="chip"><span style="color:${data.nations[n].color}">■</span> ${data.nations[n].name} ${c.toLocaleString()}칸</span>`).join('')}</div>`
    + `<div class="muted" style="font-size:12.5px">근거: ${epoch.certainty}</div>`
    + '<div class="muted" style="font-size:12px;margin:4px 0 10px">국경은 각 성에서 실제 지형을 따라 행군 거리로 넓혀 자동 계산했습니다. 진한 색은 6일 행군 안의 핵심 영역, 연한 색은 15일 행군까지의 변경, 색 없는 땅은 미지배입니다.</div>' : '';
  $('info').innerHTML = legend + '<h3>역사 지점</h3>' + fullmap.sites.map((st) =>
    `<div style="font-size:13px"><span style="color:${data.nations[st.nation]?.color ?? 'var(--dim)'}">●</span> ${st.name} `
    + `<span class="muted">${SITE_TYPE[st.type]} · ${CONF[st.confidence]}</span></div>`).join('');
  $('tile').innerHTML = '<h3>지형</h3><div class="muted">칸에 마우스를 올리세요.</div>';
  $('log').textContent = '전체 지도 보기에서는 전투가 없습니다.';
}

const SITE_TYPE = { capital: '도성', castle: '성', port: '항구', battle: '전장' };
const EDGE_ANGLES = [[-30, 30], [-90, -30], [-150, -90], [150, 210], [90, 150], [30, 90]];
function fillEpochs() {
  $('epoch').innerHTML = '<option value="">지형만</option>' + epochs.map((e) => `<option value="${e.id}">${e.title}</option>`).join('');
  $('epoch').value = 's645';
}
const CONF = { high: '위치 확실', mid: '유력설', low: '논쟁 중' };

function renderViewer() {
  const v = viewerState;
  ctx.fillStyle = '#0d1320'; ctx.fillRect(0, 0, canvas._w, canvas._h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(v.off, v.ox, v.oy, v.ow * v.scale, v.oh * v.scale);
  const k = v.scale;
  for (const st of fullmap.sites) {
    const p = toPixel(st.col, st.row, VS);
    const x = v.ox + (p.x + VS * Math.sqrt(3) / 2) * k, y = v.oy + (p.y + VS) * k;
    if (x < -50 || y < -20 || x > canvas._w + 50 || y > canvas._h + 20) continue;
    const r = st.type === 'capital' ? 6 : 4.5;
    ctx.beginPath();
    if (st.type === 'castle' || st.type === 'capital') ctx.rect(x - r, y - r, r * 2, r * 2); else ctx.arc(x, y, r, 0, Math.PI * 2);
    // 시점을 고르면 그 시점의 주인 색으로
    const owner = v.epoch && (st.name in v.epoch.owners) ? v.epoch.owners[st.name] : v.epoch ? null : st.nation;
    ctx.fillStyle = data.nations[owner]?.color ?? '#e9e2cf'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#10151f';
    if (st.confidence === 'low') ctx.setLineDash([2, 2]);
    ctx.stroke(); ctx.setLineDash([]);
    if (k > 0.55 || st.type === 'capital') {
      ctx.font = `bold ${st.type === 'capital' ? 13 : 11.5}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,21,31,.85)'; ctx.strokeText(st.name, x + r + 3, y);
      ctx.fillStyle = '#fff'; ctx.fillText(st.name, x + r + 3, y);
    }
  }
  ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(233,226,207,.8)';
  ctx.fillText(`축척 ×${k.toFixed(2)} · 1칸 ≈ 6km`, 10, canvas._h - 10);
}

function viewerHex(evt) {
  const v = viewerState, r = canvas.getBoundingClientRect();
  const x = ((evt.clientX - r.left) * (canvas._w / r.width) - v.ox) / v.scale;
  const y = ((evt.clientY - r.top) * (canvas._h / r.height) - v.oy) / v.scale;
  const row = Math.round((y - VS) / (1.5 * VS));
  const col = Math.round((x - VS * Math.sqrt(3) / 2) / (VS * Math.sqrt(3)) - 0.5 * (row & 1));
  return tileAt(v.map, col, row);
}

function zoomAt(f, cx = canvas._w / 2, cy = canvas._h / 2) {
  const v = viewerState;
  const ns = Math.min(4, Math.max(canvas._w / v.ow * 0.9, v.scale * f));
  v.ox = cx - (cx - v.ox) * (ns / v.scale);
  v.oy = cy - (cy - v.oy) * (ns / v.scale);
  v.scale = ns;
  renderViewer();
}

let drag = null, dragged = false;
canvas.addEventListener('wheel', (e) => {
  if (!viewerState && !cam.free) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * (canvas._w / r.width), sy = (e.clientY - r.top) * (canvas._h / r.height);
  if (viewerState) zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, sx, sy);
  else camZoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, sx, sy);
}, { passive: false });
canvas.addEventListener('pointerdown', (e) => {
  if (viewerState || cam.free) { drag = { x: e.clientX, y: e.clientY, moved: 0 }; dragged = false; }
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', (e) => {
  if (!viewerState && cam.free && drag) {
    const r = canvas.getBoundingClientRect(), f = canvas._w / r.width;
    drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
    if (drag.moved > 6) {
      dragged = true;
      cam.ox += (e.clientX - drag.x) * f; cam.oy += (e.clientY - drag.y) * f;
      render();
    }
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  if (!viewerState) return;
  if (drag) {
    const r = canvas.getBoundingClientRect(), f = canvas._w / r.width;
    viewerState.ox += (e.clientX - drag.x) * f; viewerState.oy += (e.clientY - drag.y) * f;
    drag = { x: e.clientX, y: e.clientY };
    renderViewer();
    return;
  }
  const t = viewerHex(e);
  if (!t) return;
  const m = fullmap.meta;
  const xkm = m.hexKm * (t.col + 0.5 * (t.row & 1)) + m.hexKm / 2, ykm = 1.5 * (m.hexKm / Math.sqrt(3)) * t.row;
  const lon = m.lon0 + xkm / m.kmLon, lat = m.lat1 - ykm / m.kmLat;
  const site = fullmap.sites.find((st) => st.col === t.col && st.row === t.row);
  $('tile').innerHTML = tileCard(t) + `<div class="muted num" style="font-size:12px">칸 (${t.col}, ${t.row}) · 북위 ${lat.toFixed(2)}° 동경 ${lon.toFixed(2)}°</div>`
    + (site ? `<div style="margin-top:4px"><b>${site.name}</b> <span class="muted">${SITE_TYPE[site.type]} · ${CONF[site.confidence]}</span></div>` : '');
});
$('zin').onclick = () => (viewerState ? zoomAt(1.5) : cam.free && camZoom(1.5));
$('zout').onclick = () => (viewerState ? zoomAt(1 / 1.5) : cam.free && camZoom(1 / 1.5));

// ── 입력 ─────────────────────────────────────────
function hexAt(evt) {
  const r = canvas.getBoundingClientRect();
  const x = ((evt.clientX - r.left) * (canvas._w / r.width) - cam.ox) / cam.s;
  const y = ((evt.clientY - r.top) * (canvas._h / r.height) - cam.oy) / cam.s;
  let best = null, bd = Infinity;
  for (const t of state.map.tiles) {
    const c = center(t.col, t.row);
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  return bd < size * size ? best : null;
}

const myTurn = () => !state.winner && !busy && player() !== 'none' && activeNation(state) === player();

canvas.addEventListener('mousemove', (e) => {
  if (viewerState) return;
  const t = hexAt(e);
  hover = t ? { tile: t, unit: unitAt(state, t.col, t.row) } : null;
  renderPanels();
});

canvas.addEventListener('click', (e) => {
  if (viewerState) return;
  if (dragged) { dragged = false; return; }
  const t = hexAt(e);
  if (!t) return;
  hover = { tile: t, unit: unitAt(state, t.col, t.row) };
  if (!myTurn()) { renderPanels(); return; }
  const u = hover.unit;
  if (selected && !u && bridgeSites(state, data, selected).includes(t)) {
    buildBridge(state, data, selected, t);
    selected = null; reach = null;
  } else if (u && u.nation === player() && !u.acted) {
    selected = u; reach = moveRange(state, data, u); fx = null;
  } else if (selected && u && u.nation !== player()) {
    const ranged = distance(u, selected) > 1;
    const res = attack(state, data, selected, u);
    if (res) { fx = { unit: selected, target: u, res, ranged }; selected = null; reach = null; }
  } else if (selected && reach?.has(key(t.col, t.row))) {
    const path = findPath(state, data, selected, t.col, t.row);
    moveUnit(state, data, selected, t.col, t.row);
    fx = { unit: selected, path };
    reach = null;
    if (!attackTargets(state, data, selected).length) { waitUnit(state, selected); selected = null; }
  } else { selected = null; reach = null; }
  render();
  if (myTurn() && state.units.every((x) => x.dead || x.nation !== player() || x.acted)) endPlayerTurn();
});

function endPlayerTurn() {
  selected = null; reach = null;
  endTurn(state, data);
  render();
  if (!state.winner) playAiTurn(gen);
}

$('scenario').onchange = (e) => load(Number(e.target.value));
$('side').onchange = restart;
$('restart').onclick = restart;
$('auto').onclick = () => { auto = !auto; updateButtons(); if (auto && !busy) runAuto(); };
$('step').onclick = () => { if (!busy) playAiTurn(gen); };
$('sim').onclick = simulate;
window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && myTurn()) endPlayerTurn(); });

fillSelectors();
fillEpochs();
$('epoch').onchange = () => viewerState && openViewer();
buildTables();
load(0);
