// 645 요동 전역 — 실측 지도판.
// 전체 지도(src/data/maps/fullmap.js)에서 요서~요동 반도를 잘라 쓰고,
// 성 주인·국경은 epochs.js 의 645년 배치를 따른다. 부대 위치는 위경도로 적는다.
import fullmap from '../maps/fullmap.js';
import epochs from '../epochs.js';
import { cropFullmap, snapTo } from '../../crop.js';
import { applyEpoch } from '../../territory.js';

const crop = cropFullmap(fullmap, { lon0: 120.6, lon1: 125.0, lat0: 38.9, lat1: 42.3 });
const epoch = epochs.find((e) => e.id === 's645');

const WALLS = { 요동성: 150, 안시성: 175 };
const castles = crop.sites
  .filter((s) => s.type === 'castle' || s.type === 'capital')
  .map((s) => ({ name: s.name, col: s.col, row: s.row, owner: epoch.owners[s.name] ?? null, wall: WALLS[s.name] ?? 100 }));
const castleAt = (name) => castles.find((c) => c.name === name);

const LAND = (ch) => '.hmwP'.includes(ch);
const used = new Set(castles.map((c) => `${c.col},${c.row}`));
function at(lat, lon, ok = LAND) {
  const p = snapTo(crop, lat, lon, (ch, c, r) => ok(ch) && !used.has(`${c},${r}`));
  used.add(`${p.col},${p.row}`);
  return p;
}
const inCastle = (name) => { const c = castleAt(name); return { col: c.col, row: c.row }; };
const garrison = (name, type, troops, general = null) => ({ general, nation: 'goguryeo', type, troops, ...inCastle(name), hold: true });

export default {
  id: 'liaodong645full',
  title: '645 요동 전역 · 실측 지도',
  year: 645,
  desc: '실제 지형 위의 645년 요동. 당군은 요하 서쪽에서 출발해 강을 건너고(여울 또는 이도종의 부교), '
    + '요동성과 안시성을 모두 함락해야 합니다. 장량의 수군은 바다로 돌아 요동 반도에 상륙합니다. '
    + '고구려는 산성마다 수비대를 두고 오골성 방면의 고연수·고혜진 구원군이 달려옵니다.',
  rows: crop.rows,
  meta: crop.meta,
  sites: crop.sites,
  castles,
  sides: ['tang', 'goguryeo'],
  setupMap(map, data) {
    applyEpoch(map, data, crop.meta, crop.sites, epoch);
  },
  units: [
    { general: 'li_shiji', nation: 'tang', type: 'spear', troops: 6000, ...at(41.85, 122.05) },
    { general: 'li_shimin', nation: 'tang', type: 'cavalry', troops: 6000, ...at(41.50, 121.75) },
    { general: 'xue_rengui', nation: 'tang', type: 'cavalry', troops: 5000, ...at(41.62, 121.85) },
    { general: 'zhangsun_wuji', nation: 'tang', type: 'archer', troops: 5000, ...at(41.42, 121.62) },
    { general: 'li_daozong', nation: 'tang', type: 'spear', troops: 6000, ...at(41.30, 121.90) },
    { general: null, nation: 'tang', type: 'siege', troops: 3000, ...at(41.50, 121.55) },
    { general: 'zhang_liang', nation: 'tang', type: 'spear', troops: 5000, ...at(39.35, 121.30, (ch) => ch === 'S') },

    garrison('요동성', 'spear', 5000),
    garrison('개모성', 'spear', 3000),
    garrison('백암성', 'archer', 3000),
    garrison('신성', 'spear', 4000),
    garrison('안시성', 'spear', 6000, 'ansi_lord'),
    { general: 'ansi_vice', nation: 'goguryeo', type: 'archer', troops: 4000, ...at(40.86, 122.86), hold: true },
    garrison('건안성', 'spear', 3000),
    garrison('비사성', 'spear', 3000),
    { general: 'go_yeonsu', nation: 'goguryeo', type: 'cavalry', troops: 6000, ...at(40.50, 124.00) },
    { general: 'go_hyejin', nation: 'goguryeo', type: 'spear', troops: 6000, ...at(40.60, 123.85) },
  ],
  victory: [
    { nation: 'tang', type: 'capture', castles: ['요동성', '안시성'] },
    { nation: 'goguryeo', type: 'survive', turns: 40 },
  ],
};
