/* 삼국기 — 장수 초상 생성기
 * 실제 일러스트가 준비되기 전까지 쓰는 임시(placeholder) SVG 초상.
 * assets/portraits/<장수id>.png 파일을 넣으면 그 그림이 자동으로 대신 쓰인다. */
(function (root) {
  'use strict';
  const D = root.SGData;

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const SKIN = ['#f1cfa5', '#e8bf94', '#dcae82', '#f5d7b3'];

  // 진영·신분별 머리 장식
  function headgear(g, c1, c2) {
    const n = g.nation, r = g.role;
    const helmet = (plume) =>
      `<path d="M28 44 Q28 16 50 14 Q72 16 72 44 L72 50 L64 42 L36 42 L28 50 Z" fill="#3b3b40" stroke="${c2}" stroke-width="1.5"/>` +
      `<rect x="47" y="6" width="6" height="10" fill="${c2}"/>` + plume;
    if (r === 'monk') return `<path d="M31 46 Q30 22 50 20 Q70 22 69 46" fill="none" stroke="#00000022" stroke-width="2"/>`;
    if (r === 'woman') return `<path d="M27 60 Q24 26 50 22 Q76 26 73 60 Q70 40 50 36 Q30 40 27 60 Z" fill="#17120f"/>` +
      `<circle cx="50" cy="16" r="10" fill="#17120f"/><path d="M36 16 H64" stroke="${c2}" stroke-width="2.5"/><circle cx="64" cy="16" r="3" fill="${c2}"/><circle cx="36" cy="16" r="3" fill="${c2}"/>`;
    if (g.cls === 'c' && r !== 'king' && n !== 'turk') {
      // 문인: 관모(뒤가 솟은 검은 모자)와 진영 색 띠
      return `<path d="M29 44 Q29 24 50 24 Q71 24 71 44 Z" fill="#15151a"/><path d="M38 26 Q38 8 50 8 Q62 8 62 26 Z" fill="#15151a"/>` +
        `<rect x="29" y="38" width="42" height="5" fill="${c1}" stroke="${c2}" stroke-width=".8"/>` +
        (n === 'wa' ? '' : `<path d="M29 40 L14 36 L14 41 L29 44 Z M71 40 L86 36 L86 41 L71 44 Z" fill="#15151a"/>`);
    }
    if (n === 'goguryeo') {
      if (r === 'king') return `<path d="M32 40 Q50 8 68 40 Z" fill="#2a2320" stroke="${c2}" stroke-width="1.5"/>` +
        `<path d="M40 22 Q30 2 26 0 Q34 12 44 24 Z" fill="${c2}"/><path d="M60 22 Q70 2 74 0 Q66 12 56 24 Z" fill="${c2}"/>`;
      return helmet(`<path d="M50 6 Q42 -8 30 -6 Q44 -2 48 8 Z" fill="${c1}"/><path d="M50 6 Q58 -8 70 -6 Q56 -2 52 8 Z" fill="${c1}"/>`);
    }
    if (n === 'baekje') {
      if (r === 'king') return `<path d="M30 42 Q30 20 50 18 Q70 20 70 42 Z" fill="#1c1c22"/>` +
        `<path d="M38 26 Q30 12 38 2 Q38 12 44 16 Q42 6 48 0 Q50 12 46 26 Z" fill="${c2}"/>` +
        `<path d="M62 26 Q70 12 62 2 Q62 12 56 16 Q58 6 52 0 Q50 12 54 26 Z" fill="${c2}"/>`;
      return helmet(`<circle cx="50" cy="4" r="5" fill="${c1}"/>`);
    }
    if (n === 'silla') {
      if (r === 'king') return `<rect x="29" y="32" width="42" height="9" fill="${c2}" stroke="#7a5a00" stroke-width="1"/>` +
        [36, 50, 64].map((x) => `<path d="M${x} 32 V6 M${x - 6} 12 H${x + 6} M${x - 6} 20 H${x + 6} M${x - 6} 12 V8 M${x + 6} 12 V8 M${x - 6} 20 V16 M${x + 6} 20 V16" stroke="${c2}" stroke-width="3" fill="none"/>`).join('') +
        `<circle cx="36" cy="26" r="2" fill="#3fa37a"/><circle cx="64" cy="26" r="2" fill="#3fa37a"/>`;
      if (r === 'hwarang') return `<path d="M30 42 Q30 20 50 18 Q70 20 70 42 Z" fill="#1c1c22"/><circle cx="50" cy="14" r="8" fill="#1c1c22"/>` +
        `<path d="M42 16 H58" stroke="${c1}" stroke-width="3"/><path d="M58 16 L70 26 L64 12 Z" fill="${c1}"/>`;
      return helmet(`<path d="M50 6 Q54 -6 66 -4 Q58 0 53 8 Z" fill="${c2}"/>`);
    }
    if (n === 'sui' || n === 'tang') {
      if (r === 'king') return `<path d="M32 42 Q32 22 50 22 Q68 22 68 42 Z" fill="#17171c"/>` +
        `<rect x="24" y="14" width="52" height="5" fill="#17171c" stroke="${c2}" stroke-width="1"/>` +
        [28, 36, 44, 56, 64, 72].map((x) => `<path d="M${x} 19 V30" stroke="${c2}" stroke-width="1.5" stroke-dasharray="2 2"/>`).join('');
      return helmet(`<path d="M50 6 L44 -6 L50 -2 L56 -6 Z" fill="${c1}"/><path d="M28 44 L22 60 L30 56 Z M72 44 L78 60 L70 56 Z" fill="#3b3b40"/>`);
    }
    if (n === 'turk') {
      return `<path d="M27 44 Q24 22 50 16 Q76 22 73 44 Q62 36 50 36 Q38 36 27 44 Z" fill="#6b4a2b"/>` +
        `<path d="M27 44 Q38 34 50 34 Q62 34 73 44" stroke="#d9c9a8" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        (r === 'king' ? `<path d="M50 16 L46 4 L50 8 L54 4 Z" fill="${c2}"/>` : '') +
        `<path d="M30 52 Q24 70 28 84" stroke="#231a12" stroke-width="4" fill="none"/><path d="M70 52 Q76 70 72 84" stroke="#231a12" stroke-width="4" fill="none"/>`;
    }
    // 왜
    if (r === 'king') return `<path d="M32 42 Q32 22 50 20 Q68 22 68 42 Z" fill="#17171c"/><path d="M46 20 Q44 2 52 0 Q56 8 54 20 Z" fill="#17171c" stroke="${c2}" stroke-width="1"/>`;
    return `<path d="M30 44 Q30 20 50 18 Q70 20 70 44 Z" fill="#17171c"/>` +
      `<ellipse cx="27" cy="58" rx="5" ry="9" fill="#17171c"/><ellipse cx="73" cy="58" rx="5" ry="9" fill="#17171c"/>` +
      `<path d="M24 58 H30 M70 58 H76" stroke="${c2}" stroke-width="2"/>`;
  }

  function svg(g) {
    const N = D.NATIONS[g.nation];
    const h = hash(g.id);
    const skin = SKIN[h % SKIN.length];
    const war = D.GRADES[g.stats.war].pt;            // 무력이 높을수록 눈썹이 치켜 올라간다
    const brow = 1 + war * 1.2;
    const beard = g.role !== 'woman' && g.role !== 'monk' && ((h >> 3) % 3 !== 0);
    const longBeard = (h >> 5) % 2 === 0;
    const gid = 'pg_' + g.id;
    const armor = g.role === 'king' ? N.color2 : g.role === 'monk' ? '#8a7f6c' : g.cls === 'c' ? '#e9e2d0' : '#4a4a52';
    return `<svg viewBox="0 -8 100 128" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${g.name}">
<defs><radialGradient id="${gid}" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="${N.color}" stop-opacity=".55"/><stop offset="1" stop-color="#0d0b0a"/></radialGradient></defs>
<rect x="0" y="-8" width="100" height="128" fill="${N.color}"/><rect x="0" y="-8" width="100" height="128" fill="url(#${gid})"/>
<text x="92" y="16" font-size="15" fill="${N.color2}" opacity=".28" writing-mode="vertical-rl" font-family="serif" font-weight="700">${g.hanja.slice(0, 4)}</text>
<path d="M6 120 Q8 88 34 82 L50 92 L66 82 Q92 88 94 120 Z" fill="${armor}" stroke="${N.color2}" stroke-width="1.5"/>
<path d="M34 82 L50 104 L66 82" fill="none" stroke="${N.color}" stroke-width="5"/>
${g.cls === 'm' ? `<path d="M14 100 H30 M70 100 H86 M12 110 H30 M70 110 H88" stroke="${N.color2}" stroke-width="1" opacity=".6"/>` : ''}
<rect x="43" y="70" width="14" height="16" fill="${skin}"/>
<ellipse cx="50" cy="54" rx="20" ry="24" fill="${skin}"/>
<path d="M36 ${48 - brow} L46 ${48}" stroke="#1d1611" stroke-width="2.6" stroke-linecap="round"/><path d="M64 ${48 - brow} L54 ${48}" stroke="#1d1611" stroke-width="2.6" stroke-linecap="round"/>
<path d="M38 53 Q42 51 46 53" stroke="#1d1611" stroke-width="1.8" fill="none"/><path d="M54 53 Q58 51 62 53" stroke="#1d1611" stroke-width="1.8" fill="none"/>
<circle cx="42" cy="54" r="1.5" fill="#1d1611"/><circle cx="58" cy="54" r="1.5" fill="#1d1611"/>
<path d="M50 55 L48 63 H52" stroke="#a9805a" stroke-width="1.2" fill="none"/>
<path d="M44 69 Q50 ${g.role === 'woman' ? 73 : 70} 56 69" stroke="#7a3b2e" stroke-width="1.6" fill="none"/>
${beard ? `<path d="M41 66 Q50 62 59 66" stroke="#1d1611" stroke-width="2" fill="none"/><path d="M40 70 Q50 ${longBeard ? 100 : 86} 60 70 Q50 76 40 70 Z" fill="#1d1611" opacity=".92"/>` : ''}
${headgear(g, N.color, N.color2)}
</svg>`;
  }

  /** 카드에 넣을 초상 HTML. 실제 그림 파일이 있으면 그 위에 덮어 보여 준다. */
  function html(g) {
    const has = (root.SG_PORTRAITS || []).indexOf(g.id) >= 0;
    return `<div class="portrait">${svg(g)}${has ? `<img class="ok" src="assets/portraits/${g.id}.png" alt="${g.name}" onerror="this.remove()">` : ''}</div>`;
  }

  root.SGPortrait = { svg, html };
})(typeof self !== 'undefined' ? self : this);
