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
  assert.equal(C.starNeed(1, '전설'), 1); assert.equal(C.starNeed(4, '전설'), 5);
  assert.equal(C.starNeed(2, '영웅'), 15);
  // 전설 ★5 까지 필요한 장수가 희귀보다 훨씬 적어야 함 (드문 만큼)
  const sum = g => [1, 2, 3, 4].reduce((a, s) => a + C.starNeed(s, g), 0);
  assert.ok(sum('전설') * 20 < sum('희귀'));
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
  assert.deepEqual(C.summon(1, () => 0.0005, 10), ['ironside']);    // 0.15% 안 → 상시 전설 (한정 나이트폴은 안 나옴)
  assert.deepEqual(C.summon(1, () => 0.0005, 4), ['mage']);         // 레벨 4 는 전설 없음 → 영웅 구간
  assert.deepEqual(C.summon(1, () => 0.9999, 1), ['breaker']);    // 희귀 구간 맨 끝
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
test('정예 호출: 희귀 없음, 전설 2%, 정예 호출권 먼저 사용', () => {
  const s = C.newState(0); s.gems = 1000; s.ptix = 1;
  const a = C.doSummon(s, 1, 'elite', () => 0.01); assert.deepEqual(a.ids, ['blackbox']); assert.equal(a.paid, 'ptix'); assert.equal(a.state.gems, 1000);
  const b = C.doSummon(a.state, 10, 'elite', () => 0.99); assert.equal(b.paid, 'gems'); assert.equal(b.state.gems, 1000 - 300);
  assert.ok(b.ids.every(id => C.heroById(id).grade !== '희귀'));
  assert.equal(b.state.pulls.total, 0);   // 소환 레벨은 요원 호출로만
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
  assert.deepEqual([...pool].sort(), ['blackbox', 'ghost', 'ironside', 'requiem']);
  let s = C.newState(0); s.gems = 1e6;
  for (let i = 0; i < 50; i++) { const r = i / 50 * 0.02; assert.notEqual(C.doSummon(s, 1, 'elite', () => r).ids[0], 'dark'); }
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
