---
name: "sahoe-exam-ppt-instructor"
description: "사탐 시험 PDF/exam.json으로 강사용 해설 PPT 제작: 문제풀이 반분할 + 자료 분석 상세 풀이 + 개념 정리 슬라이드(+ 상호 비판 화살표 직독직해 장)."
---

# 사탐 강사용 해설 PPT (반분할 + 자료 분석 + 개념 정리)

사회탐구(생활과 윤리·사회문화 등) 회차 하나를 PPT로 만든다. 문항 1개당 슬라이드는 최대 3장이다.

1. **문제풀이 슬라이드(반분할)** — 모든 문항
   - 왼쪽 = 문제 원문 그대로 (발문, 제시문, <보기>, 선지, 도표·그림)
   - 오른쪽 = ① 무엇을 묻나 ② 결정적 단서 ③ 선지별 판정(○✕ + 함정 유형) ④ 정답 루트
   - 발표자 노트 = 판서 / 발문 / 매력적 오답 (teacher 필드)
2. **자료 분석 상세 풀이 슬라이드** — 표·그래프·도식·통계·계산·연구 설계·대화 자료 문항만 (순수 개념 판별 문항은 생략). 회차당 8~13문항.
   - 왼쪽 = 이 자료가 어려운 이유와 전략 한 줄 + STEP 3~4개(왜? → 이렇게 → 결과)
   - 오른쪽 = 자료 읽는 법(legend) / 빈칸을 채운 완성표·정리표 / 검산 / 학생이 자주 하는 실수 2개
3. **개념 정리 슬라이드** — 모든 문항 (문항 뒤에 한 장씩)
   - 핵심 개념 3~5문장 + 비교표(비교가 핵심일 때) + 시험 포인트(이 문항의 함정 원인)
4. 상호 비판 화살표 문항("A~F에 해당하는 비판")은 바로 뒤에 **선지 직독직해** 장을 한 장 더 붙인다 (생활과 윤리).

슬라이드 순서: 문제풀이 → (자료 분석 상세 풀이) → 개념 정리 → (직독직해) → 다음 문항. 표지 1장 + 정답표가 맨 앞에 온다. 회차당 약 49~54장.

## 0단계: 입력 확인 (exam.json이 없을 때)

사용자가 시험지 PDF만 올릴 수도 있다 (예: 수능 1개 + 모평 2개 + 학평 4개를 한꺼번에). 이때는 `sahoe-exam-analysis` 스킬의 exam.json 스키마를 슬림 버전으로 직접 만든다.

1. 회차별 폴더를 만들고 `exam.pdf`와 `pages/p-NN.jpg`(`pdftoppm -jpeg -r 110`)를 둔다. 폴더명 예: `2022수능`, `2022_9모`, `2021_3학평`.
2. **PDF 뒤쪽에 공식 정답표와 해설이 같이 실려 있는 경우가 많다** (수능·모평은 EBSi 정답 및 해설 페이지가 5쪽부터, 학평은 마지막 쪽). pdftotext로는 글자가 안 나올 수 있으니 `pages/` 이미지를 직접 읽어 정답표를 확보한다. 풀이 후 이 표와 대조하는 것이 가장 신뢰할 수 있는 검증이다. (웹 검색으로는 EBSi 정답 PDF를 못 찾는 일이 많다.)
3. 회차별로 서브에이전트 1개씩 병렬로 exam.json을 만든다. 프롬프트는 반드시 완성된 본문을 넣는다 (자리표시자만 보내면 에이전트가 아무것도 못 한다). 필수 지시: pages 이미지를 Read로 직접 보고 원문 전사, 모든 문항 직접 풀이, 표·비율 문항은 python 재계산, 표·그래프·도식 영역은 `pdftoppm -r 200` + PIL로 크롭해 `figs/qN.png` 저장 후 육안 확인, 정답표 대조 후 `official_answer` 기록.
4. 에이전트가 만든 정답을 **공식 정답표와 반드시 1:1 대조**한다. 실제 사례: 에이전트가 정답표를 못 찾고 "공식 정답 없음"으로 보고했고, 수능 15번(표 계산), 9모 3번·8번에서 정답과 선지 판정이 틀렸다. 불일치 문항은 해설 페이지를 읽고 choices의 ox/why/answer, solution을 고친다. 에이전트가 선지 원문을 잘못 옮긴 경우(9모 8번 ⑤)도 있으니 의심되면 원본 이미지로 대조한다.
5. 개념 정리와 자료 분석 상세 풀이는 정답 확정 이후 에이전트가 exam.json에 필드를 덧붙이게 한다 (아래 스키마). 이때 "다른 필드는 절대 수정·삭제 금지"를 명시한다.

## 선행 조건

- PPT 기술 규칙은 `pptx` 스킬을 먼저 읽는다. pptxgenjs + `scripts/apply_theme.js`(pptx 스킬 폴더 안)를 쓴다. 경로는 `find / -name apply_theme.js 2>/dev/null`로 찾는다 (예: `/mnt/skills/public/pptx/scripts/apply_theme.js`).
- 실행: `NODE_PATH=$(npm root -g) node build2.js`

## exam.json에서 쓰는 필드

`questions[]` 각 문항: `no, points, title, unit, polarity, stem, material, bogi[{key,text,ox,why,trap}], choices[{no,text|combo,ox,why,trap}], answer, official_answer, figure(상대경로), solution{stem_analysis, clues[{quote,meaning}], fast_route}, teacher{board,question,attractive_wrong}`, 그리고 새로 추가된 두 필드. 최상위 `title, subject`.

```json
"concept": {
  "title": "개념 묶음 이름 (예: 일탈 이론 — 낙인 이론 vs 차별 교제 이론)",
  "points": ["핵심 개념 3~5문장, 각 70자 이내, 단정형"],
  "table": {"head": ["구분","A","B"], "rows": [["…","…","…"]]},
  "tip": "이 문항의 시험 포인트·함정 원인 1~2문장(120자 이내)"
}
```
- table은 비교가 핵심일 때 반드시(열 2~4, 행 3~6, 칸 30자 이내), 아니면 null.

```json
"walkthrough": {
  "intro": "이 자료가 왜 어려운지 + 해결 전략 한 줄 (110자)",
  "legend": [{"item": "표의 열/행/각주/기호", "plain": "무엇 대비 무엇인지, 기준(분모·100)이 누구인지 + 숫자 예 (60자)"}],
  "steps": [{"title": "STEP 제목(12자)", "why": "왜 필요한가(50자)", "how": "숫자를 전부 전개한 계산·읽기, 연산 의미를 말로(110자)", "result": "결과(45자)"}],
  "table": {"head": [], "rows": []},
  "check": "안 쓴 숫자로 검산(100자)",
  "pitfalls": ["학생이 하는 실수와 이유(80자) x2"]
}
```
- legend 2~4개, steps 3~4개(마지막은 선지 판정에 연결), table 행 6 이하·열 5 이하·칸 20자 이내(없으면 null).
- 수치는 반드시 python으로 재계산한다. 가상 숫자(인구 100명 등)를 쓰면 왜 그 숫자를 골랐는지 쓴다. 도식 문항은 "관점/기관 × 질문" O/X 패턴표를 쓴다.
- 대상: figure가 있는 문항은 반드시, 없어도 표·수치·연구 설계·대화 자료 분석형이면 포함. 순수 개념 판별 문항은 walkthrough 키를 만들지 않는다.

## 규칙 (지킬 것)

1. **왼쪽 원문은 요약·의역 금지.** exam.json의 stem/material/bogi/choices를 그대로 쓴다. HTML은 태그를 먼저 제거한 뒤 `html.unescape` 한다 (순서가 반대면 `<보기>`가 사라진다). `<br>`은 줄바꿈으로 바꾼다.
2. 오른쪽 문장은 해설 원문을 **문장 단위로** 줄인다 (`brief`). 단어 중간이나 문장 중간에서 자르지 않는다. 선지 판정은 92자 안팎, 정답 루트 150자 안팎.
3. 글자 크기는 글 길이로 자동 조절하고 (`sizeFor`), 그림이 있으면 그림 최대 높이를 줄인다. **렌더링해서 넘침을 눈으로 확인**한다.
4. 색은 SchemeColor/테마(hex는 `#` 없이)로만 지정한다. 폰트 맑은 고딕, 레이아웃 LAYOUT_WIDE(13.33×7.5). 문제풀이 번호 원=남색, 자료 분석=초록, 개념 정리=금색으로 구분한다.
5. 파일 이름: `<과목>_<연도>_<회차>_강사용_반분할.pptx` (예: `사회문화_2022_9월모평_강사용_반분할.pptx`). 완성 파일은 `/mnt/user-data/outputs/<폴더>/`에 두고 SendUserFile로 보낸다 (스크립트가 만든 파일은 SendUserFile이 필요하다).
6. 검증: `scripts/office/validate.py` → `soffice.py --headless --convert-to pdf` → `pdftoppm -jpeg -r 60~75`로 글이 가장 긴 문항, 그림 문항, 자료 분석 슬라이드, 개념 정리 슬라이드를 직접 열어 본다. 몽타주로 훑는다.
7. 사용자에게는 한두 문장으로 무엇을 만들었는지만 알리고, 공식 정답과 대조해 고친 문항·저신뢰 문항·직접 풀어 쓴 부분(예: 자료만으로 확정이 어려운 문항)을 한 줄로 밝힌다.

## 1단계: 데이터 추출 `prep2.py`

여러 회차를 한 번에 처리한다. 폴더 위치는 `B` 상수, 회차 목록은 `EXAMS`에 쓴다.

```python
import json,re,html
def clean(s):
    s=str(s or "")
    s=re.sub(r"<br\s*/?>","\n",s); s=re.sub(r"</tr>","\n",s); s=re.sub(r"</t[dh]>"," | ",s)
    s=re.sub(r"<[^>]+>","",s); s=html.unescape(s)
    s=re.sub(r"[ \t]+"," ",s); s=re.sub(r"\n\s*\n+","\n",s)
    return s.strip()
def one(s): return re.sub(r"\s+"," ",clean(s))
def first(s,mx):
    s=one(s)
    parts=re.split(r"(?<=[다요함임])\.\s+|(?<=\.)\s+(?=[①-⑤※\(])",s)
    t=parts[0]
    if len(t)<=mx: return t
    cut=t[:mx]; k=max(cut.rfind(", "),cut.rfind(" "))
    return cut[:k if k>mx*0.5 else mx].rstrip(",· ")+"…"
def brief(s,mx):
    s=one(s)
    parts=re.split(r"(?<=[다요함임])\.\s+|(?<=\.)\s+(?=[①-⑤※\(])",s)
    acc=""
    for p in parts:
        nxt=(acc+" "+p).strip() if acc else p
        if len(nxt)<=mx: acc=nxt
        else:
            if not acc: return first(p,mx)
            break
    return acc
CIR="①②③④⑤"
B="/home/claude/work/"
# (폴더, 키, 표지 라벨, 출력 파일명) — 회차마다 바꾼다
EXAMS=[("2022수능","2022 수능","2022학년도 대학수학능력시험","사회문화_2022_수능_강사용_반분할.pptx")]
out={}
for d,key,label,fname in EXAMS:
    j=json.load(open(f"{B}{d}/exam.json"))
    qs=[]
    for q in j["questions"]:
        s=q["solution"]
        bogi=[{"k":b["key"],"t":clean(b["text"])} for b in q.get("bogi",[])]
        if bogi:   # <보기> 조합형
            choices=[{"n":CIR[c["no"]-1],"t":", ".join(c["combo"])} for c in q["choices"]]
            verd=[{"l":b["key"],"ok":b["ox"]=="O","t":brief(b["why"],92)+("  ["+b["trap"]+"]" if b.get("trap") else "")} for b in q["bogi"]]
            vhead="<보기> 판정 → 정답 조합"
            combo=[c for c in q["choices"] if c["no"]==q["answer"]][0]["combo"]
            vtail=f"정답 조합 {', '.join(combo)} → {CIR[q['answer']-1]}"
        else:
            choices=[{"n":CIR[c["no"]-1],"t":clean(c["text"])} for c in q["choices"]]
            verd=[{"l":CIR[c["no"]-1],"ok":c["ox"]=="O","t":brief(c["why"],92)+("  ["+c["trap"]+"]" if c.get("trap") else "")} for c in q["choices"]]
            vhead="선지별 판정"; vtail=""
        ask=brief(s.get("stem_analysis",""),110)
        clues=[{"q":first(c["quote"],40),"m":first(c["meaning"],46)} for c in s.get("clues",[])[:3]]
        fig=f"{B}{d}/{q['figure']}" if q.get("figure") else None
        t=q.get("teacher") or {}
        qs.append(dict(no=q["no"],pts=q["points"],unit=one(q["unit"]).split(">")[-1].strip(),title=one(q["title"]),
            pol=q.get("polarity") or "",stem=clean(q["stem"]),material=clean(q["material"]),bogi=bogi,choices=choices,fig=fig,
            ask=ask,clues=clues,verd=verd,vhead=vhead,vtail=vtail,route=brief(s.get("fast_route",""),150),
            ans=CIR[q["answer"]-1],concept=q.get("concept"),walk=q.get("walkthrough"),
            notes="판서: "+one(t.get("board",""))+"\n발문: "+one(t.get("question",""))+"\n매력적 오답: "+one(t.get("attractive_wrong",""))))
    out[key]=dict(label=label,title=one(j["title"]),subject=one(j.get("subject","")) or "사회탐구",file=fname,qs=qs)
json.dump(out,open("data2.json","w"),ensure_ascii=False,indent=1)
for k,v in out.items(): print(k,v["title"],len(v["qs"]),sum(1 for q in v["qs"] if q["fig"]))
```

## 2단계: 슬라이드 빌드 `build2.js`

상단 `APPLY`는 pptx 스킬의 `scripts/apply_theme.js`. 출력 폴더 `OUT`에 회차별 파일을 쓴다. 한 파일 안에서 문항마다 (문제풀이 → 자료 분석 → 개념 정리 → 직독직해) 순서로 슬라이드를 만든다. 레이아웃 상수: `LX=0.45, LW=6.1, PY=1.15, PH=5.88, RX=6.75, RW=6.13`.

```javascript
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.APPLY_THEME || "/mnt/skills/public/pptx/scripts/apply_theme.js");
const data = require("./data2.json");
let ARROW = {}; try { ARROW = require("./arrow.js"); } catch (e) {}
const OUT = "/mnt/user-data/outputs/사회문화_강사용PPT/";
require("fs").mkdirSync(OUT, { recursive: true });
const FONT = "맑은 고딕";
const THEME = { name: "사탐 강사용", headFontFace: FONT, bodyFontFace: FONT, colors: {
  dk1: "1F2937", lt1: "FFFFFF", dk2: "1E1B4B", lt2: "EEF0FA",
  accent1: "4338CA", accent2: "D4A017", accent3: "1E8449", accent4: "C0392B", accent5: "6B7280", accent6: "0E7490",
  hlink: "4338CA", folHlink: "6B7280" } };

function leftRuns(q, fs) {
  const r = [];
  const push = (text, o = {}) => r.push({ text, options: { fontSize: fs, ...o } });
  push(q.stem, { bold: true, breakLine: true, paraSpaceAfter: 6 });
  if (q.material) q.material.split("\n").forEach((ln) => {
    const m = ln.match(/^(\([가-라]\)|[갑을병정]:|[가-라]\.|ㄱ\.|ㄴ\.|ㄷ\.|ㄹ\.)\s*(.*)$/s);
    if (m) { push(m[1] + " ", { bold: true, color: "4338CA" }); push(m[2], { breakLine: true, paraSpaceAfter: 3 }); }
    else push(ln, { breakLine: true, paraSpaceAfter: 3 });
  });
  if (q.bogi.length) {
    push("<보기>", { bold: true, breakLine: true, paraSpaceBefore: 4, paraSpaceAfter: 2 });
    q.bogi.forEach(b => { push(b.k + ". ", { bold: true, color: "4338CA" }); push(b.t, { breakLine: true, paraSpaceAfter: 2 }); });
    push(q.choices.map(c => c.n + " " + c.t).join("    "), { breakLine: false, paraSpaceBefore: 6 });
  } else {
    r.push({ text: "", options: { fontSize: 4, breakLine: true } });
    q.choices.forEach((c, i) => { push(c.n + " ", { bold: true, color: "4338CA" }); push(c.t, { breakLine: i < q.choices.length - 1, paraSpaceAfter: 2 }); });
  }
  return r;
}
const textLen = (q) => q.stem.length + q.material.length + q.bogi.reduce((a, b) => a + b.t.length + 3, 0) + q.choices.reduce((a, c) => a + c.t.length + 3, 0);
function sizeFor(q) {
  const n = textLen(q);
  let fs = n <= 330 ? 13 : n <= 430 ? 12 : n <= 560 ? 11 : n <= 680 ? 10.5 : 10;
  if (q.fig) fs = Math.min(fs, n <= 480 ? 10.5 : n <= 560 ? 10 : 9.5);
  return fs;
}
const imgSize = (p) => { const { execSync } = require("child_process"); return execSync(`python3 -c "from PIL import Image;print(*Image.open('${p}').size)"`).toString().trim().split(" ").map(Number); };

async function build(key) {
  const d = data[key]; const fname = OUT + d.file; const label = d.label;
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  pres.title = d.title + " 강사용 해설";
  const C = pres.SchemeColor;
  pres.defineSlideMaster({ title: "COVER", background: { color: C.text2 }, objects: [] });
  pres.defineSlideMaster({ title: "Q", background: { color: C.background1 },
    objects: [{ text: { text: label + " · " + d.subject + " · 강사용 해설 (좌: 문제 원문 / 우: 해설)", options: { x: 0.45, y: 7.12, w: 9, h: 0.28, fontSize: 9.5, color: C.accent5, margin: 0 } } }],
    slideNumber: { x: 12.3, y: 7.12, w: 0.6, h: 0.28, fontSize: 9.5, color: C.accent5, align: "right" } });

  const LX = 0.45, LW = 6.1, PY = 1.15, PH = 5.88, RX = 6.75, RW = 6.13;
  // 표지 + 정답표 (20문항, 한 줄 10칸)
  let s = pres.addSlide({ masterName: "COVER" });
  s.addText(label, { x: 0.7, y: 0.9, w: 12, h: 0.5, fontSize: 18, color: C.accent2, bold: true, isTextBox: true, margin: 0 });
  s.addText(d.subject + " 강사용 해설", { x: 0.7, y: 1.5, w: 12, h: 1.0, fontSize: 44, bold: true, color: C.background1, isTextBox: true, margin: 0 });
  s.addText("문제풀이 · 자료 분석 상세 풀이 · 개념 정리", { x: 0.7, y: 2.6, w: 12, h: 0.5, fontSize: 16, color: C.background2, isTextBox: true, margin: 0 });
  s.addText("정답표", { x: 0.7, y: 3.7, w: 3, h: 0.4, fontSize: 14, bold: true, color: C.accent2, isTextBox: true, margin: 0 });
  d.qs.forEach((q, i) => {
    const col = i % 10, row = Math.floor(i / 10);
    const x = 0.7 + col * 1.2, y = 4.2 + row * 1.25;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 1.05, h: 1.05, fill: { color: C.background2 }, rectRadius: 0.1, objectName: "ans" + q.no });
    s.addText(String(q.no), { x, y: y + 0.08, w: 1.05, h: 0.3, fontSize: 11, color: C.accent5, align: "center", isTextBox: true, margin: 0 });
    s.addText(q.ans, { x, y: y + 0.38, w: 1.05, h: 0.55, fontSize: 26, bold: true, color: C.text2, align: "center", isTextBox: true, margin: 0 });
  });

  for (const q of d.qs) {
    // ── (1) 문제풀이 반분할 슬라이드 ──
    s = pres.addSlide({ masterName: "Q" });
    s.addNotes(q.notes);
    s.addShape(pres.shapes.OVAL, { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fill: { color: C.text2 }, objectName: "no" });
    s.addText(String(q.no), { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addText([{ text: q.title, options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } },
               { text: q.unit + "  ·  " + q.pts + "점" + (q.pol ? "  ·  발문: " + q.pol + " 것" : ""), options: { fontSize: 10.5, color: C.accent5 } }],
      { x: 1.3, y: 0.25, w: 9.9, h: 0.78, valign: "middle", isTextBox: true, margin: 0, objectName: "title" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 11.45, y: 0.28, w: 1.43, h: 0.7, fill: { color: C.accent1 }, rectRadius: 0.12, objectName: "answer" });
    s.addText([{ text: "정답 ", options: { fontSize: 13 } }, { text: q.ans, options: { fontSize: 26, bold: true } }],
      { x: 11.45, y: 0.28, w: 1.43, h: 0.7, color: C.background1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: PY, w: LW, h: PH, fill: { color: C.background2 }, rectRadius: 0.1, objectName: "leftcard" });
    s.addText("문제 원문", { x: LX + 0.22, y: PY + 0.1, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
    let figH = 0, figW = 0;
    if (q.fig) {
      const [iw, ih] = imgSize(q.fig);
      const nn = textLen(q);
      const maxW = LW - 0.44, maxH = nn > 600 ? 1.6 : nn > 500 ? 1.85 : 2.15;
      let w = maxW, h = w * ih / iw; if (h > maxH) { h = maxH; w = h * iw / ih; }
      figW = w; figH = h;
    }
    const textH = PH - 0.5 - (figH ? figH + 0.2 : 0) - 0.1;
    s.addText(leftRuns(q, sizeFor(q)), { x: LX + 0.22, y: PY + 0.45, w: LW - 0.44, h: textH, valign: "top", color: C.text1, isTextBox: true, margin: 0, objectName: "qtext", lineSpacingMultiple: 1.05 });
    if (q.fig) s.addImage({ path: q.fig, x: LX + 0.22 + (LW - 0.44 - figW) / 2, y: PY + PH - figH - 0.15, w: figW, h: figH, altText: "문항 " + q.no + " 도표·그림" });

    const card = (y, h, fill, line, name) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX, y, w: RW, h, fill: { color: fill }, line: line ? { color: line, width: 1 } : undefined, rectRadius: 0.1, objectName: name });
    const head = (t, y, color) => s.addText(t, { x: RX + 0.2, y: y + 0.07, w: 4, h: 0.28, fontSize: 12, bold: true, color, isTextBox: true, margin: 0 });
    let y = PY;
    card(y, 0.82, C.background1, "C7CAD9", "askcard"); head("무엇을 묻나", y, C.accent1);
    s.addText(q.ask, { x: RX + 0.2, y: y + 0.36, w: RW - 0.4, h: 0.42, fontSize: 10, color: C.text1, valign: "top", isTextBox: true, margin: 0, objectName: "ask" });
    y += 0.92;
    card(y, 1.55, C.background1, "C7CAD9", "cluecard"); head("결정적 단서", y, C.accent1);
    const cr = [];
    q.clues.forEach((c, i) => { cr.push({ text: "“" + c.q + "” ", options: { bold: true, color: C.text2, fontSize: 10 } }); cr.push({ text: "→ " + c.m, options: { color: C.text1, fontSize: 10, breakLine: i < q.clues.length - 1, paraSpaceAfter: 4 } }); });
    s.addText(cr, { x: RX + 0.2, y: y + 0.38, w: RW - 0.4, h: 1.12, valign: "top", isTextBox: true, margin: 0, objectName: "clues" });
    y += 1.65;
    const AR = ARROW[key + "-" + q.no];
    if (AR) q.vtail = (q.vtail ? q.vtail + "    " : "") + "▶ 다음 장: 선지 직독직해";
    card(y, 2.4, C.background1, "C7CAD9", "verdcard"); head(q.vhead, y, C.accent1);
    const vr = [];
    q.verd.forEach((v, i) => {
      vr.push({ text: v.l + (v.ok ? " ○ " : " ✕ "), options: { bold: true, color: v.ok ? C.accent3 : C.accent4, fontSize: 9.5 } });
      vr.push({ text: v.t, options: { color: C.text1, fontSize: 9.5, breakLine: i < q.verd.length - 1 || !!q.vtail, paraSpaceAfter: 3 } });
    });
    if (q.vtail) vr.push({ text: q.vtail, options: { bold: true, color: C.accent1, fontSize: 10 } });
    s.addText(vr, { x: RX + 0.2, y: y + 0.38, w: RW - 0.4, h: 1.98, valign: "top", isTextBox: true, margin: 0, objectName: "verdicts" });
    y += 2.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX, y, w: RW, h: PY + PH - y, fill: { color: C.text2 }, rectRadius: 0.1, objectName: "routecard" });
    s.addText([{ text: "정답 루트  ", options: { bold: true, color: C.accent2, fontSize: 11 } }, { text: q.route, options: { color: C.background1, fontSize: 10.5 } }],
      { x: RX + 0.2, y, w: RW - 0.4, h: PY + PH - y, valign: "middle", isTextBox: true, margin: 0, objectName: "route" });

    // ── (2) 자료 분석 상세 풀이 (walkthrough 있는 문항만) ──
    const wk = q.walk;
    if (wk) {
      const s4 = pres.addSlide({ masterName: "Q" });
      s4.addNotes(q.notes);
      s4.addShape(pres.shapes.OVAL, { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fill: { color: C.accent3 }, objectName: "no" });
      s4.addText(String(q.no), { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
      s4.addText([{ text: "자료 분석 상세 풀이 · " + q.title, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } },
                  { text: q.no + "번  ·  정답 " + q.ans + "  ·  왜 이렇게 읽고, 왜 이렇게 계산하는가", options: { fontSize: 10.5, color: C.accent5 } }],
        { x: 1.3, y: 0.25, w: 11.5, h: 0.78, valign: "middle", isTextBox: true, margin: 0, objectName: "title" });
      const LW2 = 7.55, RX2 = LX + LW2 + 0.2, RW2 = 12.88 - RX2;
      s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: PY, w: LW2, h: 0.72, fill: { color: C.text2 }, rectRadius: 0.1, objectName: "introcard" });
      s4.addText([{ text: "이 자료가 어려운 이유와 전략  ", options: { bold: true, color: C.accent2, fontSize: 10.5 } }, { text: wk.intro, options: { color: C.background1, fontSize: 11 } }],
        { x: LX + 0.2, y: PY, w: LW2 - 0.4, h: 0.72, valign: "middle", isTextBox: true, margin: 0, objectName: "intro" });
      const n = wk.steps.length, gap = 0.1, top = PY + 0.82, avail = PH - 0.82;
      const sh = (avail - gap * (n - 1)) / n;
      wk.steps.forEach((st, i) => {
        const yy = top + i * (sh + gap);
        s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: yy, w: LW2, h: sh, fill: { color: C.background2 }, rectRadius: 0.08, objectName: "step" + i });
        s4.addShape(pres.shapes.OVAL, { x: LX + 0.15, y: yy + 0.12, w: 0.42, h: 0.42, fill: { color: C.accent1 }, objectName: "sb" + i });
        s4.addText(String(i + 1), { x: LX + 0.15, y: yy + 0.12, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
        s4.addText([
          { text: "STEP " + (i + 1) + "  " + st.title, options: { bold: true, color: C.text2, fontSize: 12, breakLine: true, paraSpaceAfter: 3 } },
          { text: "왜?  ", options: { bold: true, color: C.accent4, fontSize: 10 } }, { text: st.why, options: { fontSize: 10, breakLine: true, paraSpaceAfter: 2 } },
          { text: "이렇게  ", options: { bold: true, color: C.accent1, fontSize: 10 } }, { text: st.how, options: { fontSize: 10.5, breakLine: true, paraSpaceAfter: 2 } },
          { text: "결과  ", options: { bold: true, color: C.accent3, fontSize: 10 } }, { text: st.result, options: { fontSize: 10, bold: true, color: C.accent3 } }
        ], { x: LX + 0.7, y: yy + 0.05, w: LW2 - 0.85, h: sh - 0.1, valign: "middle", isTextBox: true, margin: 0, objectName: "steptext" + i });
      });
      const hasWT = wk.table && wk.table.rows && wk.table.rows.length;
      const legH = 1.75, tabH = hasWT ? 1.95 : 0;
      let ry = PY;
      s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX2, y: ry, w: RW2, h: legH, fill: { color: C.background1 }, line: { color: "C7CAD9", width: 1 }, rectRadius: 0.1, objectName: "legcard" });
      s4.addText("자료 읽는 법", { x: RX2 + 0.15, y: ry + 0.06, w: 3, h: 0.26, fontSize: 11.5, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
      const lr = [];
      wk.legend.forEach((l, i) => { lr.push({ text: l.item + "  ", options: { bold: true, color: C.text2, fontSize: 9.5 } }); lr.push({ text: l.plain, options: { fontSize: 9.5, breakLine: i < wk.legend.length - 1, paraSpaceAfter: 3 } }); });
      s4.addText(lr, { x: RX2 + 0.15, y: ry + 0.36, w: RW2 - 0.3, h: legH - 0.42, valign: "top", isTextBox: true, margin: 0, objectName: "legend" });
      ry += legH + 0.1;
      if (hasWT) {
        s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX2, y: ry, w: RW2, h: tabH, fill: { color: C.background1 }, line: { color: "C7CAD9", width: 1 }, rectRadius: 0.1, objectName: "wtcard" });
        s4.addText("완성표 · 정리표", { x: RX2 + 0.15, y: ry + 0.06, w: 3, h: 0.26, fontSize: 11.5, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
        const nc = wk.table.head.length;
        const rows = [wk.table.head.map(h => ({ text: String(h), options: { bold: true, color: C.background1, fill: { color: C.text2 }, align: "center", valign: "middle", fontSize: 9 } }))];
        wk.table.rows.forEach(r => rows.push(r.map((c, ci) => ({ text: String(c), options: { fontSize: 9, bold: ci === 0, color: C.text1, fill: { color: ci === 0 ? C.background2 : C.background1 }, valign: "middle", align: "center" } }))));
        const f0 = Math.min(1.1, (RW2 - 0.3) * 0.25);
        const colW = [f0].concat(Array(nc - 1).fill((RW2 - 0.3 - f0) / (nc - 1)));
        s4.addTable(rows, { x: RX2 + 0.15, y: ry + 0.36, w: RW2 - 0.3, colW, border: { type: "solid", pt: 0.5, color: "C7CAD9" }, margin: 0.03, fontFace: FONT });
        ry += tabH + 0.1;
      }
      s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX2, y: ry, w: RW2, h: PY + PH - ry, fill: { color: C.background2 }, rectRadius: 0.1, objectName: "chkcard" });
      const cr2 = [{ text: "검산  ", options: { bold: true, color: C.accent3, fontSize: 9.5 } }, { text: wk.check, options: { fontSize: 9.5, breakLine: true, paraSpaceAfter: 3 } }];
      wk.pitfalls.forEach((p, i) => { cr2.push({ text: "함정  ", options: { bold: true, color: C.accent4, fontSize: 9.5 } }); cr2.push({ text: p, options: { fontSize: 9.5, breakLine: i < wk.pitfalls.length - 1, paraSpaceAfter: 2 } }); });
      s4.addText(cr2, { x: RX2 + 0.15, y: ry, w: RW2 - 0.3, h: PY + PH - ry, valign: "middle", isTextBox: true, margin: 0, objectName: "check" });
    }

    // ── (3) 개념 정리 (모든 문항) ──
    const cp = q.concept;
    if (cp) {
      const s3 = pres.addSlide({ masterName: "Q" });
      s3.addNotes(q.notes);
      s3.addShape(pres.shapes.OVAL, { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fill: { color: C.accent2 }, objectName: "no" });
      s3.addText(String(q.no), { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.text2, align: "center", valign: "middle", isTextBox: true, margin: 0 });
      s3.addText([{ text: "개념 정리 · " + cp.title, options: { fontSize: 18, bold: true, color: C.text1, breakLine: true } },
                  { text: q.no + "번 " + q.title + "  ·  정답 " + q.ans, options: { fontSize: 10.5, color: C.accent5 } }],
        { x: 1.3, y: 0.25, w: 11.5, h: 0.78, valign: "middle", isTextBox: true, margin: 0, objectName: "title" });
      const hasT = cp.table && cp.table.rows && cp.table.rows.length;
      const tipH = 0.95, bodyH = PH - tipH - 0.15;
      const pw = hasT ? 5.6 : 12.43;
      s3.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: PY, w: pw, h: bodyH, fill: { color: C.background2 }, rectRadius: 0.1, objectName: "pcard" });
      s3.addText("핵심 개념", { x: LX + 0.22, y: PY + 0.1, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
      const pts = cp.points.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, fontSize: hasT ? 13 : 15, breakLine: i < cp.points.length - 1, paraSpaceAfter: 9 } }));
      s3.addText(pts, { x: LX + 0.22, y: PY + 0.5, w: pw - 0.44, h: bodyH - 0.6, valign: "top", color: C.text1, isTextBox: true, margin: 0, objectName: "points" });
      if (hasT) {
        const tx = LX + pw + 0.2, tw = 12.88 - tx;
        s3.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx, y: PY, w: tw, h: bodyH, fill: { color: C.background1 }, line: { color: "C7CAD9", width: 1 }, rectRadius: 0.1, objectName: "tcard" });
        s3.addText("비교 정리", { x: tx + 0.2, y: PY + 0.1, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
        const nc = cp.table.head.length;
        const rows = [cp.table.head.map(h => ({ text: h, options: { bold: true, color: C.background1, fill: { color: C.text2 }, align: "center", valign: "middle", fontSize: 11.5 } }))];
        cp.table.rows.forEach(r => rows.push(r.map((c, ci) => ({ text: String(c), options: { fontSize: 11, bold: ci === 0, color: C.text1, fill: { color: ci === 0 ? C.background2 : C.background1 }, valign: "middle", align: ci === 0 ? "center" : "left" } }))));
        const first = Math.min(1.6, (tw - 0.4) * 0.26);
        const colW = [first].concat(Array(nc - 1).fill((tw - 0.4 - first) / (nc - 1)));
        s3.addTable(rows, { x: tx + 0.2, y: PY + 0.5, w: tw - 0.4, colW, border: { type: "solid", pt: 0.75, color: "C7CAD9" }, margin: 0.06, fontFace: FONT });
      }
      const ty = PY + bodyH + 0.15;
      s3.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: ty, w: 12.43, h: tipH, fill: { color: C.text2 }, rectRadius: 0.1, objectName: "tipcard" });
      s3.addText([{ text: "시험 포인트  ", options: { bold: true, color: C.accent2, fontSize: 12 } }, { text: cp.tip, options: { color: C.background1, fontSize: 12 } }],
        { x: LX + 0.25, y: ty, w: 12.0, h: tipH, valign: "middle", isTextBox: true, margin: 0, objectName: "tip" });
    }

    // ── (4) 화살표 비판 문항: 선지 직독직해 장 (생활과 윤리, arrow.js에 있는 문항만) ──
    if (AR) {
      const s2 = pres.addSlide({ masterName: "Q" });
      s2.addNotes(q.notes);
      s2.addShape(pres.shapes.OVAL, { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fill: { color: C.accent1 }, objectName: "no" });
      s2.addText(String(q.no), { x: 0.45, y: 0.28, w: 0.7, h: 0.7, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
      s2.addText([{ text: AR.title, options: { fontSize: 16, bold: true, color: C.text1, breakLine: true } },
                  { text: q.title + "  ·  정답 " + q.ans, options: { fontSize: 10.5, color: C.accent5 } }],
        { x: 1.3, y: 0.25, w: 11.5, h: 0.78, valign: "middle", isTextBox: true, margin: 0, objectName: "title" });
      s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: LX, y: PY, w: LW, h: PH, fill: { color: C.background2 }, rectRadius: 0.1, objectName: "leftcard" });
      s2.addText("먼저 읽는 법", { x: LX + 0.22, y: PY + 0.1, w: 3, h: 0.3, fontSize: 12, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
      const lr = [];
      lr.push({ text: "① 세 사람의 한 줄 주장", options: { bold: true, color: C.text2, fontSize: 12, breakLine: true, paraSpaceAfter: 3 } });
      AR.who.forEach(w => { lr.push({ text: w[0] + "  ", options: { bold: true, color: C.accent1, fontSize: 11.5 } }); lr.push({ text: w[1], options: { fontSize: 11.5, breakLine: true, paraSpaceAfter: 2 } }); });
      lr.push({ text: "② 화살표를 말로 바꾸기  (화살표 = 비판하는 사람 → 비판받는 사람)", options: { bold: true, color: C.text2, fontSize: 12, breakLine: true, paraSpaceBefore: 8, paraSpaceAfter: 3 } });
      AR.arrows.forEach(a => lr.push({ text: a, options: { fontSize: 11.5, breakLine: true, paraSpaceAfter: 1 } }));
      lr.push({ text: "③ 말뜻", options: { bold: true, color: C.text2, fontSize: 12, breakLine: true, paraSpaceBefore: 8, paraSpaceAfter: 3 } });
      lr.push({ text: "‘간과한다’ = 그 점을 놓쳤다 / ‘무시한다’ = 그 점을 인정하지 않고 넘어간다.  둘 다 “비판받는 사람이 그걸 충분히 반영하지 않았다”는 말이다.", options: { fontSize: 11.5, breakLine: true, paraSpaceAfter: 3 } });
      lr.push({ text: "④ 성립 조건 (둘 다 맞아야 O)", options: { bold: true, color: C.text2, fontSize: 12, breakLine: true, paraSpaceBefore: 8, paraSpaceAfter: 3 } });
      lr.push({ text: "말하는 사람은 그걸 실제로 주장한다 ○", options: { fontSize: 11.5, color: C.accent3, bold: true, breakLine: true } });
      lr.push({ text: "듣는 사람은 그걸 빠뜨렸거나 반대로 말한다 ✕", options: { fontSize: 11.5, color: C.accent4, bold: true, breakLine: true, paraSpaceAfter: 3 } });
      lr.push({ text: "함정: 듣는 사람이 이미 주장하는 내용 · 말하는 사람이 하지 않는 주장 · 상대 주장을 과장한 말", options: { fontSize: 11, color: C.accent5 } });
      s2.addText(lr, { x: LX + 0.22, y: PY + 0.45, w: LW - 0.44, h: PH - 0.55, valign: "top", isTextBox: true, margin: 0, objectName: "howto" });
      const nn = AR.opts.length, gp = 0.07, ch = (PH - gp * (nn - 1)) / nn; const bump = nn === 4 ? 1.3 : 0.5;
      AR.opts.forEach((o, i) => {
        const yy = PY + i * (ch + gp);
        const col = o.ok ? C.accent3 : C.accent4;
        s2.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX, y: yy, w: RW, h: ch, fill: { color: C.background1 }, line: { color: "C7CAD9", width: 1 }, rectRadius: 0.08, objectName: "opt" + i });
        s2.addShape(pres.shapes.RECTANGLE, { x: RX, y: yy + 0.08, w: 0.09, h: ch - 0.16, fill: { color: col }, objectName: "bar" + i });
        s2.addText([
          { text: o.o + "  ", options: { bold: true, color: C.accent1, fontSize: 10.5 + bump } },
          { text: o.t, options: { bold: true, color: C.text1, fontSize: 10 + bump, breakLine: true, paraSpaceAfter: 2 } },
          { text: "쉬운 말  ", options: { bold: true, color: C.accent5, fontSize: 9.5 + bump } },
          { text: o.plain, options: { fontSize: 9.5 + bump, breakLine: true, paraSpaceAfter: 2 } },
          { text: "확인  ", options: { bold: true, color: C.accent5, fontSize: 9.5 + bump } },
          { text: o.chk, options: { fontSize: 9.5 + bump, breakLine: true, paraSpaceAfter: 2 } },
          { text: (o.ok ? "○ " : "✕ ") + o.v, options: { bold: true, color: col, fontSize: 10 + bump } }
        ], { x: RX + 0.22, y: yy + 0.04, w: RW - 0.36, h: ch - 0.08, valign: "middle", isTextBox: true, margin: 0, objectName: "opttext" + i });
      });
    }
  }
  await pres.writeFile({ fileName: fname });
  await applyTheme(fname, THEME);
  console.log("wrote", fname);
}
(async () => { for (const k of Object.keys(data)) await build(k); })();
```

## 3단계: 상호 비판 화살표 문항 `arrow.js` (생활과 윤리)

제목·제시문에 "서로에게 제기할 수 있는 비판", "화살표 A~F" 같은 말이 있는 문항(예: 동물 윤리·형벌 3인 비판)을 찾아 `arrow.js`에 문항별로 손으로 쓴다. 키는 `"<회차키>-<문항번호>"` (예: `"7m-19"`). 사회·문화 회차에는 필요 없다(파일이 없으면 자동으로 건너뛴다). 학생들이 "~간과한다 / ~무시한다"에서 **누가 누구에게 하는 말인지** 헷갈려 하므로 이 장이 필요하다.

```javascript
module.exports = {
"7m-19": {
  title: "선지 직독직해 — ‘누가 누구에게 무엇을 놓쳤다고 말하나’",
  who: [["갑 = 싱어", "쾌고 감수 능력이 있으면, 같은 고통은 똑같이 고려한다"], ["을 = 레건", "…"], ["병 = 칸트", "…"]],
  arrows: ["A  싱어 → 레건", "B  레건 → 싱어", "…"],            // 화살표 출발 = 비판하는 사람, 도착 = 비판받는 사람
  opts: [   // 선지 5개(또는 <보기> 4개). o=번호·화살표, t=선지 원문, plain=쉬운 말, chk=확인, ok=성립 여부, v=판정 한 줄
    {o:"① A", t:"…선지 문장…", plain:"싱어가 레건에게 “…을 놓쳤다”고 말함", chk:"말하는 싱어가 ‘…’를 주장하나? ✕ (이유)", ok:false, v:"말하는 사람이 하지도 않는 주장 → 성립 안 함"},
    {o:"④ D", t:"…", plain:"…", chk:"말하는 레건은 주장 ○ / 듣는 칸트는 인정 ✕", ok:true, v:"말하는 ○ + 듣는 ✕ → 성립 · 정답"}
  ]
}
};
```

판정 규칙 (모든 화살표 문항 공통): **비판이 성립하려면 말하는 사람(화살표 출발)은 그 점을 실제로 주장(○)하고, 듣는 사람(화살표 도착)은 그 점을 빠뜨리거나 반대로 말해야(✕) 한다.** 오답 함정 3가지: ① 듣는 사람이 이미 주장하는 내용 ② 말하는 사람이 하지 않는 주장 ③ 상대 주장을 과장한 말. 하나의 선지가 화살표 둘(C, E)에 걸리면 둘 다 성립해야 ○다. exam.json의 `why`/`fix`를 근거로 쓰되, `plain`(쉬운 말)·`chk`·`v`는 학생 눈높이로 새로 풀어 쓴다.

선지가 5개면 카드 글자를 `+0.5pt`, 4개(<보기> ㄱ~ㄹ)면 `+1.3pt` 키운다 (build 코드의 `bump`). 글 길이 때문에 넘치면 `chk`/`plain`을 줄인다.

## 4단계: 검증과 전달

```bash
P=/mnt/skills/public/pptx/scripts/office
python $P/validate.py 파일.pptx            # All validations PASSED 확인
python $P/soffice.py --headless --convert-to pdf 파일.pptx
pdftoppm -jpeg -r 70 -f <장> -l <장> 파일.pdf 확인     # 긴 문항·그림 문항·자료 분석 장·개념 정리 장 직접 보기
```

- 글이 가장 긴 문항(`textLen` 상위)과 figure 문항을 우선 확인한다. 오른쪽 선지 판정 카드가 넘치면 `brief` 한도(92)를 낮추고, 왼쪽이 넘치면 `sizeFor` 구간을 한 단계 낮춘다.
- 자료 분석 슬라이드가 넘치면 STEP의 how를 줄이거나 legend 항목을 줄인다.
- 완성 파일은 `/mnt/user-data/outputs/<폴더>/`에 두고 SendUserFile로 보낸다.
- 답할 때는 한두 문장으로 만든 것만 알린다. 슬라이드의 정답·판정·개념 정리·자료 분석 풀이는 해설집(exam.json)을 줄이거나 새로 쓴 것이므로, 공식 정답과 대조해 고친 문항, 근거가 약한 선지(교재마다 분류가 갈리는 개념), 자료만으로 확정이 어려워 가정을 둔 문항을 한 줄로 밝힌다.

## 흔한 실수 체크리스트

- 서브에이전트에 자리표시자 프롬프트를 보냈다 → 에이전트가 "요청이 비어 있다"고 돌아온다. 항상 완성된 지시문을 넣는다.
- PDF 뒤쪽 정답·해설 쪽을 안 보고 "공식 정답 없음"으로 두었다 → 오답이 그대로 슬라이드에 들어간다. 정답표를 먼저 확보한다.
- 에이전트에게 "다른 필드 수정 금지"를 빼먹으면 정답을 고친 뒤 이후 단계(개념·자료 분석)가 옛 정답을 덮어쓸 수 있다. 정답 확정 후에 필드를 덧붙인다.
- 표가 text로도 material에 중복 전사되면 왼쪽이 넘칠 수 있다 (figure가 있으면 숫자는 그림에만 둔다).
- 순수 개념 판별 문항에 억지로 자료 분석 슬라이드를 만들지 않는다.