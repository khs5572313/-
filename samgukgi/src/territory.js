// 국경 자동 계산: 각 세력의 성·씨앗에서 보병 행군 비용으로 동시에 퍼져 나가,
// 먼저 닿는 세력이 그 땅을 갖는다(다중 출발 다익스트라). 산맥·큰 강이 저절로 국경이 된다.
// RADIUS_MP 안은 핵심 영역, FRONTIER_MP 까지는 변경(frontier=true), 그보다 먼 땅은 미지배(null).
import { neighbors, key } from './hex.js';
import { tileAt } from './modifiers.js';
import { MinHeap } from './pq.js';

export const RADIUS_MP = 36;    // 핵심 영역: 보병 6일 행군 ≈ 평지 18칸 ≈ 108km
export const FRONTIER_MP = 90;  // 변경: 그 너머 15일 행군까지는 가장 가까운 세력의 느슨한 영향권

export function latLonToHex(meta, lat, lon) {
  const size = meta.hexKm / Math.sqrt(3);
  const ykm = (meta.lat1 - lat) * meta.kmLat;
  const row = Math.round((ykm - size) / (1.5 * size));
  const xkm = (lon - meta.lon0) * meta.kmLon;
  const col = Math.round((xkm - meta.hexKm / 2) / meta.hexKm - 0.5 * (row & 1));
  return { col, row };
}

function landCost(data, tile) {
  const t = data.terrain[tile.terrain];
  if (t.impassable) return Infinity;
  return t.move.spear ?? Infinity;
}

// map: buildMap 결과, sites: fullmap.sites(헥스 좌표 포함), epoch: epochs.js 항목
// 반환: { owners: Map(siteName→nation), seeds: [{col,row,nation,name}] } 이고 map.tiles[].owner 를 채운다
export function applyEpoch(map, data, meta, sites, epoch) {
  const seeds = [];
  for (const s of sites) {
    if (!(s.type === 'castle' || s.type === 'capital' || s.type === 'port')) continue;
    const nation = s.name in epoch.owners ? epoch.owners[s.name] : null;
    if (nation) seeds.push({ col: s.col, row: s.row, nation, name: s.name });
  }
  for (const s of epoch.seeds || []) {
    const h = latLonToHex(meta, s.lat, s.lon);
    const t = tileAt(map, h.col, h.row);
    if (t && landCost(data, t) !== Infinity) seeds.push({ ...h, nation: s.nation, name: s.name });
  }
  for (const t of map.tiles) { t.owner = null; t.frontier = false; }
  const best = new Map();
  const heap = new MinHeap();
  for (const s of seeds) heap.push({ col: s.col, row: s.row, cost: 0, nation: s.nation });
  while (heap.size) {
    const cur = heap.pop();
    const k = key(cur.col, cur.row);
    if (best.has(k)) continue;
    best.set(k, cur.nation);
    const tile = tileAt(map, cur.col, cur.row);
    tile.owner = cur.nation;
    tile.frontier = cur.cost > RADIUS_MP;
    for (const n of neighbors(cur.col, cur.row)) {
      const t = tileAt(map, n.col, n.row);
      if (!t || best.has(key(n.col, n.row))) continue;
      const c = cur.cost + landCost(data, t);
      if (c <= FRONTIER_MP) heap.push({ col: n.col, row: n.row, cost: c, nation: cur.nation });
    }
  }
  return { seeds };
}
