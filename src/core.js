/* ============================================================
 * AIU (이상현상 전담수사팀) — 게임 핵심 규칙 (순수 함수 모음)
 * ------------------------------------------------------------
 * 화면(캔버스, DOM)과 완전히 분리된 계산 전용 모듈.
 *  - 브라우저: window.Core 로 노출
 *  - Node   : module.exports 로 노출 → 단위 테스트에서 사용
 * 여기 있는 함수는 입력이 같으면 결과도 항상 같다(난수는 rng 인자로 주입).
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------- 1. 정적 데이터 ---------- */

  // 요원 도감. name 은 수사 3팀처럼 코드네임, kind 는 종족(현재 모두 사람). baseAtk/baseHp 는 Lv.1 ★1 기준값.
  // type: 명단과 파티에 보이는 큰 분류 4가지 (공격, 광역, 방어, 지원). role 은 요원 상세에서만 보이는 세부 역할.
  // limited: 특별 채용(한정)에서만 나옴. 요원 호출, 정예 호출에는 나오지 않음
  // 기술 kind: single 단일 / multi 연사 / aoe 범위 / buff 팀 강화와 회복 /
  //            mark 표식(받는 피해 증가) / exorcise 근원체 특효 + 즉시 처리 / shield 보호막과 도발 / cage 가둠 / execute 처형
  const HEROES = [
    { id: 'knight', name: '램파트', kind: '사람',  role: '돌격',   type: '방어', grade: '희귀', baseAtk: 12, baseHp: 160, atkSpd: 1.0, range: 'melee',
      skill: { name: '방패 돌진', cd: 6,  kind: 'single', mult: 5 } },
    { id: 'archer', name: '롱샷',   kind: '사람',  role: '저격',   type: '공격', grade: '희귀', baseAtk: 9,  baseHp: 90,  atkSpd: 1.5, range: 'ranged',
      skill: { name: '연속 저격', cd: 7,  kind: 'multi',  mult: 1.4, hits: 5 } },
    { id: 'scanner', name: '스캐너', kind: '사람', role: '탐지',   type: '지원', grade: '희귀', baseAtk: 8,  baseHp: 100, atkSpd: 1.2, range: 'ranged',
      skill: { name: '표식 드론', cd: 8,  kind: 'mark',   mult: 1.5, amp: 0.3, dur: 6 } },
    { id: 'breaker', name: '브레이커', kind: '사람', role: '돌파', type: '방어', grade: '희귀', baseAtk: 11, baseHp: 185, atkSpd: 0.8, range: 'melee',
      skill: { name: '문 부수기', cd: 7,  kind: 'aoe',    mult: 3, rad: 90, stun: 1.5 } },
    { id: 'mage',   name: '블레이즈', kind: '사람',  role: '폭파',   type: '광역', grade: '영웅', baseAtk: 15, baseHp: 80,  atkSpd: 0.7, range: 'aoe',
      skill: { name: '화염병 투척', cd: 9,  kind: 'aoe',    mult: 4 } },
    { id: 'priest', name: '헤일로', kind: '사람',  role: '의무',   type: '지원', grade: '영웅', baseAtk: 6,  baseHp: 100, atkSpd: 0.9, range: 'ranged',
      skill: { name: '응급 처치', cd: 10, kind: 'buff',   mult: 0.5, dur: 4, heal: 0.3 } },
    { id: 'echo',   name: '에코',   kind: '사람',  role: '교란',   type: '광역', grade: '영웅', baseAtk: 13, baseHp: 95,  atkSpd: 0.8, range: 'ranged',
      skill: { name: '음파 교란', cd: 10, kind: 'aoe',    mult: 2, rad: 240, slow: 4 } },
    { id: 'dark',   name: '나이트폴', kind: '사람',  role: '해결사', type: '공격', grade: '전설', limited: true, baseAtk: 32, baseHp: 260, atkSpd: 0.9, range: 'melee',
      skill: { name: '그림자 베기', cd: 8,  kind: 'aoe',    mult: 7 } },
    { id: 'requiem', name: '레퀴엠', kind: '사람', role: '퇴마',   type: '공격', grade: '전설', baseAtk: 30, baseHp: 210, atkSpd: 0.9, range: 'ranged',
      skill: { name: '마지막 기도', cd: 9,  kind: 'exorcise', mult: 9, low: 4, kill: 0.15 } },
    { id: 'ironside', name: '아이언사이드', kind: '사람', role: '방호', type: '방어', grade: '전설', baseAtk: 18, baseHp: 420, atkSpd: 0.8, range: 'melee',
      skill: { name: '강철 방벽', cd: 12, kind: 'shield', mult: 0.4, dur: 5 } },
    { id: 'blackbox', name: '블랙박스', kind: '사람', role: '격리', type: '지원', grade: '전설', baseAtk: 26, baseHp: 240, atkSpd: 0.8, range: 'ranged',
      skill: { name: '격리 상자', cd: 11, kind: 'cage',   mult: 6, dur: 3 } },
    { id: 'ghost',  name: '고스트', kind: '사람',  role: '은신',   type: '공격', grade: '전설', baseAtk: 36, baseHp: 170, atkSpd: 1.3, range: 'melee',
      skill: { name: '투명 처형', cd: 8,  kind: 'execute', mult: 4, hits: 3, under: 0.3 } },
  ];
  const TYPES = ['공격', '광역', '방어', '지원'];
  // 세나 키우기처럼 처음엔 요원 한 명으로 시작 (블레이즈). 나머지는 요원 호출로
  const STARTER_IDS = ['mage'];

  // 공용 강화(훈련소) 목록
  const UPGRADES = [
    { id: 'atk',  name: '사격 훈련', baseCost: 50,  growth: 1.25, max: 999 },
    { id: 'gold', name: '현상금 협상', baseCost: 80,  growth: 1.30, max: 999 },
    { id: 'crit', name: '급소 노리기', baseCost: 120, growth: 1.35, max: 45 },
  ];

  const CONST = {
    WAVE_KILLS: 10,          // 근원체 등장까지 처치 수
    BOSS_TIME: 30,           // 근원체 제한 시간(초)
    BOSS_GEMS: 100,          // 근원체 처치 보석 (10회 호출 1번)
    /* 뽑기 세 가지
     * - 요원 호출: 호출권으로 뽑음(전투에서 계속 쌓임). 소환 레벨은 여기서만 오르고, 희귀 요원은 여기서만 나옴
     * - 정예 호출: 보석(또는 정예 호출권). 희귀 없이 영웅 이상, 전설 2%. 소환 레벨과 상관없음
     * - 특별 채용: 보석(또는 정예 호출권). 소환 레벨 3부터 열림(세나 키우기 픽업과 같음). 전설 2%는 모두 그 기간의 전설,
     *   누적 RELAY 회째에 그 전설 확정 */
    CALL_COST: 1,            // 요원 호출 1회 = 호출권 1장
    PREMIUM_COST: 30,        // 정예 호출, 특별 채용 1회 = 보석 30 (10회 300)
    PREMIUM_LEGEND: 0.02,    // 정예 호출, 특별 채용 전설 확률
    PICKUP_OPEN_LV: 3,       // 특별 채용이 열리는 소환 레벨
    TICKETS_PER_KILL: 0.1,   // 이상체 10마리에 호출권 1장
    BOSS_TICKETS: 10,        // 근원체 봉쇄 호출권
    START_TICKETS: 100,
    /* 세븐나이츠 키우기 방식 뽑기
     * - 소환 레벨: 누적 뽑기 횟수로 오름. 레벨 1~4 는 전설이 아예 안 나오고, 5부터 0.10%, 10에서 0.15%
     *   (세나 키우기 실제 값: 소환 레벨 5 레전드 0.1%, 10 에서 0.15%)
     * - 영웅 등급도 레벨마다 1%씩 오름 (세나 에픽 10%→19% 와 같은 폭)
     * - 특별 채용은 릴레이: 누적 2000회를 뽑으면 나이트폴 확정 (세나 픽업 릴레이 최소 2천 뽑기) */
    SUMMON_LV_PULLS: [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000],
    LEGEND_BY_LV:    [0, 0, 0, 0, 0.0010, 0.0011, 0.0012, 0.0013, 0.0014, 0.0015],
    HERO_BY_LV:      [0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19],
    RELAY: 200,              // 특별 채용 누적 확정 (보석 뽑기 기준)
    PICKUP_DAYS: 14,         // 특별 채용 한 번의 기간 (2주, 목요일 점검 기준)
    MAX_STARS: 5,
    PARTY_MAX: 5,            // 전투에 나가는 요원 수 (세나 키우기 5명 편성)
    PARTY_SLOT_AT: [1, 1, 1, 11, 21],   // 출전 칸 i 번째가 열리는 스테이지 (처음 3칸, 2구역에서 4칸, 3구역에서 5칸)
    OFFLINE_CAP_SEC: 8 * 3600,
    OFFLINE_MIN_SEC: 60,
    OFFLINE_RATE: 0.5,       // 오프라인 효율 50%
    MAX_KILLS_PER_SEC: 2,    // 오프라인 계산 시 처치 속도 상한
    START_GEMS: 1000,
    START_EXP: 200,          // 시작 경험치 (예전 저장에도 처음 한 번)        // 시작 보석: 100회 호출
    SAVE_VERSION: 2,         // 2: 세나 방식 뽑기로 바뀜 (예전 저장에는 보상 보석을 한 번 줌)
    MIGRATE_GEMS: 1000,
    /* 출동 (세나 키우기의 일일 던전, 무한의 탑과 같은 자리) */
    DAILY_KEYS: 3,           // 일일 출동 하루 입장 횟수 (깨야 줄어듦, 소탕도 1회)
    CHAL_TIME: 30,           // 출동 제한 시간(초)
    MISSION_BONUS_PTIX: 1,   // 일일 임무를 모두 끝내면 정예 호출권
  };

  /* 일일 출동 두 가지. stageEq: 단계마다 몇 스테이지 근원체만큼 센지 */
  const DUNGEONS = [
    { id: 'bounty',   name: '현상수배', reward: 'gold', text: '골드를 크게 벌어요',  step: 6, base: 0 },
    { id: 'evidence', name: '단서 추적',   reward: 'tix',  text: '호출권을 모아요',     step: 6, base: 3 },
    { id: 'training', name: '모의 훈련',   reward: 'exp',  text: '경험치를 크게 벌어요', step: 6, base: 1 },   // 세나 키우기 영웅 경험치 던전 자리
  ];
  /* 일일 임무: 매일 0시에 초기화. 다 끝내면 정예 호출권 1장 더 */
  const MISSIONS = [
    { kind: 'kill',    text: '이상체 처리',     need: 200, gems: 30 },
    { kind: 'boss',    text: '근원체 봉쇄',     need: 2,   gems: 30 },
    { kind: 'lvup',    text: '요원 강화',       need: 10,  gems: 30 },
    { kind: 'summon',  text: '요원 호출',       need: 10,  gems: 30 },
    { kind: 'dungeon', text: '일일 작전 완료',  need: 3,   gems: 50 },
    { kind: 'tower',   text: '균열 심층 돌파',  need: 1,   gems: 30 },
  ];
  /* 출석: 7일 한 바퀴, 하루 한 번 (연속이 아니어도 다음 칸) */
  const ATTEND = [
    { gems: 100 }, { tix: 30 }, { gems: 150 }, { ptix: 1 }, { tix: 50 }, { gems: 200 }, { ptix: 3 },
  ];

  /* ---------- 2. 유틸 ---------- */

  /** 유한한 숫자인지 확인 (NaN, Infinity, 문자열 거부) */
  function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }

  /** 정수로 자르고 범위 안에 고정. 잘못된 값이면 fallback */
  function clampInt(v, min, max, fallback) {
    if (!isNum(v)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(v)));
  }

  /** 큰 숫자 축약: 1234 → 1.23K, 1.5e9 → 1.50B. 음수/비정상 값은 0 처리 */
  function formatNum(n) {
    if (!isNum(n) || n < 0) return '0';
    if (n < 1000) return String(Math.floor(n));
    const units = ['K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad'];
    let i = -1;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
    // 반올림으로 1000.0K 같은 표기가 생기지 않도록 자릿수 내림 처리
    const f = Math.floor(n * 10 ** digits) / 10 ** digits;
    return f.toFixed(digits) + units[i];
  }

  /** 초 → "3시간 12분" / "45분" / "30초" */
  function formatDuration(sec) {
    if (!isNum(sec) || sec <= 0) return '0초';
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    if (m > 0) return `${m}분`;
    return `${s}초`;
  }

  function heroById(id) {
    const h = HEROES.find(x => x.id === id);
    if (!h) throw new Error(`알 수 없는 요원: ${id}`);
    return h;
  }

  /* ---------- 3. 스테이지 / 적 ---------- */

  /** 스테이지 번호(1부터) → "1-3" 형식 */
  function stageLabel(stage) {
    const s = clampInt(stage, 1, 1e9, 1);
    return `${Math.floor((s - 1) / 10) + 1}-${((s - 1) % 10) + 1}`;
  }
  function enemyHp(stage)   { return 20 * Math.pow(1.18, clampInt(stage, 1, 1e6, 1) - 1); }
  function enemyAtk(stage)  { return 3  * Math.pow(1.16, clampInt(stage, 1, 1e6, 1) - 1); }
  function bossHp(stage)    { return enemyHp(stage) * 12; }
  function bossAtk(stage)   { return enemyAtk(stage) * 3; }

  /** 일반 적 1마리 골드. goldLv = 현상금 협상 레벨 */
  function killGold(stage, goldLv) {
    return 3 * Math.pow(1.15, clampInt(stage, 1, 1e6, 1) - 1) * goldMult(goldLv);
  }
  function bossGold(stage, goldLv) { return killGold(stage, goldLv) * 10; }
  /** 요원 경험치 (요원 레벨업 재화, 세나 키우기 영웅 경험치와 같음). 골드는 훈련소에만 씀 */
  function killExp(stage) { return 2 * Math.pow(1.15, clampInt(stage, 1, 1e6, 1) - 1); }
  function bossExp(stage) { return killExp(stage) * 10; }

  /* ---------- 4. 성장 공식 ---------- */

  function atkMult(atkLv)   { return 1 + 0.1 * clampInt(atkLv, 0, 1e6, 0); }
  function goldMult(goldLv) { return 1 + 0.1 * clampInt(goldLv, 0, 1e6, 0); }
  /** 치명타 확률(0~0.5). 기본 5% + 레벨당 1% */
  function critChance(critLv) { return Math.min(0.5, 0.05 + 0.01 * clampInt(critLv, 0, 1e6, 0)); }
  const CRIT_DMG = 2;

  /** 별(★) 배율: ★1=1, ★2=1.5, ★3=2 ... */
  function starMult(stars) { return 1 + 0.5 * (clampInt(stars, 1, CONST.MAX_STARS, 1) - 1); }

  /** 요원 공격력 */
  function heroAtk(id, lv, stars, atkLv) {
    const h = heroById(id);
    return h.baseAtk * Math.pow(1.09, clampInt(lv, 1, 1e6, 1) - 1) * starMult(stars) * atkMult(atkLv);
  }
  /** 요원 최대 체력 */
  function heroHp(id, lv, stars) {
    const h = heroById(id);
    return h.baseHp * Math.pow(1.08, clampInt(lv, 1, 1e6, 1) - 1) * starMult(stars);
  }
  /** 초당 기본 피해(스킬 제외, 치명타 기대값 포함) */
  function heroDps(id, lv, stars, atkLv, critLv) {
    const c = critChance(critLv);
    return heroAtk(id, lv, stars, atkLv) * heroById(id).atkSpd * (1 + c * (CRIT_DMG - 1));
  }

  /** 요원 Lv 강화 비용 (현재 lv → lv+1), 경험치 */
  function heroLvCost(lv) { return Math.floor(10 * Math.pow(1.13, clampInt(lv, 1, 1e6, 1) - 1)); }

  /** lv 에서 n 단계 올리는 총 비용 */
  function heroLvCostBulk(lv, n) {
    let total = 0;
    const cnt = clampInt(n, 0, 10000, 0);
    for (let i = 0; i < cnt; i++) total += heroLvCost(lv + i);
    return total;
  }

  /** 보유 골드로 최대 몇 단계 올릴 수 있는지 (limit 단계까지만) */
  function heroLvAffordable(lv, gold, limit) {
    let n = 0, spent = 0;
    const cap = clampInt(limit, 0, 10000, 0);
    while (n < cap) {
      const c = heroLvCost(lv + n);
      if (spent + c > gold) break;
      spent += c; n++;
    }
    return { n, cost: spent };
  }

  function upgradeById(id) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u) throw new Error(`알 수 없는 강화: ${id}`);
    return u;
  }
  /** 훈련소 강화 비용. 최대 레벨이면 Infinity */
  function upgradeCost(id, lv) {
    const u = upgradeById(id);
    const l = clampInt(lv, 0, 1e6, 0);
    if (l >= u.max) return Infinity;
    return Math.floor(u.baseCost * Math.pow(u.growth, l));
  }

  /** ★ 승급에 필요한 조각 수 (현재 ★ 기준). 최대 ★이면 Infinity */
  /* 승급 조각: 등급마다 얼마나 자주 나오는지에 맞춰 다르게 (희귀는 흔하니 많이, 전설은 드무니 적게).
   * 세나 계열처럼 전설을 같은 전설 수십 장으로 키우게 하지 않음 */
  const STAR_NEED = { 희귀: [10, 30, 80, 200], 영웅: [5, 15, 40, 100], 전설: [1, 2, 3, 5] };
  function starNeed(stars, grade = '희귀') {
    const s = clampInt(stars, 1, CONST.MAX_STARS, 1);
    const t = STAR_NEED[grade] || STAR_NEED['희귀'];
    return s >= CONST.MAX_STARS ? Infinity : t[s - 1];
  }


  /* ---------- 5. 파티 / 오프라인 ---------- */

  /** 현재 열린 출전 칸 수 (스테이지가 오를수록 늘어남) */
  function partySlots(state) {
    const st = clampInt(state && state.stage, 1, 1e9, 1);
    return CONST.PARTY_SLOT_AT.filter(at => st >= at).length;
  }
  /** 전투에 나가는 요원 id 목록 (보유, 중복 없음, 최대 5명). 비어 있으면 보유 요원 앞에서부터 */
  function partyIds(state) {
    const ok = id => state.heroes[id] && state.heroes[id].owned;
    let ids = Array.isArray(state.party) ? [...new Set(state.party)].filter(id => HEROES.some(h => h.id === id) && ok(id)) : [];
    if (!ids.length) ids = HEROES.filter(h => ok(h.id)).map(h => h.id);
    return ids.slice(0, partySlots(state));
  }
  /**
   * 파티에 넣거나 빼기 (상태를 직접 바꿈).
   * @returns {'in'|'out'|'full'|'last'|'none'} 넣음 / 뺌 / 가득 참 / 마지막 한 명이라 못 뺌 / 미보유
   */
  function toggleParty(state, id) {
    if (!state.heroes[id] || !state.heroes[id].owned) return 'none';
    const p = partyIds(state);
    if (p.includes(id)) { if (p.length <= 1) return 'last'; state.party = p.filter(x => x !== id); return 'out'; }
    if (p.length >= partySlots(state)) return 'full';
    state.party = [...p, id]; return 'in';
  }
  /** 파티 안 두 자리 바꾸기 (빠진 요원 id 를 넣고 원래 요원은 뺌) */
  function swapParty(state, outId, inId) {
    const p = partyIds(state), i = p.indexOf(outId);
    if (i < 0 || p.includes(inId) || !state.heroes[inId] || !state.heroes[inId].owned) return false;
    p[i] = inId; state.party = p; return true;
  }

  /** 파티 요원 DPS 합 */
  function partyDps(state) {
    let sum = 0;
    for (const id of partyIds(state)) {
      const h = state.heroes[id];
      if (!h || !h.owned) continue;
      sum += heroDps(id, h.lv, h.stars, state.up.atk, state.up.crit);
    }
    return sum;
  }

  /**
   * 오프라인 보상 계산.
   * - 1분 미만, 음수(기기 시간 되돌림)는 보상 없음
   * - 최대 8시간까지만 인정
   * - 처치 속도는 (파티 DPS / 적 체력), 상한 2마리/초, 효율 50%
   */
  function offlineReward(state, elapsedSec) {
    if (!isNum(elapsedSec) || elapsedSec < CONST.OFFLINE_MIN_SEC) return { sec: 0, gold: 0, kills: 0 };
    const sec = Math.min(elapsedSec, CONST.OFFLINE_CAP_SEC);
    const hp = enemyHp(state.stage);
    const rate = Math.min(CONST.MAX_KILLS_PER_SEC, partyDps(state) / hp);
    const kills = Math.floor(rate * sec * CONST.OFFLINE_RATE);
    const gold = Math.floor(kills * killGold(state.stage, state.up.gold));
    return { sec, gold, kills, tix: Math.floor(kills * CONST.TICKETS_PER_KILL), exp: Math.floor(kills * killExp(state.stage)) };
  }

  /* ---------- 6. 소환 ---------- */

  /** 누적 뽑기 횟수 → 소환 레벨 (1~10) */
  function summonLevel(total) {
    const t = isNum(total) && total > 0 ? total : 0;
    let lv = 1;
    CONST.SUMMON_LV_PULLS.forEach((need, i) => { if (t >= need) lv = i + 1; });
    return lv;
  }
  /** 소환 레벨별 등급 확률 {legend, hero, rare} */
  function summonRates(level) {
    const i = clampInt(level, 1, CONST.SUMMON_LV_PULLS.length, 1) - 1;
    const legend = CONST.LEGEND_BY_LV[i], hero = CONST.HERO_BY_LV[i];
    return { legend, hero, rare: 1 - legend - hero };
  }
  // 등급별 요원 목록. 한정 요원(나이트폴)은 빼고 (특별 채용에서만 나옴)
  const GRADE_IDS = g => HEROES.filter(h => h.grade === g && !h.limited).map(h => h.id);
  /**
   * n회 뽑기. 등급을 먼저 정하고 그 등급 안에서 균등하게 한 명.
   * @param {number} level 소환 레벨 1~10
   */
  function summon(n, rng, level = 1) {
    if (typeof rng !== 'function') throw new TypeError('rng 함수가 필요합니다');
    const r0 = summonRates(level), cnt = clampInt(n, 1, 100, 1), out = [];
    const pick = (ids, t) => ids[Math.min(ids.length - 1, Math.floor(t * ids.length))];
    for (let i = 0; i < cnt; i++) {
      const r = rng();
      if (!isNum(r) || r < 0 || r >= 1) throw new RangeError('rng 값은 0 이상 1 미만이어야 합니다');
      if (r < r0.legend) out.push(pick(GRADE_IDS('전설'), r / r0.legend));
      else if (r < r0.legend + r0.hero) out.push(pick(GRADE_IDS('영웅'), (r - r0.legend) / r0.hero));
      else out.push(pick(GRADE_IDS('희귀'), (r - r0.legend - r0.hero) / r0.rare));
    }
    return out;
  }
  /** 소환 레벨 보상: 레벨 L 에 처음 오르면 보석 L*100, 정예 호출권 L장 */
  function levelReward(lv) { return { gems: lv * 100, ptix: lv }; }

  /**
   * 뽑기 한 번 실행 (원본 불변, 새 상태 반환).
   * kind: 'call' 요원 호출(호출권) / 'elite' 정예 호출 / 'pickup' 특별 채용 (보석, 정예 호출권이 있으면 먼저 씀)
   * @returns {{state, ids, isNew, relayHit, lvUps: number[], paid: 'tix'|'ptix'|'gems'}}
   */
  function doSummon(state, n, kind, rng) {
    if (!['call', 'elite', 'pickup'].includes(kind)) throw new TypeError('뽑기 종류가 올바르지 않습니다: ' + kind);
    const cnt = n === 10 ? 10 : 1;
    const lv0 = summonLevel(state.pulls.total);
    if (kind === 'pickup' && lv0 < CONST.PICKUP_OPEN_LV) throw new RangeError(`특별 채용은 소환 레벨 ${CONST.PICKUP_OPEN_LV}부터 열립니다`);
    let paid;
    if (kind === 'call') { if (state.tix < cnt * CONST.CALL_COST) throw new RangeError('호출권이 부족합니다'); paid = 'tix'; }
    else if (state.ptix >= cnt) paid = 'ptix';
    else if (state.gems >= cnt * CONST.PREMIUM_COST) paid = 'gems';
    else throw new RangeError('보석이 부족합니다');
    const ids = [];
    let total = state.pulls.total, relay = state.pulls.relay, relayHit = false;
    for (let i = 0; i < cnt; i++) {
      let id;
      if (kind === 'call') { id = summon(1, rng, summonLevel(total))[0]; total++; }
      else {
        const r = rng();
        if (!isNum(r) || r < 0 || r >= 1) throw new RangeError('rng 값은 0 이상 1 미만이어야 합니다');
        const heroes = GRADE_IDS('영웅'), legends = GRADE_IDS('전설');
        const pick = (ids, t) => ids[Math.min(ids.length - 1, Math.floor(t * ids.length))];
        // 전설 2%: 특별 채용은 한정 전설(나이트폴), 정예 호출은 상시 전설 중 하나
        if (r < CONST.PREMIUM_LEGEND) id = kind === 'pickup' ? 'dark' : pick(legends, r / CONST.PREMIUM_LEGEND);
        else id = pick(heroes, (r - CONST.PREMIUM_LEGEND) / (1 - CONST.PREMIUM_LEGEND));
        if (kind === 'pickup') { relay++; if (id === 'dark') relay = 0; if (relay >= CONST.RELAY) { id = 'dark'; relay = 0; relayHit = true; } }
      }
      ids.push(id);
    }
    const res = applySummon(state, ids), st = res.state;
    if (paid === 'tix') st.tix -= cnt * CONST.CALL_COST; else if (paid === 'ptix') st.ptix -= cnt; else st.gems -= cnt * CONST.PREMIUM_COST;
    st.pulls = { total, relay };
    const lvUps = [];
    for (let L = lv0 + 1; L <= summonLevel(total); L++) { const rw = levelReward(L); st.gems += rw.gems; st.ptix += rw.ptix; lvUps.push(L); }
    return { state: st, ids, isNew: res.isNew, relayHit, lvUps, paid };
  }
  /** 전투에서 호출권 쌓기 (처치 수, 근원체 여부). 소수점은 tixPart 에 모아 둠 */
  function addTickets(state, kills, bosses = 0) {
    const k = isNum(kills) && kills > 0 ? kills : 0, b = isNum(bosses) && bosses > 0 ? bosses : 0;
    const part = (state.tixPart || 0) + k * CONST.TICKETS_PER_KILL;
    const whole = Math.floor(part + 1e-9);
    state.tixPart = part - whole; state.tix += whole + b * CONST.BOSS_TICKETS;
    return whole + b * CONST.BOSS_TICKETS;
  }

  /**
   * 소환 결과를 상태에 반영 (새 상태 반환, 원본 불변).
   * 미보유 요원은 보유로 바꾸고, 보유 요원은 조각 +1.
   */
  function applySummon(state, ids) {
    const next = cloneState(state);
    const isNew = [];
    for (const id of ids) {
      heroById(id); // 잘못된 id 방어
      const h = next.heroes[id];
      if (!h.owned) {
        h.owned = true; isNew.push(true);
        // 파티에 빈자리가 있으면 새 요원이 바로 합류
        const p = partyIds(next); if (!p.includes(id) && p.length < partySlots(next)) next.party = [...p, id];
      }
      else { h.shards += 1; isNew.push(false); }
    }
    return { state: next, isNew };
  }

  /**
   * 특별 채용 남은 시간(초). 세나 키우기처럼 정기 점검(목요일) 단위로 2주씩 열린다.
   * 기간: 목요일 오전 9시 시작 → 2주 뒤 목요일 오전 9시 직전까지 (기기 시간 기준)
   * 기준 시작일: 2026-11-26(목) 09:00
   * @param {Date} now 현재 시각
   */
  function pickupRemainSec(now) {
    if (!(now instanceof Date) || !isNum(now.getTime())) return 0;
    const P = CONST.PICKUP_DAYS * 86400000;
    const base = new Date(2026, 10, 26, 9, 0, 0).getTime();
    const off = ((now.getTime() - base) % P + P) % P;     // 현재 기간 안에서 지난 시간
    return Math.max(1, Math.round((P - off) / 1000));
  }
  /** 초 → "6일 23시간" / "5시간 12분" */
  function formatRemain(sec) {
    if (!isNum(sec) || sec <= 0) return '0분';
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}일 ${h}시간`;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${Math.max(1, m)}분`;
  }

  /* ---------- 6-2. 출동, 일일 임무, 출석 ---------- */

  /** 기기 시간 기준 날짜 문자열 (매일 0시에 바뀜) */
  function dayKey(now) {
    const d = now instanceof Date && isNum(now.getTime()) ? now : new Date(0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  /** 날짜가 바뀌었으면 입장 횟수와 일일 임무를 새로 (상태를 직접 바꿈). 바뀌었으면 true */
  function dailyReset(state, now) {
    const k = dayKey(now);
    if (state.day === k) return false;
    state.day = k;
    for (const d of DUNGEONS) state.keys[d.id] = CONST.DAILY_KEYS;
    state.daily = { p: {}, got: [], bonus: false };
    return true;
  }
  function dungeonById(id) {
    const d = DUNGEONS.find(x => x.id === id);
    if (!d) throw new Error(`알 수 없는 작전: ${id}`);
    return d;
  }
  /** 출동 lv 단계가 스테이지 몇만큼 센지 */
  function dungeonStage(id, lv) { const d = dungeonById(id); return d.base + d.step * clampInt(lv, 1, 1e5, 1); }
  /** 출동 보상: 현상수배는 그 스테이지 근원체 골드 15번 분, 단서 추적은 호출권 15 + 단계당 5 */
  function dungeonReward(id, lv, goldLv) {
    const d = dungeonById(id), L = clampInt(lv, 1, 1e5, 1);
    if (d.reward === 'gold') return { gold: Math.floor(bossGold(dungeonStage(id, L), goldLv) * 15) };
    if (d.reward === 'exp') return { exp: Math.floor(bossExp(dungeonStage(id, L)) * 15) };
    return { tix: 15 + 5 * L };
  }
  /** 균열 심층 f 층이 스테이지 몇만큼 센지, 처음 돌파 보상 (5층마다 정예 호출권, 10층마다 보석 200) */
  function towerStage(f) { return 4 + 2 * clampInt(f, 1, 1e5, 1); }
  function towerReward(f) {
    const F = clampInt(f, 1, 1e5, 1);
    return { gems: F % 10 === 0 ? 200 : 30, ptix: F % 5 === 0 ? 1 : 0 };
  }
  /** 출동 근원체 체력, 공격력 (일반 근원체와 같은 공식) */
  function chalHp(stageEq) { return bossHp(stageEq); }
  function chalAtk(stageEq) { return bossAtk(stageEq); }
  /* ---------- 수사 수첩: 구역을 넘을 때마다 열리는 콘텐츠와 달성 보상 (세나 키우기 나침반처럼) ---------- */
  const ROADMAP = [
    { id: 'z2',  name: '안개 항구 진입',   stage: 11,  rw: { gems: 100 } },
    { id: 'p4',  name: '출전 칸 4 열림',   stage: 11,  rw: { tix: 10 } },
    { id: 'z3',  name: '네온 유흥가 진입', stage: 21,  rw: { gems: 150 } },
    { id: 'p5',  name: '출전 칸 5 열림',   stage: 21,  rw: { ptix: 1 } },
    { id: 'z4',  name: '빗속 뒷골목 심층', stage: 31,  rw: { gems: 200 } },
    { id: 'z5',  name: '안개 항구 심층',   stage: 41,  rw: { tix: 20 } },
    { id: 'case', name: '사건 도감 열림',  stage: 51,  rw: { ptix: 2 } },
    { id: 'z8',  name: '네온 유흥가 심층', stage: 81,  rw: { gems: 300 } },
    { id: 'dress', name: '복장 도감 열림', stage: 121, rw: { ptix: 3 } },
  ];
  /** 받을 수 있는 수첩 보상 하나 받기 (모두 받기는 반복 호출) */
  function roadClaim(state, id) {
    const r = ROADMAP.find(x => x.id === id);
    if (!r || state.stage < r.stage || state.unl.includes(id)) return null;
    state.unl.push(id); giveReward(state, r.rw); return r.rw;
  }
  const roadReady = state => ROADMAP.filter(r => state.stage >= r.stage && !state.unl.includes(r.id));

  function giveReward(state, r) {
    if (r.gold) state.gold += r.gold;
    if (r.exp) state.exp += r.exp;
    if (r.gems) state.gems += r.gems;
    if (r.tix) state.tix += r.tix;
    if (r.ptix) state.ptix += r.ptix;
    if (r.shard && state.heroes[r.shard]) state.heroes[r.shard].shards += clampInt(r.n, 0, 1e6, 0);   // 요원 조각
    return r;
  }
  /** 일일 출동 성공 (입장 1회 씀, 처음 깬 단계면 최고 단계 올림). 상태를 직접 바꾸고 보상 반환 */
  function clearDungeon(state, id, lv) {
    dungeonById(id);
    const L = clampInt(lv, 1, 1e5, 1);
    if (L > (state.dbest[id] || 0) + 1) throw new RangeError('아직 열리지 않은 단계예요');
    if (state.keys[id] <= 0) throw new RangeError('오늘 입장 횟수를 다 썼어요');
    state.keys[id]--;
    state.dbest[id] = Math.max(state.dbest[id] || 0, L);
    progress(state, 'dungeon', 1);
    return giveReward(state, dungeonReward(id, L, state.up.gold));
  }
  /** 소탕: 깬 최고 단계 보상을 싸우지 않고 바로 받음 (입장 1회) */
  function sweepDungeon(state, id) {
    const best = state.dbest[id] || 0;
    if (best < 1) throw new RangeError('한 번 깬 단계부터 소탕할 수 있어요');
    return clearDungeon(state, id, best);
  }
  /** 균열 심층 다음 층 돌파 */
  function clearTower(state) {
    state.tower = (state.tower || 0) + 1;
    progress(state, 'tower', 1);
    return giveReward(state, towerReward(state.tower));
  }

  /** 일일 임무 진행 (상태를 직접 바꿈) */
  function missionAdd(state, kind, amount = 1) {
    if (!state || !state.daily || !isNum(amount) || amount <= 0) return false;
    const m = MISSIONS.find(x => x.kind === kind); if (!m) return false;
    state.daily.p[kind] = Math.min(m.need, (state.daily.p[kind] || 0) + amount);
    return true;
  }
  /** i 번째 임무 보상 받기. 못 받으면 0 */
  function missionClaim(state, i) {
    const m = MISSIONS[i];
    if (!m || state.daily.got.includes(i) || (state.daily.p[m.kind] || 0) < m.need) return 0;
    state.daily.got.push(i); state.gems += m.gems;
    return m.gems;
  }
  /** 모두 받았으면 보너스 (정예 호출권) */
  function missionBonus(state) {
    if (state.daily.bonus || state.daily.got.length < MISSIONS.length) return 0;
    state.daily.bonus = true; state.ptix += CONST.MISSION_BONUS_PTIX;
    return CONST.MISSION_BONUS_PTIX;
  }
  /** 가이드 퀘스트와 일일 임무를 함께 올림 */
  function progress(state, kind, amount = 1) { questAdd(state, kind, amount); missionAdd(state, kind, amount); }

  /** 출석 보상 받을 수 있는지 / 받기 (오늘 이미 받았으면 null) */
  function canAttend(state, now) { return state.att.last !== dayKey(now); }
  function attend(state, now) {
    if (!canAttend(state, now)) return null;
    const i = state.att.n % ATTEND.length, r = { ...ATTEND[i] };
    state.att = { n: state.att.n + 1, last: dayKey(now) };
    giveReward(state, r);
    return { day: i + 1, reward: r };
  }

  /* ---------- 7. 상태 생성 / 저장 검증 ---------- */

  /* ---------- 가이드 퀘스트 (세나 키우기의 왼쪽 퀘스트 줄처럼 하나씩 차례로) ----------
   * kind 별로 진행이 쌓이고, 다 차면 눌러서 보석을 받음. 목록을 다 돌면 처음으로 돌아가 목표만 커짐 */
  const QUESTS = [
    { kind: 'lvup',   text: '요원 강화',     need: 5,  gems: 100 },
    { kind: 'kill',   text: '이상체 처리',   need: 30, gems: 100 },
    { kind: 'boss',   text: '근원체 봉쇄',   need: 1,  gems: 200 },
    { kind: 'train',  text: '훈련소 강화',   need: 3,  gems: 100 },
    { kind: 'summon', text: '요원 호출',     need: 1,  gems: 100 },
    { kind: 'lvup',   text: '요원 강화',     need: 20, gems: 150 },
    { kind: 'boss',   text: '근원체 봉쇄',   need: 3,  gems: 250 },
    { kind: 'kill',   text: '이상체 처리',   need: 150, gems: 200 },
  ];
  /* 처음 시작용 가이드 퀘스트 (세나 키우기 [가이드-n] 처럼). 블레이즈 혼자 시작 → 강화 → 근원체 → 두 번째 요원(램파트) → 출전 → 호출 → 성장 → 작전.
   * rw: 보상 (hero 는 요원 한 명. 이미 있으면 조각 1개). 다 끝나면 아래 QUESTS 를 계속 돎 */
  const GUIDE = [
    { kind: 'kill',    text: '이상체 처리',       need: 10, rw: { gems: 100 } },
    { kind: 'lvup',    text: '블레이즈 강화',     need: 3,  rw: { exp: 300 } },
    { kind: 'boss',    text: '근원체 봉쇄',       need: 1,  rw: { hero: 'knight' } },
    { kind: 'party',   text: '요원 2명 출전',     need: 2,  rw: { shard: 'mage', n: 5 } },   // 블레이즈 조각 5개 → 바로 첫 승급
    { kind: 'star',    text: '블레이즈 승급',     need: 1,  rw: { tix: 10 } },
    { kind: 'summon',  text: '요원 호출',         need: 10, rw: { gems: 200 } },
    { kind: 'train',   text: '성장 강화',         need: 3,  rw: { gold: 500 } },
    { kind: 'dungeon', text: '일일 작전',         need: 1,  rw: { gems: 200 } },
    { kind: 'boss',    text: '근원체 봉쇄',       need: 3,  rw: { ptix: 1 } },
  ];
  /** i 번째 퀘스트. 처음 GUIDE 를 지나면 QUESTS 를 돎 (한 바퀴 돌 때마다 목표 2배, 보상 1.5배). guide: 가이드 번호(1부터) 또는 0 */
  function questAt(i) {
    if (!Number.isInteger(i) || i < 0) throw new RangeError('퀘스트 번호가 올바르지 않습니다: ' + i);
    if (i < GUIDE.length) { const q = GUIDE[i]; return { kind: q.kind, text: q.text, need: q.need, rw: { ...q.rw }, gems: q.rw.gems || 0, guide: i + 1 }; }
    const j = i - GUIDE.length, q = QUESTS[j % QUESTS.length], lap = Math.floor(j / QUESTS.length), gems = Math.round(q.gems * Math.pow(1.5, lap));
    return { kind: q.kind, text: q.text, need: q.need * Math.pow(2, lap), rw: { gems }, gems, guide: 0 };
  }
  /** 행동이 일어났을 때 진행 올리기. 현재 퀘스트와 종류가 같을 때만 (상태를 직접 바꿈) */
  function questAdd(state, kind, amount = 1) {
    if (!state || !state.q) return false;
    if (!isNum(amount) || amount <= 0) return false;
    const q = questAt(state.q.i);
    if (q.kind !== kind || state.q.p >= q.need) return false;
    // 출전 인원처럼 '현재 몇 명인지'를 세는 퀘스트는 더하지 않고 큰 값으로
    state.q.p = Math.min(q.need, kind === 'party' ? Math.max(state.q.p, amount) : state.q.p + amount);
    return true;
  }
  /** 다 찼으면 보상을 주고 다음 퀘스트로. 받은 보상(요원이면 hero, isNew) 반환, 안 찼으면 null */
  function questClaim(state) {
    const q = questAt(state.q.i);
    if (state.q.p < q.need) return null;
    const r = { ...q.rw };
    if (r.hero) {
      const h = state.heroes[r.hero];
      if (h.owned) { h.shards += 1; r.isNew = false; }
      else {
        h.owned = true; r.isNew = true;
        const p = partyIds(state); if (p.length < partySlots(state)) state.party = [...p, r.hero];   // 빈 출전 칸에 바로 합류
      }
    }
    giveReward(state, r);
    state.q = { i: state.q.i + 1, p: 0, g: 1 };
    // 다음 퀘스트가 출전 인원이면 현재 인원부터 셈
    if (questAt(state.q.i).kind === 'party') questAdd(state, 'party', partyIds(state).length);
    return r;
  }

  function newState(now) {
    const heroes = {};
    for (const h of HEROES) {
      heroes[h.id] = { owned: STARTER_IDS.includes(h.id), lv: 1, stars: 1, shards: 0 };
    }
    return {
      v: CONST.SAVE_VERSION,
      gold: 0,
      exp: CONST.START_EXP,     // 요원 경험치 (요원 레벨업)
      gems: CONST.START_GEMS,
      stage: 1,
      kills: 0,
      farming: false,     // 근원체에게 진 뒤 반복 사냥 모드
      heroes,
      party: STARTER_IDS.slice(),   // 전투에 나가는 요원 (최대 5명)
      unl: [],            // 받은 수사 수첩 보상
      face: '',           // 프로필 얼굴 (비면 첫 출전 요원)
      up: { atk: 0, gold: 0, crit: 0 },
      q: { i: 0, p: 0, g: 1 },  // 퀘스트 번호와 진행 (g: 가이드 퀘스트가 있는 저장)
      pulls: { total: 0, relay: 0 },    // 요원 호출 누적(소환 레벨), 특별 채용 릴레이
      tix: CONST.START_TICKETS, tixPart: 0,   // 호출권
      ptix: 0,                          // 정예 호출권
      autoSkill: true,          // 기술 자동 사용
      speed: 1,                 // 전투 배속 1 또는 2
      lastSeen: isNum(now) ? now : 0,
      day: '',                  // 마지막 일일 초기화 날짜
      keys: Object.fromEntries(DUNGEONS.map(d => [d.id, CONST.DAILY_KEYS])),   // 일일 출동 남은 입장
      dbest: Object.fromEntries(DUNGEONS.map(d => [d.id, 0])),                 // 일일 출동 깬 최고 단계
      tower: 0,                 // 균열 심층 돌파한 층
      daily: { p: {}, got: [], bonus: false },   // 일일 임무 진행, 받은 번호, 보너스
      att: { n: 0, last: '' },  // 출석 받은 횟수, 마지막 날짜
    };
  }

  function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

  /**
   * 저장 데이터 검증/복구. 손상되거나 조작된 값은 기본값으로 되돌린다.
   * 어떤 입력이 와도 예외 없이 유효한 상태를 돌려준다.
   */
  function sanitize(raw, now) {
    const base = newState(now);
    if (!raw || typeof raw !== 'object') return base;
    const s = base;
    s.gold   = isNum(raw.gold) && raw.gold >= 0 ? raw.gold : 0;
    s.exp    = isNum(raw.exp) && raw.exp >= 0 ? raw.exp : CONST.START_EXP;
    s.gems   = isNum(raw.gems) && raw.gems >= 0 ? Math.floor(raw.gems) : base.gems;
    s.stage  = clampInt(raw.stage, 1, 1e6, 1);
    s.kills  = clampInt(raw.kills, 0, CONST.WAVE_KILLS, 0);
    s.farming = raw.farming === true;
    if (raw.q && typeof raw.q === 'object') {
      s.q.i = clampInt(raw.q.i, 0, 1e6, 0);
      if (raw.q.g !== 1 && s.q.i > 0) s.q.i += GUIDE.length;   // 가이드가 생기기 전 저장: 가이드는 건너뛰고 원래 퀘스트 그대로
      s.q.p = clampInt(raw.q.p, 0, questAt(s.q.i).need, 0);
    }
    s.autoSkill = raw.autoSkill !== false;
    s.tix = clampInt(raw.tix, 0, 1e9, s.tix);
    s.tixPart = isNum(raw.tixPart) && raw.tixPart >= 0 && raw.tixPart < 1 ? raw.tixPart : 0;
    s.ptix = clampInt(raw.ptix, 0, 1e6, 0);
    if (raw.pulls && typeof raw.pulls === 'object') {
      s.pulls.total = clampInt(raw.pulls.total, 0, 1e9, 0);
      s.pulls.relay = clampInt(raw.pulls.relay, 0, CONST.RELAY - 1, 0);
    }
    // 예전 저장(버전 1)이면 뽑기 개편 보상 보석을 한 번 줌
    if (!(isNum(raw.v) && raw.v >= CONST.SAVE_VERSION)) { s.gems += CONST.MIGRATE_GEMS; s.migrated = true; }
    s.speed = raw.speed === 2 ? 2 : 1;
    s.day = typeof raw.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.day) ? raw.day : '';
    for (const d of DUNGEONS) {
      if (raw.keys && typeof raw.keys === 'object') s.keys[d.id] = clampInt(raw.keys[d.id], 0, CONST.DAILY_KEYS, CONST.DAILY_KEYS);
      if (raw.dbest && typeof raw.dbest === 'object') s.dbest[d.id] = clampInt(raw.dbest[d.id], 0, 1e5, 0);
    }
    s.tower = clampInt(raw.tower, 0, 1e5, 0);
    if (raw.daily && typeof raw.daily === 'object') {
      for (const m of MISSIONS) if (raw.daily.p && isNum(raw.daily.p[m.kind])) s.daily.p[m.kind] = clampInt(raw.daily.p[m.kind], 0, m.need, 0);
      s.daily.got = Array.isArray(raw.daily.got) ? [...new Set(raw.daily.got.filter(i => Number.isInteger(i) && i >= 0 && i < MISSIONS.length))] : [];
      s.daily.bonus = raw.daily.bonus === true && s.daily.got.length === MISSIONS.length;
    }
    s.unl = Array.isArray(raw.unl) ? raw.unl.filter(x => ROADMAP.some(r => r.id === x)) : [];
    s.face = typeof raw.face === 'string' && HEROES.some(h => h.id === raw.face) ? raw.face : '';
    if (raw.att && typeof raw.att === 'object') s.att = { n: clampInt(raw.att.n, 0, 1e6, 0), last: typeof raw.att.last === 'string' ? raw.att.last.slice(0, 10) : '' };
    s.lastSeen = isNum(raw.lastSeen) && raw.lastSeen > 0 ? raw.lastSeen : base.lastSeen;
    if (raw.up && typeof raw.up === 'object') {
      for (const u of UPGRADES) s.up[u.id] = clampInt(raw.up[u.id], 0, u.max, 0);
    }
    if (raw.heroes && typeof raw.heroes === 'object') {
      for (const h of HEROES) {
        const r = raw.heroes[h.id];
        if (!r || typeof r !== 'object') continue;
        s.heroes[h.id] = {
          // 시작 요원은 항상 보유
          owned: STARTER_IDS.includes(h.id) ? true : r.owned === true,
          lv: clampInt(r.lv, 1, 1e6, 1),
          stars: clampInt(r.stars, 1, CONST.MAX_STARS, 1),
          shards: clampInt(r.shards, 0, 1e6, 0),
        };
      }
    }
    // 파티: 보유한 요원만, 중복 없이 최대 5명. 예전 저장(파티 없음)은 보유 요원 앞에서부터
    s.party = Array.isArray(raw.party) ? raw.party.filter(id => typeof id === 'string') : null;
    s.party = partyIds(s);
    return s;
  }

  /** 저장 문자열 파싱. JSON 오류면 새 상태 */
  function loadFromString(str, now) {
    if (typeof str !== 'string' || !str) return { state: newState(now), ok: false };
    try { return { state: sanitize(JSON.parse(str), now), ok: true }; }
    catch (e) { return { state: newState(now), ok: false }; }
  }

  const Core = {
    HEROES, TYPES, STARTER_IDS, partyIds, partySlots, toggleParty, swapParty, UPGRADES, CONST, CRIT_DMG,
    isNum, clampInt, formatNum, formatDuration, heroById, upgradeById,
    ROADMAP, roadClaim, roadReady, stageLabel, killExp, bossExp, enemyHp, enemyAtk, bossHp, bossAtk, killGold, bossGold,
    atkMult, goldMult, critChance, starMult, heroAtk, heroHp, heroDps,
    heroLvCost, heroLvCostBulk, heroLvAffordable, upgradeCost, starNeed, STAR_NEED,
    partyDps, offlineReward, summon, summonLevel, summonRates, doSummon, addTickets, levelReward, applySummon, pickupRemainSec, formatRemain,
    newState, cloneState, sanitize, loadFromString, QUESTS, GUIDE, questAt, questAdd, questClaim,
    DUNGEONS, MISSIONS, ATTEND, dayKey, dailyReset, dungeonById, dungeonStage, dungeonReward, towerStage, towerReward,
    chalHp, chalAtk, clearDungeon, sweepDungeon, clearTower, missionAdd, missionClaim, missionBonus, progress, canAttend, attend,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
