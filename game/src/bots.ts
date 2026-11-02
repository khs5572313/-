// 밸런스 검증용 봇 3종. 사람 대신 수백 판을 플레이해 수치가 목표 안에 있는지 확인한다.
// 봇은 엔진의 공개 함수만 쓴다(=실제 플레이어가 화면에서 볼 수 있는 정보만 사용).

import type { Action, GameData, Item, Rng, Slot, Stat, State } from './types.ts';
import { STATS } from './types.ts';
import {
  canBuy, cloneState, dungeonById, dungeonUnlocked, expectedWage, fight, itemById, jobAvailable,
  nextMockExam, previewDungeon, previewMock, tierIndex, tuition,
} from './engine.ts';

export interface BotDecision {
  buys: string[];
  action: Action;
}

export interface Bot {
  name: string;
  label: string;
  /** 문항 정답률 배율(실제 실력). 1.0 = 엔진이 계산한 확률 그대로 맞힘. */
  accuracy: number;
  decide(s: State, d: GameData, rng: Rng): BotDecision;
}

// ───────────── 공용 판단 함수 ─────────────

function nextDungeonId(s: State, d: GameData): string | null {
  return d.dungeons.find((dg) => dungeonUnlocked(s, dg))?.id ?? null;
}

function bestJob(s: State, d: GameData): string | null {
  let best: string | null = null;
  let bestV = -1;
  for (const j of d.jobs) {
    if (!jobAvailable(s, j)) continue;
    const v = expectedWage(s, d, j);
    if (v > bestV) { bestV = v; best = j.id; }
  }
  return best;
}

function courseFor(d: GameData, stat: Stat): string {
  const c = d.courses.find((x) => x.stat === stat);
  if (!c) throw new Error(`과정 없음: ${stat}`);
  return c.id;
}

/** 어떤 능력치를 한 회차 올리면 목표 전투(몬스터 목록)의 승산이 가장 좋아지는지 탐색. */
function mostUsefulStat(s: State, d: GameData, monsters: string[]): Stat {
  let best: Stat = 'int';
  let bestScore = -Infinity;
  for (const st of STATS) {
    const t = cloneState(s);
    const tier = d.tiers[tierIndex(s, d, courseFor(d, st))];
    t.stats[st] += tier.gain * 7;
    const r = fight(t, d, monsters, null);
    const floors = monsters.length;
    const score = (r.win ? 1 + r.hpLeft / r.maxHp : r.progress / floors) - tuition(s, d, courseFor(d, st)) * 0.00002;
    if (score > bestScore) { bestScore = score; best = st; }
  }
  return best;
}

function upgradeCandidates(s: State, d: GameData): Item[] {
  const out: Item[] = [];
  for (const slot of ['weapon', 'armor', 'charm'] as Slot[]) {
    const curId = s.equipped[slot];
    const cur = curId ? itemById(d, curId).price : 0;
    for (const it of d.items) if (it.slot === slot && it.price > cur && !s.owned.includes(it.id)) out.push(it);
  }
  return out;
}

/** reserve 만큼 남기고 살 수 있는 가장 비싼 상위 장비를 슬롯별로 하나씩. */
function greedyBuys(s: State, d: GameData, reserve: number, slots: Slot[]): string[] {
  const buys: string[] = [];
  let gold = s.gold;
  for (const slot of slots) {
    const cands = upgradeCandidates(s, d)
      .filter((i) => i.slot === slot && i.price <= gold - reserve)
      .sort((a, b) => b.price - a.price);
    if (cands.length) { buys.push(cands[0].id); gold -= cands[0].price; }
  }
  return buys;
}

function studyOrWork(s: State, d: GameData, stat: Stat): Action {
  const cid = courseFor(d, stat);
  if (s.gold >= tuition(s, d, cid)) return { type: 'study', courseId: cid };
  const j = bestJob(s, d);
  return j ? { type: 'work', jobId: j } : { type: 'rest' };
}

/** 수강료가 다음 회차 기준 일정 수준 이상 모일 때까지는 알바를 섞는다. */
function needsMoney(s: State, d: GameData, stat: Stat, buffer: number): boolean {
  return s.gold < tuition(s, d, courseFor(d, stat)) * buffer;
}

// ───────────── 봇 정의 ─────────────

/** 잘하는 봇: 다음 던전에 가장 도움이 되는 과목만 골라 공부, 여유 있게 이길 때만 진입. */
export const skilledBot: Bot = {
  name: 'skilled',
  label: '잘하는 봇',
  accuracy: 1.0,
  decide(s, d) {
    const buys = greedyBuys(s, d, 200, ['weapon', 'armor', 'charm']);
    const after = applyBuys(s, d, buys);
    if (after.stress >= 65) return { buys, action: { type: 'rest' } };
    // 모의고사가 7일 안에 있고 지금 실력으로 질 것 같으면 그 대비가 최우선
    const mock = nextMockExam(after, d);
    const mockR = previewMock(after, d);
    if (mock && mockR && mock.day - after.day <= 7 && !(mockR.win && mockR.hpLeft / mockR.maxHp >= 0.1)) {
      const stat = mostUsefulStat(after, d, mock.exam.monsters);
      return { buys, action: studyOrWork(after, d, stat) };
    }
    const next = nextDungeonId(after, d);
    if (next) {
      const r = previewDungeon(after, d, next);
      if (r.win && r.hpLeft / r.maxHp >= 0.15) return { buys, action: { type: 'dungeon', dungeonId: next } };
      const stat = mostUsefulStat(after, d, dungeonById(d, next).floors);
      if (needsMoney(after, d, stat, 2)) {
        const j = bestJob(after, d);
        if (j) return { buys, action: { type: 'work', jobId: j } };
      }
      return { buys, action: studyOrWork(after, d, stat) };
    }
    return { buys, action: { type: 'rest' } };
  },
};

/** 열심히 하는 봇: 성실하지만 전략이 단순(가장 낮은 능력치부터), 승산이 아슬아슬해도 들어감. */
export const diligentBot: Bot = {
  name: 'diligent',
  label: '열심히 하는 봇',
  accuracy: 0.9,
  decide(s, d, rng) {
    const buys = greedyBuys(s, d, 150, ['weapon', 'armor']);
    const after = applyBuys(s, d, buys);
    if (after.stress >= 75) return { buys, action: { type: 'rest' } };
    const next = nextDungeonId(after, d);
    if (next) {
      const r = previewDungeon(after, d, next);
      const overconfident = rng.next() < 0.03 && r.defeated >= dungeonById(d, next).floors.length - 1;
      if ((r.win && r.hpLeft / r.maxHp >= 0.05) || overconfident) return { buys, action: { type: 'dungeon', dungeonId: next } };
    }
    const lowest = [...STATS].sort((a, b) => after.stats[a] - after.stats[b])[0];
    if (needsMoney(after, d, lowest, 1.5)) {
      const j = bestJob(after, d);
      if (j) return { buys, action: { type: 'work', jobId: j } };
    }
    return { buys, action: studyOrWork(after, d, lowest) };
  },
};

/** 대충 하는 봇: 자주 쉬고, 행동을 무작위로 고르며, 장비도 가끔만 산다. */
export const casualBot: Bot = {
  name: 'casual',
  label: '대충 하는 봇',
  accuracy: 0.75,
  decide(s, d, rng) {
    const buys = rng.next() < 0.3 ? greedyBuys(s, d, 0, ['weapon', 'armor']) : [];
    const after = applyBuys(s, d, buys);
    if (after.stress >= 60 || rng.next() < 0.3) return { buys, action: { type: 'rest' } };
    const roll = rng.next();
    const next = nextDungeonId(after, d);
    if (next && roll < 0.2) return { buys, action: { type: 'dungeon', dungeonId: next } };
    if (roll < 0.6) {
      const stat = STATS[Math.floor(rng.next() * STATS.length)];
      return { buys, action: studyOrWork(after, d, stat) };
    }
    const j = bestJob(after, d);
    return { buys, action: j ? { type: 'work', jobId: j } : { type: 'rest' } };
  },
};

export const BOTS: Bot[] = [skilledBot, diligentBot, casualBot];

function applyBuys(s: State, d: GameData, buys: string[]): State {
  const t = cloneState(s);
  for (const id of buys) {
    if (!canBuy(t, d, id)) continue;
    const it = itemById(d, id);
    t.gold -= it.price;
    t.owned.push(id);
    t.equipped[it.slot] = id;
  }
  return t;
}
