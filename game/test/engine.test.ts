import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOTS } from '../src/bots.ts';
import { loadData, validateData } from '../src/data.ts';
import {
  buy, fight, legalActions, newGame, nextMockExam, previewDungeon, step, studySuccessP, tierIndex,
} from '../src/engine.ts';
import { makeRng } from '../src/rng.ts';
import { evaluate, loadTargets, playRun, runAll } from '../src/sim.ts';
import type { GameData } from '../src/types.ts';

const d = loadData();

test('데이터 참조 무결성: 깨진 몬스터 참조를 잡아낸다', () => {
  const broken: GameData = structuredClone(d);
  broken.dungeons[0].floors.push('m_nope');
  assert.throws(() => validateData(broken), /없는 몬스터 m_nope/);
});

test('같은 시드 → 같은 판 (재현 가능)', () => {
  const a = playRun(BOTS[1], d, 42).state;
  const b = playRun(BOTS[1], d, 42).state;
  assert.deepEqual(a.log, b.log);
});

test('step 은 원본 상태를 바꾸지 않는다', () => {
  const s = newGame(d);
  const snapshot = structuredClone(s);
  step(s, d, { type: 'study', courseId: 'c_soc' }, makeRng(1));
  assert.deepEqual(s, snapshot);
});

test('교육: 수강료 차감, 정답 수만큼 능력치 상승, 스트레스 증가', () => {
  const s = newGame(d);
  const n = step(s, d, { type: 'study', courseId: 'c_soc' }, makeRng(1), () => true);
  assert.equal(n.gold, s.gold - d.tiers[0].tuition);
  assert.equal(n.stats.soc, d.tiers[0].gain * d.balance.studyAttempts);
  assert.equal(n.stress, d.balance.stressPerStudy);
  assert.equal(n.day, 2);
});

test('문항 판정기(resolver): 학생이 다 틀리면 능력치가 오르지 않는다', () => {
  const n = step(newGame(d), d, { type: 'study', courseId: 'c_law' }, makeRng(1), () => false);
  assert.equal(n.stats.law, 0);
});

test('같은 과정을 sessionsPerTier 회 들으면 다음 등급으로 오른다', () => {
  let s = newGame(d);
  s.gold = 10_000;
  for (let i = 0; i < d.balance.sessionsPerTier; i++) {
    s = step(s, d, { type: 'study', courseId: 'c_eco' }, makeRng(i), () => true);
    s.stress = 0;
  }
  assert.equal(tierIndex(s, d, 'c_eco'), 1);
});

test('스트레스가 높으면 문항 성공 확률이 떨어진다', () => {
  const s = newGame(d);
  const calm = studySuccessP(s, d, 'c_soc');
  s.stress = 90;
  assert.ok(studySuccessP(s, d, 'c_soc') < calm);
});

test('스트레스 최대치면 어떤 행동을 골라도 강제 휴식(번아웃)', () => {
  const s = newGame(d);
  s.stress = d.balance.maxStress;
  const n = step(s, d, { type: 'work', jobId: 'j_flyer' }, makeRng(1));
  assert.ok(n.log.some((e) => e.kind === 'burnout'));
  assert.equal(n.gold, s.gold);
});

test('알바 쿨다운과 해금 조건', () => {
  const s = newGame(d);
  assert.ok(!legalActions(s, d).some((a) => a.type === 'work' && a.jobId === 'j_grade'), '숙련도 합 부족 시 잠김');
  s.stats.law = 200;
  assert.ok(legalActions(s, d).some((a) => a.type === 'work' && a.jobId === 'j_grade'));
  const n = step(s, d, { type: 'work', jobId: 'j_grade' }, makeRng(1));
  assert.ok(!legalActions(n, d).some((a) => a.type === 'work' && a.jobId === 'j_grade'), '쿨다운 중');
});

test('전투: 몬스터 속성 과목 숙련도가 높을수록 결과가 좋아진다', () => {
  const s = newGame(d);
  const weak = fight(s, d, ['m_survey'], null);
  s.stats.soc = 200;
  const strong = fight(s, d, ['m_survey'], null);
  assert.ok(strong.win);
  assert.ok(strong.progress >= weak.progress);
  s.stats.soc = 0;
  s.stats.law = 200; // 다른 과목은 도움이 안 된다
  assert.equal(fight(s, d, ['m_survey'], null).progress, weak.progress);
});

test('던전은 순서대로 열리고, 최종 던전 클리어 시 게임 승리', () => {
  let s = newGame(d);
  assert.deepEqual(legalActions(s, d).filter((a) => a.type === 'dungeon').map((a) => a.type === 'dungeon' && a.dungeonId), ['d_forest']);
  for (const st of ['law', 'eco', 'soc', 'eth'] as const) s.stats[st] = 5000;
  s.stats.int = 5000;
  for (const dg of d.dungeons) {
    assert.ok(previewDungeon(s, d, dg.id).win);
    s = step(s, d, { type: 'dungeon', dungeonId: dg.id }, makeRng(7));
  }
  assert.ok(s.won && s.finished);
});

test('상점: 구매 시 골드 차감·자동 장착, 중복 구매 불가', () => {
  const s = newGame(d);
  s.gold = 1000;
  const n = buy(s, d, 'w_sharp');
  assert.equal(n.gold, 850);
  assert.equal(n.equipped.weapon, 'w_sharp');
  assert.throws(() => buy(n, d, 'w_sharp'));
});

test('모의고사는 mockExamEvery 일마다 열린다', () => {
  const s = newGame(d);
  assert.equal(nextMockExam(s, d)?.day, d.balance.mockExamEvery);
  s.day = d.balance.mockExamEvery + 1;
  assert.equal(nextMockExam(s, d)?.day, d.balance.mockExamEvery * 2);
});

test('밸런스 회귀: 봇 시뮬레이션이 targets.json 의 목표를 모두 통과한다', () => {
  const results = evaluate(loadTargets(), runAll(d, 150, 1));
  const failed = results.filter((r) => !r.pass);
  assert.deepEqual(failed.map((f) => `${f.id} ${f.desc} = ${f.value}`), []);
});
