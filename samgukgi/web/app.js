import data from '../src/data/index.js';
import scenario from '../src/data/scenarios/liaodong645.js';
import {
  createGame, moveRange, attackTargets, moveUnit, attack, waitUnit, endTurn, unitAt, tileAt, activeNation,
} from '../src/game.js';
import { runAiTurn } from '../src/ai.js';
import { computeDamage, canCounter, generalOf, critChance, unitRange } from '../src/combat.js';
import { getMods } from '../src/modifiers.js';
import { toPixel, key } from '../src/hex.js';

const SIZE = 24;
const PAD = 30;
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

let state, selected = null, reach = null, hover = null, player = $('side').value, aiTimer = null;

function start() {
  clearTimeout(aiTimer);
  state = createGame(scenario, data, Date.now() & 0xffff);
  selected = null; reach = null; hover = null;
  player = $('side').value;
  $('title').textContent = scenario.title;
  const w = SIZE * Math.sqrt(3) * (state.map.w + 0.5) + PAD * 2;
  const h = SIZE * 1.5 * (state.map.h - 1) + SIZE * 2 + PAD * 2;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.aspectRatio = `${w} / ${h}`;
  canvas.style.maxWidth = `${w}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._w = w; canvas._h = h;
  render();
  maybeAi();
}

const center = (col, row) => {
  const p = toPixel(col, row, SIZE);
  return { x: p.x + PAD + SIZE, y: p.y + PAD + SIZE };
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

function render() {
  ctx.clearRect(0, 0, canvas._w, canvas._h);
  const targets = selected && !selected.acted ? new Set(attackTargets(state, data, selected).map((u) => u.id)) : new Set();
  for (const t of state.map.tiles) {
    const { x, y } = center(t.col, t.row);
    const terr = data.terrain[t.terrain];
    hexPath(x, y, SIZE);
    ctx.fillStyle = terr.color; ctx.fill();
    if (t.owner && t.terrain !== 'sea') {
      ctx.fillStyle = data.nations[t.owner].color + '22'; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    if (reach && reach.has(key(t.col, t.row))) {
      hexPath(x, y, SIZE - 2); ctx.fillStyle = 'rgba(70,140,255,.32)'; ctx.fill();
    }
    if (t.terrain === 'mountain') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▲', x, y + 4); }
    if (t.terrain === 'forest') { ctx.fillStyle = 'rgba(0,40,0,.4)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♣', x, y + 4); }
    if (t.castle) {
      ctx.fillStyle = data.nations[t.owner]?.color ?? '#777';
      ctx.fillRect(x - 9, y - 9, 18, 14);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('城', x, y + 2);
      ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(t.castle, x, y - 13);
    }
  }
  for (const u of state.units) {
    if (u.dead) continue;
    const { x, y } = center(u.col, u.row);
    const color = data.nations[u.nation].color;
    ctx.beginPath(); ctx.arc(x, y + 4, SIZE * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = u === selected ? 3 : 1.5;
    ctx.strokeStyle = u === selected ? '#fff' : targets.has(u.id) ? '#ff3b30' : '#111';
    if (targets.has(u.id)) ctx.lineWidth = 3;
    ctx.stroke();
    if (u.acted && u.nation === activeNation(state)) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data.units[u.type].short, x, y + 8);
    const ratio = u.troops / u.maxTroops;
    ctx.fillStyle = '#111'; ctx.fillRect(x - 13, y + 17, 26, 4);
    ctx.fillStyle = ratio > 0.5 ? '#4cd964' : ratio > 0.25 ? '#ffcc00' : '#ff3b30';
    ctx.fillRect(x - 13, y + 17, 26 * ratio, 4);
  }
  renderPanels();
}

const APT_COLOR = { S: '#ffcc00', A: '#4cd964', B: '#ccc', C: '#999', D: '#777' };

function unitCard(u) {
  const g = generalOf(u, data);
  const n = data.nations[u.nation];
  const m = getMods(state, data, u, {});
  const apt = Object.keys(data.units).map((t) => `${data.units[t].name} <b style="color:${APT_COLOR[g.aptitude[t]]}">${g.aptitude[t]}</b>`).join(' · ');
  const skills = g.skills.map((s) => `<span class="tag" title="${data.skills[s].desc}">${data.skills[s].name}</span>`).join('') || '<span class="muted">없음</span>';
  return `<h2>${g.name} ${g.hanja ? `<span class="muted">${g.hanja}</span>` : ''} — ${n.name} ${data.units[u.type].name}</h2>
    <div class="muted" style="font-size:12px">${g.historicity ? `[${g.historicity}] ` : ''}${g.note ?? ''}</div>
    <table class="stats"><tr><td>통솔 ${g.lead}</td><td>무력 ${g.war}</td><td>지력 ${g.int}</td><td>정치 ${g.pol}</td><td>매력 ${g.cha}</td></tr></table>
    <div>적성: ${apt}</div>
    <div>특기: ${skills}</div>
    <div>국가 버프: <span class="tag" title="${n.buff?.desc ?? ''}">${n.buff?.name ?? '-'}</span></div>
    <div style="margin-top:6px">병력 ${u.troops.toLocaleString()} / ${u.maxTroops.toLocaleString()}</div>
    <div class="bar"><i style="width:${u.troops / u.maxTroops * 100}%;background:#4cd964"></i></div>
    <div>사기 ${Math.round(u.morale)}</div>
    <div class="bar"><i style="width:${u.morale}%;background:#5ac8fa"></i></div>
    <div class="muted" style="font-size:12px;margin-top:4px">이동력 ${data.units[u.type].move + m.move} · 사거리 ${unitRange(state, data, u)} · 전법 확률 ${(critChance(g) * 100).toFixed(0)}%${u.hold ? ' · 농성(이동 안 함)' : ''}</div>`;
}

function renderPanels() {
  const nation = activeNation(state);
  $('turn').innerHTML = state.winner
    ? `<span class="winner">승리: ${data.nations[state.winner].name}</span>`
    : `${state.turn}턴 / 제한 ${scenario.victory.find((v) => v.type === 'survive')?.turns ?? '-'}턴 · <b style="color:${data.nations[nation].color}">${data.nations[nation].name}</b> 차례`;
  const shown = hover?.unit ?? selected;
  $('info').innerHTML = shown ? unitCard(shown) : '<h2>부대 정보</h2><div class="muted">부대를 클릭하세요.</div>';
  if (selected && hover?.unit && hover.unit.nation !== selected.nation && !selected.acted) {
    const t = hover.unit;
    const inRange = attackTargets(state, data, selected).includes(t);
    const dmg = computeDamage(state, data, selected, t, { role: 'attack' });
    const ctr = dmg < t.troops && canCounter(state, data, t, selected)
      ? computeDamage(state, data, t, selected, { role: 'counter', moved: false, attTroops: t.troops - dmg }) : 0;
    $('preview').innerHTML = `<h2>교전 예측 ${inRange ? '' : '<span class="muted">(사거리 밖)</span>'}</h2>
      <div>${generalOf(selected, data).name} → ${generalOf(t, data).name}</div>
      <div>예상 피해 <b>${dmg.toLocaleString()}</b> (±25%, 전법 발동 시 1.5배)</div>
      <div>예상 반격 <b>${ctr.toLocaleString()}</b></div>
      <div class="muted">상성 계수 ×${data.counter[selected.type][t.type]}</div>`;
  }
  if (hover?.tile) {
    const t = hover.tile, terr = data.terrain[t.terrain];
    $('tile').innerHTML = `<h2>지형</h2><div>${t.castle ? `${t.castle} (성)` : terr.name} · 방어 ×${terr.def}${terr.supply ? ` · 보급 ${terr.supply * 100}%/턴` : ''}</div>
      <div class="muted">이동 비용: ${Object.entries(terr.move).map(([k, v]) => `${data.units[k].name} ${v}`).join(', ') || '이동 불가'}</div>
      <div class="muted">소유: ${t.owner ? data.nations[t.owner].name : '-'}</div>`;
  }
  const log = $('log');
  log.textContent = state.log.slice(-60).join('\n');
  log.scrollTop = log.scrollHeight;
}

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
  return bd < SIZE * SIZE ? best : null;
}

const isPlayerTurn = () => !state.winner && activeNation(state) === player;

canvas.addEventListener('mousemove', (e) => {
  const t = hexAt(e);
  hover = t ? { tile: t, unit: unitAt(state, t.col, t.row) } : null;
  renderPanels();
});

canvas.addEventListener('click', (e) => {
  const t = hexAt(e);
  if (!t || !isPlayerTurn()) return;
  const u = unitAt(state, t.col, t.row);
  if (u && u.nation === player && !u.acted) {
    selected = u; reach = moveRange(state, data, u);
  } else if (selected && u && u.nation !== player) {
    if (attack(state, data, selected, u)) { selected = null; reach = null; }
  } else if (selected && reach?.has(key(t.col, t.row))) {
    moveUnit(state, data, selected, t.col, t.row);
    reach = null;
    if (!attackTargets(state, data, selected).length) { waitUnit(state, selected); selected = null; }
  } else {
    selected = null; reach = null;
  }
  render();
});

$('wait').onclick = () => { if (selected && isPlayerTurn()) { waitUnit(state, selected); selected = null; reach = null; render(); } };
$('end').onclick = () => { if (isPlayerTurn()) { selected = null; reach = null; endTurn(state, data); render(); maybeAi(); } };
$('restart').onclick = start;
$('side').onchange = start;

function maybeAi() {
  if (state.winner || activeNation(state) === player) return;
  aiTimer = setTimeout(() => {
    runAiTurn(state, data);
    endTurn(state, data);
    render();
    maybeAi();
  }, player === 'none' ? 350 : 500);
}

start();
