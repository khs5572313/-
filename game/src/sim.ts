// 밸런스 시뮬레이터: 봇 3종 × N판을 돌려 지표를 내고, data/targets.json 의 목표와 대조한다.
// 사용: node src/sim.ts [--runs 300] [--seed 1] [--strict] [--json]

import { readFileSync } from 'node:fs';
import type { Bot } from './bots.ts';
import { BOTS } from './bots.ts';
import { loadData } from './data.ts';
import { buy, canBuy, cheapestUpgradePrice, newGame, step } from './engine.ts';
import { makeRng } from './rng.ts';
import type { GameData, State } from './types.ts';

/** 이 이상 골드를 들고 있는데 살 장비가 없으면 '돈이 남아도는 날'로 센다. */
export const IDLE_GOLD_FLOOR = 500;

export interface RunMetrics {
  won: boolean;
  wonDay: number | null;
  firstClearDay: number | null;
  mockLosses: number;
  mockCount: number;
  attempts: [number, number, number];
  defeats: [number, number, number];
  /** 돈은 있는데(≥ idleGoldFloor) 상점에 더 살 게 없는 날 */
  idleShopDays: number;
  /** 다음 장비를 살 돈이 없는 날 */
  poorDays: number;
  burnouts: number;
  daysPlayed: number;
  /** 던전 순서대로 클리어한 날짜 */
  clearDays: number[];
}

/** 1판 플레이. 봇의 정답률(accuracy)을 문항 판정기에 반영한다. */
export function playRun(bot: Bot, d: GameData, seed: number): { metrics: RunMetrics; state: State } {
  const rng = makeRng(seed);
  let s = newGame(d);
  const phaseOf = (day: number) => (day <= d.balance.totalDays / 3 ? 0 : day <= (d.balance.totalDays * 2) / 3 ? 1 : 2);
  const m: RunMetrics = {
    won: false, wonDay: null, firstClearDay: null, mockLosses: 0, mockCount: 0,
    attempts: [0, 0, 0], defeats: [0, 0, 0], idleShopDays: 0, poorDays: 0, burnouts: 0, daysPlayed: 0, clearDays: [],
  };
  const resolver = ({ p }: { p: number }) => rng.next() < p * bot.accuracy;

  while (!s.finished) {
    const dec = bot.decide(s, d, rng);
    for (const id of dec.buys) if (canBuy(s, d, id)) s = buy(s, d, id);

    const up = cheapestUpgradePrice(s, d);
    if (up === null && s.gold >= IDLE_GOLD_FLOOR) m.idleShopDays++;
    if (up !== null && s.gold < up) m.poorDays++;

    const day = s.day;
    const before = s.log.length;
    s = step(s, d, dec.action, rng, resolver);
    m.daysPlayed++;
    for (const ev of s.log.slice(before)) {
      if (ev.kind === 'burnout') m.burnouts++;
      if (ev.kind === 'dungeon_win' || ev.kind === 'dungeon_lose') {
        m.attempts[phaseOf(day)]++;
        if (ev.kind === 'dungeon_lose') m.defeats[phaseOf(day)]++;
        if (ev.kind === 'dungeon_win') {
          if (m.firstClearDay === null) m.firstClearDay = day;
          m.clearDays.push(day);
        }
      }
    }
  }
  m.won = s.won;
  m.wonDay = s.wonDay;
  m.mockCount = s.mockResults.length;
  m.mockLosses = s.mockResults.filter((x) => !x).length;
  return { metrics: m, state: s };
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const k = Math.floor(a.length / 2);
  return a.length % 2 ? a[k] : (a[k - 1] + a[k]) / 2;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export interface BotSummary {
  bot: string;
  label: string;
  runs: number;
  winRate: number;
  medianWinDay: number | null;
  medianFirstClearDay: number | null;
  avgMockLosses: number;
  mockLossRunShare: number;
  defeatRate: [number, number, number];
  idleShopShare: number;
  poorShare: number;
  avgBurnouts: number;
  /** 중반 벽: (3·4번째 던전 1개당 소요일) / (1·2번째 던전 1개당 소요일)의 중앙값 */
  midWallRatio: number | null;
}

export function summarize(bot: Bot, ms: RunMetrics[]): BotSummary {
  const rate = (i: number) => {
    const a = ms.reduce((x, m) => x + m.attempts[i], 0);
    return a ? ms.reduce((x, m) => x + m.defeats[i], 0) / a : 0;
  };
  const days = ms.reduce((x, m) => x + m.daysPlayed, 0);
  return {
    bot: bot.name,
    label: bot.label,
    runs: ms.length,
    winRate: mean(ms.map((m) => (m.won ? 1 : 0))),
    medianWinDay: median(ms.filter((m) => m.won).map((m) => m.wonDay as number)),
    medianFirstClearDay: median(ms.filter((m) => m.firstClearDay !== null).map((m) => m.firstClearDay as number)),
    avgMockLosses: mean(ms.map((m) => m.mockLosses)),
    mockLossRunShare: mean(ms.map((m) => (m.mockLosses > 0 ? 1 : 0))),
    defeatRate: [rate(0), rate(1), rate(2)],
    idleShopShare: days ? ms.reduce((x, m) => x + m.idleShopDays, 0) / days : 0,
    poorShare: days ? ms.reduce((x, m) => x + m.poorDays, 0) / days : 0,
    avgBurnouts: mean(ms.map((m) => m.burnouts)),
    midWallRatio: median(ms.filter((m) => m.clearDays.length >= 4).map((m) => {
      const c = m.clearDays;
      return (c[3] - c[1]) / c[1];
    })),
  };
}

export interface Target {
  id: string;
  desc: string;
  bot: string;
  metric: string;
  min?: number;
  max?: number;
}

export interface TargetResult extends Target {
  value: number | null;
  pass: boolean;
}

/** metric 은 BotSummary 의 숫자 키. */
function metricValue(s: BotSummary, metric: string): number | null {
  const v = (s as unknown as Record<string, unknown>)[metric];
  return typeof v === 'number' ? v : v === null ? null : NaN;
}

export function evaluate(targets: Target[], sums: BotSummary[]): TargetResult[] {
  return targets.map((t) => {
    const s = sums.find((x) => x.bot === t.bot);
    const value = s ? metricValue(s, t.metric) : null;
    const pass = value !== null && !Number.isNaN(value) &&
      (t.min === undefined || value >= t.min) && (t.max === undefined || value <= t.max);
    return { ...t, value, pass };
  });
}

export function runAll(d: GameData, runs: number, seed: number): BotSummary[] {
  return BOTS.map((bot, bi) => {
    const ms: RunMetrics[] = [];
    for (let i = 0; i < runs; i++) ms.push(playRun(bot, d, seed * 1_000_003 + bi * 100_003 + i).metrics);
    return summarize(bot, ms);
  });
}

export function loadTargets(): Target[] {
  return JSON.parse(readFileSync(new URL('../data/targets.json', import.meta.url), 'utf8')) as Target[];
}

// ───────────── CLI ─────────────

function arg(name: string, def: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : def;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmt = (x: number | null, digits = 2) => (x === null ? '-' : Number.isFinite(x) ? x.toFixed(digits) : '∞');

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = arg('runs', 300);
  const seed = arg('seed', 1);
  const t0 = Date.now();
  const d = loadData();
  const sums = runAll(d, runs, seed);
  const results = evaluate(loadTargets(), sums);
  const ms = Date.now() - t0;

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ runs, seed, ms, summaries: sums, targets: results }, null, 2));
  } else {
    console.log(`\n개념마을 밸런스 시뮬레이션 — 봇 ${sums.length}종 × ${runs}판 (seed ${seed}, ${(ms / 1000).toFixed(1)}초)\n`);
    console.log('봇              승률    중앙 승리일  첫 클리어일  모의고사 패배(평균/1회↑)  패배율 초·중·후반         돈 남는 날  돈 없는 날  번아웃  중반 벽');
    for (const s of sums) {
      console.log(
        `${s.label.padEnd(10)}  ${pct(s.winRate).padStart(6)}  ${fmt(s.medianWinDay, 0).padStart(10)}  ${fmt(s.medianFirstClearDay, 0).padStart(10)}  ` +
        `${fmt(s.avgMockLosses)} / ${pct(s.mockLossRunShare).padStart(6)}        ` +
        `${s.defeatRate.map(pct).join(' · ').padEnd(24)}  ${pct(s.idleShopShare).padStart(8)}  ${pct(s.poorShare).padStart(9)}  ${fmt(s.avgBurnouts, 1).padStart(5)}  ${fmt(s.midWallRatio).padStart(6)}`,
      );
    }
    console.log('\n밸런스 목표');
    for (const r of results) {
      const range = `${r.min ?? '-∞'} ~ ${r.max ?? '∞'}`;
      console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.id.padEnd(4)} ${r.desc}  [${fmt(r.value, 3)} / 목표 ${range}]`);
    }
    const passed = results.filter((r) => r.pass).length;
    console.log(`\n통과 ${passed}/${results.length}\n`);
  }
  if (process.argv.includes('--strict') && results.some((r) => !r.pass)) process.exit(1);
}
