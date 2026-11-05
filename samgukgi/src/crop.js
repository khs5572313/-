// 전체 지도에서 위경도 범위를 잘라 시나리오 지도로 쓴다.
// odd-r 헥스는 행의 홀짝으로 모양이 정해지므로 시작 행은 반드시 짝수로 맞춘다.
import { latLonToHex } from './territory.js';

export function cropFullmap(fullmap, { lon0, lon1, lat0, lat1 }) {
  const a = latLonToHex(fullmap.meta, lat1, lon0);
  const b = latLonToHex(fullmap.meta, lat0, lon1);
  const row0 = Math.max(0, a.row - (a.row & 1));
  const col0 = Math.max(0, a.col);
  const row1 = Math.min(fullmap.rows.length - 1, b.row);
  const col1 = Math.min(fullmap.rows[0].length - 1, b.col);
  const rows = fullmap.rows.slice(row0, row1 + 1).map((r) => r.slice(col0, col1 + 1));
  const inside = (s) => s.col >= col0 && s.col <= col1 && s.row >= row0 && s.row <= row1;
  const sites = fullmap.sites.filter(inside).map((s) => ({ ...s, col: s.col - col0, row: s.row - row0 }));
  // 잘라 낸 지도에서도 위경도 → 헥스 변환이 되도록 원점을 옮긴 meta
  const size = fullmap.meta.hexKm / Math.sqrt(3);
  const meta = {
    ...fullmap.meta,
    lat1: fullmap.meta.lat1 - (1.5 * size * row0) / fullmap.meta.kmLat,
    lon0: fullmap.meta.lon0 + (fullmap.meta.hexKm * col0) / fullmap.meta.kmLon,
  };
  return { rows, sites, meta, col0, row0 };
}

// 위경도에 가장 가까운, 지정 조건을 만족하는 칸 (부대 배치용)
export function snapTo(crop, lat, lon, ok) {
  const h = latLonToHex(crop.meta, lat, lon);
  let best = null, bd = Infinity;
  for (let r = Math.max(0, h.row - 6); r <= Math.min(crop.rows.length - 1, h.row + 6); r++) {
    for (let c = Math.max(0, h.col - 6); c <= Math.min(crop.rows[0].length - 1, h.col + 6); c++) {
      if (!ok(crop.rows[r][c], c, r)) continue;
      const d = (c - h.col) ** 2 + (r - h.row) ** 2;
      if (d < bd) { bd = d; best = { col: c, row: r }; }
    }
  }
  return best;
}
