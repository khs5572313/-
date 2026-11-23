/* 삼국기 - 병종 부대 그림 (SVG)
 * 외부 이미지 없이 코드로 그린다. 모든 그림은 오른쪽을 바라보며, 적군은 CSS에서 좌우 반전한다.
 * 움직이는 부위에는 클래스를 붙여 CSS/스크립트로 동작을 준다.
 *   .sol  병사 한 명(대기 중 들썩임)   .wpn  무기(공격 시 찌르기·발사)
 *   .legs 말 다리(돌격 시 질주)         .str  활시위 */
(function (root) {
  'use strict';
  var SGK = (root.SGK = root.SGK || {});
  var SKIN = '#e9c9a2', HELM = '#4a4038', WOOD = '#8a6a44', STEEL = '#dfe6ea', DARK = '#2b221c';

  function footman(color) {
    return '<line x1="18" y1="31" x2="15" y2="43" stroke="' + DARK + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<line x1="22" y1="31" x2="26" y2="43" stroke="' + DARK + '" stroke-width="3.2" stroke-linecap="round"/>' +
      '<rect x="14" y="16" width="12" height="16" rx="4" fill="' + color + '"/>' +
      '<rect x="14" y="26" width="12" height="2.4" fill="#000" opacity=".35"/>' +
      '<circle cx="20" cy="11" r="5.2" fill="' + SKIN + '"/>' +
      '<path d="M14.4 10.6 A5.7 5.7 0 0 1 25.6 10.6 Z" fill="' + HELM + '"/>' +
      '<line x1="20" y1="5.2" x2="20" y2="1" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="22.6" cy="11.8" r=".8" fill="#222"/>';
  }

  /* 창병: 방패와 긴 창 */
  function spearman(color) {
    return footman(color) +
      '<g class="wpn"><line x1="5" y1="29.5" x2="38" y2="17" stroke="' + WOOD + '" stroke-width="2" stroke-linecap="round"/>' +
      '<polygon points="37.5,15.4 46,13 39.6,19.6" fill="' + STEEL + '"/>' +
      '<line x1="34" y1="18.5" x2="36" y2="22" stroke="' + color + '" stroke-width="1.6"/></g>' +
      '<ellipse cx="27" cy="24" rx="4.2" ry="7" fill="#5b4a3a" stroke="#e3b341" stroke-width="1.2"/>' +
      '<circle cx="27" cy="24" r="1.3" fill="#e3b341"/>';
  }

  /* 궁병: 활, 시위, 메긴 화살, 등에 멘 화살통 */
  function archer(color) {
    return '<rect x="10" y="14" width="3.4" height="11" rx="1" fill="#6b5237" transform="rotate(-18 11.7 19.5)"/>' +
      '<line x1="9.6" y1="13" x2="8.4" y2="9.5" stroke="' + STEEL + '" stroke-width="1"/>' +
      '<line x1="11.6" y1="12.6" x2="11" y2="9" stroke="' + STEEL + '" stroke-width="1"/>' +
      footman(color) +
      '<line x1="24" y1="20.5" x2="30" y2="22" stroke="' + SKIN + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M29.5 8.5 Q41 22 29.5 35.5" fill="none" stroke="' + WOOD + '" stroke-width="2.3" stroke-linecap="round"/>' +
      '<line class="str" x1="29.5" y1="8.5" x2="29.5" y2="35.5" stroke="#e8e2d6" stroke-width=".8"/>' +
      '<g class="wpn"><line x1="23" y1="22" x2="39" y2="22" stroke="#d9d2c4" stroke-width="1.4"/>' +
      '<polygon points="38.5,20 44,22 38.5,24" fill="' + STEEL + '"/></g>';
  }

  /* 기병: 말과 기수, 긴 기창 */
  function rider(color) {
    var HORSE = '#7a5236', HD = '#5d3d27';
    return '<path d="M13 31 Q5 33.5 6.5 43" stroke="#3b2618" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<g class="legs" stroke="' + HD + '" stroke-width="3" stroke-linecap="round">' +
      '<line x1="18" y1="38" x2="14" y2="49"/><line x1="23" y1="39" x2="24" y2="49.5"/>' +
      '<line x1="34" y1="39" x2="31" y2="49.5"/><line x1="39" y1="37" x2="44" y2="48"/></g>' +
      '<ellipse cx="28" cy="33" rx="15" ry="7" fill="' + HORSE + '"/>' +
      '<path d="M38 29 L47 16.5 L53.5 18 L55.5 24 L50.5 25.2 L45 35 Z" fill="' + HORSE + '"/>' +
      '<path d="M47 16.5 L46 12 L49.5 15.5 Z" fill="' + HD + '"/>' +
      '<path d="M40 27 L46 17.5 L44 17 L38.5 25 Z" fill="#3b2618"/>' +
      '<circle cx="51.3" cy="20.6" r=".9" fill="#111"/>' +
      '<rect x="21" y="26.5" width="13" height="8" rx="2" fill="' + color + '"/>' +
      '<rect x="21" y="32.5" width="13" height="2" fill="#e3b341" opacity=".8"/>' +
      '<line x1="26" y1="29" x2="24" y2="38" stroke="' + DARK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="22.5" y="13" width="10" height="14" rx="3.5" fill="' + color + '"/>' +
      '<rect x="22.5" y="21.5" width="10" height="2" fill="#000" opacity=".35"/>' +
      '<circle cx="27.5" cy="9" r="4.6" fill="' + SKIN + '"/>' +
      '<path d="M22.6 8.6 A5 5 0 0 1 32.4 8.6 Z" fill="' + HELM + '"/>' +
      '<line x1="27.5" y1="3.8" x2="27.5" y2="0.4" stroke="' + color + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="29.8" cy="9.6" r=".7" fill="#222"/>' +
      '<g class="wpn"><line x1="14" y1="24" x2="56" y2="12" stroke="' + WOOD + '" stroke-width="2" stroke-linecap="round"/>' +
      '<polygon points="55.5,10.4 63.5,8.6 57.6,14.6" fill="' + STEEL + '"/>' +
      '<path d="M50 12.6 L50.8 18.5 L46 15 Z" fill="' + color + '"/></g>';
  }

  function place(inner, x, y, s, back, i) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"' + (back ? ' opacity=".8"' : '') + '>' +
      '<g class="sol sol' + i + '">' + inner + '</g></g>';
  }

  /* 부대 한 무리를 그린다. troop: cav|arc|spr, color: 나라 색 */
  SGK.sprite = function (troop, color) {
    var body;
    if (troop === 'cav') {
      body = place(rider(color), 0, 0, 0.74, true, 1) + place(rider(color), 9, 8, 0.96, false, 0);
    } else {
      var one = troop === 'arc' ? archer : spearman;
      body = place(one(color), 6, 0, 0.8, true, 1) + place(one(color), 0, 11, 0.86, true, 2) + place(one(color), 22, 8, 1, false, 0);
    }
    return '<svg class="squad squad-' + troop + '" viewBox="0 0 72 58" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<ellipse cx="36" cy="54" rx="30" ry="3.6" fill="#000" opacity=".28"/>' + body + '</svg>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
