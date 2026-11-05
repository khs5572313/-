/* 삼국 전쟁 시나리오 6종 — 고구려편 2 · 백제편 2 · 신라편 2
 * 수·당·왜는 지도 밖 세력으로 처리(이벤트로만 등장). 확장판에서 플레이 세력으로 추가 예정.
 * cities에 없는 도시는 비활성(지도에서 숨김). officers에 적지 않은 인물은 그 해 생존·성인이면 자국 도시에 자동 배치된다. */
(function () {
  const BASE = {
    goguryeo: ['buyeo', 'sinseong', 'gaemo', 'yodong', 'baegam', 'ansi', 'geonan', 'bisa', 'ogol', 'bakjak', 'gungnae', 'chaek', 'salsu', 'pyongyang', 'hanseong_g', 'biyeol', 'maeso', 'sokmal'],
    silla: ['chiljung', 'bukhan', 'danghang', 'haseulla', 'usan', 'samnyeon', 'sangju', 'daeya', 'amak', 'seorabeol', 'geumgwan', 'jukryeong'],
    baekje: ['imjon', 'ungjin', 'tanhyeon', 'hwangsan', 'sabi', 'gibeolpo', 'iksan', 'jullyu', 'gosa', 'gujiha'],
    neutral: ['tamra'],
  };
  /* 소유 배치 생성: 기본값 + 변경(move) + 병력 배율(mul) + 개별 덧쓰기(ov) */
  const own = (move = {}, mul = {}, ov = {}) => {
    const out = {};
    for (const n in BASE) for (const c of BASE[n]) out[c] = [n];
    for (const c in move) out[c] = [move[c]];
    for (const c in out) { out[c][1] = mul[c] || (out[c][0] === 'neutral' ? 0.4 : 1); out[c][2] = ov[c] || {}; }
    out.usan[1] = 0.4; out.sokmal[1] = out.sokmal[1] === 1 ? 0.7 : out.sokmal[1];
    return out;
  };
  const NAT = (g, b, s) => ({ goguryeo: g, baekje: b, silla: s });
  const ALL3 = ['goguryeo', 'baekje', 'silla'];

  SGK.SCENARIOS = [
    /* ───────── 고구려편 ───────── */
    {
      id: 'g1', no: 1, hero: 'goguryeo', title: '온달의 맹세', sub: '한강을 되찾으라', year: 590, season: 0, endYear: 600, img: 'field',
      desc: '590년. 평원왕은 장안성으로 도읍을 옮기고 남쪽을 노린다. 신라는 40년 전 빼앗은 한강 유역을 굳게 지키고, 백제 위덕왕은 관산성에서 아버지를 잃은 한을 품고 있다. 바보라 놀림받던 사위 온달이 왕 앞에 나선다. "계립현과 죽령 서쪽 땅을 되찾지 못하면 돌아오지 않겠습니다."',
      hist: '삼국사기 온달전: 온달은 아단성 아래에서 신라군의 화살에 맞아 죽었다. 장례를 치르려 하나 관이 움직이지 않았는데, 공주가 관을 어루만지며 "죽고 사는 것이 결정되었으니 돌아갑시다" 하니 비로소 움직였다.',
      focus: '온달·평강공주 · 한강 쟁탈전 · 598년 수의 침공(지도 밖)',
      playable: ALL3,
      nations: NAT({ gold: 3500, food: 8000, iron: 800, wood: 1500, ruler: 'pyeongwon' }, { gold: 3200, food: 6500, iron: 500, wood: 1200, ruler: 'wideok' }, { gold: 3000, food: 6500, iron: 600, wood: 1200, ruler: 'jinpyeong' }),
      relations: [['goguryeo', 'silla', 'war', 10], ['baekje', 'silla', 'war', 15], ['goguryeo', 'baekje', 'peace', 45]],
      cities: own({}, { pyongyang: 1.5, maeso: 1.6, hanseong_g: 1.3, bukhan: 1.6, chiljung: 1.2, seorabeol: 1.3, sabi: 1.3, jukryeong: 0.8 }, { bukhan: { wall: 520 } }),
      officers: { maeso: ['ondal'], pyongyang: ['pyeongwon', 'yeongyang', 'pyeonggang', 'euljimundeok'], yodong: ['gangisik'], seorabeol: ['jinpyeong', 'maya'], bukhan: ['kimseohyeon', 'chandeok'], sabi: ['wideok', 'hyewang'], gujiha: ['haesu'] },
      free: {},
      goals: {
        goguryeo: [{ type: 'capture', cities: ['bukhan', 'jukryeong'], desc: '북한산성·죽령 확보 (계립현·죽령 이서 수복)' }],
        silla: [{ type: 'hold', cities: ['bukhan', 'chiljung'], until: 596, desc: '596년 겨울까지 북한산성·칠중성 사수' }],
        baekje: [{ type: 'capture', cities: ['amak', 'daeya'], desc: '아막성·대야성 공략 (관산성의 복수)' }],
      },
    },
    {
      id: 'g2', no: 4, hero: 'goguryeo', title: '여제동맹', sub: '대막리지 연개소문의 남진', year: 655, season: 0, endYear: 664, img: 'wall',
      desc: '655년 정월. 정변으로 권력을 쥔 대막리지 연개소문은 백제 의자왕·말갈과 손잡고 신라 북쪽 33성을 친다. 신라 무열왕 김춘추는 사방이 적이다. 한강을 지키는 북한산성과 칠중성이 무너지면 신라는 바다로 나가는 길(당항성)마저 잃는다. 그리고 661년, 뇌음신과 말갈 장수 생해가 포차를 끌고 북한산성으로 향한다.',
      hist: '삼국사기 태종무열왕 2년: 고구려·백제·말갈이 연합해 북쪽 경계 33성을 빼앗았다. 8년: 고구려 장군 뇌음신이 말갈 장군 생해와 북한산성을 20일 동안 포위했으나 큰 별이 적진에 떨어지고 벼락이 쳐서 포차가 부서지자 물러갔다.',
      focus: '연개소문·뇌음신 vs 김춘추·동타천 · 조천성의 김흠운 · 칠중성의 필부',
      playable: ALL3,
      nations: NAT({ gold: 5000, food: 10000, iron: 1200, wood: 2000, ruler: 'bojang' }, { gold: 4800, food: 8000, iron: 700, wood: 1500, ruler: 'uija' }, { gold: 4500, food: 8000, iron: 900, wood: 1600, ruler: 'kimchunchu' }),
      relations: [['goguryeo', 'silla', 'war', 5], ['baekje', 'silla', 'war', 0], ['goguryeo', 'baekje', 'ally', 80]],
      cities: own({ daeya: 'baekje', amak: 'baekje' }, { pyongyang: 1.6, maeso: 2.2, hanseong_g: 1.6, biyeol: 1.3, bukhan: 1.9, chiljung: 1.6, danghang: 1.5, sangju: 2.0, samnyeon: 1.6, seorabeol: 1.8, sabi: 1.3, daeya: 1.4 }, { bukhan: { wall: 600 } }),
      officers: { pyongyang: ['bojang', 'yeongaesomun', 'namgeon', 'namsan'], maeso: ['noeeumsin', 'saenghae', 'ango'], gungnae: ['namsaeng'], biyeol: ['jeongto'], ansi: ['yangmanchun'],
        sabi: ['uija', 'seongchung', 'heungsu', 'buyeohyo', 'eungo'], daeya: ['eunsang', 'yunchung'], hwangsan: ['gyebaek'],
        seorabeol: ['kimchunchu', 'munmu', 'munhui', 'gangsu'], sangju: ['kimyusin', 'kimheumsun', 'heumun', 'yepa', 'jeokdeuk', 'boyongna'], bukhan: ['dongtacheon'], chiljung: ['pilbu'] },
      free: {},
      goals: {
        goguryeo: [{ type: 'capture', cities: ['bukhan', 'chiljung', 'danghang'], desc: '북한산성·칠중성·당항성 장악 (한강 수복)' }],
        baekje: [{ type: 'capture', cities: ['sangju', 'samnyeon'], desc: '상주·삼년산성 공략' }],
        silla: [{ type: 'hold', cities: ['bukhan', 'chiljung', 'danghang'], until: 661, desc: '661년 겨울까지 북한산성·칠중성·당항성 사수' }],
      },
    },
    /* ───────── 백제편 ───────── */
    {
      id: 'b1', no: 2, hero: 'baekje', title: '서동의 나라', sub: '무왕의 중흥과 아막성', year: 602, season: 0, endYear: 640, img: 'field',
      desc: '602년. 마를 캐던 소년 서동은 신라 공주 선화를 아내로 맞고 백제의 왕(무왕)이 되었다는 노래가 퍼져 있다. 무왕은 즉위하자마자 신라 아막성으로 군사를 보낸다. 성 안에는 원광법사에게 세속오계를 받은 두 젊은이, 귀산과 추항이 있다. 한편 북쪽 고구려는 수나라의 거센 침공을 앞두고 있다.',
      hist: '삼국사기 무왕 3년: 아막산성을 포위했으나 신라 진평왕이 정예 기병 수천을 보내 막았다. 귀산·추항은 함정에 빠진 귀산의 아버지 무은을 구하고 전사했다.',
      focus: '무왕·선화공주 · 귀산과 추항(세속오계) · 가잠성 · 미륵사',
      playable: ALL3,
      nations: NAT({ gold: 4000, food: 8500, iron: 900, wood: 1500, ruler: 'yeongyang' }, { gold: 3800, food: 7000, iron: 600, wood: 1300, ruler: 'muwang' }, { gold: 3500, food: 7000, iron: 700, wood: 1300, ruler: 'jinpyeong' }),
      relations: [['baekje', 'silla', 'war', 10], ['goguryeo', 'silla', 'war', 15], ['goguryeo', 'baekje', 'peace', 45]],
      cities: own({}, { sabi: 1.3, gujiha: 1.8, gosa: 1.3, amak: 1.3, daeya: 1.2, seorabeol: 1.3, pyongyang: 1.5, maeso: 1.4, bukhan: 1.3 }),
      officers: { sabi: ['muwang', 'sataekjeokdeok'], iksan: ['seonhwa', 'jimyeong'], gujiha: ['haesu'],
        amak: ['mueun', 'gwisan', 'chuhang'], seorabeol: ['jinpyeong', 'maya', 'wongwang', 'kimhuji'], daeya: ['kimseohyeon'],
        pyongyang: ['yeongyang', 'geonmu', 'euljimundeok'], maeso: ['goseung'], yodong: ['gangisik'] },
      free: { seorabeol: ['bihyeong'], sangju: ['gasil', 'seolssinyeo'] },
      goals: {
        baekje: [{ type: 'capture', cities: ['amak', 'daeya', 'sangju'], desc: '아막성·대야성·상주 공략 (신라 서부 장악)' }],
        silla: [{ type: 'hold', cities: ['amak', 'daeya'], until: 615, desc: '615년 겨울까지 아막성·대야성 사수' }],
        goguryeo: [{ type: 'capture', cities: ['bukhan'], desc: '북한산성 함락 (603 고승의 원정 완수)' }],
      },
    },
    {
      id: 'b2', no: 5, hero: 'baekje', title: '황산벌', sub: '계백의 결사대', year: 660, season: 1, endYear: 668, img: 'field',
      desc: '660년 여름. 김유신의 신라군 5만이 탄현을 넘어 황산벌로 향하고, 바다 건너에서는 당의 대군이 기벌포를 노린다(지도 밖 세력). 성충은 옥중에서 죽으며 "탄현과 기벌포를 막으라" 했고, 귀양 간 흥수도 같은 말을 남겼다. 계백은 처자를 베고 결사대 5천을 이끌고 나선다. 백제의 마지막 여름이다.',
      hist: '삼국사기 계백전: 계백은 네 번 싸워 모두 이겼으나 반굴·관창의 죽음에 신라군이 분발하여 마침내 전사하였다.',
      focus: '계백·의자왕·흥수 vs 김유신·관창·반굴 · 사비성 함락 이후 부흥운동',
      playable: ALL3,
      nations: NAT({ gold: 4500, food: 9000, iron: 1000, wood: 1800, ruler: 'bojang' }, { gold: 4500, food: 7000, iron: 600, wood: 1400, ruler: 'uija' }, { gold: 6000, food: 10000, iron: 1000, wood: 1800, ruler: 'kimchunchu' }),
      relations: [['baekje', 'silla', 'war', 0], ['goguryeo', 'silla', 'war', 10], ['goguryeo', 'baekje', 'ally', 70]],
      cities: own({ daeya: 'baekje', amak: 'baekje' }, { samnyeon: 3.5, sangju: 1.5, danghang: 1.5, sabi: 1.4, ungjin: 1.2, tanhyeon: 0.6, gibeolpo: 0.8, hwangsan: 0.8, pyongyang: 1.8, maeso: 1.4 }, { hwangsan: { troops: { gyeolsa: 5000 } } }),
      officers: { sabi: ['uija', 'buyeoyung', 'buyeotae', 'uijik', 'eungo'], hwangsan: ['gyebaek', 'chungsang', 'sangyeong'], imjon: ['heukchi', 'jisusin', 'satasangyeo'], jullyu: ['boksin', 'docheom'], gosa: ['heungsu'], ungjin: ['yesikjin', 'yegun'],
        seorabeol: ['kimchunchu', 'munhui', 'wonhyo', 'uisang', 'gangsu'], samnyeon: ['kimyusin', 'kimheumsun', 'pumil', 'bangul', 'gwanchang', 'munyeong'], danghang: ['munmu', 'kiminmun'], sangju: ['kimyangdo', 'yeolgi'], chiljung: ['pilbu'],
        pyongyang: ['bojang', 'yeongaesomun', 'namgeon', 'namsan'], gungnae: ['namsaeng'], maeso: ['noeeumsin', 'saenghae'] },
      free: {},
      spawn: [{ id: 'buyeopung', year: 661, city: 'jullyu', nation: 'baekje' }],
      goals: {
        baekje: [{ type: 'hold', cities: ['sabi', 'ungjin'], until: 662, desc: '662년 겨울까지 사비성·웅진성 사수' }],
        silla: [{ type: 'capture', cities: ['sabi', 'ungjin'], desc: '사비성·웅진성 함락' }],
        goguryeo: [{ type: 'capture', cities: ['bukhan', 'chiljung'], desc: '북한산성·칠중성 함락' }],
      },
    },
    /* ───────── 신라편 ───────── */
    {
      id: 's1', no: 3, hero: 'silla', title: '대야성의 한', sub: '김춘추와 김유신', year: 642, season: 1, endYear: 655, img: 'fire',
      desc: '642년. 백제 의자왕이 친히 신라 서쪽 40여 성을 빼앗았다. 이제 장군 윤충이 대야성을 노린다. 성주 김품석은 김춘추의 사위이고, 그 곁에는 딸 고타소가 있다. 성 안에는 아내를 빼앗긴 원한을 품은 검일이 있다. 딸을 잃게 될 김춘추는 적국 고구려로 원병을 청하러 가고, 김유신은 결사대 1만으로 그를 기다린다. 고구려에서는 연개소문이 칼을 갈고 있다.',
      hist: '삼국사기: 대야성 함락 후 김춘추는 "대장부가 되어 어찌 백제를 삼키지 못하겠는가"라고 하였다. 647년 비담의 난, 649년 도살성 전투(은상 격파)로 이어진다.',
      focus: '김춘추·김유신·선덕여왕 vs 의자왕·윤충 · 구토지설 · 연개소문의 정변 · 비담의 난',
      playable: ALL3,
      nations: NAT({ gold: 4500, food: 9000, iron: 1000, wood: 1800, ruler: 'geonmu' }, { gold: 5000, food: 8000, iron: 700, wood: 1500, ruler: 'uija' }, { gold: 4000, food: 7000, iron: 700, wood: 1400, ruler: 'seondeok' }),
      relations: [['baekje', 'silla', 'war', 5], ['goguryeo', 'silla', 'war', 25], ['goguryeo', 'baekje', 'peace', 55]],
      cities: own({ amak: 'baekje' }, { daeya: 0.8, sabi: 1.3, hwangsan: 1.4, amak: 1.3, gujiha: 1.2, seorabeol: 1.5, sangju: 1.8, samnyeon: 1.3, bukhan: 1.3, pyongyang: 1.6 }, { daeya: { wall: 400 } }),
      officers: { sabi: ['uija', 'seongchung', 'sataekjijeok', 'buyeoyung', 'eungo'], hwangsan: ['yunchung', 'gyebaek'], amak: ['uijik', 'eunsang'], gujiha: ['heungsu'],
        daeya: ['pumseok', 'gotaso', 'jukjuk', 'yongseok', 'geomil'], seorabeol: ['seondeok', 'jindeok', 'kimchunchu', 'alcheon', 'bidam', 'munhui', 'munmu', 'kimyongchun', 'cheonmyeong'], sangju: ['kimyusin', 'kimheumsun', 'biryeongja'],
        pyongyang: ['geonmu', 'bojang', 'seondohae', 'gojeongui'], yodong: ['yeongaesomun'], ansi: ['yangmanchun'] },
      free: { seorabeol: ['jigwi'] },
      goals: {
        silla: [{ type: 'capture', cities: ['daeya', 'amak'], desc: '대야성 사수(또는 탈환)·아막성 탈환' }],
        baekje: [{ type: 'capture', cities: ['daeya', 'sangju', 'samnyeon'], desc: '대야성·상주·삼년산성 공략' }],
        goguryeo: [{ type: 'capture', cities: ['bukhan', 'danghang'], desc: '북한산성·당항성 회복 (죽령 서북 반환 요구)' }],
      },
    },
    {
      id: 's2', no: 6, hero: 'silla', title: '삼한일통', sub: '문무왕과 김유신', year: 661, season: 2, endYear: 676, img: 'sea',
      desc: '661년 가을. 사비성은 무너졌지만 백제는 끝나지 않았다. 복신과 도침은 주류성에서, 흑치상지는 임존성에서 부흥군을 일으켰고, 왜에 있던 왕자 풍이 돌아온다. 북쪽에서는 연개소문이 건재하고, 뇌음신의 군대가 북한산성을 두들긴다. 막 즉위한 문무왕과 노장 김유신은 두 전선을 동시에 감당해야 한다.',
      hist: '삼국사기: 662년 김유신은 눈보라 속에 평양까지 군량을 날랐다. 663년 부흥군은 복신이 도침을, 풍이 복신을 죽이는 내분으로 무너졌다. 665년 연개소문이 죽고 아들들이 다투자 668년 평양성이 함락되었다.',
      focus: '문무왕·김유신·열기 vs 복신·흑치상지·부여풍 vs 연개소문·연남생·연남건',
      playable: ALL3,
      nations: NAT({ gold: 5000, food: 9000, iron: 1100, wood: 1900, ruler: 'bojang' }, { gold: 2500, food: 4000, iron: 400, wood: 900, ruler: 'boksin', alias: '백제 부흥군' }, { gold: 7000, food: 12000, iron: 1300, wood: 2000, ruler: 'munmu' }),
      relations: [['baekje', 'silla', 'war', 0], ['goguryeo', 'silla', 'war', 5], ['goguryeo', 'baekje', 'ally', 75]],
      cities: own({ sabi: 'silla', ungjin: 'silla', hwangsan: 'silla', tanhyeon: 'silla', gibeolpo: 'silla', iksan: 'silla' }, { jullyu: 1.6, imjon: 1.8, gosa: 1.2, sabi: 1.3, ungjin: 1.2, seorabeol: 1.4, bukhan: 1.4, pyongyang: 2.0, maeso: 2.0, hanseong_g: 1.4 }, { imjon: { wall: 700 }, jullyu: { wall: 650 } }),
      officers: { jullyu: ['boksin', 'docheom', 'yeojasin'], imjon: ['heukchi', 'satasangyeo', 'jisusin'], gosa: ['chungseung'],
        seorabeol: ['munmu', 'kimyusin', 'kimheumsun', 'munhui', 'gangsu', 'wonhyo'], sabi: ['kiminmun', 'intae', 'munyeong'], sangju: ['pumil', 'yeolgi', 'gugeun', 'kimyangdo'], bukhan: ['dongtacheon'],
        pyongyang: ['bojang', 'yeongaesomun', 'namgeon', 'namsan'], gungnae: ['namsaeng'], maeso: ['noeeumsin', 'saenghae'], biyeol: ['jeongto'] },
      free: {},
      exclude: ['kimchunchu', 'uija', 'buyeoyung', 'buyeotae', 'buyeohyo', 'buyeoyeon', 'buyeoyong', 'yesikjin', 'yegun', 'eungo', 'gyebaek', 'chungsang', 'sangyeong', 'cheonbok', 'gukbyeon', 'bangul', 'gwanchang', 'uijik'],
      spawn: [{ id: 'buyeopung', year: 661, city: 'jullyu', nation: 'baekje' }],
      goals: {
        silla: [{ type: 'capture', cities: ['jullyu', 'imjon', 'pyongyang'], desc: '주류성·임존성·평양성 확보 (삼한일통)' }],
        baekje: [{ type: 'capture', cities: ['sabi', 'ungjin'], desc: '사비성·웅진성 수복 (백제 부흥)' }],
        goguryeo: [{ type: 'hold', cities: ['pyongyang'], until: 668, desc: '668년 겨울까지 평양성 사수' }],
      },
    },
  ];
  SGK.scenarioById = {};
  SGK.SCENARIOS.forEach((s) => (SGK.scenarioById[s.id] = s));
})();
