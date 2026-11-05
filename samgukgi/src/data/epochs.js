// 시나리오 시점별 세력 배치 (1차안).
// owners: sites.js 의 지점 이름 → 그 시점의 주인. 적지 않은 지점은 base(581) 값을 따른다.
// seeds : 지점 목록에 없는 지역의 세력 중심 (위경도). 국경 계산의 씨앗으로만 쓴다.
// 국경은 src/territory.js 가 각 성·씨앗에서 '실제 행군 거리'로 퍼져 만나는 선으로 자동 계산한다.
// certainty: 각 시점 배치의 근거 수준. 'low' 표시가 붙은 항목은 고증 후 반드시 수정.

const BASE_581 = {
  // 고구려: 요동~평양~국내성~책성
  평양성: 'goguryeo', 국내성: 'goguryeo', 요동성: 'goguryeo', 안시성: 'goguryeo', 백암성: 'goguryeo',
  신성: 'goguryeo', 건안성: 'goguryeo', 비사성: 'goguryeo', 오골성: 'goguryeo', 개모성: 'goguryeo', 책성: 'goguryeo',
  // 백제: 사비 천도(538) 이후 충청·전라
  사비성: 'baekje', 웅진성: 'baekje', 임존성: 'baekje', 가림성: 'baekje',
  // 신라: 553년 한강 하류 장악, 562년 대가야 병합 이후
  금성: 'silla', 대야성: 'silla', 삼년산성: 'silla', 관산성: 'silla', 한산주: 'silla', 당항성: 'silla', 칠중성: 'silla',
  // 중국 왕조: 요서 영주, 산둥 항구
  영주: 'sui', 등주: 'sui', 내주: 'sui',
  // 왜: 북규슈·쓰시마
  나노쓰: 'wa', 쓰시마: 'wa',
  동모산: 'mohe',
};

const SEEDS_COMMON = [
  { name: '하슬라(강릉)', lat: 37.75, lon: 128.90, nation: 'silla' },
  { name: '국원(충주)', lat: 36.97, lon: 127.93, nation: 'silla' },
  { name: '금관(김해)', lat: 35.23, lon: 128.88, nation: 'silla' },
  { name: '대가야(고령)', lat: 35.73, lon: 128.26, nation: 'silla' },
  { name: '다자이후', lat: 33.52, lon: 130.53, nation: 'wa' },
  { name: '거란 근거지', lat: 42.30, lon: 119.50, nation: 'khitan' },
  { name: '속말말갈', lat: 43.80, lon: 126.50, nation: 'mohe' },
];
const SEEDS_BAEKJE_SOUTH = [
  { name: '무진주(광주)', lat: 35.15, lon: 126.85, nation: 'baekje' },
  { name: '남원', lat: 35.40, lon: 127.39, nation: 'baekje' },
];
const SEEDS_GOGURYEO_SOUTH = [{ name: '한성(재령)', lat: 38.40, lon: 125.60, nation: 'goguryeo' }];
const SEEDS_SHANDONG = (n) => [{ name: '제남', lat: 36.65, lon: 117.05, nation: n }];

export default [
  {
    id: 's581', year: 581, title: '581 · 수의 등장',
    note: '수 건국. 신라는 한강 유역과 가야 땅까지 차지했고, 고구려는 요동과 한반도 북부, 백제는 충청·전라를 지킨다.',
    owners: { ...BASE_581 },
    seeds: [...SEEDS_COMMON, ...SEEDS_BAEKJE_SOUTH, ...SEEDS_GOGURYEO_SOUTH, ...SEEDS_SHANDONG('sui')],
    certainty: '삼국 구도는 확실. 한강 하류 신라 지배(553~)는 확실, 동해안 북쪽 신라 경계는 추정.',
  },
  {
    id: 's612', year: 612, title: '612 · 살수',
    note: '수 양제의 2차 침공. 국경은 581년과 거의 같다.',
    owners: { ...BASE_581 },
    seeds: [...SEEDS_COMMON, ...SEEDS_BAEKJE_SOUTH, ...SEEDS_GOGURYEO_SOUTH, ...SEEDS_SHANDONG('sui')],
    certainty: '581년 배치 유지. 요서 무려라 등 요하 서쪽 고구려 거점은 아직 넣지 않음.',
  },
  {
    id: 's645', year: 645, title: '645 · 안시성',
    note: '당 태종 친정. 642년 백제가 대야성을 빼앗아 신라 서부가 위태롭다.',
    owners: { ...BASE_581, 영주: 'tang', 등주: 'tang', 내주: 'tang', 대야성: 'baekje' },
    seeds: [...SEEDS_COMMON, ...SEEDS_BAEKJE_SOUTH, ...SEEDS_GOGURYEO_SOUTH, ...SEEDS_SHANDONG('tang')],
    certainty: '대야성 함락(642) 확실.',
  },
  {
    id: 's660', year: 660, title: '660 · 황산벌',
    note: '나당연합군의 백제 공격 직전. 645년 당군이 빼앗았던 요동 성들은 철군 뒤 고구려가 되찾았다.',
    owners: { ...BASE_581, 영주: 'tang', 등주: 'tang', 내주: 'tang', 대야성: 'baekje' },
    seeds: [...SEEDS_COMMON, ...SEEDS_BAEKJE_SOUTH, ...SEEDS_GOGURYEO_SOUTH, ...SEEDS_SHANDONG('tang')],
    certainty: '요동 성의 고구려 재점유는 유력. 대야성의 백제 지배는 660년까지 확실.',
  },
  {
    id: 's670', year: 670, title: '670 · 나당전쟁',
    note: '백제(660)와 고구려(668)가 무너지고, 당은 평양에 안동도호부, 웅진에 도독부를 두었다. 신라와 고구려 부흥군이 당에 맞선다.',
    owners: {
      ...BASE_581, 영주: 'tang', 등주: 'tang', 내주: 'tang',
      평양성: 'tang', 요동성: 'tang', 안시성: 'tang', 백암성: 'tang', 신성: 'tang', 건안성: 'tang',
      비사성: 'tang', 오골성: 'tang', 개모성: 'tang', 국내성: 'tang', 책성: 'tang',
      사비성: 'tang', 웅진성: 'tang', 임존성: 'tang', 가림성: 'tang',
    },
    seeds: [...SEEDS_COMMON, { name: '고구려 부흥군(한성)', lat: 38.40, lon: 125.60, nation: 'goguryeo' },
      { name: '무진주(광주)', lat: 35.15, lon: 126.85, nation: 'tang' }, ...SEEDS_SHANDONG('tang')],
    certainty: '안동도호부(평양)·웅진도독부는 확실. 국내성·책성의 당 지배 실효성과 부흥군 범위는 추정(low).',
  },
  {
    id: 's696', year: 696, title: '696 · 동모산으로',
    note: '나당전쟁(676) 이후 신라가 대동강 남쪽까지 차지했다. 당은 안동도호부를 요동으로 물렸고, 696년 거란 이진충이 영주를 점령해 혼란이 시작된다.',
    owners: {
      ...BASE_581, 영주: 'khitan', 등주: 'tang', 내주: 'tang',
      평양성: null, 요동성: 'tang', 안시성: 'tang', 백암성: 'tang', 신성: 'tang', 건안성: 'tang',
      비사성: 'tang', 오골성: 'tang', 개모성: 'tang', 국내성: null, 책성: 'mohe',
      사비성: 'silla', 웅진성: 'silla', 임존성: 'silla', 가림성: 'silla', 대야성: 'silla',
    },
    seeds: [...SEEDS_COMMON, { name: '무진주(광주)', lat: 35.15, lon: 126.85, nation: 'silla' },
      { name: '한주 북부(평산)', lat: 38.33, lon: 126.40, nation: 'silla' }, ...SEEDS_SHANDONG('tang')],
    certainty: '영주 함락(696) 확실. 신라 북계(대동강~원산만 부근)는 추정이며, 평양·국내성 일대는 실효 지배 세력이 불분명해 미지배로 둠.',
  },
];
