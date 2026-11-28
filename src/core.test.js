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
  assert.equal(C.heroLvCost(1), 300);
  assert.equal(C.heroLvCostBulk(1, 3), C.heroLvCost(1) + C.heroLvCost(2) + C.heroLvCost(3));
  assert.equal(C.heroLvCostBulk(1, 0), 0);
  const r = C.heroLvAffordable(1, 700, 10);
  assert.equal(r.n, 2);                 // 300 + 318 = 618 ≤ 700, 다음 337 은 불가
  assert.equal(r.cost, 618);
  assert.equal(C.heroLvAffordable(1, 299, 10).n, 0);
});

test('성장 곡선: 후반에도 한 스테이지 진행 시간이 폭증하지 않음', () => {
  // 한 스테이지에 필요한 레벨 수 = ln(적 체력 증가) / ln(공격력 증가)
  const L = Math.log(C.enemyHp(2) / C.enemyHp(1)) / Math.log(C.heroAtk('knight', 2, 1, 0) / C.heroAtk('knight', 1, 1, 0));
  // 스테이지당 사냥 시간 증가율 = 레벨 비용 증가^L / 경험치 증가
  const g = Math.pow(C.heroLvCost(501) / C.heroLvCost(500), L) / (C.killExp(501) / C.killExp(500));
  assert.ok(g < 1.02, `스테이지마다 ${((g - 1) * 100).toFixed(1)}%씩 느려짐`);
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
  assert.equal(C.starNeed(1, '전설'), 2); assert.equal(C.starNeed(4, '전설'), 15);
  assert.equal(C.starNeed(2, '영웅'), 15);
  // 전설 ★5 까지 필요한 장수가 희귀보다 훨씬 적어야 함 (드문 만큼)
  const sum = g => [1, 2, 3, 4].reduce((a, s) => a + C.starNeed(s, g), 0);
  assert.ok(sum('전설') * 10 < sum('희귀'));
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
  const { state, isNew } = C.applySummon(s, ['dark', 'dark', 'mage']);
  assert.deepEqual(isNew, [true, false, false]);
  assert.equal(state.heroes.dark.owned, true);
  assert.equal(state.heroes.dark.shards, 1);
  assert.equal(state.heroes.mage.shards, 1);
  assert.equal(s.heroes.dark.owned, false);           // 원본은 그대로
});

test('sanitize: 손상, 조작 데이터 복구', () => {
  const s = C.sanitize({
    v: 2, gold: -100, gems: 'lots', stage: 1e12, kills: 99,
    heroes: { mage: { owned: false, lv: -3, stars: 99, shards: NaN }, dark: { owned: 'yes' } },
    up: { atk: 3.7, crit: 500 },
  }, 1);
  assert.equal(s.gold, 0);
  assert.equal(s.gems, C.CONST.START_GEMS);
  assert.equal(s.stage, 1e6);
  assert.equal(s.kills, C.CONST.WAVE_KILLS);
  assert.equal(s.heroes.mage.owned, true);            // 시작 요원(블레이즈)은 항상 보유
  assert.equal(s.heroes.mage.lv, 1);
  assert.equal(s.heroes.mage.stars, 5);
  assert.equal(s.heroes.mage.shards, 0);
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
  assert.equal(C.questAt(0).kind, 'kill'); assert.equal(C.questAt(0).guide, 1);
  assert.equal(C.questAdd(s, 'lvup', 3), false);
  C.questAdd(s, 'kill', 3); assert.equal(C.questClaim(s), null);
  C.questAdd(s, 'kill', 30); assert.equal(s.q.p, 10);
  const g = s.gems; const r = C.questClaim(s);
  assert.equal(r.gems, 100); assert.equal(s.gems, g + 100); assert.equal(s.q.i, 1);
});
test('가이드 퀘스트: 근원체 봉쇄 보상으로 램파트 합류, 다음 퀘스트(2명 출전)는 바로 참', () => {
  const s = C.newState(0); s.q = { i: 2, p: 1, g: 1 };
  const r = C.questClaim(s);
  assert.equal(r.hero, 'knight'); assert.equal(r.isNew, true); assert.equal(s.heroes.knight.owned, true);
  assert.deepEqual(C.partyIds(s), ['mage', 'knight']);
  assert.equal(C.questAt(s.q.i).kind, 'party'); assert.equal(s.q.p, 2);
});
test('가이드 퀘스트: 가이드가 끝나면 원래 퀘스트를 돌고, 한 바퀴 돌면 목표 2배', () => {
  const g = C.GUIDE.length, n = C.QUESTS.length;
  assert.equal(C.questAt(g).kind, C.QUESTS[0].kind); assert.equal(C.questAt(g).guide, 0);
  assert.equal(C.questAt(g + n).need, C.QUESTS[0].need * 2);
  assert.throws(() => C.questAt(-1), RangeError);
});
test('저장 복구: 퀘스트, 자동 기술, 배속 / 가이드 전 저장은 가이드 건너뜀', () => {
  const s = C.sanitize({ q: { i: 2, p: 999, g: 1 }, autoSkill: false, speed: 7 }, 0);
  assert.equal(s.q.p, C.questAt(2).need); assert.equal(s.autoSkill, false); assert.equal(s.speed, 1);
  assert.equal(C.sanitize({}, 0).autoSkill, true);
  assert.equal(C.sanitize({ q: { i: 3, p: 0 } }, 0).q.i, 3 + C.GUIDE.length);
  assert.equal(C.sanitize({ q: { i: 0, p: 0 } }, 0).q.i, 0);
});


test('소환 레벨: 세나 키우기처럼 1~4 는 전설 없음, 5 에서 0.10%, 10 에서 0.15%', () => {
  assert.equal(C.summonLevel(0), 1); assert.equal(C.summonLevel(499), 4); assert.equal(C.summonLevel(500), 5); assert.equal(C.summonLevel(1e6), 10);
  assert.equal(C.summonRates(4).legend, 0); assert.equal(C.summonRates(5).legend, 0.001); assert.equal(C.summonRates(10).legend, 0.0015);
  for (let lv = 1; lv <= 10; lv++) { const r = C.summonRates(lv); assert.ok(Math.abs(r.legend + r.hero + r.rare - 1) < 1e-9); }
});
test('소환: 등급 구간과 잘못된 rng', () => {
  assert.equal(C.heroById(C.summon(1, () => 0.0005, 10)[0]).grade, '전설'); assert.notEqual(C.summon(1, () => 0.0005, 10)[0], 'dark');    // 0.15% 안 → 상시 전설 (한정 나이트폴은 안 나옴)
  assert.deepEqual(C.summon(1, () => 0.0005, 4), ['mage']);         // 레벨 4 는 전설 없음 → 영웅 구간
  assert.equal(C.heroById(C.summon(1, () => 0.9999, 1)[0]).grade, '희귀');    // 희귀 구간 맨 끝
  assert.equal(C.summon(10, Math.random, 10).length, 10);
  assert.throws(() => C.summon(1, () => 1, 1), RangeError);
  assert.throws(() => C.summon(1, null), TypeError);
});
test('요원 호출: 호출권 차감, 소환 레벨 상승 보상', () => {
  const s = C.newState(0); s.tix = 600;
  const r = C.doSummon(s, 10, 'call', () => 0.9);
  assert.equal(r.paid, 'tix'); assert.equal(r.state.tix, 590); assert.equal(r.state.pulls.total, 10); assert.equal(s.tix, 600);
  let st = s; for (let i = 0; i < 5; i++) st = C.doSummon(st, 10, 'call', () => 0.9).state;   // 50회 → 레벨 2
  assert.equal(C.summonLevel(st.pulls.total), 2);
  assert.equal(st.gems, s.gems + C.levelReward(2).gems); assert.equal(st.ptix, C.levelReward(2).ptix);
  const poor = C.newState(0); poor.tix = 0; assert.throws(() => C.doSummon(poor, 1, 'call', Math.random), RangeError);
});
test('정예 호출: 희귀 없음, 전설 0.5%, 정예 호출권 먼저 사용', () => {
  const s = C.newState(0); s.gems = 2000; s.ptix = 1;
  const a = C.doSummon(s, 1, 'elite', () => 0.004); assert.equal(C.heroById(a.ids[0]).grade, '전설'); assert.equal(a.paid, 'ptix'); assert.equal(a.state.gems, 2000);
  const b = C.doSummon(a.state, 10, 'elite', () => 0.99); assert.equal(b.paid, 'gems'); assert.equal(b.state.gems, 2000 - 1500);
  assert.ok(b.ids.every(id => C.heroById(id).grade !== '희귀'));
  assert.equal(b.state.pulls.total, 11);   // 정예 호출도 소환 레벨에 쌓임
});
test('특별 채용: 소환 레벨 3부터, 릴레이 확정', () => {
  const s = C.newState(0); s.gems = 1e6;
  assert.throws(() => C.doSummon(s, 1, 'pickup', Math.random), RangeError);
  s.pulls.total = C.CONST.SUMMON_LV_PULLS[2]; s.pulls.relay = C.CONST.RELAY - 3;
  const p = C.doSummon(s, 10, 'pickup', () => 0.9);
  assert.equal(p.ids[2], 'dark'); assert.equal(p.relayHit, true); assert.equal(p.state.pulls.relay, 7);
  assert.throws(() => C.doSummon(s, 1, 'nope', Math.random), TypeError);
});
test('호출권: 처치 10마리에 1장, 근원체 10장, 소수점은 모아 둠', () => {
  const s = C.newState(0), t0 = s.tix;
  C.addTickets(s, 5); assert.equal(s.tix, t0); C.addTickets(s, 5); assert.equal(s.tix, t0 + 1);
  C.addTickets(s, 0, 1); assert.equal(s.tix, t0 + 1 + C.CONST.BOSS_TICKETS);
});
test('저장: 예전 버전이면 개편 보상 한 번, 릴레이 값 복구', () => {
  const old = C.sanitize({ v: 1, gems: 50 }, 0); assert.equal(old.gems, 50 + C.CONST.MIGRATE_GEMS); assert.equal(old.v, C.CONST.SAVE_VERSION);
  assert.equal(C.sanitize({ v: 2, gems: 50 }, 0).gems, 50);
  assert.equal(C.sanitize({ v: 2, pulls: { total: -5, relay: 99999 } }, 0).pulls.relay, C.CONST.RELAY - 1);
});

/* ---------- 출동, 일일 임무, 출석 ---------- */
test('일일 초기화: 날짜가 바뀌면 입장 3회와 임무가 새로', () => {
  const s = C.newState(0), d1 = new Date(2026, 10, 27, 23, 59), d2 = new Date(2026, 10, 28, 0, 1);
  assert.equal(C.dailyReset(s, d1), true); assert.equal(C.dailyReset(s, d1), false);
  s.keys.bounty = 0; C.missionAdd(s, 'kill', 50);
  assert.equal(C.dailyReset(s, d2), true); assert.equal(s.keys.bounty, 3); assert.deepEqual(s.daily.p, {});
});
test('일일 출동: 다음 단계까지만, 깨면 입장 1회 쓰고 보상, 소탕은 최고 단계', () => {
  const s = C.newState(0); C.dailyReset(s, new Date(2026, 10, 27));
  assert.throws(() => C.clearDungeon(s, 'bounty', 2), RangeError);
  const r = C.clearDungeon(s, 'bounty', 1); assert.ok(r.gold > 0); assert.equal(s.gold, r.gold); assert.equal(s.keys.bounty, 2); assert.equal(s.dbest.bounty, 1);
  assert.throws(() => C.sweepDungeon(s, 'evidence'), RangeError);
  const t0 = s.tix; C.clearDungeon(s, 'evidence', 1); assert.equal(s.tix, t0 + 20);
  C.sweepDungeon(s, 'bounty'); C.sweepDungeon(s, 'bounty'); assert.equal(s.keys.bounty, 0);
  assert.throws(() => C.sweepDungeon(s, 'bounty'), RangeError);
  assert.equal(s.daily.p.dungeon, 3);
  assert.ok(C.dungeonStage('bounty', 2) > C.dungeonStage('bounty', 1));
  assert.throws(() => C.dungeonById('x'), Error);
});
test('균열 심층: 층마다 보상, 5층 정예 호출권, 10층 보석 200', () => {
  const s = C.newState(0); C.dailyReset(s, new Date(2026, 10, 27));
  for (let i = 0; i < 10; i++) C.clearTower(s);
  assert.equal(s.tower, 10); assert.equal(s.ptix, 2); assert.equal(s.gems, C.CONST.START_GEMS + 8 * 30 + 30 + 200);
  assert.equal(C.towerReward(10).gems, 200); assert.ok(C.towerStage(5) > C.towerStage(4));
});
test('일일 임무: 다 차야 받고, 두 번 못 받고, 모두 받으면 정예 호출권', () => {
  const s = C.newState(0); C.dailyReset(s, new Date(2026, 10, 27));
  assert.equal(C.missionClaim(s, 0), 0);
  C.progress(s, 'kill', 500); assert.equal(s.daily.p.kill, 200);
  assert.equal(C.missionClaim(s, 0), 30); assert.equal(C.missionClaim(s, 0), 0);
  assert.equal(C.missionBonus(s), 0);
  C.MISSIONS.forEach((m, i) => { C.missionAdd(s, m.kind, m.need); C.missionClaim(s, i); });
  assert.equal(C.missionBonus(s), 1); assert.equal(C.missionBonus(s), 0); assert.equal(s.ptix, 1);
  assert.equal(C.missionAdd(s, 'nope', 1), false);
});
test('출석: 하루 한 번, 7일째 정예 호출권 3장, 8일째 다시 1일', () => {
  const s = C.newState(0);
  for (let d = 0; d < 7; d++) { const r = C.attend(s, new Date(2026, 10, 27 + d)); assert.equal(r.day, d + 1); assert.equal(C.attend(s, new Date(2026, 10, 27 + d)), null); }
  assert.equal(s.ptix, 4); assert.equal(C.attend(s, new Date(2026, 11, 10)).day, 1);
});
test('저장: 출동 값이 이상하면 바로잡음', () => {
  const s = C.sanitize({ v: 2, keys: { bounty: 99, evidence: -3 }, dbest: { bounty: 'x' }, tower: 5.7, daily: { p: { kill: 9999 }, got: [0, 0, 99, 'a'], bonus: true }, att: { n: -1, last: 5 } }, 0);
  assert.equal(s.keys.bounty, 3); assert.equal(s.keys.evidence, 0); assert.equal(s.dbest.bounty, 0); assert.equal(s.tower, 5);
  assert.equal(s.daily.p.kill, 200); assert.deepEqual(s.daily.got, [0]); assert.equal(s.daily.bonus, false); assert.deepEqual(s.att, { n: 0, last: '' });
});

test('한정 요원: 나이트폴은 특별 채용에서만 나옴', () => {
  const pool = new Set();
  for (let i = 0; i < 400; i++) { const r = (i + 0.5) / 400; C.summon(1, () => r * 0.0015, 10).forEach(id => pool.add(id)); }
  assert.ok(!pool.has('dark'));
  assert.deepEqual([...pool].sort(), C.HEROES.filter(h => h.grade === '전설' && !h.limited).map(h => h.id).sort());
  let s = C.newState(0); s.gems = 1e6;
  for (let i = 0; i < 50; i++) { const r = i / 50 * 0.005; assert.notEqual(C.doSummon(s, 1, 'elite', () => r).ids[0], 'dark'); }
  s.pulls.total = 300;
  assert.deepEqual(C.doSummon(s, 1, 'pickup', () => 0.001).ids, ['dark']);
});

test('분류: 모든 요원은 큰 분류 4가지 중 하나', () => {
  for (const h of C.HEROES) assert.ok(C.TYPES.includes(h.type), h.id + ' 분류 ' + h.type);
  assert.equal(new Set(C.HEROES.map(h => h.id)).size, C.HEROES.length);
  assert.equal(new Set(C.HEROES.map(h => h.name)).size, C.HEROES.length);
});

test('파티: 최대 5명, 보유 요원만, 마지막 한 명은 못 뺌', () => {
  let s = C.newState(0);
  assert.deepEqual(C.partyIds(s), ['mage']);                      // 블레이즈 한 명으로 시작
  assert.equal(C.partySlots(s), 3); s.stage = 11; assert.equal(C.partySlots(s), 4); s.stage = 21; assert.equal(C.partySlots(s), 5);
  assert.equal(C.toggleParty(s, 'dark'), 'none');                 // 미보유
  s = C.applySummon(s, ['knight', 'archer', 'priest', 'ghost', 'echo']).state;   // 빈자리 4 → 고스트까지 합류
  assert.deepEqual(C.partyIds(s), ['mage', 'knight', 'archer', 'priest', 'ghost']);
  assert.equal(C.toggleParty(s, 'echo'), 'full');
  assert.ok(C.swapParty(s, 'mage', 'echo'));
  assert.deepEqual(C.partyIds(s), ['echo', 'knight', 'archer', 'priest', 'ghost']);
  for (const id of ['knight', 'archer', 'priest', 'ghost']) assert.equal(C.toggleParty(s, id), 'out');
  assert.equal(C.toggleParty(s, 'echo'), 'last');
  // 저장 검증: 미보유, 중복, 6명 이상, 잘못된 값은 걸러짐
  const own = { owned: true }, r = C.sanitize({ stage: 30, heroes: { ghost: own, knight: own, archer: own, priest: own }, party: ['ghost', 'ghost', 'dark', 7, 'knight', 'archer', 'mage', 'priest', 'x'] }, 0);
  assert.deepEqual(r.party, ['ghost', 'knight', 'archer', 'mage', 'priest']);
  // 예전 저장(파티 없음): 보유 요원 앞에서부터, 열린 칸만큼
  assert.deepEqual(C.sanitize({ heroes: { knight: own, archer: own, priest: own } }, 0).party, ['knight', 'archer', 'mage']);
});

test('파티 DPS 는 파티 요원만 셈', () => {
  const s = C.applySummon(C.newState(0), ['knight', 'archer']).state, all = C.partyDps(s);
  s.party = ['knight']; assert.ok(C.partyDps(s) < all);
});

test('경험치: 처치, 오프라인, 모의 훈련으로 쌓이고 저장 검증', () => {
  assert.ok(C.killExp(1) > 0 && C.bossExp(5) === C.killExp(5) * 10);
  const s = C.newState(0); assert.equal(s.exp, C.CONST.START_EXP);
  s.party = ['knight'];
  const r = C.offlineReward(s, 3600); assert.ok(r.exp > 0);
  const before = s.exp; const got = C.clearDungeon(s, 'training', 1);
  assert.ok(got.exp > 0); assert.equal(s.exp, before + got.exp);
  assert.equal(C.sanitize({ exp: -5 }, 0).exp, C.CONST.START_EXP);
  assert.equal(C.sanitize({ exp: 1234 }, 0).exp, 1234);
});

test('수사 수첩: 단계 도달 전에는 못 받고, 한 번만 받음', () => {
  const s = C.newState(0);
  assert.equal(C.roadClaim(s, 'z2'), null);
  s.stage = 11; const g = s.gems;
  assert.deepEqual(C.roadClaim(s, 'z2'), { gems: 100 });
  assert.equal(s.gems, g + 100);
  assert.equal(C.roadClaim(s, 'z2'), null);
  assert.equal(C.roadReady(s).map(r => r.id).join(), 'p4');
  const t = C.sanitize(JSON.parse(JSON.stringify({ ...s, face: 'mage', unl: ['z2', 'x'] })), 0);
  assert.deepEqual(t.unl, ['z2']); assert.equal(t.face, 'mage');
});

test('요원 도감: 레벨 10마다 한 번', () => {
  const s = C.newState(0); const g = s.gems;
  assert.equal(C.codexClaim(s), 0);
  s.heroes.mage.lv = 25;
  assert.equal(C.codexClaim(s), 20 + 40);
  assert.equal(s.gems, g + 60);
  assert.equal(C.codexClaim(s), 0);
  assert.equal(C.codexNext(s, 'mage').lv, 30);
  assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).cdx.mage, 2);
});

test('우편함: 한 번만 받음', () => {
  const s = C.newState(0), g = s.gems;
  assert.deepEqual(C.mailClaim(s, 'welcome'), { gems: 300 });
  assert.equal(s.gems, g + 300);
  assert.equal(C.mailClaim(s, 'welcome'), null);
  assert.deepEqual(C.sanitize(JSON.parse(JSON.stringify({ ...s, mail: ['welcome', 'zz'] })), 0).mail, ['welcome']);
});

test('핵심 버프: 방어 2명이면 체력 +15%, 네 유형이면 전체 버프', () => {
  const s = C.newState(0);
  s.heroes.knight.owned = true; s.heroes.breaker.owned = true; s.party = ['knight', 'breaker'];
  const a = C.synergy(s); assert.ok(Math.abs(a.hp - 1.15) < 1e-9); assert.equal(a.atk, 1);
  for (const id of ['archer', 'mage', 'priest']) s.heroes[id].owned = true;
  s.stage = 21; s.party = ['knight', 'archer', 'mage', 'priest'];
  const b = C.synergy(s); assert.ok(Math.abs(b.atk - 1.1) < 1e-9); assert.ok(Math.abs(b.hp - 1.1) < 1e-9);
});
test('가방: 보급품을 쓰면 줄고 골드가 늘어남', () => {
  const s = C.newState(0); C.mailClaim(s, 'supply');
  assert.equal(s.bag.g2, 3); const g = s.gold;
  const r = C.useItem(s, 'g2', 2); assert.ok(r.gold > 0); assert.equal(s.gold, g + r.gold); assert.equal(s.bag.g2, 1);
  assert.equal(C.useItem(s, 'g2', 5), null);
  assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).bag.g2, 1);
});

test('편성 프리셋: 칸마다 따로 저장', () => {
  const s = C.newState(0); s.stage = 21;
  for (const id of ['knight', 'archer']) s.heroes[id].owned = true;
  s.party = ['mage', 'knight'];
  C.switchPreset(s, 1); assert.equal(s.preI, 1); assert.deepEqual(s.party, ['mage', 'knight']);
  s.party = ['archer'];
  C.switchPreset(s, 0); assert.deepEqual(s.party, ['mage', 'knight']);
  C.switchPreset(s, 1); assert.deepEqual(s.party, ['archer']);
  const t = C.sanitize(JSON.parse(JSON.stringify(s)), 0); assert.equal(t.preI, 1); assert.deepEqual(t.pre[0], ['mage', 'knight']);
});
test('구급상자: 우편으로 받음, 저장 유지', () => {
  const s = C.newState(0); const m = s.med; C.mailClaim(s, 'medkit'); assert.equal(s.med, m + 30);
  s.medHp = 70; assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).medHp, 70);
});

test('상점: 하루 횟수 제한, 보석 차감, 날이 바뀌면 다시', () => {
  const s = C.newState(0), d1 = new Date(2026, 10, 28, 10), d2 = new Date(2026, 10, 29, 10);
  C.shopBuy(s, 'free1', d1);
  assert.throws(() => C.shopBuy(s, 'free1', d1));
  const g = s.gems; C.shopBuy(s, 'gem1', d1); assert.equal(s.gems, g - 100); assert.equal(s.bag.g2, 2);
  C.shopBuy(s, 'free1', d2);
  s.gems = 0; assert.throws(() => C.shopBuy(s, 'gem2', d2));
  assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).shop.n.free1, 1);
});

test('패스: 무료는 바로, 유료는 구매 뒤에만', () => {
  const s = C.newState(0); s.stage = 12;
  assert.ok(C.passClaim(s, 0, 'free')); assert.equal(C.passClaim(s, 0, 'free'), null);
  assert.equal(C.passClaim(s, 0, 'paid'), null);
  s.pass.paid = true; assert.ok(C.passClaim(s, 0, 'paid'));
  assert.equal(C.passClaim(s, 5, 'free'), null);
  assert.deepEqual(C.passReady(s).map(x => x.join()), ['1,free', '1,paid']);
});

test('주간, 월간, 반복 임무와 임무 패스', () => {
  const s = C.newState(0), d = new Date(2026, 10, 28, 10);   // 토요일
  C.misReset(s, d);
  assert.equal(s.mis.w.k, '2026-11-23'); assert.equal(s.mis.m.k, '2026-11');
  C.progress(s, 'boss', 20);
  assert.ok(C.misClaim(s, 'w', 1)); assert.equal(C.misClaim(s, 'w', 1), null);
  assert.equal(s.mis.m.pts, 20);
  // 반복: 근원체 5마다 한 번, 20이면 4번
  assert.equal(C.repeatReady(s, 1), 4); const g = s.gems; C.misClaim(s, 'r', 1); assert.equal(s.gems, g + 80); assert.equal(C.repeatReady(s, 1), 0);
  // 다음 주가 되면 주간만 새로
  C.misReset(s, new Date(2026, 10, 30, 1)); assert.equal(s.mis.w.got.length, 0); assert.equal(s.mis.m.pts, 20);
  // 패스: 60점 넘으면 1단계 무료
  s.mis.m.pts = 65; assert.ok(C.mpassClaim(s, 0, 'free')); assert.equal(C.mpassClaim(s, 0, 'paid'), null);
  s.mis.paid = s.mis.m.k; assert.ok(C.mpassClaim(s, 0, 'paid'));
  const t = C.sanitize(JSON.parse(JSON.stringify(s)), 0); assert.equal(t.mis.m.pts, 65); assert.deepEqual(t.mis.m.pf, [0]);
});

test('유료 보석부터 쓰고, 첫 결제 보너스는 3일', () => {
  const s = C.newState(0); s.gems = 100; s.pgems = 50;
  C.spendGems(s, 80); assert.equal(s.pgems, 0); assert.equal(s.gems, 70);
  assert.throws(() => C.spendGems(s, 100));
  const d1 = new Date(2026, 10, 28, 9), d2 = new Date(2026, 10, 29, 9), d5 = new Date(2026, 11, 3, 9);
  assert.equal(C.firstPayReady(s, d1), -1);
  C.firstPayStart(s, d1); assert.equal(C.firstPayReady(s, d1), 0); C.firstPayClaim(s, d1); assert.equal(C.firstPayReady(s, d1), -1);
  assert.equal(C.firstPayReady(s, d2), 1); C.firstPayClaim(s, d2);
  assert.equal(C.firstPayReady(s, d5), 2); C.firstPayClaim(s, d5); assert.equal(C.firstPayReady(s, d5), -1);
  const t = C.sanitize(JSON.parse(JSON.stringify(s)), 0); assert.equal(t.fp.got.length, 3);
});

test('각성: 전설 ★5 다음 단계, 조각 10개', () => {
  const s = C.newState(0);
  assert.equal(C.starNeed(5, '전설'), 10); assert.equal(C.starNeed(6, '전설'), Infinity); assert.equal(C.starNeed(5, '영웅'), Infinity);
  s.heroes.reaper.owned = true; s.heroes.reaper.stars = 6;
  assert.equal(C.heroGrade(s, 'reaper'), '각성'); assert.equal(C.heroGrade(s, 'mage'), '영웅');
  assert.ok(C.heroAtk('reaper', 1, 6, 0) > C.heroAtk('reaper', 1, 5, 0) * 1.3);
  assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).heroes.reaper.stars, 6);
  s.heroes.mage.stars = 6; assert.equal(C.sanitize(JSON.parse(JSON.stringify(s)), 0).heroes.mage.stars, 5);
});

/* ---------- 수집 시스템 ---------- */
const seq = arr => { let i = 0; return () => arr[i++ % arr.length]; };
test('칭호: 조건을 채우면 얻고, 장착하면 보너스, 도감 레벨', () => {
  const s = C.newState(0);
  assert.deepEqual(C.titleCheck(s).map(t => t.id), ['new']);
  C.progress(s, 'kill', 100); assert.ok(C.titleCheck(s).some(t => t.id === 'kill1'));
  assert.throws(() => C.titleEquip(s, 'boss3'), /보유하지 않은/);
  const b0 = C.statBonus(s).gold; C.titleEquip(s, 'kill1'); assert.ok(C.statBonus(s).gold > b0);
  assert.equal(C.titleLevel(s), 1);   // 칭호 2개 → 1레벨
  assert.deepEqual(C.sanitize(JSON.parse(JSON.stringify({ ...s, tt: ['kill1', 'zzz'], ttEq: 'zzz' })), 0).tt, ['kill1']);
});
test('도감: 레벨 단계 10개, 승급 단계, 영구 보너스', () => {
  const s = C.newState(0); s.heroes.mage.lv = 35; s.heroes.mage.stars = 3;
  assert.equal(C.codexClaim(s, 'mage'), 20 + 40 + 60);
  assert.equal(C.codexStarClaim(s, 'mage'), 30 + 60);
  assert.equal(s.cdxs.mage, 2); assert.ok(C.statBonus(s).src.도감.atk > 0);
  assert.equal(C.codexNext(s, 'mage').lv, 40);
});
test('증거 카드: 10장이어야 켜지고, 합성은 같은 등급 3장', () => {
  const s = C.newState(0);
  C.CARDS.filter(c => c.grade === '일반').slice(0, 9).forEach(c => C.cardAdd(s, c.id));
  C.deckAuto(s); assert.equal(s.deck.length, 9); assert.equal(C.statBonus(s).src['증거 카드'].atk, 0);
  C.cardAdd(s, 'c_rose'); C.deckAuto(s); assert.ok(C.deckOn(s)); assert.ok(C.statBonus(s).src['증거 카드'].cdmg > 0);
  C.cardAdd(s, 'c_mask'); assert.equal(C.deckToggle(s, 'c_mask'), 'full');
  assert.throws(() => C.cardCombine(s, ['c_shell', 'c_shell', 'c_shell'], Math.random), /남는 카드/);
  C.cardAdd(s, 'c_shell', 3);
  const r = C.cardCombine(s, ['c_shell', 'c_shell', 'c_shell'], seq([0.1, 0, 0]));   // 0.1 < 0.3 → 희귀
  assert.ok(r.up); assert.equal(C.cardById(r.id).grade, '희귀'); assert.equal(s.cards.c_shell.n, 1);
  assert.throws(() => C.cardCombine(s, ['c_shell', 'c_rose', 'c_shell'], Math.random), /같은 등급/);
  C.cardAdd(s, 'c_print', 2); assert.ok(C.cardStarUp(s, 'c_print')); assert.equal(s.cards.c_print.s, 2);
});
test('복장: 보석으로 사고 입기, 고유 능력, 레벨 초기화, 수사팀 이름', () => {
  const s = C.newState(0); s.gems = 2500;
  C.costumeBuy(s, 'mage_biker'); assert.equal(s.gems, 500); assert.throws(() => C.costumeBuy(s, 'mage_suit'), /부족/);
  assert.throws(() => C.costumeWear(s, 'dark', 'mage_biker'), /보유하지 않은/);
  C.costumeWear(s, 'mage', 'mage_biker'); assert.equal(s.cosEq.mage, 'mage_biker');
  assert.ok(C.statBonus(s).src.복장.atk > 0);
  assert.equal(C.passiveOf(s, 'mage').on, false); s.stage = 81; assert.ok(C.statBonus(s).src['고유 능력'].boss > 0);
  s.heroes.mage.lv = 20; const e0 = s.exp, back = C.heroLvReset(s, 'mage');
  assert.equal(back, C.heroLvCostBulk(1, 19)); assert.equal(s.exp, e0 + back); assert.equal(s.heroes.mage.lv, 1);
  assert.equal(C.teamNameError('A'), '수사팀 이름이 너무 짧아요'); assert.equal(C.teamNameError('가나다라마바사아자'), '수사팀 이름이 너무 길어요'); assert.ok(C.teamNameError('반가워!'));
  C.teamRename(s, '야간반', 1000); assert.equal(s.tname, '야간반');
  assert.throws(() => C.teamRename(s, '주간반', 2000), /24시간/);
  assert.equal(C.accAdd(s, C.accNeed(1)), 1); assert.equal(s.acc.lv, 2);
  const r = C.sanitize(JSON.parse(JSON.stringify(s)), 0); assert.equal(r.tname, '야간반'); assert.equal(r.cosEq.mage, 'mage_biker');
});

test('대량 호출: 30회, 최대 호출, 범위 검사', () => {
  const s = C.newState(0); s.tix = 1234;
  assert.equal(C.summonMaxN(s, 'call'), 1000);
  const r = C.doSummon(s, 30, 'call', () => 0.9); assert.equal(r.ids.length, 30); assert.equal(r.state.tix, 1204);
  const big = C.doSummon(s, 1000, 'call', () => 0.9); assert.equal(big.ids.length, 1000); assert.equal(big.state.tix, 234);
  assert.throws(() => C.doSummon(s, 0, 'call', Math.random), RangeError);
  assert.throws(() => C.doSummon(s, 1001, 'call', Math.random), RangeError);
  assert.throws(() => C.doSummon(s, 2.5, 'call', Math.random), RangeError);
  const g = C.newState(0); g.ptix = 0; g.gems = 950; assert.equal(C.summonMaxN(g, 'elite'), Math.floor(C.gemTotal(g) / C.CONST.PREMIUM_COST));
  g.ptix = 7; assert.equal(C.summonMaxN(g, 'elite'), 7);
});

test('상점: 누적 구매일, 골드 충전, 정기권', () => {
  const s = C.newState(0); s.gems = 5000;
  const d1 = new Date('2026-11-28T10:00:00'), d2 = new Date('2026-11-29T10:00:00');
  C.shopBuy(s, 'd_tix', d1); C.shopBuy(s, 'd_gold', d1); assert.equal(s.sk.n, 1);      // 같은 날 두 번 사도 1일
  C.shopBuy(s, 'ad1', d2); assert.equal(s.sk.n, 1);                                   // 광고 상점은 세지 않음
  C.shopBuy(s, 'd_tix', d2); assert.equal(s.sk.n, 2);
  assert.ok(C.streakClaim(s, 0)); assert.equal(C.streakClaim(s, 0), null); assert.equal(C.streakClaim(s, 2), null);
  const g0 = s.gold; C.goldPackBuy(s, 'mg0', d1); assert.equal(s.gold, g0 + 100000);
  assert.throws(() => C.goldPackBuy(s, 'mg0', d2), RangeError);
  assert.doesNotThrow(() => C.goldPackBuy(s, 'mg0', new Date('2026-12-01T10:00:00')));   // 다음 달 다시
  assert.equal(C.planLeft(s, 'p_month', d1), 0); assert.equal(C.battleMods(s, d1).gold > 0, true);
  const gold0 = C.battleMods(s, d1).gold;
  C.planBuy(s, 'p_month', d1); assert.equal(C.planLeft(s, 'p_month', d1), 28);
  assert.ok(Math.abs(C.battleMods(s, d1).gold - gold0 * 1.3) < 1e-9);
  C.planBuy(s, 'p_month', d1); assert.equal(C.planLeft(s, 'p_month', d1), 56);          // 기간 합산
  assert.ok(C.planClaim(s, 'p_month', d1)); assert.equal(C.planClaim(s, 'p_month', d1), null); assert.ok(C.planClaim(s, 'p_month', d2));
  assert.equal(C.planClaim(s, 'w_sum', d1), null);
  const back = C.loadFromString(JSON.stringify(s), 0).state;
  assert.deepEqual(back.plans, s.plans); assert.deepEqual(back.sk, s.sk); assert.deepEqual(back.shopM, s.shopM);
});

test('성장 패스: 팀 레벨, 호출, 균열', () => {
  const s = C.newState(0); s.acc.lv = 9; s.pulls.total = 120; s.tower = 0;
  assert.deepEqual(C.pxReady(s, 'level').map(x => x[0]), [0, 1, 2]);
  assert.ok(C.pxClaim(s, 'level', 0, 'free')); assert.equal(C.pxClaim(s, 'level', 0, 'free'), null);
  assert.equal(C.pxClaim(s, 'level', 0, 'paid'), null); C.pxBuy(s, 'level'); assert.ok(C.pxClaim(s, 'level', 0, 'paid'));
  assert.equal(C.pxClaim(s, 'level', 5, 'free'), null);
  assert.equal(C.pxReady(s, 'summon').length, 3); assert.equal(C.pxReady(s, 'rift').length, 0);
  const back = C.loadFromString(JSON.stringify(s), 0).state; assert.deepEqual(back.px, s.px);
});

test('수사력 단계: 상한까지만 강화, 모두 채우면 승급', () => {
  const s = C.newState();
  assert.equal(C.tstepOf(s), 1);
  assert.equal(C.upCap(s, 'atk'), 10); assert.equal(C.upCap(s, 'crit'), 3);
  s.up.atk = 10; assert.equal(C.upCost(s, 'atk', 10), Infinity);
  assert.throws(() => C.tstepUp(s), RangeError);
  s.up.gold = 10; s.up.crit = 3; s.gold = 0;
  assert.equal(C.tstepProg(s).ready, true);
  assert.throws(() => C.tstepUp(s), RangeError);   // 골드 부족
  s.gold = C.tstepCost(s); const g0 = s.gems;
  C.tstepUp(s);
  assert.equal(C.tstepOf(s), 2); assert.equal(s.gold, 0); assert.equal(s.gems, g0);   // 보석 대신 능력치
  assert.ok(C.statBonus(s).src.수사력.atk > 0.049);
  assert.equal(C.upCap(s, 'atk'), 20); assert.ok(C.upCost(s, 'atk', 10) < Infinity);
  assert.deepEqual(C.tstepProg(s), { cur: 0, need: 23, ready: false });
});
test('수사력 단계: 예전 저장은 현재 강화 레벨에 맞는 단계로', () => {
  const s = C.sanitize({ v: 2, up: { atk: 35, gold: 12, crit: 4 } });
  assert.equal(s.tstep, 4); assert.equal(s.up.atk, 35);
});
test('보급품: 팀이 약해도 0이 아닌 보상', () => {
  const s = C.sanitize({ v: 2, stage: 60, bag: { g2: 1, e2: 1 }, heroes: { mage: { owned: true, lv: 1 } }, party: ['mage'] });
  assert.ok(C.useItem(s, 'g2', 1).gold > 0); assert.ok(C.useItem(s, 'e2', 1).exp > 0);
});

test('요원 레벨: 고정 상한 없음', () => {
  assert.ok(C.heroLvCap(1) > 10000);
});

test('기술 성장: 별이 오를수록 기술 수치가 커지고 원본은 그대로', () => {
  const h = C.heroById('requiem');
  assert.equal(C.skillOf(h, 1).mult, h.skill.mult);
  assert.ok(C.skillOf(h, 5).mult > C.skillOf(h, 3).mult);
  assert.equal(C.skillOf(h, C.AWAKE_STAR).cd, h.skill.cd - 1);
  assert.equal(h.skill.mult, 9);   // 원본 데이터는 바뀌지 않음
});

test('새 콘텐츠: 특성, 장비, 연구, 후원, 식당이 능력치에 더해지고 저장/불러오기가 유지됨', () => {
  const now = Date.now(), s = C.newState(now); s.stage = 450; s.gold = 1e40; s.gems = 1e6;
  const s2 = C.newState(now); s2.stage = 10; assert.throws(() => C.traitUp(s2, 'atk', 1), /스테이지 51/);
  C.traitUp(s, 'atk', 5); C.gearUp(s, 'wpn'); C.labStart(s, 'atk', now); C.labRush(s, now); C.aidGive(s, 'gold', now); C.foodEat(s, 'coffee', now);
  const b = C.statBonus(s).src;
  assert.ok(b.특성.atk > 0 && b.장비.atk > 0 && b.연구.atk > 0 && b.아지트.atk > 0);
  assert.throws(() => C.labStart(s, 'atk', now) && C.labStart(s, 'hp', now), /진행 중/);
  const r = C.loadFromString(JSON.stringify(s)).state;
  assert.equal(r.sys.trait.atk, 5); assert.equal(r.sys.gear.wpn, 1); assert.equal(r.sys.food.id, 'coffee');
});
test('새 콘텐츠: 현상 의뢰는 조건을 채워야 받고, 평판이 쌓임', () => {
  const now = new Date(), s = C.newState(+now); s.stage = 200; C.huntReset(s, now);
  const i = s.sys.hunt.ids[0], h = C.HUNTS[i];
  assert.throws(() => C.huntClaim(s, i, now), /조건/);
  C.progress(s, h.kind, h.n); C.huntClaim(s, i, now);
  assert.equal(s.sys.rep, h.rep); assert.throws(() => C.huntClaim(s, i, now), /이미/);
});
test('새 콘텐츠: 수색은 출전 요원을 못 보내고, 시간이 지나야 받음', () => {
  const now = Date.now(), s = C.newState(now); s.stage = 300;
  const free = C.HEROES.find(h => s.heroes[h.id].owned && !C.partyIds(s).includes(h.id)) || (s.heroes.echo.owned = true, C.heroById('echo'));
  assert.throws(() => C.searchStart(s, 's1', C.partyIds(s)[0], now), /출전/);
  C.searchStart(s, 's1', free.id, now);
  assert.throws(() => C.searchClaim(s, 's1', now), /아직/);
  const r = C.searchClaim(s, 's1', now + 3600 * 1000 + 1); assert.ok(r.gold > 0);
});
test('새 콘텐츠: 특수 작전은 전투력이 닿는 단계까지 한 번에, 하루 2번', () => {
  const now = Date.now(), s = C.newState(now); s.stage = 200; s.heroes.mage.owned = true; s.heroes.mage.lv = 300; s.party = ['mage'];
  const r = C.specRun(s, 'elite', now); assert.ok(r.win && r.lv >= 1);
  C.specRun(s, 'elite', now); assert.throws(() => C.specRun(s, 'elite', now), /입장/);
});
test('숫자 표기: 아주 큰 수도 단위로 짧게', () => {
  assert.equal(C.formatNum(1.2e15), '1.20aa'); assert.ok(C.formatNum(1e60).length <= 7);
});
test('새 콘텐츠: 하루가 지나면 후원, 특수 작전, 대련 횟수가 다시 채워짐 (숫자 시각도)', () => {
  const t0 = new Date(2026, 10, 28, 12).getTime(), t1 = new Date(2026, 10, 29, 12).getTime(), s = C.newState(t0); s.stage = 400; s.gold = 1e40;
  C.aidGive(s, 'gold', t0); C.aidGive(s, 'gold', t0); C.aidGive(s, 'gold', t0);
  assert.throws(() => C.aidGive(s, 'gold', t0), /모두/);
  assert.equal(C.aidLeft(s, t1), 3);
  C.duelKeys(s, t0); s.sys.duel.keys = 0; assert.equal(C.duelKeys(s, t1), 5);
});
test('장비: 근원체에서 떨어지고, 더 좋은 등급은 바로 장착, 분해하면 골드', () => {
  const s = C.newState(Date.now()); s.stage = 500; let r = 0; const rng = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 30; i++) C.gearDrop(s, rng);
  assert.ok(Object.keys(s.sys.gearEq).length > 0);
  for (const g of C.GEAR) { const e = s.sys.gearEq[g.id]; if (e) assert.ok(s.sys.gearInv.filter(x => x.slot === g.id).every(x => x.grade <= e.grade)); }
  const g0 = s.gold, got = C.gearScrap(s, 4); assert.ok(got.n > 0 && s.gold > g0 && s.sys.gearInv.length === 0);
  const back = C.loadFromString(JSON.stringify(s)).state; assert.deepEqual(back.sys.gearEq, s.sys.gearEq);
});
