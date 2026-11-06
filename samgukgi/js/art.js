/* 삼국기 — 절차적 SVG 아트
 * 초상화(2D, 국가·신분별 의관), 병종 일러스트, 타로풍 병력 카드, 건축물 아이콘, 국가 문장, 전투 이펙트 */
(function (S) {
  'use strict';
  const U = S.U;
  const A = {};
  const SKIN = ['#f1d1b0', '#e8c39e', '#dcb08a', '#e9c7a6', '#d8a982', '#f3d7bd'];
  const HAIR = ['#1b1512', '#231a14', '#2a1f18', '#15110f'];
  let uid = 0;
  const nid = (p) => `${p}${++uid}`;

  /* ── 국가 문장 ── */
  A.emblem = (nation, size = 40) => {
    const N = S.NATIONS[nation] || S.NATIONS.neutral;
    const c = N.color, d = N.dark, l = N.light;
    let inner = '';
    switch (N.emblem) {
      case 'samjogo': /* 삼족오: 태양 속 세 발 까마귀 */
        inner = `<circle cx="50" cy="50" r="34" fill="#f2b632"/><circle cx="50" cy="50" r="34" fill="none" stroke="#fff3c4" stroke-width="3"/>
          <path d="M28 52 Q38 34 52 40 Q60 30 70 34 L64 40 Q74 42 76 48 L62 48 Q60 56 52 58 L46 70 M50 58 L52 72 M54 57 L58 70" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M22 50 Q34 42 44 48 Q36 54 22 50Z" fill="#1a1a1a"/><circle cx="62" cy="38" r="1.8" fill="#f2b632"/>`;
        break;
      case 'bonghwang': /* 금동대향로의 봉황 */
        inner = `<path d="M50 14 Q62 26 56 36 Q70 32 74 44 Q64 44 60 50 Q74 58 70 74 Q60 62 52 66 Q50 80 40 86 Q42 70 36 62 Q24 62 20 50 Q32 52 38 46 Q30 36 38 26 Q44 34 48 32 Q44 22 50 14Z" fill="#e2b13c" stroke="#fff1c2" stroke-width="2"/>
          <circle cx="52" cy="24" r="2" fill="${d}"/><path d="M50 14 Q56 8 60 12" stroke="#e2b13c" stroke-width="3" fill="none"/>`;
        break;
      case 'geumgwan': /* 신라 금관: 出자형 세움장식 */
        inner = `<rect x="20" y="62" width="60" height="12" rx="2" fill="#e8bf3a" stroke="#fff3b8" stroke-width="1.5"/>
          <path d="M30 62 V30 M30 40 H40 M30 50 H40 M50 62 V22 M50 32 H60 M50 32 H40 M50 44 H60 M50 44 H40 M70 62 V30 M70 40 H60 M70 50 H60" stroke="#e8bf3a" stroke-width="5" fill="none" stroke-linecap="round"/>
          <circle cx="50" cy="20" r="4" fill="#e8bf3a"/><circle cx="30" cy="28" r="3.5" fill="#e8bf3a"/><circle cx="70" cy="28" r="3.5" fill="#e8bf3a"/>
          ${[26, 38, 50, 62, 74].map((x) => `<circle cx="${x}" cy="80" r="2.5" fill="#3aa86b"/>`).join('')}`;
        break;
      case 'dragon':
        inner = `<path d="M24 66 Q20 44 38 36 Q52 30 58 40 Q66 30 76 36 L68 42 Q78 48 72 58 Q62 52 56 58 Q60 70 48 74 Q36 76 30 70 Q40 68 42 62 Q32 62 24 66Z" fill="#e8c35a" stroke="#fff2c9" stroke-width="2"/>
          <circle cx="64" cy="40" r="2" fill="${d}"/><path d="M70 34 L80 26 M66 32 L72 22" stroke="#e8c35a" stroke-width="2.5"/>`;
        break;
      case 'sun':
        inner = `<circle cx="50" cy="50" r="22" fill="#e8483a"/>${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${50 + 27 * Math.cos(a)}" y1="${50 + 27 * Math.sin(a)}" x2="${50 + 35 * Math.cos(a)}" y2="${50 + 35 * Math.sin(a)}" stroke="#f3e2c0" stroke-width="3"/>`; }).join('')}`;
        break;
      case 'wolf':
        inner = `<path d="M30 70 L34 36 L44 48 L50 30 L56 48 L66 36 L70 70 Q50 82 30 70Z" fill="#d8c3a0" stroke="#fff" stroke-width="1.5"/><circle cx="42" cy="56" r="2.5" fill="${d}"/><circle cx="58" cy="56" r="2.5" fill="${d}"/>`;
        break;
      default:
        inner = `<circle cx="50" cy="50" r="20" fill="${l}"/>`;
    }
    return `<svg class="emblem" viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="47" fill="${c}" stroke="${d}" stroke-width="4"/><circle cx="50" cy="50" r="42" fill="none" stroke="${l}" stroke-width="1" opacity=".6"/>${inner}</svg>`;
  };

  /* ── 초상화 ── */
  A.portrait = (oid, size = 100, opt = {}) => {
    const o = S.officerById[oid];
    if (!o) return '';
    const st = S.state;
    const nat = (opt.nation || (st && st.officers[oid] && st.officers[oid].nation) || o.nation);
    const N = S.NATIONS[nat] || S.NATIONS.neutral;
    const ON = S.NATIONS[o.nation] || N; /* 의관은 출신국 기준 */
    const r = U.seeded(U.hash(oid));
    const year = st ? st.year : 640;
    const age = U.clamp(year - (o.b || year - 35), 14, 90);
    const skin = SKIN[Math.floor(r() * SKIN.length)];
    const hair = age > 58 ? '#9a9590' : age > 48 ? '#5a534d' : HAIR[Math.floor(r() * HAIR.length)];
    const fem = !!o.female;
    const role = o.role;
    const war = o.s[1], intl = o.s[2];
    const gid = nid('pg');
    const isArmored = role === 'general' || role === 'hwarang' || (role === 'king' && war >= 80 && !fem);
    const isMonk = role === 'monk';
    let defs = `<radialGradient id="${gid}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${N.light}"/><stop offset="1" stop-color="${N.color}"/></radialGradient>`;
    let out = `<rect x="0" y="0" width="100" height="120" rx="8" fill="url(#${gid})"/>`;
    /* 배경 무기 */
    if (isArmored) {
      if (['cav', 'gaema', 'hwarang', 'mohecav', 'spear', 'joui', 'bubyeong', 'gyeolsa'].includes(o.u)) {
        out += `<line x1="84" y1="118" x2="84" y2="10" stroke="#5a3a1e" stroke-width="3"/><path d="M84 2 L89 16 L84 13 L79 16Z" fill="#cfd6dc" stroke="#7a838c"/><path d="M80 18 Q84 24 88 18" stroke="${N.color}" stroke-width="3" fill="none"/>`;
      } else if (['bow', 'gangung', 'cheonbo', 'xbow'].includes(o.u)) {
        out += `<path d="M86 12 Q66 60 86 108" stroke="#6b4422" stroke-width="3.5" fill="none"/><line x1="86" y1="12" x2="86" y2="108" stroke="#e8e0d0" stroke-width="0.8"/>`;
      } else {
        out += `<line x1="18" y1="116" x2="12" y2="20" stroke="#bfc6cc" stroke-width="3"/><circle cx="12" cy="18" r="4" fill="none" stroke="#d4a531" stroke-width="2"/>`;
      }
    }
    if (o.legend && role === 'legend') out += `<circle cx="50" cy="60" r="44" fill="#8a5bd6" opacity=".25"/><circle cx="50" cy="60" r="34" fill="#b18cf0" opacity=".2"/>`;
    /* 몸·옷 */
    const robe = isMonk ? '#6d6253' : fem ? (r() > 0.5 ? ON.color : '#7b3b62') : ON.color;
    out += `<path d="M6 120 Q8 96 30 90 L42 86 L58 86 L70 90 Q92 96 94 120Z" fill="${robe}"/>`;
    if (isArmored) {
      const pid = nid('lam');
      defs += `<pattern id="${pid}" width="6" height="7" patternUnits="userSpaceOnUse"><rect width="6" height="7" fill="#8d8f92"/><rect x="0.6" y="0.6" width="4.8" height="5.6" rx="1.2" fill="#b9bcc0"/><line x1="3" y1="1" x2="3" y2="6" stroke="#6e7174" stroke-width=".6"/></pattern>`;
      out += `<path d="M10 120 Q12 98 32 92 L42 89 L58 89 L68 92 Q88 98 90 120Z" fill="url(#${pid})"/>`;
      out += `<path d="M14 104 Q30 96 50 98 Q70 96 86 104" stroke="${ON.color}" stroke-width="4" fill="none"/>`;
      out += `<path d="M20 98 Q12 104 10 116 L24 116 Q24 104 30 96Z" fill="url(#${pid})" stroke="${ON.dark}" stroke-width="1"/><path d="M80 98 Q88 104 90 116 L76 116 Q76 104 70 96Z" fill="url(#${pid})" stroke="${ON.dark}" stroke-width="1"/>`;
      if (nat === 'tang' || nat === 'sui' || o.nation === 'tang' || o.nation === 'sui') out += `<circle cx="38" cy="106" r="6" fill="#e6c96a" stroke="#8a6d1d"/><circle cx="62" cy="106" r="6" fill="#e6c96a" stroke="#8a6d1d"/>`; /* 명광개 원형 호심경 */
    } else if (isMonk) {
      out += `<path d="M26 92 L78 120 L60 120 L22 98Z" fill="#b5532d"/><path d="M30 92 L50 104 L70 92" stroke="#3b342b" stroke-width="2" fill="none"/>`;
    } else {
      out += `<path d="M42 86 L50 104 L58 86" fill="none" stroke="${role === 'king' || role === 'queen' ? '#e2b13c' : '#f3eadb'}" stroke-width="4"/>`;
      if (role === 'king' || role === 'queen') out += `<path d="M14 112 Q50 100 86 112" stroke="#e2b13c" stroke-width="2.5" fill="none"/><circle cx="50" cy="112" r="3" fill="#e2b13c"/>`;
      if (fem) out += `<path d="M34 90 Q50 100 66 90" stroke="#f0d5e0" stroke-width="3" fill="none"/>`;
    }
    /* 목·얼굴 */
    out += `<rect x="43" y="74" width="14" height="16" fill="${skin}"/><path d="M43 84 Q50 88 57 84" stroke="#000" stroke-opacity=".12" stroke-width="2" fill="none"/>`;
    const faceW = fem ? 15.5 : 16.5 + r() * 1.5, faceH = fem ? 19 : 20 + r() * 1.5;
    /* 머리카락(뒤) */
    if (fem && !isMonk) out += `<ellipse cx="50" cy="56" rx="${faceW + 5}" ry="${faceH + 4}" fill="${hair}"/>`;
    out += `<ellipse cx="${50 - faceW + 1}" cy="61" rx="3" ry="5" fill="${skin}"/><ellipse cx="${50 + faceW - 1}" cy="61" rx="3" ry="5" fill="${skin}"/>`;
    out += `<ellipse cx="50" cy="58" rx="${faceW}" ry="${faceH}" fill="${skin}"/>`;
    if (!isMonk) {
      out += `<path d="M${50 - faceW} 54 Q${50 - faceW} 34 50 34 Q${50 + faceW} 34 ${50 + faceW} 54 Q${50 + faceW - 3} 44 50 42 Q${50 - faceW + 3} 44 ${50 - faceW} 54Z" fill="${hair}"/>`;
    }
    /* 눈썹·눈 */
    const bw = 1.2 + (war / 100) * 2.6;
    const eyeY = 57, browY = 51 - (intl > 85 ? 0.5 : 0);
    const tilt = war > 80 ? 2 : war < 40 ? -1 : 0.8;
    out += `<path d="M38 ${browY + tilt} Q42 ${browY - 1.5} 46 ${browY}" stroke="${hair === '#9a9590' ? '#777' : '#1b1512'}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
    out += `<path d="M54 ${browY} Q58 ${browY - 1.5} 62 ${browY + tilt}" stroke="${hair === '#9a9590' ? '#777' : '#1b1512'}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
    const ew = fem ? 3.6 : 3.2;
    out += `<path d="M${42 - ew} ${eyeY} Q42 ${eyeY - 2.4} ${42 + ew} ${eyeY} Q42 ${eyeY + 1.6} ${42 - ew} ${eyeY}Z" fill="#fff"/><circle cx="42.3" cy="${eyeY - 0.2}" r="1.5" fill="#1a1410"/>`;
    out += `<path d="M${58 - ew} ${eyeY} Q58 ${eyeY - 2.4} ${58 + ew} ${eyeY} Q58 ${eyeY + 1.6} ${58 - ew} ${eyeY}Z" fill="#fff"/><circle cx="57.7" cy="${eyeY - 0.2}" r="1.5" fill="#1a1410"/>`;
    out += `<path d="M${42 - ew} ${eyeY} Q42 ${eyeY - 2.6} ${42 + ew + 0.5} ${eyeY - 0.3}" stroke="#2a1d16" stroke-width="${fem ? 1.3 : 0.9}" fill="none"/><path d="M${58 - ew - 0.5} ${eyeY - 0.3} Q58 ${eyeY - 2.6} ${58 + ew} ${eyeY}" stroke="#2a1d16" stroke-width="${fem ? 1.3 : 0.9}" fill="none"/>`;
    /* 코·입·볼 */
    out += `<path d="M50 59 L48.6 65 Q50 66.2 51.6 65" stroke="#000" stroke-opacity=".25" stroke-width="1" fill="none"/>`;
    const mouthCurve = intl > war ? 0.8 : -0.4;
    out += `<path d="M45.5 70 Q50 ${70 + mouthCurve + (fem ? 1 : 0)} 54.5 70" stroke="${fem ? '#b5445a' : '#7a4434'}" stroke-width="${fem ? 1.8 : 1.2}" fill="none" stroke-linecap="round"/>`;
    if (fem) out += `<ellipse cx="40" cy="65" rx="3.5" ry="2" fill="#e88a8a" opacity=".35"/><ellipse cx="60" cy="65" rx="3.5" ry="2" fill="#e88a8a" opacity=".35"/>`;
    if (age > 50) out += `<path d="M37 61 Q40 63 44 62 M56 62 Q60 63 63 61" stroke="#000" stroke-opacity=".18" stroke-width=".8" fill="none"/><path d="M44 67 Q42 70 43 73 M56 67 Q58 70 57 73" stroke="#000" stroke-opacity=".15" stroke-width=".8" fill="none"/>`;
    /* 수염 */
    if (!fem && !isMonk && age >= 26) {
      const bc = age > 58 ? '#b8b3ad' : age > 48 ? '#4e4741' : '#1d1612';
      const style = Math.floor(r() * 4);
      out += `<path d="M43.5 68.3 Q47 66.5 50 67.4 Q53 66.5 56.5 68.3 Q53 68 50 68.8 Q47 68 43.5 68.3Z" fill="${bc}"/>`;
      if (style >= 1) out += `<path d="M47 72 Q50 ${80 + style * 2} 53 72Z" fill="${bc}"/>`;
      if (style >= 2 && war > 70) out += `<path d="M${50 - faceW + 3} 62 Q${50 - faceW + 4} 76 50 ${80 + style} Q${50 + faceW - 4} 76 ${50 + faceW - 3} 62 Q${50 + faceW - 6} 72 50 74 Q${50 - faceW + 6} 72 ${50 - faceW + 3} 62Z" fill="${bc}" opacity=".92"/>`;
    }
    /* 관모·투구 */
    out += A._headgear(o, nat, ON, isArmored, isMonk, fem, hair, r, faceW);
    return `<svg class="portrait" viewBox="0 0 100 120" width="${size}" height="${size * 1.2}"><defs>${defs}</defs>${out}<rect x="1" y="1" width="98" height="118" rx="8" fill="none" stroke="${N.dark}" stroke-width="2"/></svg>`;
  };

  A._headgear = (o, nat, N, armored, monk, fem, hair, r, fw) => {
    const n = o.nation;
    const role = o.role;
    if (monk) return `<path d="M${50 - fw} 52 Q${50 - fw} 35 50 35 Q${50 + fw} 35 ${50 + fw} 52" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="3"/>`;
    if (armored) {
      /* 종장판 투구 */
      let h = `<path d="M${50 - fw - 3} 52 Q${50 - fw - 3} 26 50 24 Q${50 + fw + 3} 26 ${50 + fw + 3} 52 L${50 + fw + 1} 54 Q50 44 ${50 - fw - 1} 54Z" fill="#8f949a" stroke="#4e5358" stroke-width="1.2"/>`;
      for (let i = -3; i <= 3; i++) h += `<line x1="${50 + i * 5}" y1="${26 + Math.abs(i) * 1.3}" x2="${50 + i * 6.3}" y2="${50 - Math.abs(i) * 0.3}" stroke="#5f646a" stroke-width=".8"/>`;
      h += `<path d="M${50 - fw - 3} 50 L${50 - fw - 5} 70 L${50 - fw + 2} 68 L${50 - fw + 1} 54Z" fill="#7d8288" stroke="#4e5358"/><path d="M${50 + fw + 3} 50 L${50 + fw + 5} 70 L${50 + fw - 2} 68 L${50 + fw - 1} 54Z" fill="#7d8288" stroke="#4e5358"/>`;
      h += `<rect x="${50 - fw - 3}" y="49" width="${2 * fw + 6}" height="4" fill="${N.color}" stroke="#4e5358" stroke-width=".8"/>`;
      if (n === 'goguryeo') h += `<path d="M50 24 Q46 8 40 2 Q50 6 52 16 Q58 4 64 2 Q56 12 52 24Z" fill="#e8e1d2" stroke="#999" stroke-width=".6"/>`; /* 새깃 장식 */
      else if (n === 'tang' || n === 'sui') h += `<path d="M${50 - fw - 3} 40 Q${50 - fw - 14} 32 ${50 - fw - 10} 22 Q${50 - fw - 4} 30 ${50 - fw - 1} 34Z" fill="#c9a43a"/><path d="M${50 + fw + 3} 40 Q${50 + fw + 14} 32 ${50 + fw + 10} 22 Q${50 + fw + 4} 30 ${50 + fw + 1} 34Z" fill="#c9a43a"/><circle cx="50" cy="22" r="3" fill="#c03a2b"/>`;
      else if (n === 'silla') h += `<path d="M50 24 L50 10" stroke="#c9a227" stroke-width="2"/><path d="M50 10 Q44 2 50 0 Q56 2 50 10Z" fill="#d23c3c"/>${role === 'hwarang' ? '<circle cx="62" cy="30" r="4" fill="#ef7fa3"/><circle cx="62" cy="30" r="1.5" fill="#ffd34d"/>' : ''}`;
      else if (n === 'baekje') h += `<path d="M50 24 L50 12" stroke="#d8d8d8" stroke-width="2"/><path d="M50 14 Q42 8 46 2 Q50 6 50 10 Q50 6 54 2 Q58 8 50 14Z" fill="#dfe4ea"/>`;
      else if (n === 'wa') h += `<path d="M38 26 L50 14 L62 26" stroke="#c9a43a" stroke-width="2.5" fill="none"/>`;
      else h += `<path d="M50 24 Q46 12 50 6 Q54 12 50 24Z" fill="#7a5a34"/>`;
      return h;
    }
    if (fem) {
      if (role === 'queen') {
        if (n === 'silla') return A._silla_crown(fw, true);
        return `<path d="M34 34 Q50 18 66 34 L62 38 Q50 30 38 38Z" fill="#d9b23a"/><circle cx="50" cy="24" r="4" fill="#c03a5a"/><path d="M36 34 L30 46 M64 34 L70 46" stroke="#d9b23a" stroke-width="1.5"/>`;
      }
      return `<ellipse cx="50" cy="31" rx="13" ry="8" fill="${hair}"/><line x1="34" y1="31" x2="68" y2="28" stroke="#d9b23a" stroke-width="2.4" stroke-linecap="round"/><circle cx="68" cy="28" r="2.6" fill="#c03a5a"/>`;
    }
    if (n === 'goguryeo') {
      if (role === 'king') return `<path d="M${50 - fw + 1} 44 Q50 10 ${50 + fw - 1} 44Z" fill="#f4f1ea" stroke="#c9a227" stroke-width="1.5"/><path d="M38 40 H62" stroke="#c9a227" stroke-width="3"/><path d="M42 22 Q34 4 30 0 M58 22 Q66 4 70 0" stroke="#e2b13c" stroke-width="2.5" fill="none"/>`; /* 백라관 */
      /* 절풍 + 조우관(새깃) */
      return `<path d="M${50 - fw + 3} 42 L50 18 L${50 + fw - 3} 42Z" fill="#3b2a20" stroke="#1a120c"/><path d="M44 24 Q36 6 32 2 Q42 8 47 22Z" fill="#efe8da"/><path d="M56 24 Q64 6 68 2 Q58 8 53 22Z" fill="#efe8da"/><line x1="${50 - fw + 2}" y1="42" x2="${50 + fw - 2}" y2="42" stroke="#c9a227" stroke-width="2"/>`;
    }
    if (n === 'baekje') {
      /* 오라관 + 금화/은화 관식 */
      const metal = role === 'king' ? '#e2b13c' : '#dfe4ea';
      return `<path d="M${50 - fw} 44 Q${50 - fw} 26 50 26 Q${50 + fw} 26 ${50 + fw} 44Z" fill="#1d1a20"/><path d="M${50 - fw - 1} 44 H${50 + fw + 1}" stroke="${metal}" stroke-width="2"/>
        <path d="M44 28 Q38 16 42 6 Q44 14 46 12 Q44 4 48 0 Q48 10 50 8 Q52 10 52 0 Q56 4 54 12 Q56 14 58 6 Q62 16 56 28Z" fill="${metal}" stroke="#9c8a5a" stroke-width=".6"/>`;
    }
    if (n === 'silla') {
      if (role === 'king') return A._silla_crown(fw, false);
      if (role === 'hwarang') return `<ellipse cx="50" cy="31" rx="8" ry="6" fill="${hair}"/><path d="M${50 - fw} 42 Q50 36 ${50 + fw} 42" stroke="#e05a7a" stroke-width="3.5" fill="none"/><path d="M${50 + fw} 42 Q${50 + fw + 8} 50 ${50 + fw + 4} 60" stroke="#e05a7a" stroke-width="2.5" fill="none"/><circle cx="58" cy="30" r="3.5" fill="#f3a4bd"/>`;
      return `<path d="M${50 - fw + 2} 42 Q${50 - fw + 2} 22 50 22 Q${50 + fw - 2} 22 ${50 + fw - 2} 42Z" fill="#3a3326"/><path d="M${50 - fw} 42 H${50 + fw}" stroke="#c9a227" stroke-width="2"/>`;
    }
    if (n === 'tang' || n === 'sui') {
      /* 복두(幞頭) */
      const gold = role === 'king' ? `<path d="M40 30 H60" stroke="#e2b13c" stroke-width="2"/><circle cx="50" cy="26" r="2.5" fill="#e2b13c"/>` : '';
      return `<path d="M${50 - fw} 44 Q${50 - fw} 22 50 20 Q${50 + fw} 22 ${50 + fw} 44Z" fill="#141414"/><path d="M${50 - fw + 4} 26 Q50 14 ${50 + fw - 4} 26" fill="#141414"/><path d="M${50 + fw - 2} 30 Q${50 + fw + 16} 26 ${50 + fw + 22} 34" stroke="#141414" stroke-width="3" fill="none"/><path d="M${50 - fw + 2} 30 Q${50 - fw - 16} 26 ${50 - fw - 22} 34" stroke="#141414" stroke-width="3" fill="none"/>${gold}`;
    }
    if (n === 'wa') {
      /* 미즈라 */
      return `<ellipse cx="50" cy="34" rx="${fw}" ry="9" fill="${hair}"/><ellipse cx="${50 - fw - 2}" cy="62" rx="4" ry="7" fill="${hair}"/><ellipse cx="${50 + fw + 2}" cy="62" rx="4" ry="7" fill="${hair}"/><path d="M${50 - fw - 5} 56 H${50 - fw + 1} M${50 + fw - 1} 56 H${50 + fw + 5}" stroke="#d9b23a" stroke-width="1.6"/>`;
    }
    return `<ellipse cx="50" cy="32" rx="9" ry="7" fill="${hair}"/>`;
  };
  A._silla_crown = (fw, fem) => {
    const g = '#e8bf3a';
    return `<rect x="${50 - fw - 2}" y="38" width="${2 * fw + 4}" height="6" fill="${g}" stroke="#a0801c" stroke-width=".8"/>
      <path d="M50 38 V12 M50 18 H56 M50 26 H44 M50 26 H56 M50 18 H44 M38 38 V18 M38 24 H44 M38 30 H44 M62 38 V18 M62 24 H56 M62 30 H56" stroke="${g}" stroke-width="2.6" fill="none"/>
      <circle cx="50" cy="11" r="2.4" fill="${g}"/><circle cx="38" cy="17" r="2" fill="${g}"/><circle cx="62" cy="17" r="2" fill="${g}"/>
      <path d="M${50 - fw - 1} 44 L${50 - fw - 3} 62 M${50 + fw + 1} 44 L${50 + fw + 3} 62" stroke="${g}" stroke-width="1.4"/><circle cx="${50 - fw - 3}" cy="63" r="2" fill="#3aa86b"/><circle cx="${50 + fw + 3}" cy="63" r="2" fill="#3aa86b"/>
      ${[40, 46, 54, 60].map((x) => `<circle cx="${x}" cy="41" r="1.2" fill="#3aa86b"/>`).join('')}`;
  };

  /* ── 병종 일러스트 ── */
  const fig = (x, y, s, c, opt) => {
    /* 보병 1인: 발 기준 (x,y), 크기 s */
    const k = s / 40;
    const T = (dx, dy) => `${x + dx * k},${y + dy * k}`;
    const skin = '#e3bc95', metal = opt.metal || '#9aa0a6', dark = opt.dark || '#2a2a2a';
    let g = '';
    g += `<ellipse cx="${x}" cy="${y}" rx="${10 * k}" ry="${2.5 * k}" fill="#000" opacity=".25"/>`;
    g += `<path d="M${T(-6, 0)} L${T(-4, -14)} L${T(0, -14)} L${T(-1, 0)}Z M${T(6, 0)} L${T(4, -14)} L${T(0, -14)} L${T(1, 0)}Z" fill="${dark}"/>`;
    const body = opt.robe || metal;
    g += `<path d="M${T(-8, -12)} L${T(-7, -30)} Q${T(0, -34)} ${T(7, -30)} L${T(8, -12)}Z" fill="${body}" stroke="${dark}" stroke-width="${0.6 * k}"/>`;
    if (!opt.robe) for (let i = 0; i < 4; i++) g += `<line x1="${x - 7 * k}" y1="${y + (-28 + i * 4) * k}" x2="${x + 7 * k}" y2="${y + (-28 + i * 4) * k}" stroke="${dark}" stroke-opacity=".35" stroke-width="${0.6 * k}"/>`;
    g += `<rect x="${x - 8 * k}" y="${y - 16 * k}" width="${16 * k}" height="${3 * k}" fill="${c}"/>`;
    g += `<circle cx="${x}" cy="${y - 37 * k}" r="${5 * k}" fill="${skin}"/>`;
    if (opt.helmet !== false) g += `<path d="M${T(-5.6, -37)} Q${T(0, -46)} ${T(5.6, -37)}Z" fill="${opt.helmetColor || metal}" stroke="${dark}" stroke-width="${0.5 * k}"/><line x1="${x}" y1="${y - 45 * k}" x2="${x}" y2="${y - 50 * k}" stroke="${c}" stroke-width="${1.6 * k}"/>`;
    else g += `<path d="M${T(-5.5, -38)} Q${T(0, -45)} ${T(5.5, -38)}Z" fill="${opt.hairColor || '#1b1512'}"/>${opt.band ? `<line x1="${x - 5.5 * k}" y1="${y - 39 * k}" x2="${x + 5.5 * k}" y2="${y - 39 * k}" stroke="${opt.band}" stroke-width="${1.8 * k}"/>` : ''}`;
    /* 무기 */
    const w = opt.weapon;
    if (w === 'spear') g += `<line x1="${x + 9 * k}" y1="${y + 2 * k}" x2="${x + 14 * k}" y2="${y - 62 * k}" stroke="#6b4422" stroke-width="${1.4 * k}"/><path d="M${T(14, -62)} L${T(12.5, -70)} L${T(16, -62)}Z" fill="#d7dde2" stroke="#666" stroke-width="${0.4 * k}"/>`;
    if (w === 'spear' || w === 'sword') g += `<path d="M${T(-14, -30)} L${T(-6, -30)} L${T(-6, -16)} Q${T(-10, -12)} ${T(-14, -16)}Z" fill="${c}" stroke="${dark}" stroke-width="${0.6 * k}"/>`;
    if (w === 'sword') g += `<line x1="${x + 7 * k}" y1="${y - 22 * k}" x2="${x + 18 * k}" y2="${y - 46 * k}" stroke="#dfe5ea" stroke-width="${1.6 * k}"/><circle cx="${x + 7 * k}" cy="${y - 22 * k}" r="${1.8 * k}" fill="none" stroke="#d4a531" stroke-width="${0.8 * k}"/>`;
    if (w === 'bow') g += `<path d="M${T(10, -50)} Q${T(22, -32)} ${T(10, -12)}" stroke="#6b4422" stroke-width="${1.6 * k}" fill="none"/><line x1="${x + 10 * k}" y1="${y - 50 * k}" x2="${x + 2 * k}" y2="${y - 31 * k}" stroke="#ddd" stroke-width="${0.5 * k}"/><line x1="${x + 2 * k}" y1="${y - 31 * k}" x2="${x + 10 * k}" y2="${y - 12 * k}" stroke="#ddd" stroke-width="${0.5 * k}"/><line x1="${x + 2 * k}" y1="${y - 31 * k}" x2="${x + 26 * k}" y2="${y - 33 * k}" stroke="#8a6a3a" stroke-width="${0.8 * k}"/>`;
    if (w === 'longbow') g += `<path d="M${T(10, -62)} Q${T(24, -34)} ${T(10, -4)}" stroke="#6b4422" stroke-width="${1.8 * k}" fill="none"/><line x1="${x + 10 * k}" y1="${y - 62 * k}" x2="${x + 10 * k}" y2="${y - 4 * k}" stroke="#ddd" stroke-width="${0.5 * k}"/>`;
    if (w === 'xbow') g += `<rect x="${x + 2 * k}" y="${y - 31 * k}" width="${20 * k}" height="${3 * k}" fill="#6b4422"/><path d="M${T(18, -42)} Q${T(23, -30)} ${T(18, -18)}" stroke="#3b2a1a" stroke-width="${2 * k}" fill="none"/>`;
    return g;
  };
  const horse = (x, y, s, c, armored) => {
    const k = s / 60;
    const T = (dx, dy) => `${x + dx * k},${y + dy * k}`;
    const col = armored ? '#8f949a' : '#6b4a2e';
    let g = `<ellipse cx="${x}" cy="${y}" rx="${30 * k}" ry="${4 * k}" fill="#000" opacity=".25"/>`;
    g += `<path d="M${T(-20, -2)} L${T(-18, -22)} M${T(-12, -2)} L${T(-12, -22)} M${T(14, -2)} L${T(12, -22)} M${T(22, -2)} L${T(18, -22)}" stroke="#3a2a1a" stroke-width="${3 * k}" stroke-linecap="round"/>`;
    g += `<path d="M${T(-26, -24)} Q${T(-26, -38)} ${T(-10, -38)} L${T(16, -38)} Q${T(24, -40)} ${T(28, -52)} L${T(36, -50)} Q${T(38, -44)} ${T(32, -40)} Q${T(26, -30)} ${T(22, -22)} Q${T(0, -16)} ${T(-26, -24)}Z" fill="${col}" stroke="#2a1d12" stroke-width="${0.8 * k}"/>`;
    g += `<path d="M${T(-26, -30)} Q${T(-36, -28)} ${T(-34, -14)}" stroke="#2a1d12" stroke-width="${3 * k}" fill="none"/>`;
    if (armored) {
      const pid = nid('bard');
      g = `<defs><pattern id="${pid}" width="${5 * k}" height="${4 * k}" patternUnits="userSpaceOnUse"><path d="M0 ${4 * k} Q${2.5 * k} 0 ${5 * k} ${4 * k}" fill="#a9aeb3" stroke="#5c6166" stroke-width="${0.5 * k}"/></pattern></defs>` + g;
      g += `<path d="M${T(-26, -24)} Q${T(-26, -38)} ${T(-10, -38)} L${T(16, -38)} Q${T(24, -40)} ${T(28, -52)} L${T(36, -50)} Q${T(38, -44)} ${T(32, -40)} Q${T(26, -30)} ${T(22, -18)} Q${T(0, -12)} ${T(-26, -18)}Z" fill="url(#${pid})" stroke="#4a4f54" stroke-width="${0.8 * k}"/>`;
      g += `<path d="M${T(28, -52)} L${T(38, -50)} L${T(36, -44)}Z" fill="#c9cdd1" stroke="#555"/>`;
    }
    g += `<path d="M${T(-6, -38)} L${T(6, -38)} L${T(4, -30)} L${T(-4, -30)}Z" fill="${c}"/>`;
    return g;
  };
  const rider = (x, y, s, c, opt) => {
    const k = s / 60;
    let g = horse(x, y, s, c, opt.armored);
    const rx = x - 2 * k, ry = y - 36 * k;
    g += `<path d="M${rx - 6 * k} ${ry} L${rx - 5 * k} ${ry - 18 * k} Q${rx} ${ry - 21 * k} ${rx + 5 * k} ${ry - 18 * k} L${rx + 6 * k} ${ry}Z" fill="${opt.armored ? '#8f949a' : opt.robe || '#9aa0a6'}" stroke="#2a2a2a" stroke-width="${0.6 * k}"/>`;
    g += `<circle cx="${rx}" cy="${ry - 24 * k}" r="${4.5 * k}" fill="#e3bc95"/>`;
    g += opt.hwarang
      ? `<path d="M${rx - 5 * k} ${ry - 25 * k} Q${rx} ${ry - 32 * k} ${rx + 5 * k} ${ry - 25 * k}Z" fill="#1b1512"/><path d="M${rx - 5 * k} ${ry - 26 * k} H${rx + 5 * k} Q${rx + 12 * k} ${ry - 22 * k} ${rx + 14 * k} ${ry - 14 * k}" stroke="#e05a7a" stroke-width="${1.8 * k}" fill="none"/><circle cx="${rx + 3 * k}" cy="${ry - 30 * k}" r="${2.2 * k}" fill="#f3a4bd"/>`
      : `<path d="M${rx - 5 * k} ${ry - 24 * k} Q${rx} ${ry - 33 * k} ${rx + 5 * k} ${ry - 24 * k}Z" fill="#8f949a" stroke="#333" stroke-width="${0.4 * k}"/><line x1="${rx}" y1="${ry - 32 * k}" x2="${rx}" y2="${ry - 38 * k}" stroke="${c}" stroke-width="${1.6 * k}"/>`;
    if (opt.weapon === 'bow') g += `<path d="M${rx + 8 * k} ${ry - 26 * k} Q${rx + 16 * k} ${ry - 14 * k} ${rx + 8 * k} ${ry - 2 * k}" stroke="#6b4422" stroke-width="${1.5 * k}" fill="none"/>`;
    else g += `<line x1="${rx - 14 * k}" y1="${ry + 6 * k}" x2="${rx + 34 * k}" y2="${ry - 34 * k}" stroke="#6b4422" stroke-width="${1.5 * k}"/><path d="M${rx + 34 * k} ${ry - 34 * k} L${rx + 31 * k} ${ry - 40 * k} L${rx + 37 * k} ${ry - 37 * k}Z" fill="#d7dde2"/>`;
    if (opt.flag) g += `<line x1="${rx - 6 * k}" y1="${ry}" x2="${rx - 8 * k}" y2="${ry - 40 * k}" stroke="#5a3a1e" stroke-width="${1 * k}"/><path d="M${rx - 8 * k} ${ry - 40 * k} L${rx - 22 * k} ${ry - 36 * k} L${rx - 8 * k} ${ry - 31 * k}Z" fill="${c}"/>`;
    return g;
  };
  const machine = (x, y, s, kind) => {
    const k = s / 60;
    const T = (dx, dy) => `${x + dx * k},${y + dy * k}`;
    let g = `<ellipse cx="${x}" cy="${y}" rx="${30 * k}" ry="${4 * k}" fill="#000" opacity=".25"/>`;
    if (kind === 'ram') {
      g += `<path d="M${T(-28, -8)} L${T(-20, -36)} L${T(20, -36)} L${T(28, -8)}Z" fill="#7a5530" stroke="#3a2512" stroke-width="${k}"/><path d="M${T(-24, -36)} L${T(0, -50)} L${T(24, -36)}Z" fill="#5d3f22" stroke="#3a2512"/><rect x="${x - 34 * k}" y="${y - 22 * k}" width="${20 * k}" height="${6 * k}" fill="#8f949a"/>`;
      g += [-18, 18].map((dx) => `<circle cx="${x + dx * k}" cy="${y - 6 * k}" r="${6 * k}" fill="#4a3018" stroke="#2a1a0a"/>`).join('');
    } else {
      g += `<path d="M${T(-24, -4)} L${T(-14, -40)} L${T(-4, -4)} M${T(4, -4)} L${T(14, -40)} L${T(24, -4)}" stroke="#6b4422" stroke-width="${3 * k}" fill="none"/><rect x="${x - 28 * k}" y="${y - 8 * k}" width="${56 * k}" height="${5 * k}" fill="#5d3f22"/>`;
      g += `<line x1="${x - 30 * k}" y1="${y - 14 * k}" x2="${x + 26 * k}" y2="${y - 52 * k}" stroke="#7a5530" stroke-width="${3 * k}"/><circle cx="${x + 26 * k}" cy="${y - 52 * k}" r="${5 * k}" fill="#8a8a8a" stroke="#444"/><line x1="${x}" y1="${y - 38 * k}" x2="${x - 22 * k}" y2="${y - 4 * k}" stroke="#ccc" stroke-width="${k}"/>`;
    }
    return g;
  };
  const ship = (x, y, s, c, kind) => {
    const k = s / 60;
    const T = (dx, dy) => `${x + dx * k},${y + dy * k}`;
    let g = `<path d="M${T(-40, -2)} Q${T(-20, 4)} ${T(0, -2)} Q${T(20, 4)} ${T(40, -2)}" stroke="#7fb3d8" stroke-width="${2 * k}" fill="none" opacity=".8"/>`;
    g += `<path d="M${T(-34, -16)} L${T(34, -16)} L${T(26, -4)} L${T(-28, -4)}Z" fill="#6b4422" stroke="#3a2512" stroke-width="${k}"/>`;
    g += `<rect x="${x - 16 * k}" y="${y - 26 * k}" width="${30 * k}" height="${10 * k}" fill="#8a6038" stroke="#3a2512"/>`;
    g += `<line x1="${x}" y1="${y - 26 * k}" x2="${x}" y2="${y - 64 * k}" stroke="#4a3018" stroke-width="${2 * k}"/>`;
    g += kind === 'wa' ? `<rect x="${x - 14 * k}" y="${y - 62 * k}" width="${28 * k}" height="${30 * k}" fill="#f1ead8" stroke="#888"/><circle cx="${x}" cy="${y - 47 * k}" r="${7 * k}" fill="#d8402f"/>`
      : `<path d="M${T(-2, -62)} Q${T(22, -48)} ${T(-2, -30)}Z" fill="#f1ead8" stroke="#888" stroke-width="${0.6 * k}"/>${[0, 1, 2, 3, 4].map((i) => `<line x1="${x - 2 * k}" y1="${y + (-58 + i * 6) * k}" x2="${x + (12 - Math.abs(i - 2) * 3) * k}" y2="${y + (-58 + i * 6) * k}" stroke="#aaa" stroke-width="${0.5 * k}"/>`).join('')}`;
    g += `<path d="M${T(0, -64)} L${T(-14, -60)} L${T(0, -56)}Z" fill="${c}"/>`;
    for (let i = 0; i < 5; i++) g += `<line x1="${x + (-24 + i * 11) * k}" y1="${y - 8 * k}" x2="${x + (-28 + i * 11) * k}" y2="${y + 4 * k}" stroke="#3a2512" stroke-width="${k}"/>`;
    return g;
  };

  A.unitArt = (uid, nation, w = 120, h = 100) => {
    const N = S.NATIONS[nation] || S.NATIONS.neutral;
    const c = N.color;
    let g = '';
    const trio = (fn) => fn(36, 80, 0.72, 0.6) + fn(84, 82, 0.72, 0.6) + fn(60, 94, 1, 1);
    switch (uid) {
      case 'cav': g = rider(30, 70, 42, c, { flag: true }) + rider(70, 92, 56, c, {}); break;
      case 'gaema': g = rider(30, 70, 42, c, { armored: true }) + rider(70, 94, 60, c, { armored: true, flag: true }); break;
      case 'hwarang': g = rider(30, 70, 42, c, { hwarang: true }) + rider(70, 92, 56, c, { hwarang: true, flag: true }); break;
      case 'mohecav': g = rider(30, 70, 42, '#7a5a34', { weapon: 'bow' }) + rider(70, 92, 56, '#7a5a34', { weapon: 'bow' }); break;
      case 'spear': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'spear' })); break;
      case 'bubyeong': g = trio((x, y, s) => fig(x, y, 42 * s, c, { weapon: 'spear', metal: '#b8a46a', helmetColor: '#c9b06a' })); break;
      case 'joui': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'sword', robe: '#1e1e24', helmet: false, band: '#a3242a' })); break;
      case 'gyeolsa': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'sword', robe: '#5a2a2a', helmet: false, band: '#e23b3b' })); break;
      case 'bow': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'bow', robe: N.light, helmet: true })); break;
      case 'gangung': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'longbow', robe: '#2b3e66' })); break;
      case 'xbow': g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'xbow' })); break;
      case 'cheonbo': g = machine(60, 94, 46, 'xbow').replace(/#7a5530/g, '#5d3f22') + fig(26, 92, 30, c, { weapon: 'xbow' }) + fig(98, 92, 30, c, { weapon: 'xbow' }); break;
      case 'siege': g = machine(36, 78, 40, 'ram') + machine(80, 94, 56, 'cata'); break;
      case 'pocha': g = machine(34, 78, 40, 'cata') + machine(80, 94, 58, 'cata'); break;
      case 'navy': g = ship(34, 70, 36, c) + ship(76, 94, 58, c); break;
      case 'wanavy': g = ship(34, 70, 36, c, 'wa') + ship(76, 94, 58, c, 'wa'); break;
      default: g = trio((x, y, s) => fig(x, y, 40 * s, c, { weapon: 'spear' }));
    }
    return `<svg class="unitart" viewBox="0 0 120 100" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet">${g}</svg>`;
  };

  /* ── 타로풍 병력 카드 (장수 초상 + 병종 일러스트 합성) ── */
  A.unitCard = (oid, uid, nation, troops, opt = {}) => {
    const N = S.NATIONS[nation] || S.NATIONS.neutral;
    const u = S.UNITS[uid];
    const o = S.officerById[oid];
    const gid = nid('uc');
    const portrait = o ? A.portrait(oid, 40, { nation }).replace('<svg class="portrait"', '<svg x="6" y="128" class="pt"') : `<g transform="translate(26,152)"><circle r="20" fill="${N.dark}"/><path d="M-11 -2 Q0 -18 11 -2 Z" fill="#8f949a"/><circle cy="2" r="7" fill="#d9b48f"/><path d="M-14 18 Q0 6 14 18" fill="#8f949a"/></g>`;
    const name = o ? o.name : '수비대장';
    return `<svg class="ucard" viewBox="0 0 150 220" width="${opt.w || 150}" height="${opt.h || 220}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${N.light}"/><stop offset=".55" stop-color="#f6efe0"/><stop offset="1" stop-color="${N.light}"/></linearGradient>
      <linearGradient id="${gid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset=".5" stop-color="#b98a2a"/><stop offset="1" stop-color="#f1d27a"/></linearGradient></defs>
      <rect x="2" y="2" width="146" height="216" rx="10" fill="${N.dark}" stroke="url(#${gid}g)" stroke-width="3"/>
      <rect x="9" y="9" width="132" height="202" rx="6" fill="url(#${gid})" stroke="url(#${gid}g)" stroke-width="1.5"/>
      <path d="M16 118 V48 Q16 18 75 16 Q134 18 134 48 V118Z" fill="#e9dcc0" stroke="url(#${gid}g)" stroke-width="2"/>
      <path d="M16 118 V48 Q16 18 75 16 Q134 18 134 48 V118Z" fill="${N.color}" opacity=".12"/>
      <g transform="translate(15,22)">${A.unitArt(uid, nation, 120, 96).replace('<svg class="unitart"', '<svg')}</g>
      <circle cx="75" cy="18" r="13" fill="${N.dark}" stroke="url(#${gid}g)" stroke-width="2"/><text x="75" y="${u && u.hanja.length > 1 ? 21.5 : 23.5}" text-anchor="middle" font-size="${u && u.hanja.length > 1 ? 9.5 : 15}" fill="#f6dc8a" font-family="serif" font-weight="700">${u ? u.hanja : '兵'}</text>
      <path d="M20 122 H130 L124 138 H26Z" fill="${N.color}" stroke="url(#${gid}g)" stroke-width="1.2"/>
      <text x="75" y="134" text-anchor="middle" font-size="11.5" fill="#fff" font-weight="700">${u ? u.name : ''}</text>
      ${portrait}
      <circle cx="26" cy="152" r="21" fill="none" stroke="url(#${gid}g)" stroke-width="2.5"/>
      <text x="52" y="152" font-size="13" font-weight="800" fill="${N.dark}">${name}</text>
      <text x="52" y="168" font-size="10" fill="#5a4a32">병력 <tspan font-weight="800" class="uc-troops">${U.fmt(troops || 0)}</tspan></text>
      <text x="75" y="203" text-anchor="middle" font-size="9" fill="#7a6a4a" letter-spacing="2">${N.name} · ${N.hanja}</text>
    </svg>`;
  };

  /* ── 행동 카드 아이콘 ── */
  A.fxIcon = (fx, color = '#fff') => {
    const P = {
      slash: `<path d="M12 50 Q32 20 52 12" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 54 Q38 28 56 20" stroke="${color}" stroke-width="2" fill="none" opacity=".6"/>`,
      slash5: [0, 1, 2, 3, 4].map((i) => `<path d="M${8 + i * 9} 56 L${20 + i * 9} 8" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`).join(''),
      charge: `<path d="M8 40 L40 40 L36 30 L58 44 L36 58 L40 48 L8 48Z" fill="${color}"/><path d="M8 24 H28 M4 32 H22" stroke="${color}" stroke-width="2" opacity=".6"/>`,
      spear: `<line x1="6" y1="58" x2="50" y2="14" stroke="${color}" stroke-width="4"/><path d="M50 14 L58 6 L54 20Z" fill="${color}"/>`,
      arrows: [0, 1, 2, 3].map((i) => `<line x1="${10 + i * 12}" y1="8" x2="${4 + i * 12}" y2="50" stroke="${color}" stroke-width="2"/><path d="M${4 + i * 12} 50 l-3 -7 l6 0Z" fill="${color}"/>`).join(''),
      arrow: `<line x1="8" y1="56" x2="52" y2="12" stroke="${color}" stroke-width="3"/><path d="M52 12 L44 14 L50 20Z" fill="${color}"/><path d="M8 56 l2 -10 M8 56 l10 -2" stroke="${color}" stroke-width="2"/>`,
      arrow3: [0, 1, 2].map((i) => `<line x1="8" y1="${48 + i * 6}" x2="54" y2="${12 + i * 6}" stroke="${color}" stroke-width="2.5"/>`).join(''),
      bolt: `<rect x="6" y="28" width="40" height="8" fill="${color}"/><path d="M46 22 L60 32 L46 42Z" fill="${color}"/>`,
      rock: `<circle cx="38" cy="22" r="12" fill="${color}"/><path d="M8 58 Q16 30 30 28" stroke="${color}" stroke-width="2" stroke-dasharray="4 3" fill="none"/>`,
      ram: `<rect x="6" y="26" width="38" height="12" rx="3" fill="${color}"/><path d="M44 20 L58 32 L44 44Z" fill="${color}"/>`,
      wave: `<path d="M4 40 Q14 28 24 40 T44 40 T64 40" stroke="${color}" stroke-width="4" fill="none"/><path d="M4 52 Q14 40 24 52 T44 52 T64 52" stroke="${color}" stroke-width="2.5" fill="none" opacity=".7"/>`,
      water: `<path d="M32 6 Q48 30 46 40 A14 14 0 0 1 18 40 Q16 30 32 6Z" fill="${color}"/>`,
      fire: `<path d="M32 58 Q12 50 18 30 Q22 38 26 36 Q22 20 34 6 Q36 22 44 24 Q42 16 46 12 Q58 36 48 52 Q42 60 32 58Z" fill="${color}"/>`,
      shield: `<path d="M32 6 L54 14 Q54 42 32 58 Q10 42 10 14Z" fill="none" stroke="${color}" stroke-width="4"/>`,
      wall: `<path d="M6 56 V24 H14 V16 H22 V24 H30 V16 H38 V24 H46 V16 H54 V24 H58 V56Z" fill="${color}"/>`,
      buff: `<path d="M32 6 L40 24 L58 26 L44 38 L48 56 L32 46 L16 56 L20 38 L6 26 L24 24Z" fill="${color}"/>`,
      heal: `<path d="M24 8 H40 V24 H56 V40 H40 V56 H24 V40 H8 V24 H24Z" fill="${color}"/>`,
      confuse: `<path d="M32 32 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" stroke="${color}" stroke-width="3" fill="none"/>`,
      ambush: `<path d="M6 54 L18 30 L28 44 L38 22 L58 54Z" fill="${color}" opacity=".85"/><circle cx="44" cy="16" r="5" fill="${color}"/>`,
      thunder: `<path d="M36 4 L14 36 H30 L22 60 L50 24 H34Z" fill="${color}"/>`,
      dragon: `<path d="M8 44 Q16 20 34 26 Q48 30 56 14 Q58 34 44 40 Q30 46 22 56 Q24 46 8 44Z" fill="${color}"/>`,
      ghost: `<path d="M16 58 V28 Q16 8 32 8 Q48 8 48 28 V58 L42 52 L36 58 L32 52 L28 58 L22 52Z" fill="${color}"/><circle cx="26" cy="28" r="3" fill="#333"/><circle cx="38" cy="28" r="3" fill="#333"/>`,
      lotus: `<path d="M32 50 Q18 40 20 22 Q30 30 32 44 Q34 30 44 22 Q46 40 32 50Z" fill="${color}"/><path d="M32 46 Q8 46 6 30 Q20 30 30 44 M32 46 Q56 46 58 30 Q44 30 34 44" fill="${color}" opacity=".7"/>`,
      song: `<path d="M22 46 V12 L50 6 V40" stroke="${color}" stroke-width="3" fill="none"/><ellipse cx="17" cy="46" rx="7" ry="5" fill="${color}"/><ellipse cx="45" cy="40" rx="7" ry="5" fill="${color}"/>`,
      summon: `<path d="M14 58 V8 M14 8 L42 16 L14 26" stroke="${color}" stroke-width="3" fill="${color}"/><path d="M36 58 V20 M36 20 L58 26 L36 34" stroke="${color}" stroke-width="3" fill="${color}" opacity=".7"/>`,
      tiger: `<path d="M14 10 Q20 34 12 56 M30 8 Q36 34 28 58 M46 10 Q52 34 44 56" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    };
    return `<svg viewBox="0 0 64 64" width="100%" height="100%">${P[fx] || P.slash}</svg>`;
  };

  /* ── 건축물 아이콘 ── */
  A.building = (bid, nation, size = 56) => {
    const N = S.NATIONS[nation] || S.NATIONS.neutral;
    const c = N.color;
    const roof = (x, y, w, col) => `<path d="M${x - 4} ${y} Q${x + w / 2} ${y - 12} ${x + w + 4} ${y} L${x + w} ${y + 3} H${x}Z" fill="${col || '#3e4a52'}" stroke="#222" stroke-width=".8"/><path d="M${x - 4} ${y} Q${x - 6} ${y - 4} ${x - 8} ${y - 6} M${x + w + 4} ${y} Q${x + w + 6} ${y - 4} ${x + w + 8} ${y - 6}" stroke="${col || '#3e4a52'}" stroke-width="2" fill="none"/>`;
    const hall = (x, y, w, h, col) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#d9c7a2" stroke="#6b4a2a"/>${Array.from({ length: Math.floor(w / 8) }, (_, i) => `<line x1="${x + 4 + i * 8}" y1="${y}" x2="${x + 4 + i * 8}" y2="${y + h}" stroke="#8b2d1d" stroke-width="2"/>`).join('')}${roof(x, y, w, col)}`;
    let g = '';
    switch (bid) {
      case 'field': g = `<rect x="6" y="26" width="52" height="30" fill="#7fa646"/>${[0, 1, 2].map((i) => `<path d="M6 ${34 + i * 9} H58" stroke="#5a7c2c" stroke-width="2"/>`).join('')}${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${10 + i * 8} 30 l2 -6 l2 6" stroke="#c4d66a" stroke-width="1.5" fill="none"/>`).join('')}<circle cx="50" cy="14" r="6" fill="#f2c94c"/>`; break;
      case 'reservoir': g = `<path d="M4 40 Q32 30 60 40 V58 H4Z" fill="#4c8fc4"/><path d="M8 46 Q16 42 24 46 T40 46 T56 46" stroke="#a9d3f0" stroke-width="1.5" fill="none"/><path d="M4 30 L60 30 L56 38 L8 38Z" fill="#8b7a5a" stroke="#5a4a32"/><path d="M14 26 l4 -10 l4 10 M40 26 l4 -12 l4 12" fill="#4f7a32"/>`; break;
      case 'granary': g = `<line x1="16" y1="58" x2="16" y2="34" stroke="#5a3a1e" stroke-width="3"/><line x1="48" y1="58" x2="48" y2="34" stroke="#5a3a1e" stroke-width="3"/><line x1="32" y1="58" x2="32" y2="34" stroke="#5a3a1e" stroke-width="3"/><rect x="10" y="22" width="44" height="14" fill="#c8a26a" stroke="#6b4a2a"/>${roof(10, 22, 44, '#7a5530')}<text x="32" y="33" text-anchor="middle" font-size="8" fill="#5a3a1e">倉</text>`; break;
      case 'market': g = [0, 1, 2].map((i) => `<rect x="${4 + i * 20}" y="30" width="16" height="24" fill="#e6d3ab" stroke="#6b4a2a"/><path d="M${2 + i * 20} 30 L${10 + i * 20} 20 L${22 + i * 20} 30Z" fill="${i === 1 ? c : '#b5532d'}"/><circle cx="${12 + i * 20}" cy="44" r="4" fill="#d9a441"/>`).join(''); break;
      case 'station': g = `${hall(8, 28, 28, 22)}<line x1="48" y1="58" x2="48" y2="10" stroke="#5a3a1e" stroke-width="2"/><path d="M48 10 L60 14 L48 20Z" fill="${c}"/><path d="M38 56 Q40 44 50 42 L56 44 L54 48 L48 48 L46 56" fill="#6b4a2e"/>`; break;
      case 'tradehouse': g = `${hall(4, 22, 30, 20)}<path d="M30 52 L60 52 L56 60 L34 60Z" fill="#6b4422"/><line x1="46" y1="52" x2="46" y2="32" stroke="#4a3018" stroke-width="2"/><path d="M46 32 Q58 40 46 50Z" fill="#f1ead8"/><circle cx="16" cy="52" r="5" fill="#d9a441"/>`; break;
      case 'housing': g = `${[[4, 34, 24], [22, 26, 22], [40, 36, 20]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${58 - y}" fill="#e6d3ab" stroke="#6b4a2a"/><path d="M${x - 3} ${y} L${x + w / 2} ${y - 10} L${x + w + 3} ${y}Z" fill="#8a6a3a" stroke="#5a3a1e"/><rect x="${x + w / 2 - 3}" y="${50}" width="6" height="8" fill="#5a3a1e"/>`).join('')}<path d="M44 20 Q46 12 50 14" stroke="#aaa" stroke-width="2" fill="none"/>`; break;
      case 'office': g = `<rect x="8" y="32" width="48" height="24" fill="#d9c7a2" stroke="#6b4a2a"/>${[14, 24, 34, 44].map((x) => `<line x1="${x}" y1="32" x2="${x}" y2="56" stroke="#8b2d1d" stroke-width="2.5"/>`).join('')}<path d="M2 32 Q32 16 62 32 L58 35 H6Z" fill="#2f3a40" stroke="#222"/><rect x="24" y="22" width="16" height="7" fill="#1b1410"/><text x="32" y="28" text-anchor="middle" font-size="6" fill="#f6dc8a">官衙</text><rect x="26" y="44" width="12" height="12" fill="#5a3a1e"/>`; break;
      case 'mine': g = `<path d="M4 58 L14 26 H30 L34 58Z" fill="#7a6a5a" stroke="#3a2f25"/><path d="M12 58 Q19 44 26 58Z" fill="#e8662d"/><path d="M20 24 Q16 14 22 8 Q22 16 26 14 Q28 20 24 24Z" fill="#9a9a9a" opacity=".7"/>${[38, 50].map((x, i) => `<path d="M${x + 6} ${16 + i * 4} L${x} ${46} H${x + 12}Z" fill="#3f7a3a"/><rect x="${x + 4.5}" y="46" width="3" height="8" fill="#5a3a1e"/>`).join('')}<rect x="36" y="54" width="26" height="5" rx="2.5" fill="#8a6038"/>`; break;
      case 'smelter': g = `<path d="M18 58 L22 20 H42 L46 58Z" fill="#7a6a5a" stroke="#3a2f25"/><path d="M26 58 Q32 44 38 58Z" fill="#e8662d"/><path d="M30 18 Q26 10 32 4 Q32 12 36 10 Q38 16 34 18Z" fill="#9a9a9a" opacity=".7"/><rect x="4" y="48" width="12" height="10" fill="#555"/><rect x="48" y="50" width="12" height="8" fill="#6b6b6b"/>`; break;
      case 'lumber': g = `${[10, 26, 42].map((x, i) => `<path d="M${x + 6} ${12 + i * 2} L${x} ${40} H${x + 12}Z" fill="#3f7a3a"/><rect x="${x + 4.5}" y="40" width="3" height="8" fill="#5a3a1e"/>`).join('')}<rect x="6" y="50" width="52" height="6" rx="3" fill="#8a6038"/><circle cx="8" cy="53" r="3" fill="#c49a6a"/>`; break;
      case 'workshop': g = `${hall(6, 30, 52, 24, '#5a4a3a')}<path d="M22 22 L34 10 L38 14 L26 26Z" fill="#888"/><rect x="34" y="8" width="6" height="16" transform="rotate(45 37 16)" fill="#6b4422"/>`; break;
      case 'shipyard': g = `<path d="M6 50 H58 L52 58 H12Z" fill="#6b4422"/><path d="M10 46 L54 46 L48 52 L16 52Z" fill="#8a6038"/>${[14, 26, 38, 50].map((x) => `<line x1="${x}" y1="46" x2="${x - 4}" y2="16" stroke="#5a3a1e" stroke-width="2"/>`).join('')}<line x1="6" y1="18" x2="56" y2="18" stroke="#5a3a1e" stroke-width="2"/>`; break;
      case 'barracks': g = `${[8, 34].map((x) => `<path d="M${x} 54 L${x + 11} 26 L${x + 22} 54Z" fill="${c}" stroke="#222"/><path d="M${x + 11} 26 V54" stroke="#222"/>`).join('')}<line x1="32" y1="56" x2="32" y2="8" stroke="#5a3a1e" stroke-width="2"/><path d="M32 8 L46 12 L32 18Z" fill="#e8c35a"/>`; break;
      case 'stable': g = `<path d="M4 58 V36 H60 V58" fill="none" stroke="#6b4a2a" stroke-width="3"/><path d="M4 44 H60" stroke="#6b4a2a" stroke-width="2"/><path d="M20 34 Q20 16 34 14 L44 8 L48 14 L42 18 Q46 26 40 34Z" fill="#6b4a2e" stroke="#2a1d12"/><circle cx="40" cy="14" r="1.5" fill="#fff"/>`; break;
      case 'bowshop': g = `<path d="M18 6 Q44 32 18 58" stroke="#6b4422" stroke-width="4" fill="none"/><line x1="18" y1="6" x2="18" y2="58" stroke="#ddd"/>${[0, 1, 2].map((i) => `<line x1="${30 + i * 8}" y1="56" x2="${34 + i * 8}" y2="12" stroke="#8a6a3a" stroke-width="2"/><path d="M${34 + i * 8} 12 l-3 6 l6 0Z" fill="#aaa"/>`).join('')}`; break;
      case 'chi': g = `<path d="M2 58 V30 H62 V58Z" fill="#9c917f" stroke="#4a4236"/><path d="M22 58 V20 H42 V58Z" fill="#b2a690" stroke="#4a4236"/>${[22, 28, 34, 40].map((x) => `<rect x="${x}" y="14" width="4" height="6" fill="#b2a690" stroke="#4a4236"/>`).join('')}<path d="M26 58 V44 Q32 38 38 44 V58Z" fill="#3a2a1a"/>${[0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${2 + i * 9}" y="${34 + r * 8}" width="8" height="7" fill="none" stroke="#7a705f" stroke-width=".5"/>`).join('')).join('')}`; break;
      case 'beacon': g = `<path d="M18 58 L24 22 H40 L46 58Z" fill="#9c917f" stroke="#4a4236"/><path d="M26 22 Q22 10 30 6 Q30 14 34 12 Q36 18 34 22Z" fill="#e8662d"/><path d="M34 6 Q38 -2 46 2 Q40 4 40 10" stroke="#9a9a9a" stroke-width="3" fill="none" opacity=".7"/>`; break;
      case 'temple': g = `${hall(10, 40, 44, 16, '#3e4a52')}<rect x="27" y="10" width="10" height="30" fill="#c8b48a"/>${[12, 20, 28].map((y) => roof(25, y, 14))}<line x1="32" y1="2" x2="32" y2="10" stroke="#d4a531" stroke-width="2"/>`; break;
      case 'school': g = `${hall(8, 28, 48, 26, '#2f4a5a')}<rect x="22" y="38" width="20" height="10" fill="#f3eadb" stroke="#6b4a2a"/><line x1="32" y1="38" x2="32" y2="48" stroke="#6b4a2a"/>`; break;
      case 'w_cheolli': g = `<path d="M0 50 Q16 30 32 38 T64 26 V42 Q48 52 32 52 T0 62Z" fill="#9c917f" stroke="#4a4236"/>${[4, 14, 24, 34, 44, 54].map((x, i) => `<rect x="${x}" y="${44 - i * 3 - (i % 2) * 2}" width="5" height="5" fill="#b2a690" stroke="#4a4236"/>`).join('')}<rect x="28" y="28" width="10" height="14" fill="#b2a690" stroke="#4a4236"/>${roof(27, 28, 12, c)}`; break;
      case 'w_hwangnyong': g = `<rect x="27" y="56" width="10" height="4" fill="#6b4a2a"/>${Array.from({ length: 9 }, (_, i) => { const w = 30 - i * 2.4, y = 54 - i * 5.4; return `<rect x="${32 - w / 2 + 2}" y="${y - 3}" width="${w - 4}" height="3" fill="#8b2d1d"/>${roof(32 - w / 2, y - 3, w, '#2f3a40')}`; }).join('')}<line x1="32" y1="6" x2="32" y2="0" stroke="#d4a531" stroke-width="2"/>`; break;
      case 'w_cheomseong': g = `<path d="M22 60 Q16 40 24 22 H40 Q48 40 42 60Z" fill="#c4b494" stroke="#6b5a3a"/>${[26, 32, 38, 44, 50, 56].map((y) => `<path d="M${22 - (y - 40) * 0.1} ${y} H${42 + (y - 40) * 0.1}" stroke="#8a7a5a" stroke-width=".8"/>`).join('')}<rect x="28" y="36" width="8" height="8" fill="#3a2a1a"/><rect x="22" y="16" width="20" height="6" fill="#b2a284" stroke="#6b5a3a"/>`; break;
      case 'w_mireuk': g = `<rect x="18" y="54" width="28" height="6" fill="#9a9a90"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${20 + i * 1.5}" y="${46 - i * 7}" width="${24 - i * 3}" height="5" fill="#b8b8ac" stroke="#6a6a60"/><path d="M${17 + i * 1.5} ${46 - i * 7} H${47 - i * 1.5}" stroke="#6a6a60" stroke-width="2"/>`).join('')}<line x1="32" y1="6" x2="32" y2="2" stroke="#d4a531" stroke-width="2"/>`; break;
      case 'w_jeongnim': g = `<rect x="20" y="54" width="24" height="6" fill="#9a9a90"/>${Array.from({ length: 5 }, (_, i) => `<rect x="${24 + i * 1.6}" y="${46 - i * 8}" width="${16 - i * 3.2}" height="6" fill="#c2c2b6" stroke="#6a6a60"/><path d="M${18 + i * 2} ${46 - i * 8} Q32 ${44 - i * 8} ${46 - i * 2} ${46 - i * 8}" stroke="#6a6a60" stroke-width="2" fill="none"/>`).join('')}`; break;
      case 'w_canal': g = `<path d="M0 30 Q32 40 64 30 V44 Q32 54 0 44Z" fill="#4c8fc4"/><path d="M18 34 L46 34 L42 40 L22 40Z" fill="#6b4422"/><path d="M32 34 V20 Q40 26 32 30" fill="#f1ead8" stroke="#888"/>`; break;
      default: g = `<rect x="12" y="20" width="40" height="36" fill="#ccc"/>`;
    }
    return `<svg class="bicon" viewBox="0 0 64 64" width="${size}" height="${size}">${g}</svg>`;
  };

  /* ── 지도 도시 아이콘 ── */
  A.cityIcon = (type, color, dark, port) => {
    let g = '';
    switch (type) {
      case 'capital': g = `<rect x="-13" y="-6" width="26" height="12" fill="${color}" stroke="${dark}" stroke-width="1.5"/><path d="M-17 -6 Q0 -18 17 -6 Z" fill="${dark}"/><path d="M-12 -13 Q0 -22 12 -13" stroke="${dark}" stroke-width="3" fill="none"/><rect x="-3" y="0" width="6" height="6" fill="${dark}"/><circle cx="0" cy="-20" r="2.5" fill="#f3d36b"/>`; break;
      case 'plain': g = `<rect x="-10" y="-8" width="20" height="16" fill="${color}" stroke="${dark}" stroke-width="1.5"/>${[-10, -4, 2, 8].map((x) => `<rect x="${x}" y="-12" width="3" height="4" fill="${color}" stroke="${dark}" stroke-width="1"/>`).join('')}<rect x="-3" y="1" width="6" height="7" fill="${dark}"/>`; break;
      case 'mountain': g = `<path d="M-14 9 L-4 -12 L2 -4 L7 -10 L15 9Z" fill="#8a8072" stroke="${dark}" stroke-width="1"/><path d="M-10 9 V0 H10 V9" fill="${color}" stroke="${dark}" stroke-width="1.5"/>${[-10, -4, 2, 8].map((x) => `<rect x="${x}" y="-3" width="2.5" height="3" fill="${color}" stroke="${dark}" stroke-width=".8"/>`).join('')}`; break;
      case 'port': g = `<path d="M-13 2 H13 L9 9 H-9Z" fill="${dark}"/><line x1="0" y1="2" x2="0" y2="-14" stroke="${dark}" stroke-width="2"/><path d="M0 -14 Q11 -7 0 0Z" fill="${color}" stroke="${dark}" stroke-width="1"/>`; break;
      case 'wall': g = `<path d="M-18 6 V-4 H-14 V-8 H-10 V-4 H-6 V-8 H-2 V-4 H2 V-8 H6 V-4 H10 V-8 H14 V-4 H18 V6Z" fill="${color}" stroke="${dark}" stroke-width="1.5"/><rect x="-4" y="-14" width="8" height="10" fill="${color}" stroke="${dark}" stroke-width="1.2"/><path d="M-6 -14 L0 -19 L6 -14Z" fill="${dark}"/>`; break;
      case 'pass': g = `<path d="M-14 8 L-14 -6 L-6 -10 L-6 8 M14 8 L14 -6 L6 -10 L6 8" fill="#8a8072" stroke="${dark}"/><path d="M-8 -6 H8 V8 H-8Z" fill="${color}" stroke="${dark}" stroke-width="1.5"/><path d="M-4 8 V0 Q0 -4 4 0 V8" fill="${dark}"/>`; break;
      case 'jin': g = `<path d="M-12 8 L-6 -4 L0 8Z M0 8 L6 -4 L12 8Z" fill="${color}" stroke="${dark}" stroke-width="1.3"/><line x1="0" y1="8" x2="0" y2="-16" stroke="${dark}" stroke-width="2"/><path d="M0 -16 L11 -12 L0 -8Z" fill="${color}" stroke="${dark}"/>`; break;
    }
    if (port && type !== 'port') g += `<g transform="translate(13,6) scale(.5)"><circle r="7" fill="#fff" stroke="#2b6ca3" stroke-width="2"/><path d="M0 -4 V4 M-4 1 Q0 6 4 1" stroke="#2b6ca3" stroke-width="2" fill="none"/></g>`;
    return g;
  };

  /* ── 전투 이펙트 (DOM 오버레이용 SVG) ── */
  A.effect = (fx) => {
    const E = {
      slash: `<svg viewBox="0 0 100 100" class="fx fx-slash"><path d="M10 80 Q50 20 90 10" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M14 86 Q54 30 92 22" stroke="#ffd36b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
      slash5: `<svg viewBox="0 0 100 100" class="fx fx-slash5">${[0, 1, 2, 3, 4].map((i) => `<path style="animation-delay:${i * 60}ms" d="M${10 + i * 16} 90 L${30 + i * 14} 10" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`).join('')}</svg>`,
      charge: `<svg viewBox="0 0 100 100" class="fx fx-charge"><path d="M0 50 H70 L60 34 L100 54 L60 74 L70 58 H0Z" fill="#ffefb0" opacity=".9"/>${[0, 1, 2].map((i) => `<path d="M0 ${30 + i * 20} H40" stroke="#d6c08a" stroke-width="3" opacity=".7"/>`).join('')}</svg>`,
      spear: `<svg viewBox="0 0 100 100" class="fx fx-spear"><line x1="0" y1="90" x2="85" y2="15" stroke="#e6ecf0" stroke-width="5"/><path d="M85 15 L98 2 L92 24Z" fill="#fff"/></svg>`,
      arrows: `<svg viewBox="0 0 100 100" class="fx fx-arrows">${Array.from({ length: 12 }, (_, i) => `<g style="animation-delay:${(i % 6) * 50}ms"><line x1="${8 + i * 7.5}" y1="0" x2="${2 + i * 7.5}" y2="${30 + (i % 3) * 10}" stroke="#f1e2c0" stroke-width="2"/></g>`).join('')}</svg>`,
      arrow: `<svg viewBox="0 0 100 100" class="fx fx-arrow"><line x1="0" y1="80" x2="90" y2="20" stroke="#f1e2c0" stroke-width="3"/><path d="M90 20 L78 22 L86 30Z" fill="#fff"/></svg>`,
      arrow3: `<svg viewBox="0 0 100 100" class="fx fx-arrow">${[0, 1, 2].map((i) => `<line x1="0" y1="${70 + i * 8}" x2="92" y2="${14 + i * 8}" stroke="#f1e2c0" stroke-width="3"/>`).join('')}</svg>`,
      bolt: `<svg viewBox="0 0 100 100" class="fx fx-arrow"><rect x="0" y="44" width="80" height="10" fill="#e6ecf0"/><path d="M80 36 L100 49 L80 62Z" fill="#fff"/></svg>`,
      rock: `<svg viewBox="0 0 100 100" class="fx fx-rock"><circle cx="50" cy="50" r="18" fill="#8a8a8a" stroke="#555" stroke-width="3"/><circle cx="44" cy="44" r="4" fill="#aaa"/></svg>`,
      ram: `<svg viewBox="0 0 100 100" class="fx fx-charge"><rect x="0" y="40" width="70" height="20" rx="5" fill="#7a5530"/><path d="M70 30 L100 50 L70 70Z" fill="#9aa0a6"/></svg>`,
      wave: `<svg viewBox="0 0 100 100" class="fx fx-wave"><path d="M0 60 Q12 40 25 60 T50 60 T75 60 T100 60 V100 H0Z" fill="#5fa8e0" opacity=".85"/><path d="M0 70 Q12 52 25 70 T50 70 T75 70 T100 70" stroke="#e6f4ff" stroke-width="4" fill="none"/></svg>`,
      water: `<svg viewBox="0 0 100 100" class="fx fx-water"><path d="M0 100 Q10 30 30 50 Q40 10 60 40 Q75 5 100 50 V100Z" fill="#3d8fd1" opacity=".85"/><path d="M0 100 Q20 60 40 70 Q60 50 80 70 Q90 60 100 70" stroke="#e6f4ff" stroke-width="5" fill="none"/></svg>`,
      fire: `<svg viewBox="0 0 100 100" class="fx fx-fire">${[20, 45, 70].map((x, i) => `<path style="animation-delay:${i * 90}ms" d="M${x} 95 Q${x - 18} 70 ${x - 6} 45 Q${x - 2} 58 ${x + 4} 54 Q${x - 2} 30 ${x + 10} 10 Q${x + 12} 34 ${x + 20} 38 Q${x + 34} 70 ${x} 95Z" fill="#ff7a2a"/><path d="M${x + 2} 92 Q${x - 6} 74 ${x + 2} 60 Q${x + 6} 72 ${x + 12} 66 Q${x + 18} 82 ${x + 2} 92Z" fill="#ffd34d"/>`).join('')}</svg>`,
      shield: `<svg viewBox="0 0 100 100" class="fx fx-shield"><path d="M50 6 L88 20 Q88 66 50 94 Q12 66 12 20Z" fill="#7fc8ff" opacity=".35" stroke="#d6f0ff" stroke-width="4"/></svg>`,
      wall: `<svg viewBox="0 0 100 100" class="fx fx-shield"><path d="M4 96 V40 H16 V28 H28 V40 H40 V28 H52 V40 H64 V28 H76 V40 H88 V28 H96 V96Z" fill="#b2a690" opacity=".8" stroke="#f1e8d0" stroke-width="3"/></svg>`,
      buff: `<svg viewBox="0 0 100 100" class="fx fx-buff"><circle cx="50" cy="50" r="40" fill="none" stroke="#ffd36b" stroke-width="4"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${18 + i * 13} 90 V${50 - (i % 2) * 14}" stroke="#ffe9a8" stroke-width="3" stroke-linecap="round"/>`).join('')}</svg>`,
      heal: `<svg viewBox="0 0 100 100" class="fx fx-buff"><path d="M40 16 H60 V40 H84 V60 H60 V84 H40 V60 H16 V40 H40Z" fill="#6be08f" opacity=".85"/></svg>`,
      confuse: `<svg viewBox="0 0 100 100" class="fx fx-confuse"><path d="M50 50 m-6 0 a6 6 0 1 1 12 0 a12 12 0 1 1 -24 0 a18 18 0 1 1 36 0 a24 24 0 1 1 -48 0" stroke="#c9a6ff" stroke-width="4" fill="none"/></svg>`,
      ambush: `<svg viewBox="0 0 100 100" class="fx fx-charge">${[0, 1, 2, 3].map((i) => `<path d="M${i * 25} 100 L${i * 25 + 12} 60 L${i * 25 + 24} 100Z" fill="#2c4a2c" opacity=".9"/>`).join('')}<path d="M10 50 L90 40" stroke="#fff" stroke-width="5"/></svg>`,
      thunder: `<svg viewBox="0 0 100 100" class="fx fx-thunder"><path d="M58 0 L22 56 H46 L34 100 L82 36 H56Z" fill="#fff7a8" stroke="#ffd34d" stroke-width="3"/></svg>`,
      dragon: `<svg viewBox="0 0 100 100" class="fx fx-water"><path d="M0 80 Q20 20 50 40 Q70 52 90 18 Q100 50 74 64 Q50 76 34 100 Q34 82 0 80Z" fill="#3fb48a" opacity=".9"/><circle cx="84" cy="24" r="3" fill="#fff"/></svg>`,
      ghost: `<svg viewBox="0 0 100 100" class="fx fx-confuse">${[20, 50, 80].map((x) => `<path d="M${x - 12} 90 V50 Q${x - 12} 26 ${x} 26 Q${x + 12} 26 ${x + 12} 50 V90 L${x + 6} 84 L${x} 90 L${x - 6} 84Z" fill="#e8e0ff" opacity=".8"/>`).join('')}</svg>`,
      lotus: `<svg viewBox="0 0 100 100" class="fx fx-buff"><path d="M50 80 Q26 64 30 34 Q46 48 50 70 Q54 48 70 34 Q74 64 50 80Z" fill="#ffb3cf"/><path d="M50 76 Q12 76 8 50 Q30 50 46 72 M50 76 Q88 76 92 50 Q70 50 54 72" fill="#ff8fb8" opacity=".8"/></svg>`,
      song: `<svg viewBox="0 0 100 100" class="fx fx-confuse"><path d="M30 76 V20 L80 10 V66" stroke="#ffe08a" stroke-width="5" fill="none"/><ellipse cx="22" cy="76" rx="10" ry="7" fill="#ffe08a"/><ellipse cx="72" cy="66" rx="10" ry="7" fill="#ffe08a"/></svg>`,
      summon: `<svg viewBox="0 0 100 100" class="fx fx-buff">${[20, 50, 80].map((x) => `<line x1="${x}" y1="96" x2="${x}" y2="16" stroke="#5a3a1e" stroke-width="3"/><path d="M${x} 16 L${x + 18} 24 L${x} 34Z" fill="#e8c35a"/>`).join('')}</svg>`,
      tiger: `<svg viewBox="0 0 100 100" class="fx fx-slash5">${[0, 1, 2].map((i) => `<path d="M${22 + i * 22} 8 Q${32 + i * 22} 50 ${18 + i * 22} 94" stroke="#ff9a3d" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('')}</svg>`,
    };
    return E[fx] || E.slash;
  };

  S.Art = A;
})(window.SGK);
