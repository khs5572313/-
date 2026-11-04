// 무장 DB (1차 샘플). 능력치·적성·특기는 게임 설계값이며 사료 수치가 아니다.
// born/died: 사서로 확정되는 경우만 기입, 불확실하면 null + note.
// historicity: '사서'(정사 기록) | '후대전승'(이름·일화가 후대 문헌) | '가상'
// aptitude: 병종 적성 S/A/B/C/D
export default {
  // ── 병종 실험실 전용 ─────────────────
  lab_std: { name: '표준 장수', hanja: '', nation: 'lab_a', born: null, died: null, historicity: '가상',
    note: '병종·지형만 비교하기 위한 기준 장수 (전 능력치 70, 적성 B, 특기 없음)',
    lead: 70, war: 70, int: 70, pol: 70, cha: 70,
    aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [] },

  // ── 당 ──────────────────────────────
  li_shimin: { name: '이세민', hanja: '李世民', nation: 'tang', born: 598, died: 649, historicity: '사서',
    note: '당 태종. 645년 고구려 친정', lead: 95, war: 80, int: 88, pol: 92, cha: 97,
    aptitude: { cavalry: 'S', spear: 'A', archer: 'A' }, skills: ['dolgyeok', 'jilpung'] },
  li_shiji: { name: '이세적', hanja: '李世勣', nation: 'tang', born: 594, died: 669, historicity: '사서',
    note: '645년 요동도 행군대총관, 668년 평양성 함락', lead: 93, war: 85, int: 85, pol: 70, cha: 80,
    aptitude: { cavalry: 'A', spear: 'S', archer: 'A' }, skills: ['jangchang'] },
  zhangsun_wuji: { name: '장손무기', hanja: '長孫無忌', nation: 'tang', born: null, died: 659, historicity: '사서',
    note: '645년 주필산 전투에서 우회 기동', lead: 78, war: 55, int: 90, pol: 92, cha: 78,
    aptitude: { cavalry: 'B', spear: 'B', archer: 'A' }, skills: [] },
  xue_rengui: { name: '설인귀', hanja: '薛仁貴', nation: 'tang', born: 614, died: 683, historicity: '사서',
    note: '645년 주필산 전투에서 두각', lead: 82, war: 96, int: 60, pol: 50, cha: 72,
    aptitude: { cavalry: 'S', spear: 'A', archer: 'S' }, skills: ['singung', 'dolgyeok'] },
  li_daozong: { name: '이도종', hanja: '李道宗', nation: 'tang', born: null, died: 653, historicity: '사서',
    note: '안시성 공략 때 토산 축조 지휘', lead: 80, war: 76, int: 74, pol: 70, cha: 75,
    aptitude: { cavalry: 'B', spear: 'A', archer: 'B' }, skills: [] },

  // ── 고구려 ───────────────────────────
  ansi_lord: { name: '안시성주', hanja: '安市城主', nation: 'goguryeo', born: null, died: null, historicity: '후대전승',
    note: '삼국사기는 성주 이름을 적지 않음. "양만춘"이라는 이름은 후대(조선) 문헌 전승',
    lead: 96, war: 75, int: 88, pol: 70, cha: 92,
    aptitude: { cavalry: 'B', spear: 'S', archer: 'S' }, skills: ['cheolbyeok', 'bulgul'] },
  go_yeonsu: { name: '고연수', hanja: '高延壽', nation: 'goguryeo', born: null, died: null, historicity: '사서',
    note: '645년 북부 욕살, 안시성 구원군 지휘 후 주필산에서 항복', lead: 78, war: 72, int: 55, pol: 60, cha: 65,
    aptitude: { cavalry: 'A', spear: 'B', archer: 'B' }, skills: ['gaema'] },
  go_hyejin: { name: '고혜진', hanja: '高惠眞', nation: 'goguryeo', born: null, died: null, historicity: '사서',
    note: '645년 남부 욕살, 고연수와 함께 구원군 지휘', lead: 75, war: 70, int: 65, pol: 60, cha: 62,
    aptitude: { cavalry: 'A', spear: 'A', archer: 'B' }, skills: [] },
  ansi_vice: { name: '안시성 부장', hanja: '', nation: 'goguryeo', born: null, died: null, historicity: '가상',
    note: '프로토타입용 가상 무장', lead: 68, war: 70, int: 60, pol: 50, cha: 60,
    aptitude: { cavalry: 'C', spear: 'B', archer: 'A' }, skills: ['gangno'] },
  yeon_gaesomun: { name: '연개소문', hanja: '淵蓋蘇文', nation: 'goguryeo', born: null, died: null, historicity: '사서',
    note: '642년 정변으로 집권. 사망 연도는 665년·666년 설이 갈림', lead: 95, war: 92, int: 85, pol: 80, cha: 85,
    aptitude: { cavalry: 'S', spear: 'A', archer: 'A' }, skills: ['gaema', 'gisa'] },
  eulji_mundeok: { name: '을지문덕', hanja: '乙支文德', nation: 'goguryeo', born: null, died: null, historicity: '사서',
    note: '612년 살수대첩', lead: 95, war: 80, int: 98, pol: 85, cha: 88,
    aptitude: { cavalry: 'A', spear: 'A', archer: 'A' }, skills: ['bulgul'] },

  // ── 신라 ────────────────────────────
  kim_yusin: { name: '김유신', hanja: '金庾信', nation: 'silla', born: 595, died: 673, historicity: '사서',
    note: '660년 황산벌 전투 신라군 지휘', lead: 96, war: 90, int: 88, pol: 80, cha: 90,
    aptitude: { cavalry: 'S', spear: 'S', archer: 'A' }, skills: ['hwarang', 'dolgyeok'] },
  kim_chunchu: { name: '김춘추', hanja: '金春秋', nation: 'silla', born: 603, died: 661, historicity: '사서',
    note: '태종 무열왕. 나당동맹 외교', lead: 70, war: 50, int: 92, pol: 96, cha: 95,
    aptitude: { cavalry: 'C', spear: 'B', archer: 'B' }, skills: [] },
  gwanchang: { name: '관창', hanja: '官昌', nation: 'silla', born: 645, died: 660, historicity: '사서',
    note: '황산벌 전투에서 16세로 전사한 화랑', lead: 55, war: 75, int: 40, pol: 30, cha: 80,
    aptitude: { cavalry: 'A', spear: 'B', archer: 'C' }, skills: ['hwarang'] },

  // ── 백제 ────────────────────────────
  gyebaek: { name: '계백', hanja: '階伯', nation: 'baekje', born: null, died: 660, historicity: '사서',
    note: '660년 황산벌 전투 결사대 5천', lead: 92, war: 93, int: 75, pol: 60, cha: 88,
    aptitude: { cavalry: 'A', spear: 'S', archer: 'A' }, skills: ['bulgul', 'gyeolsa'] },
  uija: { name: '의자왕', hanja: '義慈王', nation: 'baekje', born: null, died: 660, historicity: '사서',
    note: '백제 마지막 왕. 660년 당으로 끌려가 사망', lead: 75, war: 70, int: 80, pol: 82, cha: 78,
    aptitude: { cavalry: 'B', spear: 'B', archer: 'B' }, skills: [] },
  seongchung: { name: '성충', hanja: '成忠', nation: 'baekje', born: null, died: 656, historicity: '사서',
    note: '좌평. 656년 옥사', lead: 60, war: 40, int: 92, pol: 90, cha: 85,
    aptitude: { cavalry: 'C', spear: 'C', archer: 'B' }, skills: [] },
  heukchi_sangji: { name: '흑치상지', hanja: '黑齒常之', nation: 'baekje', born: 630, died: 689, historicity: '사서',
    note: '백제 부흥군 → 이후 당 장수', lead: 88, war: 90, int: 75, pol: 60, cha: 82,
    aptitude: { cavalry: 'S', spear: 'A', archer: 'A' }, skills: ['jilpung'] },
};
