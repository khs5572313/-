import data from '../src/data/index.js';
import scenario645 from '../src/data/scenarios/liaodong645.js';
import labs from '../src/data/scenarios/labs.js';
import {
  createGame, moveRange, attackTargets, moveUnit, attack, waitUnit, endTurn, unitAt, activeNation, findPath,
} from '../src/game.js';
import { actUnit, aiOrder } from '../src/ai.js';
import { computeDamage, canCounter, generalOf, unitRange, isDismounted } from '../src/combat.js';
import { getMods, tileAt } from '../src/modifiers.js';
import { runMany } from '../src/sim.js';
import { toPixel, key, distance } from '../src/hex.js';

const SCENARIOS = [...labs, { ...scenario645, expect: { text: 'AI 대 AI 기준 당과 고구려가 대략 반반이 되도록 맞췄습니다.' } }];
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
  resize();
  updateButtons();
  render();
  if (player() !== 'none' && activeNation(state) !== player()) playAiTurn(gen);
}

function resize() {
  const w0 = Math.sqrt(3) * (state.map.w + 0.5);
  const h0 = 1.5 * (state.map.h - 1) + 2;
  size = Math.max(18, Math.min(34, 900 / w0));
  const w = size * w0 + PAD * 2, h = size * h0 + PAD * 2;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.aspectRatio = `${w} / ${h}`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = w; canvas._h = h;
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
  ctx.clearRect(0, 0, canvas._w, canvas._h);
  const targets = selected && !selected.acted ? new Set(attackTargets(state, data, selected).map((u) => u.id)) : new Set();
  for (const t of state.map.tiles) {
    const { x, y } = center(t.col, t.row);
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
  renderPanels();
}

function drawUnit(u, targets) {
  if (u.dead) return;
  const { x, y } = center(u.col, u.row);
  const r = size * 0.56;
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
  const badge = isDismounted(state, data, u) ? '하마' : t.terrain === 'ford' ? '도하' : null;
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
  if (isDismounted(state, data, u)) status.push('<span class="chip alert">하마 — 말을 끌고 걷는 중 (공격 ×0.6, 방어 ×0.8)</span>');
  if (tileAt(state.map, u.col, u.row).terrain === 'ford') status.push('<span class="chip alert">도하 중 — 방어 ×0.6, 공격 ×0.7</span>');
  const skills = g.skills.map((s) => `<span class="chip" title="${data.skills[s].desc}">${data.skills[s].name}</span>`).join('');
  return `<h3>부대</h3>
    <div><b>${g.name}</b> <span class="muted">${g.hanja || ''}</span> · ${n.name} ${data.units[u.type].name}</div>
    <div class="muted" style="font-size:12.5px">${g.note ?? ''}</div>
    <div class="num" style="font-size:13px;margin-top:4px">통솔 ${g.lead} · 무력 ${g.war} · 지력 ${g.int}</div>
    <div style="font-size:13px">적성 ${Object.keys(data.units).map((t) => `${data.units[t].name} <b style="color:${APT_COLOR[g.aptitude[t]]}">${g.aptitude[t]}</b>`).join(' · ')}</div>
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
  return `<h3>지형</h3><div><b>${t.castle ? `${t.castle} (성)` : terr.name}</b> · 방어 ×${terr.def}</div>
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
        <td>${Math.floor(u.move / mtn.move[id])}칸${id === 'cavalry' ? ' (하마)' : ''}</td><td>${rangeNote}</td>
        <td class="num">${u.atk} / ${u.def}</td><td>${strong} ×1.2 / ${weak} ×0.85</td></tr>`;
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

// ── 입력 ─────────────────────────────────────────
function hexAt(evt) {
  const r = canvas.getBoundingClientRect();
  const x = (evt.clientX - r.left) * (canvas._w / r.width);
  const y = (evt.clientY - r.top) * (canvas._h / r.height);
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
  const t = hexAt(e);
  hover = t ? { tile: t, unit: unitAt(state, t.col, t.row) } : null;
  renderPanels();
});

canvas.addEventListener('click', (e) => {
  const t = hexAt(e);
  if (!t) return;
  hover = { tile: t, unit: unitAt(state, t.col, t.row) };
  if (!myTurn()) { renderPanels(); return; }
  const u = hover.unit;
  if (u && u.nation === player() && !u.acted) {
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
buildTables();
load(0);
