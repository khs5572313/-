import { readFileSync } from 'node:fs';
import type { GameData } from './types.ts';
import { SUBJECTS } from './types.ts';

const DATA_DIR = new URL('../data/', import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, DATA_DIR), 'utf8')) as T;
}

/** data/*.json 을 읽고 참조 무결성을 검사한다. 밸런스 수치는 전부 여기 있고, 코드에는 없다. */
export function loadData(): GameData {
  const data: GameData = {
    balance: readJson('balance.json'),
    tiers: readJson('tiers.json'),
    courses: readJson('courses.json'),
    jobs: readJson('jobs.json'),
    items: readJson('items.json'),
    monsters: readJson('monsters.json'),
    dungeons: readJson('dungeons.json'),
    mockExams: readJson('mock_exams.json'),
  };
  validateData(data);
  return data;
}

export function validateData(d: GameData): void {
  const errors: string[] = [];
  const monsterIds = new Set(d.monsters.map((m) => m.id));
  const dungeonIds = new Set(d.dungeons.map((x) => x.id));
  const uniq = (label: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) errors.push(`${label}: id 중복`);
  };
  uniq('courses', d.courses.map((c) => c.id));
  uniq('jobs', d.jobs.map((j) => j.id));
  uniq('items', d.items.map((i) => i.id));
  uniq('monsters', d.monsters.map((m) => m.id));
  uniq('dungeons', d.dungeons.map((x) => x.id));

  for (const m of d.monsters) {
    if (!SUBJECTS.includes(m.element)) errors.push(`monster ${m.id}: 알 수 없는 속성 ${m.element}`);
  }
  for (const dg of d.dungeons) {
    for (const f of dg.floors) if (!monsterIds.has(f)) errors.push(`dungeon ${dg.id}: 없는 몬스터 ${f}`);
    if (dg.requires && !dungeonIds.has(dg.requires)) errors.push(`dungeon ${dg.id}: 없는 선행 던전 ${dg.requires}`);
  }
  for (const me of d.mockExams) {
    for (const f of me.monsters) if (!monsterIds.has(f)) errors.push(`mock ${me.name}: 없는 몬스터 ${f}`);
  }
  if (d.dungeons.filter((x) => x.final).length !== 1) errors.push('final 던전은 정확히 1개여야 함');
  for (const slot of ['weapon', 'armor', 'charm']) {
    if (!d.items.some((i) => i.slot === slot && i.price === 0)) errors.push(`${slot}: 기본(0골드) 장비가 없음`);
  }
  if (errors.length) throw new Error('데이터 오류:\n' + errors.join('\n'));
}
