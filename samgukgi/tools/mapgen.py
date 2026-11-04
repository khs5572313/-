#!/usr/bin/env python3
"""전체 필드맵 생성기: 실측 고도 데이터 → 6km 헥스 지도.

  python3 tools/mapgen.py            # src/data/maps/fullmap.js 생성
  python3 tools/mapgen.py --preview  # dist/fullmap_preview.png 도 생성

원본 데이터: AWS Terrain Tiles (Terrarium 형식, SRTM 등을 합성한 공개 고도 타일)
  https://registry.opendata.aws/terrain-tiles/

처리 단계
  1. 범위(요서~규슈 북부)의 z7 타일을 받아 고도 모자이크를 만든다 (픽셀 ≈ 0.9km).
  2. 헥스(가로 6km, 뾰족한 위, odd-r) 중심마다 주변 표본 19개의 고도를 읽는다.
  3. 분류: 표본 절반 이상이 해발 0 이하 → 바다
            기복(최고-최저) 또는 평균 고도로 → 산악 / 구릉 / 평지
  4. 강: 헥스 고도로 웅덩이를 메운 뒤(priority-flood) 가장 낮은 이웃으로 물을 흘려
         상류 면적을 누적한다. 큰 강은 '강'(걸어서 못 건넘), 중간 강은 '여울'(어디서나 건너지만 하루 소모).
  5. 큰 강에는 일정 간격으로 여울을 둔다 (실제 도하 지점 고증 전 임시 배치).

한계 (게임 배치 전에 사람이 손봐야 할 것)
  · 해안선은 현대 기준이다. 서해안 간척지, 요하 하구 삼각주 등은 7세기와 다르다.
  · 숲·습지는 고도만으로 알 수 없어 넣지 않았다(요택 습지만 범위로 지정).
  · 큰 강의 여울 위치는 임시다.
"""
import io, json, math, os, sys, urllib.request
from heapq import heappush, heappop

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CACHE = os.environ.get('MAPGEN_CACHE', os.path.join(ROOT, '.cache', 'terrain'))
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

LON0, LON1 = 117.0, 132.0      # 요서(랴오시) ~ 동해·규슈 동단
LAT0, LAT1 = 33.0, 44.0        # 규슈 북부 ~ 동모산 북쪽
Z = 7
HEX_KM = 6.0                   # 헥스 가로폭(마주 보는 변 사이 거리)
SIZE = HEX_KM / math.sqrt(3)   # 중심~꼭짓점
ROW_KM = 1.5 * SIZE
KM_LAT = 110.57
KM_LON = 111.32 * math.cos(math.radians((LAT0 + LAT1) / 2))

BIG_RIVER_KM2 = 15000          # 상류 면적이 이보다 크면 '강' (걸어서 도하 불가)
MID_RIVER_KM2 = 3000           # 이보다 크면 '여울' (어디서나 건너지만 하루 소모)
FORD_EVERY = 5                 # 큰 강 몇 칸마다 여울 하나
# 요택: 요하 하류 서쪽의 저습지 (대략 범위)
MARSH_BOX = (121.6, 122.7, 40.9, 41.9)  # lon0, lon1, lat0, lat1, 해발 30m 미만만


def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def fetch(z, x, y):
    path = os.path.join(CACHE, f'{z}_{x}_{y}.png')
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    return img[..., 0] * 256 + img[..., 1] + img[..., 2] / 256 - 32768


def mosaic():
    x0, y0 = tile_xy(LON0, LAT1, Z)
    x1, y1 = tile_xy(LON1, LAT0, Z)
    tx = range(int(x0), int(x1) + 1)
    ty = range(int(y0), int(y1) + 1)
    rows = []
    for y in ty:
        rows.append(np.concatenate([fetch(Z, x, y) for x in tx], axis=1))
        print(f'  타일 행 {y} 완료', file=sys.stderr)
    return np.concatenate(rows, axis=0), tx.start, ty.start


def main():
    preview = '--preview' in sys.argv
    print('고도 타일 내려받는 중…', file=sys.stderr)
    dem, tx0, ty0 = mosaic()
    H, W = dem.shape

    def elev(lon, lat):
        x, y = tile_xy(lon, lat, Z)
        px, py = (x - tx0) * 256, (y - ty0) * 256
        ix, iy = int(px), int(py)
        if not (0 <= ix < W - 1 and 0 <= iy < H - 1):
            return 0.0
        fx, fy = px - ix, py - iy
        a = dem[iy, ix] * (1 - fx) + dem[iy, ix + 1] * fx
        b = dem[iy + 1, ix] * (1 - fx) + dem[iy + 1, ix + 1] * fx
        return a * (1 - fy) + b * fy

    cols = int((LON1 - LON0) * KM_LON / HEX_KM)
    rows = int((LAT1 - LAT0) * KM_LAT / ROW_KM)

    def center(c, r):
        xkm = HEX_KM * (c + 0.5 * (r & 1)) + HEX_KM / 2
        ykm = ROW_KM * r + SIZE
        return LON0 + xkm / KM_LON, LAT1 - ykm / KM_LAT

    # 헥스 안 표본 19점 (중심 + 반지름 0.45, 0.85 링)
    offs = [(0.0, 0.0)] + [(0.45 * math.cos(a), 0.45 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 6, endpoint=False)] \
        + [(0.85 * math.cos(a), 0.85 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)]
    print(f'헥스 {cols}×{rows} 분류 중…', file=sys.stderr)
    mean = np.zeros((rows, cols)); relief = np.zeros((rows, cols)); seafrac = np.zeros((rows, cols))
    for r in range(rows):
        for c in range(cols):
            lon, lat = center(c, r)
            vals = [elev(lon + dx * SIZE / KM_LON, lat + dy * SIZE / KM_LAT) for dx, dy in offs]
            land = [v for v in vals if v > 0]
            seafrac[r, c] = 1 - len(land) / len(vals)
            mean[r, c] = sum(land) / len(land) if land else min(vals)
            relief[r, c] = (max(land) - min(land)) if len(land) > 1 else 0

    sea = seafrac >= 0.5
    terrain = np.full((rows, cols), '.', dtype='<U1')
    terrain[(relief > 220) | (mean > 400)] = 'h'
    terrain[(relief > 550) | (mean > 900)] = 'm'
    for r in range(rows):
        for c in range(cols):
            lon, lat = center(c, r)
            # 요택: 범위 안에서도 해발 15m 미만이고 기복 10m 미만인 저습지만
            if MARSH_BOX[0] <= lon <= MARSH_BOX[1] and MARSH_BOX[2] <= lat <= MARSH_BOX[3] \
                    and mean[r, c] < 15 and relief[r, c] < 10:
                terrain[r, c] = 'w'
    terrain[sea] = 'S'

    # ── 강: 웅덩이 메우기 + 최저 이웃 흐름 + 상류 누적 ──
    def nbrs(c, r):
        odd = r & 1
        for dc, dr in ([(1, 0), (-1, 0), (0, -1), (-1, -1), (0, 1), (-1, 1)] if not odd
                       else [(1, 0), (-1, 0), (1, -1), (0, -1), (1, 1), (0, 1)]):
            cc, rr = c + dc, r + dr
            if 0 <= cc < cols and 0 <= rr < rows:
                yield cc, rr

    filled = np.where(sea, -1e9, mean).astype(float)
    done = np.zeros((rows, cols), bool)
    pq = []
    for r in range(rows):
        for c in range(cols):
            if sea[r, c] or r in (0, rows - 1) or c in (0, cols - 1):
                done[r, c] = True
                heappush(pq, (filled[r, c], r, c))
    down = {}
    while pq:
        z, r, c = heappop(pq)
        for cc, rr in nbrs(c, r):
            if done[rr, cc]:
                continue
            done[rr, cc] = True
            filled[rr, cc] = max(mean[rr, cc], z + 1e-3)
            down[(cc, rr)] = (c, r)      # 물은 먼저 처리된(더 낮은) 칸으로 흐른다
            heappush(pq, (filled[rr, cc], rr, cc))
    order = sorted(((filled[r, c], c, r) for r in range(rows) for c in range(cols) if not sea[r, c]), reverse=True)
    acc = np.ones((rows, cols))
    for _, c, r in order:
        d = down.get((c, r))
        if d:
            acc[d[1], d[0]] += acc[r, c]
    area = acc * (3 * math.sqrt(3) / 2) * SIZE ** 2   # km²

    big = (area >= BIG_RIVER_KM2) & ~sea
    mid = (area >= MID_RIVER_KM2) & ~big & ~sea
    terrain[mid] = '='
    # 큰 강: 하류부터 따라가며 FORD_EVERY칸마다 여울
    k = 0
    for _, c, r in sorted(((area[r, c], c, r) for r in range(rows) for c in range(cols) if big[r, c])):
        terrain[r, c] = '=' if k % FORD_EVERY == 0 else '~'
        k += 1

    # ── 역사 지점 ──
    sites_js = open(os.path.join(ROOT, 'src/data/sites.js'), encoding='utf8').read()
    body = sites_js[sites_js.index('['):sites_js.rindex(']') + 1]
    import re
    entries = re.findall(r"\{ name: '([^']+)', nation: (?:'([^']+)'|null), type: '([^']+)', lat: ([\d.]+), lon: ([\d.]+), confidence: '([^']+)'", body)
    placed = []
    for name, nation, typ, lat, lon, conf in entries:
        lat, lon = float(lat), float(lon)
        best = min(((c, r) for r in range(rows) for c in range(cols)),
                   key=lambda cr: (center(*cr)[0] - lon) ** 2 * (KM_LON / KM_LAT) ** 2 + (center(*cr)[1] - lat) ** 2)
        c, r = best
        if terrain[r, c] == 'S':  # 바다에 떨어지면 가장 가까운 육지로
            land = [(cc, rr) for cc, rr in nbrs(c, r) if terrain[rr, cc] != 'S']
            if land:
                c, r = land[0]
        if typ == 'port':
            terrain[r, c] = 'P'
        placed.append({'name': name, 'nation': nation or None, 'type': typ, 'col': int(c), 'row': int(r), 'confidence': conf})

    rows_out = [''.join(terrain[r]) for r in range(rows)]
    counts = {ch: int((terrain == ch).sum()) for ch in '.hmw~=SP'}
    out = os.path.join(ROOT, 'src/data/maps/fullmap.js')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf8') as f:
        f.write('// 자동 생성 파일 — 직접 고치지 말고 tools/mapgen.py 를 다시 실행하세요.\n')
        f.write(f'// 범위 경도 {LON0}~{LON1}, 위도 {LAT0}~{LAT1} · 헥스 가로 {HEX_KM}km · {cols}×{rows}칸\n')
        f.write(f'// 지형 칸 수: {json.dumps(counts, ensure_ascii=False)}\n')
        meta = {'lon0': LON0, 'lon1': LON1, 'lat0': LAT0, 'lat1': LAT1, 'hexKm': HEX_KM, 'kmLon': KM_LON, 'kmLat': KM_LAT}
        f.write('export default ' + json.dumps({'id': 'fullmap', 'meta': meta, 'sites': placed, 'rows': rows_out},
                                               ensure_ascii=False, indent=0) + ';\n')
    print(f'완료: {out}  ({cols}×{rows}) {counts}', file=sys.stderr)

    if preview:
        pal = {'.': (199, 211, 154), 'h': (184, 167, 116), 'm': (138, 123, 98), 'w': (134, 169, 156),
               '~': (60, 120, 200), '=': (120, 170, 215), 'S': (54, 100, 155), 'P': (230, 200, 120)}
        img = Image.new('RGB', (cols, rows))
        img.putdata([pal[ch] for row in rows_out for ch in row])
        os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
        img.resize((cols * 3, rows * 3), Image.NEAREST).save(os.path.join(ROOT, 'dist/fullmap_preview.png'))


if __name__ == '__main__':
    main()
