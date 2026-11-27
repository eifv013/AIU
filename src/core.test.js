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
  assert.equal(C.starNeed(1), 2);
  assert.equal(C.starNeed(4), 8);
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

test('소환: 확률 구간과 잘못된 rng', () => {
  assert.deepEqual(C.summon(1, () => 0.0), ['dark']);
  assert.deepEqual(C.summon(1, () => 0.029), ['dark']);
  assert.deepEqual(C.summon(1, () => 0.03), ['knight']);
  assert.deepEqual(C.summon(1, () => 0.9999), ['priest']);
  assert.equal(C.summon(10, Math.random).length, 10);
  assert.throws(() => C.summon(1, () => 1), RangeError);
  assert.throws(() => C.summon(1, null), TypeError);
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
    gold: -100, gems: 'lots', stage: 1e12, kills: 99,
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
