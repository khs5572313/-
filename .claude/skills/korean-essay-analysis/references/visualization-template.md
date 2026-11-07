# 시각화 위젯 템플릿

## 위젯 구성 원칙

분석 완료 후 `visualize:show_widget` 도구로 인터랙티브 HTML 위젯을 생성한다.

### 필수 6섹션 구조

```
섹션1: 통계 요약 카드 (3×2 그리드)
섹션2: 문제 유형 패턴 (번호형 목록 + 사례 박스)
섹션3: 제시문 경향성 (분야 그리드 + 문학 특징)
섹션4: 연도별 변화 테이블
섹션5: 채점 기준 (원칙 + 배점 + 오답 주의)
섹션6: 대비 전략 (그라디언트 카드)
```

---

## CSS 클래스 시스템

위젯에서 공통으로 사용하는 CSS:

```css
/* 레이아웃 */
.wrap { padding: 1rem 0; }
.section { margin-bottom: 2rem; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

/* 섹션 제목 */
.sec-title {
  font-size: 17px; font-weight: 500;
  border-left: 3px solid #534AB7; padding-left: 10px; margin-bottom: 14px;
}

/* 카드 */
.card {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 10px;
}
.stat-box { background: var(--color-background-secondary); border-radius: 8px; padding: 12px 14px; text-align: center; }
.stat-num { font-size: 26px; font-weight: 500; color: #534AB7; }
.stat-label { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }

/* 태그 시스템 */
.tag { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 6px; margin: 2px 3px 2px 0; font-weight: 500; }
.tag-p { background: #EEEDFE; color: #3C3489; }  /* 보라 - 문학 */
.tag-t { background: #E1F5EE; color: #085041; }  /* 초록 - 독서 */
.tag-a { background: #FAEEDA; color: #633806; }  /* 주황 - 언어매체 */
.tag-c { background: #FAECE7; color: #712B13; }  /* 산호 - 화법작문 */
.tag-b { background: #E6F1FB; color: #0C447C; }  /* 파랑 - 키워드 */

/* 유형 행 */
.type-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid var(--color-border-tertiary); }
.type-num { min-width: 60px; font-size: 20px; font-weight: 500; color: #534AB7; text-align: center; padding-top: 2px; }
.type-name { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
.type-desc { font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 5px; }

/* 예시 박스 */
.ex-box {
  background: var(--color-background-secondary);
  border-radius: 8px; padding: 8px 12px; font-size: 12px; line-height: 1.7;
  margin-top: 6px; border-left: 2px solid #7F77DD;
}
.ex-label { font-size: 11px; color: #534AB7; font-weight: 500; margin-bottom: 3px; }

/* 규칙 행 */
.rule-row { display: flex; gap: 10px; align-items: flex-start; padding: 7px 0; border-bottom: 0.5px solid var(--color-border-tertiary); font-size: 13px; }
.rule-icon { font-size: 15px; min-width: 22px; }

/* 전략 카드 */
.adv-box {
  background: linear-gradient(135deg, #EEEDFE 0%, #E1F5EE 100%);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px; padding: 1.1rem 1.4rem; margin-bottom: 10px;
}
.adv-title { font-size: 13px; font-weight: 500; color: #26215C; margin-bottom: 6px; }
.adv-list { font-size: 12px; color: #3C3489; line-height: 1.8; padding-left: 14px; }

/* 테이블 */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { background: var(--color-background-secondary); padding: 8px 10px; text-align: left; font-weight: 500; font-size: 12px; border-bottom: 0.5px solid var(--color-border-tertiary); }
td { padding: 7px 10px; border-bottom: 0.5px solid var(--color-border-tertiary); vertical-align: top; }

/* 배지 */
.badge { display: inline-block; font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 500; }
.badge-y { background: #FAC775; color: #412402; }
.badge-b { background: #B5D4F4; color: #042C53; }
.badge-r { background: #F7C1C1; color: #501313; }

/* 제시문 토픽 그리드 */
.topic-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.topic-cell { background: var(--color-background-secondary); border-radius: 8px; padding: 8px 10px; font-size: 12px; text-align: center; color: var(--color-text-secondary); }
.topic-cell strong { display: block; font-size: 13px; color: var(--color-text-primary); margin-bottom: 3px; }
```

---

## 섹션별 HTML 뼈대

### 섹션1: 통계 요약

```html
<div class="section">
  <div class="sec-title">📊 {분석기간} 문항 개요</div>
  <div class="grid3">
    <div class="stat-box"><div class="stat-num">{값}</div><div class="stat-label">{라벨}</div></div>
    <!-- 6개 stat-box -->
  </div>
</div>
```

### 섹션2: 문제 유형 패턴

```html
<div class="section">
  <div class="sec-title">🧩 문제 유형 패턴 (핵심)</div>
  <div class="type-row">
    <div class="type-num">①</div>
    <div class="type-body">
      <div class="type-name">{유형명} <span class="tag tag-c">{영역}</span></div>
      <div class="type-desc">{설명}</div>
      <div class="ex-box">
        <div class="ex-label">실제 문제 사례 ({연도} {형번}번)</div>
        {문제내용}<br><strong>정답: {정답}</strong>
      </div>
    </div>
  </div>
  <!-- 유형마다 반복 -->
</div>
```

### 섹션3: 제시문 경향성

```html
<div class="section">
  <div class="sec-title">📚 제시문 경향성</div>
  <div class="grid2">
    <div class="card">
      <div class="card-title">독서 제시문 주제 영역</div>
      <div class="topic-grid">
        <div class="topic-cell"><strong>{분야}</strong>{내용}</div>
        <!-- 분야마다 반복 -->
      </div>
    </div>
    <div class="card">
      <div class="card-title">문학 제시문 특징</div>
      <!-- 갈래 태그 + 특징 -->
    </div>
  </div>
</div>
```

### 섹션4: 연도별 변화 테이블

```html
<div class="section">
  <div class="sec-title">📅 연도별 출제 경향 변화</div>
  <div class="card">
    <div class="table-wrap">
      <table>
        <tr><th>학년도</th><th>화법·작문</th><th>독서</th><th>문법</th><th>문학</th><th>특이사항</th></tr>
        <tr>
          <td><span class="badge badge-y">{연도}</span></td>
          <td>{내용}</td><td>{내용}</td><td>{내용}</td><td>{내용}</td><td>{내용}</td>
        </tr>
      </table>
    </div>
  </div>
</div>
```

### 섹션5: 채점 기준

```html
<div class="section">
  <div class="sec-title">✅ 채점 기준 분석</div>
  <div class="grid2">
    <div class="card">
      <div class="card-title">핵심 원칙</div>
      <div class="rule-row"><div class="rule-icon">❶</div><div>{원칙}</div></div>
      <!-- 원칙마다 반복 -->
    </div>
    <div class="card">
      <div class="card-title">배점 구조 패턴</div>
      <!-- 배점 규칙 -->
    </div>
  </div>
</div>
```

### 섹션6: 대비 전략

```html
<div class="section">
  <div class="sec-title">🎯 약술형 논술 대비 핵심 전략</div>
  <div class="adv-box">
    <div class="adv-title">① {유형명} 전략</div>
    <ul class="adv-list">
      <li>{전략1}</li>
      <li>{전략2}</li>
      <li>{전략3}</li>
    </ul>
  </div>
  <!-- 유형마다 반복 -->
</div>
```

---

## 학원/기관 정보 섹션 (선택)

사용자가 학원 정보를 요청하거나 기존 데이터에 포함된 경우 마지막에 추가:

```html
<div class="section">
  <div class="card" style="background:linear-gradient(135deg,#EEEDFE,#E1F5EE);border:1px solid #AFA9EC">
    <div style="font-size:16px;font-weight:500;color:#26215C;margin-bottom:8px">📖 {학원명}</div>
    <div style="font-size:13px;color:#3C3489;line-height:1.9">
      <strong>개강:</strong> {날짜}<br>
      <strong>전화:</strong> {번호}<br>
      <strong>주소:</strong> {주소}<br>
    </div>
    <div style="margin-top:10px;font-size:12px;color:#534AB7;background:rgba(255,255,255,0.5);border-radius:8px;padding:8px 12px">
      {특징 설명}
    </div>
  </div>
</div>
```

---

## 위젯 생성 시 loading_messages 권장 문구

```python
loading_messages = [
  "기출 문항 데이터 분류 중...",
  "유형별 패턴 추출 중...",
  "제시문 경향 분석 중...",
  "채점 기준 정리 중..."
]
```
