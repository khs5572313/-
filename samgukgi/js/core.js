/* 삼국기 — 코어 유틸리티 & 전역 네임스페이스 */
window.SGK = window.SGK || {};
(function (S) {
  'use strict';
  const U = {};
  U.rand = Math.random;
  U.ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  U.rf = (a, b) => a + Math.random() * (b - a);
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  U.fmt = (n) => Math.round(n).toLocaleString('ko-KR');
  U.hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  /* 시드 고정 난수 (초상화 등 결정적 생성용) */
  U.seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.el = (tag, attrs, ...children) => {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return e;
  };
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.sleep = (ms) => new Promise((r) => setTimeout(r, S.settings && S.settings.fast ? ms * 0.35 : ms));
  U.deepCopy = (o) => JSON.parse(JSON.stringify(o));
  U.SEASONS = ['봄', '여름', '가을', '겨울'];
  U.dateStr = (y, s) => `${y}년 ${U.SEASONS[s]}`;
  /* 지도 투영: 경위도 → SVG 좌표 */
  U.LON0 = 115; U.LAT0 = 45; U.KX = 175; U.KY = 230;
  U.MAP_W = (132 - 115) * U.KX; U.MAP_H = (45 - 33) * U.KY;
  U.px = (lon) => (lon - U.LON0) * U.KX;
  U.py = (lat) => (U.LAT0 - lat) * U.KY;
  /* 안전한 저장소: 브라우저 저장소가 막힌 환경(아티팩트 등)에서는 메모리에 보관 */
  const mem = {};
  S.store = {
    get: (k) => { try { const v = window.localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : null) : v; } catch (e) { return k in mem ? mem[k] : null; } },
    set: (k, v) => { mem[k] = v; try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: (k) => { delete mem[k]; try { window.localStorage.removeItem(k); } catch (e) { /* 무시 */ } },
  };
  S.U = U;
  S.settings = { fast: false, historicalDeath: true, sound: false, balanceRoster: true };
})(window.SGK);
