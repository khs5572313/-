/* 인물 데이터
 * s: [통솔, 무력, 지력, 정치]   b: 출생(추정)  d: 사망(추정, 역사 수명 옵션)
 * role: king/queen/general/scholar/monk/lady/hwarang/legend   u: 선호 병종
 * src: 출전 (사기=삼국사기, 유사=삼국유사, 수서/구당서/신당서, 서기=일본서기, 야사=후대 전승)
 * legend: true → 설화·야사 인물(이름·행적이 정사로 확인되지 않음) */
(function () {
  const L = [];
  const O = (id, name, hanja, nation, s, o) => L.push(Object.assign({ id, name, hanja, nation, s }, o));
  /* ─── 고구려 ─── */
  O('yeongyang', '영양왕', '嬰陽王', 'goguryeo', [72, 60, 80, 82], { role: 'king', u: 'cav', b: 565, d: 618, sp: 'taewang', loyal: 100, src: '사기' });
  O('geonmu', '고건무', '高建武', 'goguryeo', [80, 82, 70, 72], { role: 'king', u: 'gaema', b: 581, d: 642, sp: 'gyeolsa500', loyal: 100, src: '사기·수서', note: '영양왕의 이복동생, 618년 즉위한 영류왕.' });
  O('euljimundeok', '을지문덕', '乙支文德', 'goguryeo', [94, 80, 98, 82], { role: 'general', u: 'cav', b: 560, d: 630, sp: 'salsu', loyal: 95, src: '사기·수서' });
  O('gangisik', '강이식', '姜以式', 'goguryeo', [88, 85, 74, 60], { role: 'general', u: 'gaema', b: 555, d: 625, sp: 'imyu', loyal: 92, src: '야사', legend: true, note: '598년 임유관 전투의 병마원수로 전하나 정사에는 기록이 없다.' });
  O('yeongaesomun', '연개소문', '淵蓋蘇文', 'goguryeo', [93, 92, 84, 76], { role: 'general', u: 'gaema', b: 603, d: 665, sp: 'odo', loyal: 90, src: '사기·신당서·서기', ambition: true });
  O('yangmanchun', '양만춘', '楊萬春', 'goguryeo', [92, 82, 90, 84], { role: 'general', u: 'bow', b: 600, d: 670, sp: 'ansi', loyal: 98, src: '야사', legend: true, note: '안시성주는 정사에 이름이 없고, 양만춘은 조선 후기 문헌(송준길·열하일기)의 전승.' });
  O('bojang', '보장왕', '寶臧王', 'goguryeo', [55, 40, 70, 72], { role: 'king', u: 'spear', b: 615, d: 682, sp: 'dogyo', loyal: 100, src: '사기' });
  O('namsaeng', '연남생', '淵男生', 'goguryeo', [78, 72, 70, 66], { role: 'general', u: 'cav', b: 634, d: 679, sp: 'nyeonbong', loyal: 50, src: '사기·천남생묘지' });
  O('namgeon', '연남건', '淵男建', 'goguryeo', [80, 82, 62, 55], { role: 'general', u: 'spear', b: 638, d: 690, sp: 'pyongyang', loyal: 85, src: '사기' });
  O('namsan', '연남산', '淵男産', 'goguryeo', [60, 58, 65, 62], { role: 'scholar', u: 'spear', b: 639, d: 701, sp: 'sanseong', loyal: 60, src: '사기' });
  O('jeongto', '연정토', '淵淨土', 'goguryeo', [74, 72, 66, 64], { role: 'general', u: 'spear', b: 610, d: 680, sp: 'sanseong', loyal: 55, src: '사기', note: '666년 12성을 들어 신라에 투항.' });
  O('goyeonsu', '고연수', '高延壽', 'goguryeo', [76, 78, 55, 50], { role: 'general', u: 'mohecav', b: 600, d: 645, sp: 'mohe', loyal: 60, src: '사기·구당서' });
  O('gohyejin', '고혜진', '高惠眞', 'goguryeo', [72, 74, 58, 52], { role: 'general', u: 'bow', b: 602, d: 670, sp: 'maekgung', loyal: 55, src: '사기·구당서' });
  O('gojeongui', '고정의', '高正義', 'goguryeo', [60, 45, 88, 70], { role: 'scholar', u: 'spear', b: 580, d: 650, sp: 'jigujeon', loyal: 90, src: '사기·구당서' });
  O('geommojam', '검모잠', '劍牟岑', 'goguryeo', [80, 78, 72, 64], { role: 'general', u: 'spear', b: 620, d: 670, sp: 'buheung', loyal: 95, src: '사기' });
  O('anseung', '안승', '安勝', 'goguryeo', [62, 55, 64, 70], { role: 'king', u: 'spear', b: 640, d: 700, sp: 'bodeok', loyal: 80, src: '사기' });
  O('goyeonmu', '고연무', '高延武', 'goguryeo', [78, 80, 62, 58], { role: 'general', u: 'cav', b: 630, d: 690, sp: 'amnok', loyal: 92, src: '사기' });
  O('damjing', '담징', '曇徵', 'goguryeo', [20, 25, 90, 88], { role: 'monk', u: 'spear', b: 579, d: 631, sp: 'byeokhwa', loyal: 90, src: '서기' });
  O('hyeja', '혜자', '慧慈', 'goguryeo', [22, 20, 92, 85], { role: 'monk', u: 'spear', b: 560, d: 623, sp: 'hyeja', loyal: 90, src: '서기' });
  O('daejoyeong', '대조영', '大祚榮', 'goguryeo', [86, 88, 80, 78], { role: 'general', u: 'cav', b: 648, d: 719, sp: 'cheonmun', loyal: 85, src: '구당서·신당서', note: '698년 발해 건국. 본 시대에는 젊은 장수로 등장.' });

  /* ─── 백제 ─── */
  O('muwang', '무왕', '武王', 'baekje', [80, 78, 82, 85], { role: 'king', u: 'spear', b: 580, d: 641, sp: 'seodong', loyal: 100, src: '사기·유사', note: '이름 부여장(扶餘璋). 어릴 적 마를 캐던 서동이라는 설화가 있다.' });
  O('seonhwa', '선화공주', '善花公主', 'baekje', [30, 15, 82, 88], { role: 'lady', u: 'spear', b: 585, d: 640, sp: 'seonhwa', loyal: 100, female: true, src: '유사', legend: true, note: '진평왕의 셋째 딸이라는 삼국유사 설화. 2009년 미륵사지 사리봉안기에는 왕후가 사택적덕의 딸로 나온다.' });
  O('sataekjeokdeok', '사택적덕', '沙乇積德', 'baekje', [45, 30, 78, 86], { role: 'scholar', u: 'spear', b: 570, d: 640, sp: 'sataek', loyal: 90, src: '미륵사지 사리봉안기' });
  O('haesu', '해수', '解讎', 'baekje', [76, 74, 60, 58], { role: 'general', u: 'cav', b: 565, d: 625, sp: 'haesu', loyal: 88, src: '사기' });
  O('uija', '의자왕', '義慈王', 'baekje', [84, 82, 80, 72], { role: 'king', u: 'gangung', b: 599, d: 660, sp: 'haedong', loyal: 100, src: '사기' });
  O('gyebaek', '계백', '階伯', 'baekje', [90, 93, 72, 58], { role: 'general', u: 'gyeolsa', b: 610, d: 660, sp: 'gyebaek', loyal: 100, src: '사기' });
  O('seongchung', '성충', '成忠', 'baekje', [70, 50, 92, 88], { role: 'scholar', u: 'spear', b: 605, d: 656, sp: 'seongchung', loyal: 100, src: '사기' });
  O('heungsu', '흥수', '興首', 'baekje', [55, 40, 90, 84], { role: 'scholar', u: 'spear', b: 600, d: 661, sp: 'heungsu', loyal: 95, src: '사기' });
  O('yunchung', '윤충', '允忠', 'baekje', [86, 84, 76, 62], { role: 'general', u: 'spear', b: 600, d: 655, sp: 'yunchung', loyal: 90, src: '사기' });
  O('uijik', '의직', '義直', 'baekje', [80, 82, 65, 55], { role: 'general', u: 'cav', b: 605, d: 660, sp: 'uijik', loyal: 88, src: '사기' });
  O('heukchi', '흑치상지', '黑齒常之', 'baekje', [91, 92, 78, 70], { role: 'general', u: 'gangung', b: 630, d: 689, sp: 'heukchi', loyal: 70, src: '사기·구당서·흑치상지묘지' });
  O('boksin', '귀실복신', '鬼室福信', 'baekje', [86, 80, 84, 68], { role: 'general', u: 'spear', b: 610, d: 663, sp: 'boksin', loyal: 85, src: '사기·서기', ambition: true });
  O('docheom', '도침', '道琛', 'baekje', [60, 50, 82, 66], { role: 'monk', u: 'spear', b: 615, d: 661, sp: 'docheom', loyal: 85, src: '사기' });
  O('buyeopung', '부여풍', '扶餘豊', 'baekje', [62, 58, 70, 64], { role: 'king', u: 'spear', b: 620, d: 690, sp: 'waegun', loyal: 95, src: '사기·서기' });
  O('buyeoyung', '부여융', '扶餘隆', 'baekje', [64, 60, 72, 74], { role: 'king', u: 'spear', b: 615, d: 682, sp: 'yung', loyal: 60, src: '사기·부여융묘지' });
  O('sataekjijeok', '사택지적', '砂宅智積', 'baekje', [50, 32, 84, 90], { role: 'scholar', u: 'spear', b: 590, d: 655, sp: 'jijeok', loyal: 90, src: '사택지적비·서기' });
  O('chungsang', '충상', '忠常', 'baekje', [72, 70, 64, 60], { role: 'general', u: 'spear', b: 615, d: 670, sp: 'sangyeong', loyal: 60, src: '사기' });
  O('sangyeong', '상영', '常永', 'baekje', [70, 68, 62, 58], { role: 'general', u: 'bow', b: 615, d: 670, sp: 'sangyeong', loyal: 60, src: '사기' });
  O('jisusin', '지수신', '遲受信', 'baekje', [82, 84, 64, 55], { role: 'general', u: 'spear', b: 620, d: 670, sp: 'susin', loyal: 100, src: '사기' });
  O('satasangyeo', '사타상여', '沙吒相如', 'baekje', [78, 82, 60, 55], { role: 'general', u: 'cav', b: 625, d: 690, sp: 'uijik', loyal: 60, src: '사기' });

  /* ─── 신라 ─── */
  O('jinpyeong', '진평왕', '眞平王', 'silla', [70, 68, 72, 82], { role: 'king', u: 'spear', b: 565, d: 632, sp: 'okdae', loyal: 100, src: '사기·유사' });
  O('seondeok', '선덕여왕', '善德女王', 'silla', [72, 30, 96, 88], { role: 'queen', u: 'spear', b: 595, d: 647, sp: 'jigi', loyal: 100, female: true, src: '사기·유사' });
  O('jindeok', '진덕여왕', '眞德女王', 'silla', [60, 30, 82, 86], { role: 'queen', u: 'spear', b: 600, d: 654, sp: 'taepyeong', loyal: 100, female: true, src: '사기' });
  O('kimchunchu', '김춘추', '金春秋', 'silla', [76, 55, 94, 95], { role: 'king', u: 'spear', b: 603, d: 661, sp: 'chunchu', loyal: 100, src: '사기', note: '654년 즉위한 태종 무열왕.' });
  O('kimyusin', '김유신', '金庾信', 'silla', [97, 92, 90, 80], { role: 'general', u: 'hwarang', b: 595, d: 673, sp: 'yusin', loyal: 100, src: '사기 열전' });
  O('munmu', '김법민', '金法敏', 'silla', [86, 78, 84, 86], { role: 'king', u: 'spear', b: 626, d: 681, sp: 'munmu', loyal: 100, src: '사기·유사', note: '661년 즉위한 문무왕.' });
  O('kiminmun', '김인문', '金仁問', 'silla', [70, 65, 88, 84], { role: 'scholar', u: 'spear', b: 629, d: 694, sp: 'inmun', loyal: 95, src: '사기' });
  O('kimheumsun', '김흠순', '金欽純', 'silla', [82, 80, 66, 64], { role: 'general', u: 'cav', b: 599, d: 680, sp: 'heumsun', loyal: 98, src: '사기' });
  O('bangul', '반굴', '盤屈', 'silla', [60, 78, 50, 40], { role: 'hwarang', u: 'hwarang', b: 638, d: 660, sp: 'bangul', loyal: 100, src: '사기' });
  O('gwanchang', '관창', '官昌', 'silla', [55, 76, 48, 40], { role: 'hwarang', u: 'hwarang', b: 645, d: 660, sp: 'gwanchang', loyal: 100, src: '사기 열전' });
  O('pumil', '김품일', '金品日', 'silla', [78, 74, 64, 60], { role: 'general', u: 'spear', b: 610, d: 670, sp: 'pumil', loyal: 98, src: '사기' });
  O('pumseok', '김품석', '金品釋', 'silla', [55, 58, 50, 52], { role: 'general', u: 'spear', b: 615, d: 642, sp: 'pumseok', loyal: 80, src: '사기' });
  O('gotaso', '고타소', '古陀炤', 'silla', [20, 15, 60, 62], { role: 'lady', u: 'spear', b: 620, d: 642, sp: 'munhui', loyal: 100, female: true, src: '사기' });
  O('jukjuk', '죽죽', '竹竹', 'silla', [58, 74, 52, 46], { role: 'general', u: 'spear', b: 615, d: 642, sp: 'jukjuk', loyal: 100, src: '사기 열전' });
  O('bidam', '비담', '毗曇', 'silla', [78, 76, 70, 62], { role: 'general', u: 'cav', b: 600, d: 647, sp: 'bidam', loyal: 35, src: '사기', ambition: true });
  O('alcheon', '알천', '閼川', 'silla', [80, 85, 70, 74], { role: 'general', u: 'cav', b: 590, d: 660, sp: 'alcheon', loyal: 98, src: '사기·유사' });
  O('kimseohyeon', '김서현', '金舒玄', 'silla', [74, 70, 68, 70], { role: 'general', u: 'spear', b: 570, d: 640, sp: 'seohyeon', loyal: 95, src: '사기' });
  O('kimyongchun', '김용춘', '金龍春', 'silla', [72, 64, 74, 76], { role: 'scholar', u: 'spear', b: 578, d: 647, sp: 'yongchun', loyal: 95, src: '사기' });
  O('munhui', '문희', '文姬', 'silla', [20, 10, 78, 80], { role: 'lady', u: 'spear', b: 605, d: 681, sp: 'munhui', loyal: 100, female: true, src: '사기·유사' });
  O('wonhyo', '원효', '元曉', 'silla', [25, 30, 97, 90], { role: 'monk', u: 'spear', b: 617, d: 686, sp: 'wonhyo', loyal: 90, src: '유사·송고승전' });
  O('uisang', '의상', '義湘', 'silla', [20, 22, 94, 88], { role: 'monk', u: 'spear', b: 625, d: 702, sp: 'uisang', loyal: 95, src: '유사' });
  O('jajang', '자장', '慈藏', 'silla', [25, 25, 92, 88], { role: 'monk', u: 'spear', b: 590, d: 658, sp: 'jajang', loyal: 95, src: '유사·속고승전' });
  O('wongwang', '원광', '圓光', 'silla', [30, 25, 93, 86], { role: 'monk', u: 'spear', b: 555, d: 638, sp: 'wongwang', loyal: 95, src: '사기·유사' });
  O('gwisan', '귀산', '貴山', 'silla', [62, 76, 56, 44], { role: 'hwarang', u: 'hwarang', b: 580, d: 602, sp: 'gwisan', loyal: 100, src: '사기 열전' });
  O('chuhang', '추항', '箒項', 'silla', [58, 74, 54, 44], { role: 'hwarang', u: 'spear', b: 580, d: 602, sp: 'chuhang', loyal: 100, src: '사기 열전' });
  O('wonsul', '원술', '元述', 'silla', [74, 80, 62, 55], { role: 'hwarang', u: 'hwarang', b: 650, d: 710, sp: 'wonsul', loyal: 95, src: '사기 열전' });
  O('sideuk', '시득', '施得', 'silla', [80, 72, 66, 58], { role: 'general', u: 'navy', b: 630, d: 690, sp: 'sideuk', loyal: 98, src: '사기' });
  O('bihyeong', '비형랑', '鼻荊郞', 'silla', [40, 60, 90, 60], { role: 'legend', u: 'spear', b: 580, d: 640, sp: 'bihyeong', loyal: 85, src: '유사', legend: true, note: '진지왕의 혼령과 도화녀 사이에서 났다는 설화의 인물.' });
  O('jigwi', '지귀', '志鬼', 'silla', [10, 20, 40, 30], { role: 'legend', u: 'spear', b: 610, d: 640, sp: 'jigwi', loyal: 70, src: '수이전(대동운부군옥 인용)', legend: true });
  O('gasil', '가실', '嘉實', 'silla', [58, 70, 48, 46], { role: 'general', u: 'spear', b: 585, d: 650, sp: 'gasil', loyal: 95, src: '사기 열전', legend: true });
  O('seolssinyeo', '설씨녀', '薛氏女', 'silla', [15, 10, 60, 66], { role: 'lady', u: 'spear', b: 590, d: 650, sp: 'seolssi', loyal: 100, female: true, src: '사기 열전', legend: true });
  O('yeolgi', '열기', '裂起', 'silla', [60, 72, 62, 50], { role: 'general', u: 'cav', b: 630, d: 690, sp: 'yeolgi', loyal: 95, src: '사기 열전' });
  O('gujincheon', '구진천', '仇珍川', 'silla', [10, 20, 80, 78], { role: 'scholar', u: 'cheonbo', b: 625, d: 690, sp: 'gujincheon', loyal: 100, src: '사기' });
  O('kimyangdo', '김양도', '金良圖', 'silla', [74, 72, 72, 68], { role: 'general', u: 'spear', b: 615, d: 670, sp: 'yangdo', loyal: 98, src: '사기' });
  O('kimhuji', '김후직', '金后稷', 'silla', [40, 30, 80, 86], { role: 'scholar', u: 'spear', b: 560, d: 620, sp: 'huji', loyal: 100, src: '사기 열전' });
  O('haeron', '해론', '奚論', 'silla', [62, 76, 52, 44], { role: 'hwarang', u: 'spear', b: 590, d: 618, sp: 'haeron', loyal: 100, src: '사기 열전' });
  O('seoloyu', '설오유', '薛烏儒', 'silla', [76, 76, 62, 56], { role: 'general', u: 'cav', b: 630, d: 690, sp: 'seoloyu', loyal: 95, src: '사기' });
  O('kimcheonjon', '김천존', '金天存', 'silla', [76, 70, 68, 66], { role: 'general', u: 'spear', b: 615, d: 680, sp: 'cheonjon', loyal: 98, src: '사기' });

  /* ─── 수 ─── */
  O('yangje', '수 양제', '隋煬帝', 'sui', [70, 60, 78, 40], { role: 'king', u: 'bubyeong', b: 569, d: 618, sp: 'baekman', loyal: 100, src: '수서' });
  O('umunsul', '우문술', '宇文述', 'sui', [80, 72, 68, 60], { role: 'general', u: 'cav', b: 555, d: 616, sp: 'unha', loyal: 90, src: '수서' });
  O('ujungmun', '우중문', '于仲文', 'sui', [78, 70, 72, 58], { role: 'general', u: 'cav', b: 545, d: 613, sp: 'ujungmun', loyal: 88, src: '수서' });
  O('naehoa', '내호아', '來護兒', 'sui', [82, 78, 60, 54], { role: 'general', u: 'navy', b: 550, d: 618, sp: 'naehoa', loyal: 90, src: '수서' });
  O('maekcheoljang', '맥철장', '麥鐵杖', 'sui', [66, 86, 40, 34], { role: 'general', u: 'bubyeong', b: 555, d: 612, sp: 'maekcheol', loyal: 95, src: '수서' });
  O('umunhwageup', '우문화급', '宇文化及', 'sui', [50, 60, 55, 40], { role: 'general', u: 'cav', b: 575, d: 619, sp: 'hwageup', loyal: 25, src: '수서', ambition: true });
  O('jubeopsang', '주법상', '周法尙', 'sui', [72, 70, 60, 58], { role: 'general', u: 'navy', b: 556, d: 614, sp: 'beopsang', loyal: 85, src: '수서' });

  /* ─── 당 ─── */
  O('taejong', '당 태종', '唐太宗', 'tang', [96, 88, 90, 92], { role: 'king', u: 'cav', b: 598, d: 649, sp: 'cheongahan', loyal: 100, src: '구당서·신당서', note: '이세민. 626년 현무문의 변으로 즉위.' });
  O('isejeok', '이세적', '李世勣', 'tang', [92, 82, 88, 78], { role: 'general', u: 'cav', b: 594, d: 669, sp: 'ijeok', loyal: 92, src: '구당서' });
  O('jangnyang', '장량', '張亮', 'tang', [78, 70, 70, 68], { role: 'general', u: 'navy', b: 590, d: 646, sp: 'jangnyang', loyal: 75, src: '구당서' });
  O('idojong', '이도종', '李道宗', 'tang', [84, 80, 76, 70], { role: 'general', u: 'pocha', b: 600, d: 653, sp: 'dojong', loyal: 90, src: '구당서' });
  O('seolingwi', '설인귀', '薛仁貴', 'tang', [86, 95, 64, 58], { role: 'general', u: 'cav', b: 614, d: 683, sp: 'inkwi', loyal: 90, src: '구당서' });
  O('sojeongbang', '소정방', '蘇定方', 'tang', [90, 86, 78, 62], { role: 'general', u: 'bubyeong', b: 592, d: 667, sp: 'sojeongbang', loyal: 92, src: '구당서' });
  O('yuingwe', '유인궤', '劉仁軌', 'tang', [80, 66, 86, 84], { role: 'scholar', u: 'navy', b: 601, d: 685, sp: 'ingwe', loyal: 92, src: '구당서' });
  O('yuinwon', '유인원', '劉仁願', 'tang', [76, 72, 70, 68], { role: 'general', u: 'bubyeong', b: 610, d: 680, sp: 'inwon', loyal: 85, src: '구당서·유인원기공비' });
  O('igeunhaeng', '이근행', '李謹行', 'tang', [84, 82, 70, 62], { role: 'general', u: 'cav', b: 620, d: 683, sp: 'geunhaeng', loyal: 85, src: '구당서' });
  O('gyepilharyeok', '계필하력', '契苾何力', 'tang', [84, 86, 66, 60], { role: 'general', u: 'cav', b: 605, d: 677, sp: 'gyepil', loyal: 95, src: '구당서' });
  O('gogan', '고간', '高侃', 'tang', [74, 74, 62, 58], { role: 'general', u: 'pocha', b: 615, d: 690, sp: 'gogan', loyal: 88, src: '구당서' });
  O('uljigyeongdeok', '울지경덕', '尉遲敬德', 'tang', [82, 92, 56, 50], { role: 'general', u: 'cav', b: 585, d: 658, sp: 'uljiyeong', loyal: 95, src: '구당서' });
  O('jangsonmugi', '장손무기', '長孫無忌', 'tang', [62, 50, 90, 92], { role: 'scholar', u: 'bubyeong', b: 594, d: 659, sp: 'jangson', loyal: 92, src: '구당서' });
  O('gojong', '당 고종', '唐高宗', 'tang', [60, 40, 72, 70], { role: 'king', u: 'bubyeong', b: 628, d: 683, sp: 'gojong', loyal: 100, src: '구당서' });
  O('mucheuk', '측천무후', '則天武后', 'tang', [70, 40, 95, 94], { role: 'queen', u: 'bubyeong', b: 624, d: 705, sp: 'mucheuk', loyal: 100, female: true, src: '구당서' });
  O('jeongmyeongjin', '정명진', '程名振', 'tang', [76, 72, 64, 58], { role: 'general', u: 'cav', b: 595, d: 662, sp: 'myeongjin', loyal: 88, src: '구당서' });
  O('banghyotae', '방효태', '龐孝泰', 'tang', [70, 70, 58, 50], { role: 'general', u: 'bubyeong', b: 605, d: 662, sp: 'banghyo', loyal: 90, src: '구당서' });

  /* ─── 왜·말갈 ─── */
  O('shotoku', '쇼토쿠 태자', '聖德太子', 'wa', [60, 40, 94, 96], { role: 'king', u: 'wanavy', b: 574, d: 622, sp: 'hunbeop', loyal: 100, src: '서기' });
  O('nakanooe', '나카노오에', '中大兄', 'wa', [74, 60, 84, 82], { role: 'king', u: 'wanavy', b: 626, d: 672, sp: 'taika', loyal: 100, src: '서기', note: '668년 즉위한 덴지 천황.' });
  O('kamatari', '나카토미노 가마타리', '中臣鎌足', 'wa', [50, 40, 90, 90], { role: 'scholar', u: 'wanavy', b: 614, d: 669, sp: 'kamatari', loyal: 95, src: '서기' });
  O('hirafu', '아베노 히라후', '阿倍比羅夫', 'wa', [80, 78, 64, 58], { role: 'general', u: 'wanavy', b: 615, d: 680, sp: 'hirafu', loyal: 92, src: '서기' });
  O('takutsu', '에치노 다쿠쓰', '朴市田來津', 'wa', [72, 80, 56, 48], { role: 'general', u: 'wanavy', b: 620, d: 663, sp: 'takutsu', loyal: 98, src: '서기' });
  O('doljigye', '돌지계', '突地稽', 'mohe', [74, 76, 50, 48], { role: 'general', u: 'mohecav', b: 570, d: 630, sp: 'dolji', loyal: 70, src: '수서·구당서' });
  O('geolsabiu', '걸사비우', '乞四比羽', 'mohe', [76, 80, 52, 46], { role: 'general', u: 'mohecav', b: 640, d: 697, sp: 'geolsa', loyal: 70, src: '구당서·신당서' });

  SGK.OFFICERS = L;
  SGK.officerById = {};
  L.forEach((o) => (SGK.officerById[o.id] = o));
})();

/* 인물 연계(조합) — 같은 부대(출진 편성)에 함께 있으면 발동
 * bonus: 전투 공·방 %   card: 합격기(전용 협력 카드)   neg: 부정적 관계(같이 출진 시 페널티) */
SGK.LINKS = [
  { id: 'samhan', name: '삼한일통의 맹약', type: '처남매부', members: ['kimyusin', 'kimchunchu'], bonus: 0.15, src: '사기',
    desc: '김유신은 누이 문희를 김춘추에게 시집보내 평생의 동지가 되었다.',
    card: { name: '일통의 맹세', cost: 2, kind: 'atk', target: 'allEnemy', pow: 16, stat: 'lead', fx: 'thunder', morale: 20, desc: '[합격기] 적 전체 강타 + 아군 사기 +20.' } },
  { id: 'kkum', name: '꿈을 산 인연', type: '부부', members: ['kimchunchu', 'munhui'], bonus: 0.08, src: '유사', desc: '언니 보희의 꿈을 산 문희가 축국 중 김춘추의 옷고름을 꿰매며 맺어졌다.' },
  { id: 'nammae', name: '오누이', type: '남매', members: ['kimyusin', 'munhui'], bonus: 0.05, src: '사기·유사', desc: '김유신과 누이 문희.' },
  { id: 'seodongyo', name: '서동요', type: '연인', members: ['muwang', 'seonhwa'], bonus: 0.12, src: '유사', legend: true,
    desc: '"선화공주님은 남몰래 정을 통해 두고 서동방을 밤에 몰래 안고 간다."',
    card: { name: '서동과 선화', cost: 1, kind: 'heal', target: 'allAlly', pow: 7, stat: 'pol', fx: 'lotus', morale: 15, desc: '[합격기] 아군 전체 회복 + 사기 +15.' } },
  { id: 'samchung', name: '백제 삼충신', type: '충신', members: ['gyebaek', 'seongchung', 'heungsu'], min: 2, bonus: 0.12, src: '사기(부여 삼충사)',
    desc: '나라의 마지막을 지킨 성충·흥수·계백. 부여 삼충사에 함께 모셔져 있다.',
    card: { name: '삼충의 혼', cost: 2, kind: 'def', target: 'allAlly', pow: 16, stat: 'lead', fx: 'wall', defUp: 0.3, turns: 2, desc: '[합격기] 아군 전체 방어막 + 방어 +30%.' } },
  { id: 'sesok', name: '세속오계의 벗', type: '의형제', members: ['gwisan', 'chuhang'], bonus: 0.15, src: '사기 열전',
    desc: '원광법사에게 함께 세속오계를 받고 아막성에서 함께 전사한 두 벗.',
    card: { name: '교우이신', cost: 1, kind: 'atk', target: 'enemy', pow: 18, stat: 'war', fx: 'slash5', desc: '[합격기] 두 벗의 협공.' } },
  { id: 'sajeon', name: '사제(師弟)', type: '스승과 제자', members: ['wongwang', 'gwisan'], bonus: 0.05, src: '사기', desc: '세속오계를 내린 스승 원광.' },
  { id: 'pumil_gc', name: '화랑의 혼', type: '부자', members: ['pumil', 'gwanchang'], bonus: 0.12, src: '사기', desc: '"내 아들의 얼굴이 살아 있는 것 같구나." 관창의 목을 받아 든 품일.' },
  { id: 'heum_bg', name: '부자의 충절', type: '부자', members: ['kimheumsun', 'bangul'], bonus: 0.12, src: '사기', desc: '"신하로서는 충성이 제일이고 자식으로서는 효도가 제일이다." 흠순이 아들 반굴에게.' },
  { id: 'yusin_heum', name: '김씨 형제', type: '형제', members: ['kimyusin', 'kimheumsun'], bonus: 0.1, src: '사기', desc: '김유신과 아우 흠순.' },
  { id: 'yusin_ws', name: '아버지와 아들', type: '부자(불화)', members: ['kimyusin', 'wonsul'], bonus: -0.05, neg: true, src: '사기 열전', desc: '석문 패전 후 김유신은 원술을 아들로 인정하지 않았다. 함께 출진 시 사기 저하.' },
  { id: 'chunchu_go', name: '대야성의 한', type: '부녀', members: ['kimchunchu', 'gotaso'], bonus: 0.05, src: '사기', desc: '딸 고타소의 죽음을 들은 김춘추는 기둥에 기대어 종일 사람을 알아보지 못했다.' },
  { id: 'pumseok_go', name: '대야성 부부', type: '부부', members: ['pumseok', 'gotaso'], bonus: 0.05, src: '사기', desc: '대야성주 김품석과 아내 고타소.' },
  { id: 'gasil_seol', name: '반쪽 거울', type: '연인', members: ['gasil', 'seolssinyeo'], bonus: 0.1, src: '사기 열전', legend: true, desc: '거울을 둘로 나눠 갖고 6년을 기다린 약속.' },
  { id: 'jigwi_sd', name: '심화요탑', type: '짝사랑', members: ['jigwi', 'seondeok'], bonus: 0.03, src: '수이전', legend: true, desc: '여왕이 잠든 지귀의 가슴에 팔찌를 얹어 두고 갔다.' },
  { id: 'wonhyo_us', name: '해골물의 도반', type: '도반', members: ['wonhyo', 'uisang'], bonus: 0.1, src: '유사·송고승전', desc: '함께 당 유학길에 올랐다가 원효는 깨달음을 얻고 돌아섰다.' },
  { id: 'munmu_im', name: '무열왕의 아들들', type: '형제', members: ['munmu', 'kiminmun'], bonus: 0.08, src: '사기', desc: '문무왕과 김인문.' },
  { id: 'eulji_yy', name: '살수의 군신', type: '군신', members: ['yeongyang', 'euljimundeok'], bonus: 0.1, src: '사기', desc: '영양왕과 을지문덕.' },
  { id: 'gogu_brothers', name: '왕실 형제', type: '형제', members: ['yeongyang', 'geonmu'], bonus: 0.08, src: '사기', desc: '영양왕과 이복동생 고건무.' },
  { id: 'yeon_sons', name: '연씨 형제의 반목', type: '형제(불화)', members: ['namsaeng', 'namgeon'], bonus: -0.1, neg: true, src: '사기', desc: '666년 남건·남산이 형 남생을 몰아내 고구려 멸망을 재촉했다.' },
  { id: 'yeon_father', name: '막리지 부자', type: '부자', members: ['yeongaesomun', 'namsaeng'], bonus: 0.08, src: '사기', desc: '연개소문과 맏아들 남생.' },
  { id: 'yeon_jt', name: '연씨 형제', type: '형제', members: ['yeongaesomun', 'jeongto'], bonus: 0.05, src: '사기', desc: '연개소문과 아우 연정토.' },
  { id: 'gomo_an', name: '부흥의 동지', type: '동지(배신)', members: ['geommojam', 'anseung'], bonus: 0.05, src: '사기', desc: '검모잠이 안승을 왕으로 세웠으나 안승은 검모잠을 죽이고 신라로 갔다.' },
  { id: 'goyeon', name: '주필산의 두 장수', type: '동료', members: ['goyeonsu', 'gohyejin'], bonus: 0.08, src: '사기', desc: '645년 주필산에서 함께 당에 항복한 두 욕살.' },
  { id: 'boksin_dc', name: '부흥군 지도부', type: '동지(배신)', members: ['boksin', 'docheom'], bonus: 0.05, src: '사기', desc: '함께 부흥을 일으켰으나 복신이 도침을 죽였다.' },
  { id: 'heukchi_sata', name: '임존성의 동지', type: '동지', members: ['heukchi', 'satasangyeo'], bonus: 0.1, src: '사기', desc: '함께 임존성에서 싸우다 함께 당에 항복했다.' },
  { id: 'buyeo_family', name: '의자왕의 아들들', type: '부자', members: ['uija', 'buyeoyung'], bonus: 0.05, src: '사기', desc: '의자왕과 태자 부여융.' },
  { id: 'tang_jg', name: '정관의 군신', type: '군신', members: ['taejong', 'isejeok'], bonus: 0.1, src: '구당서', desc: '당 태종과 이세적.' },
  { id: 'tang_jang', name: '처남과 매부', type: '인척', members: ['taejong', 'jangsonmugi'], bonus: 0.05, src: '구당서', desc: '장손무기는 장손황후의 오빠.' },
  { id: 'tang_so', name: '백제 원정군', type: '동료', members: ['sojeongbang', 'yuinwon'], bonus: 0.08, src: '구당서', desc: '660년 함께 사비성을 함락.' },
  { id: 'damjing_hyeja', name: '왜로 간 고구려 승려', type: '도반', members: ['damjing', 'hyeja'], bonus: 0.05, src: '서기', desc: '7세기 초 왜에 불교·회화·제지술을 전한 두 승려.' },
  { id: 'shotoku_hyeja', name: '태자와 스승', type: '스승과 제자', members: ['shotoku', 'hyeja'], bonus: 0.1, src: '서기', desc: '혜자는 쇼토쿠 태자의 스승이었다.' },
  { id: 'nakano_kama', name: '을사의 변', type: '동지', members: ['nakanooe', 'kamatari'], bonus: 0.1, src: '서기', desc: '645년 함께 소가노 이루카를 제거하고 다이카 개신을 시작했다.' },
  { id: 'baek_wa', name: '백강의 맹약', type: '동맹', members: ['buyeopung', 'takutsu'], bonus: 0.08, src: '서기', desc: '부여풍을 호위해 백제로 건너온 왜군.' },
  { id: 'gyeom_ilseok', name: '보덕국과 신라', type: '군신', members: ['anseung', 'munmu'], bonus: 0.05, src: '사기', desc: '문무왕이 안승을 보덕국왕으로 봉했다.' },
];
