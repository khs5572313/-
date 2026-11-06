/* 삼국기 — 삼국 통일 캠페인: 한 나라를 골라 6개 시나리오를 연대순으로 이어 플레이
 * 590 온달의 맹세 → 602 서동의 나라 → 642 대야성의 한 → 655 여제동맹 → 660 황산벌 → 661 삼한일통
 * 앞 장의 결과(승리·점수)가 다음 장의 시작 보너스(군자금·군량·사기)로 이어진다 */
(function (S) {
  'use strict';
  const U = S.U, G = S.G, A = S.Art, el = U.el, $ = U.$;
  const C = {};
  const KEY = 'samgukgi_campaign';
  C.order = () => S.SCENARIOS.slice().sort((a, b) => a.year - b.year || a.season - b.season).map((s) => s.id);
  C.load = () => { try { return JSON.parse(S.store.get(KEY)); } catch (e) { return null; } };
  C.save = (c) => S.store.set(KEY, JSON.stringify(c));
  C.clear = () => S.store.remove(KEY);

  /* 앞 장 결과 → 다음 장 보너스 */
  C.bonusFor = (c) => {
    const last = c.results[c.results.length - 1];
    if (!last) return null;
    const k = last.win ? 1 : 0.4;
    const fromScore = Math.min(1500, Math.round(last.score / 25));
    return { gold: Math.round((800 + fromScore) * k), food: Math.round(2000 * k), iron: Math.round(200 * k), wood: Math.round(300 * k), morale: last.win ? 10 : 0 };
  };
  C.start = (nation, diff) => {
    const c = { nation, diff, idx: 0, results: [], started: Date.now() };
    C.save(c);
    C.play(c);
  };
  C.play = async (c) => {
    const id = C.order()[c.idx];
    const sc = S.scenarioById[id];
    const bonus = C.bonusFor(c);
    G.newGame(id, c.nation, { diff: c.diff, campaign: { idx: c.idx }, bonus });
    await S.UI.startMain(false);
    const prev = c.results.map((r, i) => el('li', { class: r.win ? 'ok' : 'fail' }, `제${i + 1}장 ${r.title} — ${r.win ? '승리' : '종료'} · ${U.fmt(r.score)}점`));
    await S.UI.modal({
      title: `삼국 통일 캠페인 — 제${c.idx + 1}장 / ${C.order().length}장`, wide: true,
      body: el('div', { class: 'intro' },
        el('div', { class: 'intro-em', html: A.emblem(c.nation, 70) }),
        el('h3', {}, `${sc.year}년 「${sc.title}」 — ${sc.sub}`),
        el('p', {}, sc.desc),
        el('h3', {}, '이번 장의 승리 조건'),
        el('ul', {}, G.goalStatus(c.nation).map((g) => el('li', {}, g.desc))),
        bonus ? el('p', { class: 'hint' }, `앞 장의 전공 계승: 돈 +${U.fmt(bonus.gold)} · 식량 +${U.fmt(bonus.food)} · 철 +${bonus.iron} · 목재 +${bonus.wood}${bonus.morale ? ` · 사기 +${bonus.morale}` : ''}`) : null,
        prev.length ? el('div', {}, el('h3', {}, '지난 장'), el('ul', { class: 'goals' }, prev)) : null,
        el('p', { class: 'muted small' }, `난이도 ${G.DIFF[c.diff].name} · ${S.nationName(c.nation)}`)),
      buttons: [{ label: '출정', cls: 'gold' }] });
    await S.UI.runEvents();
  };
  /* 시나리오가 끝났을 때 (UI.gameEnd에서 호출) */
  C.onEnd = async (end) => {
    const c = C.load();
    const st = S.state;
    if (!c || !st.campaign || st.campaign.idx !== c.idx || st.player !== c.nation) return false;
    const sc = S.scenarioById[st.scenario];
    const score = G.score() + (end.win ? 3000 : 0);
    c.results[c.idx] = { id: sc.id, title: sc.title, win: !!end.win, score, cities: G.citiesOf(st.player).length };
    const last = c.idx >= C.order().length - 1;
    C.save(c);
    const choice = await S.UI.modal({
      title: end.win ? `🏆 제${c.idx + 1}장 승리` : `⏳ 제${c.idx + 1}장 종료`, closable: false, wide: true,
      body: el('div', { class: 'end' }, el('span', { html: A.emblem(st.player, 90) }), el('h2', {}, end.msg),
        el('p', {}, `${sc.title} · ${U.dateStr(st.year, st.season)} · 이번 장 점수 ${U.fmt(score)}${end.win ? ' (승리 보너스 +3,000 포함)' : ''}`),
        last ? el('p', { class: 'hint' }, '마지막 장입니다. 캠페인 결과를 확인하세요.') : el('p', { class: 'hint' }, `다음 장: ${S.scenarioById[C.order()[c.idx + 1]].year}년 「${S.scenarioById[C.order()[c.idx + 1]].title}」`)),
      buttons: [
        last ? { label: '캠페인 결과', cls: 'gold', value: 'result' } : { label: '다음 장으로 ▶', cls: 'gold', value: 'next' },
        { label: '이 장 다시 하기', value: 'retry' },
        { label: '계속 플레이', value: 'stay' }] });
    if (choice === 'next') { c.idx++; C.save(c); setTimeout(() => C.play(c)); }
    else if (choice === 'retry') { c.results.length = c.idx; C.save(c); setTimeout(() => C.play(c)); }
    else if (choice === 'result') setTimeout(() => C.result(c));
    return true;
  };
  C.grade = (c) => {
    const wins = c.results.filter((r) => r && r.win).length;
    return wins >= 6 ? 'S' : wins >= 5 ? 'A' : wins >= 4 ? 'B' : wins >= 3 ? 'C' : 'D';
  };
  C.result = async (c) => {
    c = c || C.load();
    if (!c) return;
    const total = c.results.reduce((a, r) => a + (r ? r.score : 0), 0);
    const g = C.grade(c);
    const title = { S: '삼한일통의 위업', A: '천하의 패자', B: '강국의 군주', C: '버텨 낸 왕조', D: '역사의 조연' }[g];
    await S.UI.modal({
      title: '삼국 통일 캠페인 — 최종 결과', wide: true, closable: false,
      body: el('div', { class: 'end' }, el('span', { html: A.emblem(c.nation, 90) }),
        el('h2', {}, `등급 ${g} — 「${title}」`),
        el('p', {}, `${S.nationName(c.nation)} · 난이도 ${G.DIFF[c.diff].name} · 총점 ${U.fmt(total)}`),
        el('ul', { class: 'goals' }, c.results.map((r, i) => el('li', { class: r && r.win ? 'ok' : 'fail' }, `제${i + 1}장 ${r ? r.title : '-'} — ${r ? (r.win ? '승리' : '종료') : '-'} · ${r ? U.fmt(r.score) : 0}점`))),
        el('p', { class: 'muted small' }, '등급: 6승 S · 5승 A · 4승 B · 3승 C · 그 이하 D')),
      buttons: [{ label: '타이틀로', cls: 'gold', fn: () => { C.clear(); setTimeout(S.UI.title); } }] });
  };
  /* 타이틀 메뉴: 나라·난이도 선택 */
  C.menu = async () => {
    const saved = C.load();
    let nation = 'goguryeo', diff = 'normal';
    const body = el('div', { class: 'camp' });
    const render = () => {
      body.innerHTML = '';
      body.appendChild(el('p', {}, '한 나라를 골라 590년부터 661년까지 여섯 시나리오를 연대순으로 이어 갑니다. 앞 장의 전공이 다음 장의 군자금·군량·사기로 이어지고, 마지막에 등급(S~D)을 받습니다.'));
      body.appendChild(el('ol', { class: 'camp-list' }, C.order().map((id) => { const sc = S.scenarioById[id]; return el('li', {}, `${sc.year}년 「${sc.title}」 — ${S.NATIONS[sc.hero].name}편`); })));
      body.appendChild(el('h4', {}, '나라'));
      body.appendChild(el('div', { class: 'camp-pick' }, ['goguryeo', 'baekje', 'silla'].map((n) => el('button', { class: `btn ${nation === n ? 'on' : ''}`, onclick: () => { nation = n; render(); } }, el('span', { html: A.emblem(n, 22) }), ` ${S.NATIONS[n].name}`))));
      body.appendChild(el('h4', {}, '난이도'));
      body.appendChild(S.UI.diffPicker(diff, (d) => { diff = d; render(); }));
      if (saved) body.appendChild(el('p', { class: 'hint' }, `진행 중인 캠페인: ${S.nationName(saved.nation)} · 제${saved.idx + 1}장 · 난이도 ${G.DIFF[saved.diff].name} — 「이어하기」로 계속할 수 있습니다. 새로 시작하면 덮어씁니다.`));
    };
    render();
    await S.UI.modal({ title: '삼국 통일 캠페인', body, wide: true,
      buttons: [
        { label: '새 캠페인 시작', cls: 'gold', fn: () => setTimeout(() => C.start(nation, diff)) },
        saved ? { label: `이어하기 (제${saved.idx + 1}장)`, fn: () => setTimeout(() => C.play(saved)) } : null,
        { label: '닫기' }].filter(Boolean) });
  };
  S.Campaign = C;
})(window.SGK);
