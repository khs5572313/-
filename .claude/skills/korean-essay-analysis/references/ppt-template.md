# PPT 생성 가이드 (pptxgenjs)

## 설정 및 실행 환경

```bash
# 의존성 설치 (최초 1회)
npm install -g pptxgenjs react react-dom sharp react-icons
```

## 팔레트 & 공통 상수

```javascript
const C = {
  navy:    "1A2F5E",   // 배경 진네이비 (타이틀·dark 슬라이드)
  purple:  "4B3FA0",   // 포인트 퍼플 (TYPE-A)
  purpleL: "7B6FD0",   // 밝은 퍼플
  teal:    "0D9488",   // 초록 (TYPE-B)
  tealL:   "99E6DF",
  coral:   "E05A3A",   // 코랄 (TYPE-C / 연도변화)
  gold:    "F5C842",   // 골드 강조
  white:   "FFFFFF",
  offW:    "F4F6FA",   // 라이트 슬라이드 배경
  gray1:   "E2E8F0",
  gray2:   "94A3B8",
  gray3:   "475569",
  dark:    "1E293B",
};

// shadow는 반드시 매 호출마다 새 객체로 생성 (pptxgenjs 객체 변이 버그)
const makeShadow = () => ({
  type:"outer", color:"000000", blur:8, offset:3, angle:45, opacity:0.13
});
```

## 아이콘 생성 (react-icons → PNG base64)

```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaBookOpen, FaListUl, FaBullseye, FaCheckCircle,
        FaChartBar, FaLightbulb, FaCalendarAlt } = require("react-icons/fa");
const { MdSchool } = require("react-icons/md");

async function iconPng(Icon, color="#FFFFFF", size=256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(Icon, { color, size: String(size) })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
```

## 슬라이드 구성 (11슬라이드 표준)

| # | 제목 | 배경 | 핵심 요소 |
|---|------|------|---------|
| 01 | 타이틀 | navy | 대학명·분석기간·4개 정보카드·유튜브배지 |
| 02 | 통계 요약 | offW | 6개 stat-box (3×2) + 하단 포인트바 |
| 03 | 유형 개요 | navy | 좌4개 세로 + 우빈도 + 하단3개 가로 |
| 04 | TYPE-A 상세 | offW | 3단계 플로우 + 기출 3사례 카드 |
| 05 | TYPE-B/C 상세 | offW | 좌:B형 사례2개 / 우:C형 7변동표 |
| 06 | TYPE-D·E·F·G | offW | 2×2 카드 그리드 |
| 07 | 제시문 경향성 | navy | 독서5분야 + 문학6특징 |
| 08 | 연도별 변화 | offW | 연도별 테이블 (헤더+3행) |
| 09 | 채점 기준 | navy | 5원칙 + 4배점규칙 + 오답주의 |
| 10 | 대비 전략 | offW | 4유형 2×2 전략카드 |
| 11 | 마무리 | navy | 핵심정리 + 유튜브배지 + 학원정보 |

## 슬라이드별 핵심 코드 패턴

### 타이틀 슬라이드 (01)

```javascript
const s = pres.addSlide();
s.background = { color: C.navy };

// 상단 골드 라인
s.addShape(pres.shapes.RECTANGLE, {
  x:0, y:0, w:10, h:0.08, fill:{ color:C.gold }, line:{ color:C.gold }
});

// 좌측 메인 박스
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x:0.5, y:0.9, w:4.2, h:3.8,
  fill:{ color:C.purple, transparency:20 },
  line:{ color:C.purpleL }, rectRadius:0.15
});
s.addText("가천대학교\n약술형 논술", {
  x:0.75, y:1.1, w:3.7, h:1.6,
  fontSize:36, bold:true, color:C.white, fontFace:"Calibri",
  align:"left", valign:"top", margin:0
});
s.addText("국어 문항 분석", {
  x:0.75, y:2.65, w:3.7, h:0.55,
  fontSize:22, color:C.gold, fontFace:"Calibri", align:"left", margin:0
});

// 유튜브 배지
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x:0.5, y:5.0, w:4.2, h:0.45,
  fill:{ color:"C00000" }, line:{ color:"C00000" }, rectRadius:0.1
});
s.addText("▶  유튜브 채널 '입시를 보다'", {
  x:0.6, y:5.05, w:4.0, h:0.35,
  fontSize:13, bold:true, color:C.white, fontFace:"Calibri",
  align:"center", margin:0
});
```

### 섹션 헤더 공통 패턴

```javascript
// 모든 내용 슬라이드 상단에 아이콘 + 제목
s.addShape(pres.shapes.RECTANGLE, {
  x:0, y:0, w:10, h:0.07,
  fill:{ color:ACCENT_COLOR }, line:{ color:ACCENT_COLOR }
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x:0.4, y:0.18, w:0.42, h:0.42,
  fill:{ color:ACCENT_COLOR }, line:{ color:ACCENT_COLOR }, rectRadius:0.08
});
s.addImage({ data:iconData, x:0.47, y:0.26, w:0.28, h:0.28 });
s.addText("섹션 제목", {
  x:0.95, y:0.22, w:8.6, h:0.4,
  fontSize:20, bold:true, color:TEXT_COLOR, fontFace:"Calibri", margin:0
});
```

### stat-box 패턴 (통계 요약)

```javascript
// 3×2 그리드, 각 박스: w:2.9 h:1.7
const stats = [
  [C.purple, "7",    "국어 유형 수 (A~G형)", iconData1],
  [C.teal,   "6~9",  "형별 문항 수",          iconData2],
  // ...
];
stats.forEach(([col, num, label, ic], i) => {
  const x = 0.4 + (i % 3) * 3.1;
  const y = 0.9 + Math.floor(i / 3) * 2.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w:2.9, h:1.7,
    fill:{ color:col }, line:{ color:col },
    rectRadius:0.12, shadow: makeShadow()
  });
  s.addImage({ data:ic, x:x+0.15, y:y+0.18, w:0.38, h:0.38 });
  s.addText(num, {
    x:x+0.6, y:y+0.12, w:2.2, h:0.65,
    fontSize:32, bold:true, color:C.white, fontFace:"Calibri",
    align:"left", margin:0
  });
  s.addText(label, {
    x:x+0.1, y:y+0.85, w:2.7, h:0.55,
    fontSize:12, color:"CCEEFF", fontFace:"Calibri",
    align:"center", margin:0, wrap:true
  });
});
```

### 유형 카드 패턴 (2×2 그리드)

```javascript
const items = [
  { code:"TYPE-D", name:"개념어 분류·적용", col:"5B4FA0",
    desc:"설명 텍스트", answer:"정답 예시" },
  // ...
];
items.forEach((t, i) => {
  const x = i % 2 === 0 ? 0.4 : 5.1;
  const y = i < 2 ? 0.75 : 3.15;
  // 카드 배경
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w:4.5, h:2.2,
    fill:{ color:C.white }, line:{ color:C.gray1 },
    rectRadius:0.12, shadow: makeShadow()
  });
  // 컬러 헤더
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w:4.5, h:0.5,
    fill:{ color:t.col }, line:{ color:t.col }, rectRadius:0.12
  });
  s.addText(t.code, {
    x:x+0.1, y:y+0.04, w:1.2, h:0.25,
    fontSize:9.5, bold:true, color:"FFECB3", fontFace:"Calibri", margin:0
  });
  s.addText(t.name, {
    x:x+0.1, y:y+0.25, w:4.3, h:0.26,
    fontSize:13, bold:true, color:C.white, fontFace:"Calibri", margin:0
  });
  // 본문
  s.addText(t.desc, {
    x:x+0.12, y:y+0.58, w:4.28, h:1.08,
    fontSize:10.5, color:C.dark, fontFace:"Calibri",
    margin:0, wrap:true
  });
  // 정답 배지
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:x+0.1, y:y+1.76, w:4.3, h:0.32,
    fill:{ color:t.col, transparency:10 },
    line:{ color:t.col }, rectRadius:0.06
  });
  s.addText("정답 예시: "+t.answer, {
    x:x+0.2, y:y+1.79, w:4.1, h:0.26,
    fontSize:10, bold:true, color:C.white, fontFace:"Calibri", margin:0
  });
});
```

### 학원 정보 섹션 (마지막 슬라이드)

```javascript
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x:0.4, y:3.25, w:9.2, h:2.18,
  fill:{ color:C.dark }, line:{ color:C.purpleL }, rectRadius:0.14
});
const infos = [
  ["개강", "2025년 7월 20일 (월) · 주 5일 집중반"],
  ["전화", "010-2740-9317"],
  ["주소", "인천 미추홀구 주안로 213번길 15, 간석역플라자 4층"],
  ["교통", "인천 간석역 1번 출구 도보 1분"],
];
infos.forEach(([label, val], i) => {
  s.addText(label, {
    x:0.55, y:4.02+i*0.35, w:0.7, h:0.3,
    fontSize:11, bold:true, color:C.gold, fontFace:"Calibri", margin:0
  });
  s.addText(val, {
    x:1.3, y:4.02+i*0.35, w:7.9, h:0.3,
    fontSize:11, color:C.gray1, fontFace:"Calibri", margin:0
  });
});
```

## 파일 저장 및 QA

```javascript
// 저장
await pres.writeFile({ fileName: "/mnt/user-data/outputs/{대학명}_약술형논술_분석.pptx" });

// QA: PDF 변환 → 이미지 → 육안 확인
// python3 /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to pdf output.pptx
// rm -f slide-*.jpg && pdftoppm -jpeg -r 150 output.pdf slide
// view tool로 각 슬라이드 이미지 확인
```

## 주의사항 (Common Pitfalls)

1. **hex 색상에 "#" 절대 금지** — 파일 손상 발생
2. **shadow 객체 재사용 금지** — `makeShadow()` 호출로 매번 새 객체 생성
3. **8자리 hex 금지** — opacity는 별도 속성으로
4. `rectRadius`는 `ROUNDED_RECTANGLE`에만 작동 (RECTANGLE에 쓰면 무시됨)
5. **텍스트 overflow 방지** — 긴 텍스트는 `wrap:true` + 충분한 `h` 확보
6. **한국어 폰트** — `fontFace:"Calibri"` 사용 (LibreOffice QA 환경 호환)
