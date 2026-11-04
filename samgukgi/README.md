# 삼국기(三國記) — 프로토타입

581년 수 건국부터 698년 발해 건국까지, 고구려·백제·신라의 필드맵 전략 시뮬레이션.
현재 단계는 **M1 수직 슬라이스: 645 요동 전역(안시성)** 입니다. 기획서는 [`docs/GDD_M0.md`](docs/GDD_M0.md)에 있습니다.

## 실행

설치할 것은 없습니다. Node.js 18 이상과 Python 3(로컬 웹 서버용)만 있으면 됩니다.

```bash
cd samgukgi
```

브라우저에서 플레이:

```bash
python3 -m http.server 8645
```

→ 브라우저에서 `http://localhost:8645/web/index.html` 열기

테스트:

```bash
npm test
```

밸런스 리포트(병종 상성, 능력치·적성 영향, 시나리오 승률을 수백 판 자동 대전으로 측정):

```bash
node tools/balance.js --n 200
```

## 구조

```
samgukgi/
├ docs/GDD_M0.md            기획서 (전투 공식·상성표·국가 버프·특기·로드맵)
├ src/
│ ├ hex.js                  헥스 좌표 (거리·이웃·화면 좌표)
│ ├ modifiers.js            수정치 엔진: 국가 버프·무장 특기를 같은 형식으로 판정·합산
│ ├ combat.js               전투 공식
│ ├ game.js                 게임 규칙 (맵 생성, 이동·ZOC, 공격, 점령, 턴, 승리 조건)
│ ├ ai.js                   기본 AI (기대 피해 − 반격 − 위험도로 행동 선택)
│ └ data/                   ← 밸런스 조정은 여기만 고치면 됨
│   ├ terrain.js  units.js  nations.js  skills.js  generals.js
│   └ scenarios/liaodong645.js
├ tools/balance.js          밸런스 시뮬레이터
├ tests/                    규칙 테스트 + 밸런스 회귀 테스트
└ web/                      브라우저 화면 (index.html, app.js)
```

게임 규칙(`src/`)과 화면(`web/`)이 분리되어 있어, 같은 규칙 코드를 테스트·시뮬레이터·브라우저가 함께 씁니다.
나중에 엔진을 바꿔도(Godot 등) `src/data`의 데이터와 공식은 그대로 옮길 수 있습니다.

## 데이터 수정 요령

- 수치를 바꾼 뒤에는 반드시 `npm test`를 실행합니다. 밸런스 회귀 테스트가 설계 목표(상성 우위 75% 이상, 명장 역상성 25~65%, 시나리오 25~75%)를 벗어나면 실패로 알려 줍니다.
- 새 국가 버프·특기는 `{ stat, value, cond }` 형식으로 추가합니다. 사용할 수 있는 키는 `src/data/nations.js` 맨 위 주석에 있습니다.
- 지도는 `rows` 문자열로 그립니다(`.` 평지, `h` 구릉, `m` 산악, `f` 숲, `w` 습지, `~` 하천, `S` 바다).
