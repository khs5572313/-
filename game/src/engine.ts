// 개념마을 규칙 엔진 — 화면·네트워크·저장소에 의존하지 않는 순수 로직.
// 3D 클라이언트도, 밸런스 봇도 같은 함수를 호출한다(규칙은 한 곳에만 존재).

import type {
  Action, BattleResult, Course, Dungeon, GameData, Item, Job, MockExam, Monster, Resolver, Rng, Slot, Stat, State,
} from './types.ts';
import { STATS, SUBJECTS } from './types.ts';

// ───────────────────────── 초기화 ─────────────────────────

export function newGame(data: GameData): State {
  const stats = Object.fromEntries(STATS.map((s) => [s, 0])) as Record<Stat, number>;
  const owned = data.items.filter((i) => i.price === 0).map((i) => i.id);
  const equipped: Partial<Record<Slot, string>> = {};
  for (const id of owned) equipped[itemById(data, id).slot] = id;
  return {
    day: 1,
    gold: 100,
    stress: 0,
    stats,
    courseSessions: Object.fromEntries(data.courses.map((c) => [c.id, 0])),
    jobReadyDay: Object.fromEntries(data.jobs.map((j) => [j.id, 1])),
    owned,
    equipped,
    cleared: [],
    mockResults: [],
    finished: false,
    won: false,
    wonDay: null,
    log: [],
  };
}

/** 빠른 복사: 이벤트 객체는 불변으로 취급하므로 배열만 새로 만든다(봇이 하루에 수십 번 미리보기를 하므로 중요). */
export function cloneState(s: State): State {
  return {
    ...s,
    stats: { ...s.stats },
    courseSessions: { ...s.courseSessions },
    jobReadyDay: { ...s.jobReadyDay },
    owned: s.owned.slice(),
    equipped: { ...s.equipped },
    cleared: s.cleared.slice(),
    mockResults: s.mockResults.slice(),
    log: s.log.slice(),
  };
}

// ───────────────────────── 조회 헬퍼 ─────────────────────────

export const itemById = (d: GameData, id: string): Item => find(d.items, id, 'item');
export const courseById = (d: GameData, id: string): Course => find(d.courses, id, 'course');
export const jobById = (d: GameData, id: string): Job => find(d.jobs, id, 'job');
export const dungeonById = (d: GameData, id: string): Dungeon => find(d.dungeons, id, 'dungeon');
export const monsterById = (d: GameData, id: string): Monster => find(d.monsters, id, 'monster');

function find<T extends { id: string }>(arr: T[], id: string, label: string): T {
  const x = arr.find((a) => a.id === id);
  if (!x) throw new Error(`없는 ${label}: ${id}`);
  return x;
}

function equippedItem(s: State, d: GameData, slot: Slot): Item | null {
  const id = s.equipped[slot];
  return id ? itemById(d, id) : null;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// ───────────────────────── 교육 ─────────────────────────

/** 같은 과정을 sessionsPerTier 회 들을 때마다 초급→중급→고급→특급. */
export function tierIndex(s: State, d: GameData, courseId: string): number {
  return Math.min(Math.floor(s.courseSessions[courseId] / d.balance.sessionsPerTier), d.tiers.length - 1);
}

export function tuition(s: State, d: GameData, courseId: string): number {
  return d.tiers[tierIndex(s, d, courseId)].tuition;
}

/** 문항 1개를 맞힐 확률(봇 기준). 실제 학생은 이 값과 무관하게 진짜로 풀어야 한다. */
export function studySuccessP(s: State, d: GameData, courseId: string): number {
  const b = d.balance;
  const tier = d.tiers[tierIndex(s, d, courseId)];
  const intBonus = Math.min(s.stats.int * b.intPBonusPerPoint, b.intPBonusCap);
  const stressPenalty = Math.max(0, s.stress - b.stressPenaltyStart) * b.stressPenaltyPerPoint;
  const charm = equippedItem(s, d, 'charm')?.studyP ?? 0;
  return clamp(tier.baseP + intBonus + charm - stressPenalty, b.minSuccessP, b.maxSuccessP);
}

// ───────────────────────── 알바 ─────────────────────────

export function jobUnlocked(s: State, j: Job): boolean {
  for (const st of STATS) {
    const need = j.req[st];
    if (need !== undefined && s.stats[st] < need) return false;
  }
  if (j.req.masterySum !== undefined && masterySum(s) < j.req.masterySum) return false;
  return true;
}

export function jobAvailable(s: State, j: Job): boolean {
  return jobUnlocked(s, j) && s.jobReadyDay[j.id] <= s.day;
}

export const masterySum = (s: State): number => SUBJECTS.reduce((a, k) => a + s.stats[k], 0);

export function expectedWage(s: State, d: GameData, j: Job): number {
  const mul = equippedItem(s, d, 'charm')?.wageMul ?? 1;
  return Math.round(j.wage * mul) * j.hours * j.p;
}

// ───────────────────────── 전투 ─────────────────────────

export function playerCombat(s: State, d: GameData) {
  const b = d.balance;
  const w = equippedItem(s, d, 'weapon');
  const a = equippedItem(s, d, 'armor');
  return {
    maxHp: Math.round(b.baseHp + s.stats.int * b.intToHp + (a?.hp ?? 0)),
    atk: b.baseAtk + (w?.atk ?? 0),
    def: a?.def ?? 0,
  };
}

/** 실시간 전투를 '초당 피해량 경주'로 근사한다.
 *  몬스터 속성 과목의 숙련도가 곧 그 몬스터에 대한 공격력 배율 → 약점 단원이 곧 벽이 된다.
 *  rng 가 null 이면 분산 없는 기댓값 계산(봇의 승산 예측용). */
export function fight(s: State, d: GameData, monsterIds: string[], rng: Rng | null): BattleResult {
  const b = d.balance;
  const p = playerCombat(s, d);
  let hp = p.maxHp;
  let defeated = 0;
  for (const id of monsterIds) {
    const m = monsterById(d, id);
    const roll = () => (rng ? 1 + (rng.next() * 2 - 1) * b.combatVariance : 1);
    const dps = p.atk * (1 + s.stats[m.element] / b.masteryScale) * (100 / (100 + m.def)) * roll();
    const incoming = m.atk * (100 / (100 + p.def)) * roll();
    const seconds = m.hp / Math.max(dps, 0.01);
    const needed = incoming * seconds;
    if (needed >= hp) {
      const partial = hp / needed;
      return { win: false, hpLeft: 0, maxHp: p.maxHp, defeated, progress: defeated + partial };
    }
    hp -= needed;
    defeated++;
  }
  return { win: true, hpLeft: hp, maxHp: p.maxHp, defeated, progress: defeated };
}

export function dungeonUnlocked(s: State, dg: Dungeon): boolean {
  return !s.cleared.includes(dg.id) && (dg.requires === null || s.cleared.includes(dg.requires));
}

/** 봇·UI 공용: 지금 들어가면 이길지 기댓값으로 미리 본다. */
export function previewDungeon(s: State, d: GameData, dungeonId: string): BattleResult {
  return fight(s, d, dungeonById(d, dungeonId).floors, null);
}

// ───────────────────────── 상점 ─────────────────────────

export function canBuy(s: State, d: GameData, itemId: string): boolean {
  const it = itemById(d, itemId);
  return !s.owned.includes(itemId) && s.gold >= it.price;
}

export function buy(s: State, d: GameData, itemId: string): State {
  if (!canBuy(s, d, itemId)) throw new Error(`구매 불가: ${itemId}`);
  const n = cloneState(s);
  const it = itemById(d, itemId);
  n.gold -= it.price;
  n.owned.push(itemId);
  n.equipped[it.slot] = itemId;
  n.log.push({ day: n.day, kind: 'buy', text: `${it.name} 구매(${it.price}G)` });
  return n;
}

/** 같은 슬롯에서 현재 장비보다 비싼(=상위) 아직 안 산 장비 중 가장 싼 것의 가격. 없으면 null. */
export function cheapestUpgradePrice(s: State, d: GameData): number | null {
  let best: number | null = null;
  for (const slot of ['weapon', 'armor', 'charm'] as Slot[]) {
    const cur = equippedItem(s, d, slot)?.price ?? 0;
    for (const it of d.items) {
      if (it.slot !== slot || s.owned.includes(it.id) || it.price <= cur) continue;
      if (best === null || it.price < best) best = it.price;
    }
  }
  return best;
}

// ───────────────────────── 하루 진행 ─────────────────────────

export function legalActions(s: State, d: GameData): Action[] {
  if (s.finished) return [];
  const out: Action[] = [{ type: 'rest' }];
  for (const c of d.courses) if (s.gold >= tuition(s, d, c.id)) out.push({ type: 'study', courseId: c.id });
  for (const j of d.jobs) if (jobAvailable(s, j)) out.push({ type: 'work', jobId: j.id });
  for (const dg of d.dungeons) if (dungeonUnlocked(s, dg)) out.push({ type: 'dungeon', dungeonId: dg.id });
  return out;
}

/** 다음 모의고사(오늘 포함)와 그 날짜. UI의 '운명의 달력'·봇의 대비 판단에 쓴다. */
export function nextMockExam(s: State, d: GameData): { day: number; exam: MockExam } | null {
  const every = d.balance.mockExamEvery;
  const day = Math.ceil(s.day / every) * every;
  const exam = d.mockExams.find((m) => m.index === day / every - 1);
  return exam && day <= d.balance.totalDays ? { day, exam } : null;
}

export function previewMock(s: State, d: GameData): BattleResult | null {
  const nx = nextMockExam(s, d);
  return nx ? fight(s, d, nx.exam.monsters, null) : null;
}

export function isMockExamDay(d: GameData, day: number): boolean {
  return day % d.balance.mockExamEvery === 0;
}

/** 하루 1행동. 반환값은 새 상태(원본 불변). */
export function step(
  s0: State,
  d: GameData,
  action: Action,
  rng: Rng,
  resolver: Resolver = ({ p }) => rng.next() < p,
): State {
  if (s0.finished) throw new Error('이미 끝난 게임');
  const s = cloneState(s0);
  const b = d.balance;
  const log = (kind: string, text: string) => s.log.push({ day: s.day, kind, text });

  let act = action;
  if (s.stress >= b.maxStress && act.type !== 'rest') {
    log('burnout', '번아웃: 오늘은 강제로 쉽니다');
    act = { type: 'rest' };
  }

  switch (act.type) {
    case 'rest': {
      s.stress = Math.max(0, s.stress - b.restRelief);
      log('rest', '휴식');
      break;
    }
    case 'study': {
      const c = courseById(d, act.courseId);
      const fee = tuition(s, d, c.id);
      if (s.gold < fee) throw new Error(`수강료 부족: ${c.id}`);
      s.gold -= fee;
      const tIdx = tierIndex(s, d, c.id);
      const tier = d.tiers[tIdx];
      let ok = 0;
      for (let i = 0; i < b.studyAttempts; i++) {
        const p = studySuccessP(s, d, c.id);
        if (resolver({ stat: c.stat, tier: tIdx, p })) {
          ok++;
          s.stats[c.stat] += tier.gain;
          if (c.stat !== 'int') s.stats.int += b.intGainPerSuccess;
        }
      }
      s.courseSessions[c.id]++;
      s.stress += b.stressPerStudy;
      log('study', `${c.name}(${tier.name}) ${ok}/${b.studyAttempts} 정답`);
      break;
    }
    case 'work': {
      const j = jobById(d, act.jobId);
      if (!jobAvailable(s, j)) throw new Error(`알바 불가: ${j.id}`);
      const wage = Math.round(j.wage * (equippedItem(s, d, 'charm')?.wageMul ?? 1));
      let earned = 0;
      for (let h = 0; h < j.hours; h++) if (rng.next() < j.p) earned += wage;
      s.gold += earned;
      s.jobReadyDay[j.id] = s.day + j.cooldown + 1;
      s.stress += b.stressPerWork;
      log('work', `${j.name} ${earned}G`);
      break;
    }
    case 'dungeon': {
      const dg = dungeonById(d, act.dungeonId);
      if (!dungeonUnlocked(s, dg)) throw new Error(`던전 잠김: ${dg.id}`);
      const r = fight(s, d, dg.floors, rng);
      s.stress += b.stressPerDungeon;
      if (r.win) {
        s.gold += dg.reward.gold;
        s.cleared.push(dg.id);
        log('dungeon_win', `${dg.name} 클리어 +${dg.reward.gold}G`);
        if (dg.final) {
          s.won = true;
          s.wonDay = s.day;
          s.finished = true;
        }
      } else {
        const partial = Math.floor((dg.reward.gold * r.defeated) / dg.floors.length * b.lootKeepOnDefeat);
        s.gold += partial;
        s.stress += b.defeatStress;
        log('dungeon_lose', `${dg.name} 패배 (${r.defeated}/${dg.floors.length}층) +${partial}G`);
      }
      break;
    }
  }

  // 일일 장신구 효과
  s.stress = Math.max(0, s.stress - (equippedItem(s, d, 'charm')?.dailyRelief ?? 0));

  // 월례 모의고사(라이벌 보스): 정해진 날 저녁에 자동으로 붙는다
  if (!s.finished && isMockExamDay(d, s.day)) {
    const idx = s.day / b.mockExamEvery - 1;
    const me = d.mockExams.find((m) => m.index === idx);
    if (me) {
      const r = fight(s, d, me.monsters, rng);
      s.mockResults.push(r.win);
      if (r.win) {
        s.gold += me.reward.gold;
        s.stats.int += me.reward.int;
        log('mock_win', `${me.name} 승리 +${me.reward.gold}G`);
      } else {
        s.stress += me.failStress;
        log('mock_lose', `${me.name} 패배`);
      }
    }
  }

  s.stress = clamp(s.stress, 0, b.maxStress);
  if (!s.finished) {
    s.day++;
    if (s.day > b.totalDays) s.finished = true;
  }
  return s;
}
