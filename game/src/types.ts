// 개념마을 — 화면 없는 규칙 엔진의 타입 정의.
// 이 파일과 data/*.json 만 보면 게임 규칙 전체를 알 수 있도록 유지한다.

/** 과목 = 전투 속성. 몬스터마다 하나의 과목 속성을 가진다. */
export type Subject = 'law' | 'eco' | 'soc' | 'eth';
/** 능력치 = 4과목 숙련도 + 이해력(int). */
export type Stat = Subject | 'int';

export const SUBJECTS: readonly Subject[] = ['law', 'eco', 'soc', 'eth'];
export const STATS: readonly Stat[] = ['law', 'eco', 'soc', 'eth', 'int'];

export interface Balance {
  totalDays: number;
  mockExamEvery: number;
  studyAttempts: number;
  sessionsPerTier: number;
  intGainPerSuccess: number;
  intPBonusPerPoint: number;
  intPBonusCap: number;
  stressPenaltyStart: number;
  stressPenaltyPerPoint: number;
  minSuccessP: number;
  maxSuccessP: number;
  stressPerStudy: number;
  stressPerWork: number;
  stressPerDungeon: number;
  restRelief: number;
  maxStress: number;
  defeatStress: number;
  lootKeepOnDefeat: number;
  baseHp: number;
  intToHp: number;
  baseAtk: number;
  masteryScale: number;
  combatVariance: number;
}

export interface Tier {
  name: string;
  tuition: number;
  baseP: number;
  gain: number;
}

export interface Course {
  id: string;
  name: string;
  npc: string;
  stat: Stat;
}

export interface Job {
  id: string;
  name: string;
  wage: number;
  hours: number;
  p: number;
  cooldown: number;
  req: Partial<Record<Stat, number>> & { masterySum?: number };
}

export type Slot = 'weapon' | 'armor' | 'charm';

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  atk?: number;
  def?: number;
  hp?: number;
  studyP?: number;
  wageMul?: number;
  dailyRelief?: number;
}

export interface Monster {
  id: string;
  name: string;
  element: Subject;
  hp: number;
  atk: number;
  def: number;
}

export interface Dungeon {
  id: string;
  name: string;
  requires: string | null;
  floors: string[];
  reward: { gold: number };
  final?: boolean;
}

export interface MockExam {
  index: number;
  name: string;
  monsters: string[];
  reward: { gold: number; int: number };
  failStress: number;
}

export interface GameData {
  balance: Balance;
  tiers: Tier[];
  courses: Course[];
  jobs: Job[];
  items: Item[];
  monsters: Monster[];
  dungeons: Dungeon[];
  mockExams: MockExam[];
}

export type Action =
  | { type: 'study'; courseId: string }
  | { type: 'work'; jobId: string }
  | { type: 'rest' }
  | { type: 'dungeon'; dungeonId: string };

export interface GameEvent {
  day: number;
  kind: string;
  text: string;
}

export interface State {
  day: number;
  gold: number;
  stress: number;
  stats: Record<Stat, number>;
  courseSessions: Record<string, number>;
  jobReadyDay: Record<string, number>;
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
  cleared: string[];
  mockResults: boolean[];
  finished: boolean;
  won: boolean;
  wonDay: number | null;
  log: GameEvent[];
}

/** 문항 1개에 대한 정오 판정.
 *  실제 게임에서는 학생이 진짜 문항을 풀고 그 결과를 넘긴다.
 *  시뮬레이션에서는 봇이 확률 p 로 맞힌다. */
export type Resolver = (ctx: { stat: Stat; tier: number; p: number }) => boolean;

export interface Rng {
  next(): number;
}

export interface BattleResult {
  win: boolean;
  hpLeft: number;
  maxHp: number;
  defeated: number;
  /** 진행도 0..층수. 쓰러진 몬스터 수 + 마지막 몬스터에게 입힌 피해 비율. 패배 시 '얼마나 근접했나'. */
  progress: number;
}
