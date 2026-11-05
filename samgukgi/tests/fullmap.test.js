// 전체 지도·시점별 국경·실측 전역 시나리오 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/index.js';
import fullmap from '../src/data/maps/fullmap.js';
import epochs from '../src/data/epochs.js';
import sites from '../src/data/sites.js';
import full645 from '../src/data/scenarios/liaodong645full.js';
import { buildMap, createGame } from '../src/game.js';
import { applyEpoch, latLonToHex } from '../src/territory.js';
import { cropFullmap } from '../src/crop.js';
import { playOut } from '../src/sim.js';

const map = buildMap({ rows: fullmap.rows, castles: [], territory: [] }, data);
const siteTile = (name) => {
  const s = fullmap.sites.find((x) => x.name === name);
  return map.tiles[s.row * map.w + s.col];
};

test('전체 지도: 크기·지형 문자가 올바르고 모든 역사 지점이 육지에 놓인다', () => {
  assert.ok(map.w > 200 && map.h > 200);
  assert.equal(fullmap.sites.length, sites.length);
  for (const s of fullmap.sites) assert.notEqual(fullmap.rows[s.row][s.col], 'S', `${s.name}이 바다에 놓임`);
});

test('위경도 → 헥스 변환이 지도 생성기와 일치한다', () => {
  for (const name of ['평양성', '금성', '사비성', '요동성']) {
    const s = sites.find((x) => x.name === name);
    const h = latLonToHex(fullmap.meta, s.lat, s.lon);
    const placed = fullmap.sites.find((x) => x.name === name);
    assert.ok(Math.abs(h.col - placed.col) <= 1 && Math.abs(h.row - placed.row) <= 1, `${name} ${JSON.stringify(h)} vs ${placed.col},${placed.row}`);
  }
});

test('모든 시점의 세력 이름이 nations에 정의되어 있다', () => {
  for (const e of epochs) {
    for (const [site, n] of Object.entries(e.owners)) {
      assert.ok(sites.some((s) => s.name === site), `${e.id}: 없는 지점 ${site}`);
      if (n) assert.ok(data.nations[n], `${e.id}: 없는 세력 ${n}`);
    }
    for (const s of e.seeds) assert.ok(data.nations[s.nation], `${e.id}: 없는 세력 ${s.nation}`);
  }
});

test('시점별 국경이 역사 흐름과 맞는다', () => {
  const at = (id, name) => { applyEpoch(map, data, fullmap.meta, fullmap.sites, epochs.find((e) => e.id === id)); return siteTile(name).owner; };
  assert.equal(at('s645', '사비성'), 'baekje');
  assert.equal(at('s645', '대야성'), 'baekje');   // 642년 함락
  assert.equal(at('s645', '평양성'), 'goguryeo');
  assert.equal(at('s670', '평양성'), 'tang');     // 안동도호부
  assert.equal(at('s670', '웅진성'), 'tang');     // 웅진도독부
  assert.equal(at('s696', '사비성'), 'silla');
  assert.equal(at('s696', '영주'), 'khitan');     // 이진충의 난
});

test('지도 자르기: 시작 행은 짝수(헥스 모양 유지)이고 지점 좌표가 함께 옮겨진다', () => {
  const c = cropFullmap(fullmap, { lon0: 120.6, lon1: 125.0, lat0: 38.9, lat1: 42.3 });
  assert.equal(c.row0 % 2, 0);
  const s = c.sites.find((x) => x.name === '요동성');
  const g = fullmap.sites.find((x) => x.name === '요동성');
  assert.equal(s.col + c.col0, g.col);
  assert.equal(s.row + c.row0, g.row);
});

test('645 실측 전역: 부대가 갈 수 있는 칸에 서 있고, 장량은 배 위에서 시작한다', () => {
  const s = createGame(full645, data, 1);
  for (const u of s.units) {
    const t = s.map.tiles[u.row * s.map.w + u.col];
    if (u.generalId === 'zhang_liang') assert.ok(u.embarked);
    else assert.ok(!data.terrain[t.terrain].impassable, `${u.generalId} 시작 칸 ${t.terrain}`);
  }
  assert.equal(s.map.tiles.find((t) => t.castle === '요동성').owner, 'goguryeo');
});

test('645 실측 전역 밸런스: 요동성은 대부분 함락, 당 승률 20~80%', () => {
  const n = 16;
  let tang = 0, yd = 0;
  for (let i = 0; i < n; i++) {
    const s = createGame(full645, data, 1000 + i);
    if (playOut(s, data, 400) === 'tang') tang++;
    if (s.map.tiles.find((t) => t.castle === '요동성').owner === 'tang') yd++;
  }
  assert.ok(yd / n >= 0.7, `요동성 함락 ${yd}/${n}`);
  assert.ok(tang / n >= 0.2 && tang / n <= 0.8, `당 승 ${tang}/${n}`);
});
