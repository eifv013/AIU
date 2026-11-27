/* AIU 핵심 규칙 단위 테스트 — 실행: node --test src/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./core.js');

test('formatNum: 축약 표기와 비정상 값', () => {
  assert.equal(C.formatNum(0), '0');
  assert.equal(C.formatNum(999), '999');
  assert.equal(C.formatNum(1234), '1.23K');
  assert.equal(C.formatNum(12345), '12.3K');
  assert.equal(C.formatNum(999999), '999K');      // 1000.0K 로 반올림되지 않음
  assert.equal(C.formatNum(1.5e9), '1.50B');
  assert.equal(C.formatNum(-5), '0');
  assert.equal(C.formatNum(NaN), '0');
  assert.equal(C.formatNum(Infinity), '0');
});

test('formatDuration', () => {
  assert.equal(C.formatDuration(30), '30초');
  assert.equal(C.formatDuration(45 * 60), '45분');
  assert.equal(C.formatDuration(3 * 3600 + 12 * 60), '3시간 12분');
  assert.equal(C.formatDuration(2 * 3600), '2시간');
  assert.equal(C.formatDuration(-1), '0초');
});

test('stageLabel: 10스테이지마다 챕터 증가', () => {
  assert.equal(C.stageLabel(1), '1-1');
  assert.equal(C.stageLabel(10), '1-10');
  assert.equal(C.stageLabel(11), '2-1');
  assert.equal(C.stageLabel(0), '1-1');
  assert.equal(C.stageLabel('x'), '1-1');
});

test('적 체력과 골드는 스테이지마다 증가', () => {
  assert.ok(C.enemyHp(2) > C.enemyHp(1));
  assert.ok(C.bossHp(5) > C.enemyHp(5) * 10);
  assert.ok(C.killGold(1, 5) > C.killGold(1, 0));   // 현상금 협상 효과
});

test('요원 능력치: 레벨, 별, 훈련 반영', () => {
  const a1 = C.heroAtk('knight', 1, 1, 0);
  assert.equal(a1, 12);
  assert.ok(C.heroAtk('knight', 10, 1, 0) > a1);
  assert.equal(C.heroAtk('knight', 1, 3, 0), 24);   // ★3 = 2배
  assert.ok(Math.abs(C.heroAtk('knight', 1, 1, 5) - 18) < 1e-9);  // 훈련 5 = 1.5배
  assert.throws(() => C.heroAtk('nobody', 1, 1, 0), /알 수 없는 요원/);
});

test('강화 비용: 일괄 비용과 구매 가능 수', () => {
  assert.equal(C.heroLvCost(1), 10);
  assert.equal(C.heroLvCostBulk(1, 3), C.heroLvCost(1) + C.heroLvCost(2) + C.heroLvCost(3));
  assert.equal(C.heroLvCostBulk(1, 0), 0);
  const r = C.heroLvAffordable(1, 25, 10);
  assert.equal(r.n, 2);                 // 10 + 11 = 21 ≤ 25, 다음 12 는 불가
  assert.equal(r.cost, 21);
  assert.equal(C.heroLvAffordable(1, 5, 10).n, 0);
});

test('훈련소: 치명타 최대치와 비용', () => {
  assert.equal(C.critChance(0), 0.05);
  assert.equal(C.critChance(1000), 0.5);
  assert.equal(C.upgradeCost('crit', 45), Infinity);
  assert.ok(C.upgradeCost('atk', 1) > C.upgradeCost('atk', 0));
});

test('별 승급 조각', () => {
  assert.equal(C.starNeed(1), 10);
  assert.equal(C.starNeed(4), 200);
  assert.equal(C.starNeed(5), Infinity);
});

test('오프라인 보상: 최소/최대 시간, 시계 되돌림', () => {
  const s = C.newState(0);
  assert.equal(C.offlineReward(s, 30).gold, 0);       // 1분 미만
  assert.equal(C.offlineReward(s, -500).gold, 0);     // 기기 시간 되돌림
  assert.equal(C.offlineReward(s, NaN).gold, 0);
  const h8 = C.offlineReward(s, 8 * 3600);
  const h20 = C.offlineReward(s, 20 * 3600);
  assert.ok(h8.gold > 0);
  assert.equal(h20.gold, h8.gold);                    // 8시간 상한
  assert.equal(h20.sec, 8 * 3600);
});


test('applySummon: 신규 보유와 조각, 원본 불변', () => {
  const s = C.newState(0);
  const { state, isNew } = C.applySummon(s, ['dark', 'dark', 'knight']);
  assert.deepEqual(isNew, [true, false, false]);
  assert.equal(state.heroes.dark.owned, true);
  assert.equal(state.heroes.dark.shards, 1);
  assert.equal(state.heroes.knight.shards, 1);
  assert.equal(s.heroes.dark.owned, false);           // 원본은 그대로
});

test('sanitize: 손상, 조작 데이터 복구', () => {
  const s = C.sanitize({
    v: 2, gold: -100, gems: 'lots', stage: 1e12, kills: 99,
    heroes: { knight: { owned: false, lv: -3, stars: 99, shards: NaN }, dark: { owned: 'yes' } },
    up: { atk: 3.7, crit: 500 },
  }, 1);
  assert.equal(s.gold, 0);
  assert.equal(s.gems, C.CONST.START_GEMS);
  assert.equal(s.stage, 1e6);
  assert.equal(s.kills, C.CONST.WAVE_KILLS);
  assert.equal(s.heroes.knight.owned, true);          // 시작 요원은 항상 보유
  assert.equal(s.heroes.knight.lv, 1);
  assert.equal(s.heroes.knight.stars, 5);
  assert.equal(s.heroes.knight.shards, 0);
  assert.equal(s.heroes.dark.owned, false);           // 'yes' 는 true 가 아님
  assert.equal(s.up.atk, 3);
  assert.equal(s.up.crit, 45);
  assert.deepEqual(C.sanitize(null, 1), C.newState(1));
});

test('loadFromString: 깨진 JSON 은 새 게임', () => {
  assert.equal(C.loadFromString('{broken', 5).ok, false);
  assert.equal(C.loadFromString('', 5).ok, false);
  const good = JSON.stringify({ ...C.newState(5), gold: 77 });
  const r = C.loadFromString(good, 5);
  assert.equal(r.ok, true);
  assert.equal(r.state.gold, 77);
});

test('요원 이름: 코드네임과 동물이 모두 있고 겹치지 않음', () => {
  const names = C.HEROES.map(h => h.name);
  assert.equal(new Set(names).size, names.length);
  for (const h of C.HEROES) { assert.ok(h.name && h.name.length >= 2); assert.ok(h.kind); }
});

test('등급 이름: 희귀, 영웅, 전설만 사용', () => {
  for (const h of C.HEROES) assert.ok(['희귀', '영웅', '전설'].includes(h.grade), h.id + ' 등급 ' + h.grade);
});


test('특별 채용 남은 기간: 2주 단위, 목요일 오전 9시에 바뀜', () => {
  assert.equal(C.pickupRemainSec(new Date(2026, 10, 26, 9, 0, 0)), 14 * 86400);   // 시작 순간
  assert.equal(C.pickupRemainSec(new Date(2026, 11, 10, 8, 0, 0)), 3600);          // 2주 뒤 목요일 8시 → 1시간 남음
  assert.equal(C.pickupRemainSec(new Date(2026, 11, 10, 9, 0, 0)), 14 * 86400);   // 다음 기간 시작
  assert.equal(C.pickupRemainSec(new Date(NaN)), 0);
});

test('가이드 퀘스트: 같은 종류만 쌓이고, 다 차야 보상', () => {
  const s = C.newState(0);
  assert.equal(C.questAt(0).kind, 'lvup');
  assert.equal(C.questAdd(s, 'kill', 3), false);
  C.questAdd(s, 'lvup', 3); assert.equal(C.questClaim(s), 0);
  C.questAdd(s, 'lvup', 10); assert.equal(s.q.p, 5);
  const g = s.gems; const r = C.questClaim(s);
  assert.equal(r, 100); assert.equal(s.gems, g + 100); assert.deepEqual(s.q, { i: 1, p: 0 });
});
test('가이드 퀘스트: 한 바퀴 돌면 목표 2배, 잘못된 번호는 오류', () => {
  const n = C.QUESTS.length;
  assert.equal(C.questAt(n).need, C.QUESTS[0].need * 2);
  assert.throws(() => C.questAt(-1), RangeError);
});
test('저장 복구: 퀘스트, 자동 기술, 배속', () => {
  const s = C.sanitize({ q: { i: 2, p: 999 }, autoSkill: false, speed: 7 }, 0);
  assert.equal(s.q.p, C.questAt(2).need); assert.equal(s.autoSkill, false); assert.equal(s.speed, 1);
  assert.equal(C.sanitize({}, 0).autoSkill, true);
});


test('소환 레벨: 세나 키우기처럼 1~4 는 전설 없음, 5 에서 0.10%, 10 에서 0.15%', () => {
  assert.equal(C.summonLevel(0), 1); assert.equal(C.summonLevel(499), 4); assert.equal(C.summonLevel(500), 5); assert.equal(C.summonLevel(1e6), 10);
  assert.equal(C.summonRates(4).legend, 0); assert.equal(C.summonRates(5).legend, 0.001); assert.equal(C.summonRates(10).legend, 0.0015);
  for (let lv = 1; lv <= 10; lv++) { const r = C.summonRates(lv); assert.ok(Math.abs(r.legend + r.hero + r.rare - 1) < 1e-9); }
});
test('소환: 등급 구간과 잘못된 rng', () => {
  assert.deepEqual(C.summon(1, () => 0.0005, 10), ['dark']);        // 0.15% 안
  assert.deepEqual(C.summon(1, () => 0.0005, 4), ['mage']);         // 레벨 4 는 전설 없음 → 영웅 구간
  assert.deepEqual(C.summon(1, () => 0.9999, 1), ['archer']);
  assert.equal(C.summon(10, Math.random, 10).length, 10);
  assert.throws(() => C.summon(1, () => 1, 1), RangeError);
  assert.throws(() => C.summon(1, null), TypeError);
});
test('뽑기 실행: 보석 차감, 누적 횟수, 특별 채용 릴레이 2000회 확정', () => {
  const s = C.newState(0); s.gems = 1e6;
  const r = C.doSummon(s, 10, 'normal', () => 0.9);
  assert.equal(r.state.gems, 1e6 - C.CONST.SUMMON_COST_10); assert.equal(r.state.pulls.total, 10); assert.equal(r.state.pulls.relay, 0);
  assert.equal(s.pulls.total, 0);   // 원본 불변
  s.pulls.relay = C.CONST.RELAY - 3;
  const p = C.doSummon(s, 10, 'pickup', () => 0.9);
  assert.equal(p.ids[2], 'dark'); assert.equal(p.relayHit, true); assert.equal(p.state.pulls.relay, 7);
  s.gems = 5; assert.throws(() => C.doSummon(s, 1, 'normal', Math.random), RangeError);
});
test('저장: 예전 버전이면 개편 보상 한 번, 릴레이 값 복구', () => {
  const old = C.sanitize({ v: 1, gems: 50 }, 0); assert.equal(old.gems, 50 + C.CONST.MIGRATE_GEMS); assert.equal(old.v, C.CONST.SAVE_VERSION);
  assert.equal(C.sanitize({ v: 2, gems: 50 }, 0).gems, 50);
  assert.equal(C.sanitize({ v: 2, pulls: { total: -5, relay: 99999 } }, 0).pulls.relay, C.CONST.RELAY - 1);
});
