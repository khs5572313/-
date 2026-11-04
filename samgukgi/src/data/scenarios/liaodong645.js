// M1 수직 슬라이스: 645년 요동 전역 (안시성 포위 직전)
// 지형·성 위치는 '개략 배치'다. 실측 고도 데이터 기반 지도는 M2에서 만든다.
// 문자: . 평지 / h 구릉 / m 산악 / f 숲 / w 습지(요택) / ~ 강(요하, 배 없이 도하 불가) / = 여울·나루 / S 바다(발해만)
// 서쪽(왼쪽)이 요하·요택, 동쪽(오른쪽)이 천산산맥 방향, 아래쪽이 남쪽.
export default {
  id: 'liaodong645',
  title: '645 요동 전역 — 안시성',
  year: 645,
  desc: '당 태종이 개모성·요동성·백암성을 함락하고 안시성으로 향한다. 고연수·고혜진의 구원군이 다가온다.',
  rows: [
    '...www~....hhhmmmmmmmm',
    '...www=.....hhmmmmmmmm',
    '..www~~......hhmmmmmmm',
    '..www~.......hhhmmmmmm',
    '..www~........hhmmmmmm',
    '..www~.....f..hhmmmmmm',
    '..ww~~....ff..hhhmmmmm',
    '..ww~.....f....hhmmmmm',
    '..ww=..........hhmmmmm',
    '.www~.........hhhmmmmm',
    'SSww~.......hhhmmmmmmm',
    'SSSS~~.....hhhmmmmmmmm',
    'SSSSSS~....hhmmmmmmmmm',
    'SSSSSSS....hhmmmmmmmmm',
    'SSSSSSSS...hhhmmmmmmmm',
    'SSSSSSSSS...hhmmmmmmmm',
  ],
  // 영토: 요하 서쪽은 당, 동쪽은 고구려 (성은 아래에서 개별 지정)
  territory: [
    { nation: 'tang', minCol: 0, maxCol: 4 },
    { nation: 'goguryeo', minCol: 5, maxCol: 99 },
  ],
  castles: [
    { name: '신성', col: 12, row: 1, owner: 'goguryeo' },
    { name: '개모성', col: 8, row: 3, owner: 'tang' },
    { name: '요동성', col: 9, row: 6, owner: 'tang' },
    { name: '백암성', col: 13, row: 6, owner: 'tang' },
    { name: '안시성', col: 10, row: 10, owner: 'goguryeo', wall: 175 },
    { name: '건안성', col: 10, row: 13, owner: 'goguryeo' },
  ],
  sides: ['tang', 'goguryeo'],
  units: [
    // 당군: 요동성·개모성 일대에서 남하 (안시성까지 5~7칸)
    { general: 'li_shimin',     nation: 'tang', type: 'cavalry', troops: 6000, col: 9,  row: 5 },
    { general: 'li_shiji',      nation: 'tang', type: 'spear',   troops: 6000, col: 10, row: 5 },
    { general: 'zhangsun_wuji', nation: 'tang', type: 'archer',  troops: 5000, col: 9,  row: 4 },
    { general: 'xue_rengui',    nation: 'tang', type: 'cavalry', troops: 5000, col: 12, row: 5 },
    { general: 'li_daozong',    nation: 'tang', type: 'spear',   troops: 6000, col: 8,  row: 4 },
    // 포차·충차 부대 (당군은 요동성 공략에 포차를 썼다)
    { general: null,            nation: 'tang', type: 'siege',   troops: 3000, col: 10, row: 4 },

    // 고구려: 안시성 수비대(농성) + 동쪽 구릉의 구원군
    { general: 'ansi_lord',  nation: 'goguryeo', type: 'spear',   troops: 6000, col: 10, row: 10, hold: true },
    { general: 'ansi_vice',  nation: 'goguryeo', type: 'archer',  troops: 4000, col: 12, row: 11 },
    { general: 'go_yeonsu',  nation: 'goguryeo', type: 'cavalry', troops: 6000, col: 15, row: 8 },
    { general: 'go_hyejin',  nation: 'goguryeo', type: 'spear',   troops: 6000, col: 13, row: 10 },
  ],
  victory: [
    { nation: 'tang', type: 'capture', castle: '안시성' },
    { nation: 'goguryeo', type: 'survive', turns: 20 }, // 성벽 175와 함께 AI 대 AI 당 승률 ≈ 50% (tools/balance.js)
  ],
};
