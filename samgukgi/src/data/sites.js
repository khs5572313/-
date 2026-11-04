// 역사 지점 (전체 지도용). 좌표는 위도·경도이며, 지도 생성기(tools/mapgen.py)가 헥스 좌표로 바꾼다.
// confidence: high = 위치가 확실함(도성·현재 지명과 일치)
//             mid  = 학계 다수설·유력설에 따른 추정
//             low  = 여러 설이 갈리는 추정. 반드시 고증 후 수정
// 좌표는 ±10km 수준의 개략치다(헥스 1칸 ≈ 6km). 게임 배치 전에 고증이 필요하다.
export default [
  // ── 고구려 ─────────────────────────
  { name: '평양성', nation: 'goguryeo', type: 'capital', lat: 39.02, lon: 125.75, confidence: 'high', note: '586년 장안성 천도 이후 도성' },
  { name: '국내성', nation: 'goguryeo', type: 'castle', lat: 41.13, lon: 126.19, confidence: 'high', note: '중국 지린성 지안' },
  { name: '요동성', nation: 'goguryeo', type: 'castle', lat: 41.27, lon: 123.17, confidence: 'high', note: '랴오양' },
  { name: '안시성', nation: 'goguryeo', type: 'castle', lat: 40.83, lon: 122.80, confidence: 'mid', note: '하이청 영성자산성 설' },
  { name: '백암성', nation: 'goguryeo', type: 'castle', lat: 41.17, lon: 123.42, confidence: 'mid', note: '덩타 연주성 설' },
  { name: '신성', nation: 'goguryeo', type: 'castle', lat: 41.89, lon: 123.88, confidence: 'mid', note: '푸순 고이산성 설' },
  { name: '건안성', nation: 'goguryeo', type: 'castle', lat: 40.37, lon: 122.48, confidence: 'mid', note: '가이저우 고려성자산성 설' },
  { name: '비사성', nation: 'goguryeo', type: 'castle', lat: 39.10, lon: 121.95, confidence: 'mid', note: '다롄 대흑산산성 설' },
  { name: '오골성', nation: 'goguryeo', type: 'castle', lat: 40.45, lon: 124.10, confidence: 'mid', note: '펑청 봉황산성 설' },
  { name: '개모성', nation: 'goguryeo', type: 'castle', lat: 41.73, lon: 123.27, confidence: 'low', note: '선양 부근, 위치 논쟁' },
  { name: '책성', nation: 'goguryeo', type: 'castle', lat: 42.87, lon: 130.36, confidence: 'mid', note: '훈춘 일대' },
  // ── 백제 ───────────────────────────
  { name: '사비성', nation: 'baekje', type: 'capital', lat: 36.28, lon: 126.91, confidence: 'high', note: '부여. 538년 천도' },
  { name: '웅진성', nation: 'baekje', type: 'castle', lat: 36.46, lon: 127.12, confidence: 'high', note: '공주 공산성' },
  { name: '임존성', nation: 'baekje', type: 'castle', lat: 36.56, lon: 126.75, confidence: 'mid', note: '예산 봉수산성 설. 백제 부흥군 거점' },
  { name: '가림성', nation: 'baekje', type: 'castle', lat: 36.21, lon: 126.85, confidence: 'mid', note: '부여 성흥산성' },
  // ── 신라 ───────────────────────────
  { name: '금성', nation: 'silla', type: 'capital', lat: 35.83, lon: 129.22, confidence: 'high', note: '경주' },
  { name: '대야성', nation: 'silla', type: 'castle', lat: 35.57, lon: 128.17, confidence: 'mid', note: '합천. 642년 백제에 함락' },
  { name: '삼년산성', nation: 'silla', type: 'castle', lat: 36.49, lon: 127.72, confidence: 'high', note: '보은' },
  { name: '관산성', nation: 'silla', type: 'castle', lat: 36.30, lon: 127.58, confidence: 'mid', note: '옥천. 554년 성왕 전사' },
  { name: '한산주', nation: 'silla', type: 'castle', lat: 37.52, lon: 127.18, confidence: 'mid', note: '하남 이성산성 설' },
  { name: '당항성', nation: 'silla', type: 'port', lat: 37.19, lon: 126.71, confidence: 'mid', note: '화성. 신라의 대중국 항구' },
  { name: '칠중성', nation: 'silla', type: 'castle', lat: 37.95, lon: 126.93, confidence: 'mid', note: '파주 적성' },
  { name: '매소성', nation: 'silla', type: 'battle', lat: 38.08, lon: 127.07, confidence: 'low', note: '연천 대전리산성 설. 675년 나당전쟁' },
  // ── 수·당 ──────────────────────────
  { name: '영주', nation: 'tang', type: 'castle', lat: 41.57, lon: 120.45, confidence: 'high', note: '차오양. 대고구려전 전진기지' },
  { name: '등주', nation: 'tang', type: 'port', lat: 37.81, lon: 120.75, confidence: 'high', note: '펑라이. 산둥 수군 출항지' },
  { name: '내주', nation: 'tang', type: 'port', lat: 37.18, lon: 119.94, confidence: 'high', note: '라이저우' },
  { name: '덕물도', nation: null, type: 'port', lat: 37.23, lon: 126.13, confidence: 'high', note: '덕적도. 660년 당군 기착지' },
  { name: '기벌포', nation: null, type: 'battle', lat: 36.00, lon: 126.69, confidence: 'mid', note: '금강 하구. 660년 당군 상륙, 676년 해전' },
  // ── 왜 ─────────────────────────────
  { name: '나노쓰', nation: 'wa', type: 'port', lat: 33.59, lon: 130.40, confidence: 'high', note: '하카타. 백강 전투 출병지' },
  { name: '쓰시마', nation: 'wa', type: 'port', lat: 34.40, lon: 129.33, confidence: 'high', note: '대한해협 중계지' },
  // ── 기타 ───────────────────────────
  { name: '살수', nation: null, type: 'battle', lat: 39.62, lon: 125.66, confidence: 'mid', note: '청천강 하류 안주 일대. 612년 살수대첩' },
  { name: '황산벌', nation: null, type: 'battle', lat: 36.21, lon: 127.18, confidence: 'mid', note: '논산 연산. 660년' },
  { name: '동모산', nation: 'balhae', type: 'capital', lat: 43.37, lon: 128.20, confidence: 'mid', note: '둔화 성산자산성 설. 698년 발해 건국' },
];
