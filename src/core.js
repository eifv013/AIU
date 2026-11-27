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

  // 요원 도감. name 은 수사 3팀처럼 코드네임, kind 는 동물. baseAtk/baseHp 는 Lv.1 ★1 기준값.
  const HEROES = [
    { id: 'knight', name: '램파트', kind: '코뿔소',  role: '돌격',   grade: '희귀', baseAtk: 12, baseHp: 160, atkSpd: 1.0, range: 'melee',
      skill: { name: '방패 돌진', cd: 6,  kind: 'single', mult: 5 } },
    { id: 'archer', name: '롱샷',   kind: '스라소니',  role: '저격',   grade: '희귀', baseAtk: 9,  baseHp: 90,  atkSpd: 1.5, range: 'ranged',
      skill: { name: '연속 저격', cd: 7,  kind: 'multi',  mult: 1.4, hits: 5 } },
    { id: 'mage',   name: '블레이즈', kind: '검은 염소',  role: '폭파',   grade: '영웅', baseAtk: 15, baseHp: 80,  atkSpd: 0.7, range: 'aoe',
      skill: { name: '화염병 투척', cd: 9,  kind: 'aoe',    mult: 4 } },
    { id: 'priest', name: '헤일로', kind: '두루미',  role: '의무',   grade: '영웅', baseAtk: 6,  baseHp: 100, atkSpd: 0.9, range: 'ranged',
      skill: { name: '응급 처치', cd: 10, kind: 'buff',   mult: 0.5, dur: 4, heal: 0.3 } },
    { id: 'dark',   name: '나이트폴', kind: '흑표범',  role: '해결사', grade: '전설', baseAtk: 32, baseHp: 260, atkSpd: 0.9, range: 'melee',
      skill: { name: '그림자 베기', cd: 8,  kind: 'aoe',    mult: 7 } },
  ];
  const STARTER_IDS = ['knight', 'archer', 'mage', 'priest'];

  // 공용 강화(훈련소) 목록
  const UPGRADES = [
    { id: 'atk',  name: '사격 훈련', baseCost: 50,  growth: 1.25, max: 999 },
    { id: 'gold', name: '현상금 협상', baseCost: 80,  growth: 1.30, max: 999 },
    { id: 'crit', name: '급소 노리기', baseCost: 120, growth: 1.35, max: 45 },
  ];

  const CONST = {
    WAVE_KILLS: 10,          // 보스 등장까지 처치 수
    BOSS_TIME: 30,           // 보스 제한 시간(초)
    BOSS_GEMS: 10,           // 보스 처치 보석
    SUMMON_COST_1: 30,
    SUMMON_COST_10: 270,
    LEGEND_RATE: 0.03,       // 요원 호출: 전설(해결사) 확률
    PICKUP_LEGEND_RATE: 0.09, // 특별 채용(기간 한정): 전설 확률 3배
    MAX_STARS: 5,
    OFFLINE_CAP_SEC: 8 * 3600,
    OFFLINE_MIN_SEC: 60,
    OFFLINE_RATE: 0.5,       // 오프라인 효율 50%
    MAX_KILLS_PER_SEC: 2,    // 오프라인 계산 시 처치 속도 상한
    START_GEMS: 300,
    SAVE_VERSION: 1,
  };

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

  /** 요원 Lv 강화 비용 (현재 lv → lv+1) */
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
  function starNeed(stars) {
    const s = clampInt(stars, 1, CONST.MAX_STARS, 1);
    return s >= CONST.MAX_STARS ? Infinity : s * 2;
  }

  /* ---------- 5. 파티 / 오프라인 ---------- */

  /** 보유 요원 전체 DPS 합 */
  function partyDps(state) {
    let sum = 0;
    for (const id of Object.keys(state.heroes)) {
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
    return { sec, gold, kills };
  }

  /* ---------- 6. 소환 ---------- */

  /**
   * 소환 n회. rng() 는 [0,1) 난수 함수 (테스트에서 고정값 주입).
   * 전설은 legendRate(기본 LEGEND_RATE, 특별 채용은 PICKUP_LEGEND_RATE), 나머지는 시작 요원 4명 균등.
   * @returns {string[]} 뽑힌 요원 id 배열
   */
  function summon(n, rng, legendRate) {
    if (typeof rng !== 'function') throw new TypeError('rng 함수가 필요합니다');
    const lr = legendRate === undefined ? CONST.LEGEND_RATE : legendRate;
    if (!isNum(lr) || lr <= 0 || lr >= 1) throw new RangeError('전설 확률은 0 초과 1 미만이어야 합니다');
    const cnt = clampInt(n, 1, 100, 1);
    const out = [];
    for (let i = 0; i < cnt; i++) {
      const r = rng();
      if (!isNum(r) || r < 0 || r >= 1) throw new RangeError('rng 값은 0 이상 1 미만이어야 합니다');
      if (r < lr) { out.push('dark'); continue; }
      // 남은 구간을 4등분
      const t = (r - lr) / (1 - lr);
      out.push(STARTER_IDS[Math.min(STARTER_IDS.length - 1, Math.floor(t * STARTER_IDS.length))]);
    }
    return out;
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
      if (!h.owned) { h.owned = true; isNew.push(true); }
      else { h.shards += 1; isNew.push(false); }
    }
    return { state: next, isNew };
  }

  /**
   * 특별 채용 남은 시간(초): 매주 월요일 0시(기기 시간)에 새 기간이 시작된다.
   * @param {Date} now 현재 시각
   */
  function pickupRemainSec(now) {
    if (!(now instanceof Date) || !isNum(now.getTime())) return 0;
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());   // 오늘 0시
    const daysToMon = ((8 - next.getDay()) % 7) || 7;                         // 다음 월요일까지 일수 (월요일이면 7)
    next.setDate(next.getDate() + daysToMon);
    return Math.max(0, Math.floor((next - now) / 1000));
  }
  /** 초 → "6일 23시간" / "5시간 12분" */
  function formatRemain(sec) {
    if (!isNum(sec) || sec <= 0) return '0분';
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}일 ${h}시간`;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${Math.max(1, m)}분`;
  }

  /* ---------- 7. 상태 생성 / 저장 검증 ---------- */

  function newState(now) {
    const heroes = {};
    for (const h of HEROES) {
      heroes[h.id] = { owned: STARTER_IDS.includes(h.id), lv: 1, stars: 1, shards: 0 };
    }
    return {
      v: CONST.SAVE_VERSION,
      gold: 0,
      gems: CONST.START_GEMS,
      stage: 1,
      kills: 0,
      farming: false,     // 보스에게 진 뒤 반복 사냥 모드
      heroes,
      up: { atk: 0, gold: 0, crit: 0 },
      lastSeen: isNum(now) ? now : 0,
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
    s.gems   = isNum(raw.gems) && raw.gems >= 0 ? Math.floor(raw.gems) : base.gems;
    s.stage  = clampInt(raw.stage, 1, 1e6, 1);
    s.kills  = clampInt(raw.kills, 0, CONST.WAVE_KILLS, 0);
    s.farming = raw.farming === true;
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
    return s;
  }

  /** 저장 문자열 파싱. JSON 오류면 새 상태 */
  function loadFromString(str, now) {
    if (typeof str !== 'string' || !str) return { state: newState(now), ok: false };
    try { return { state: sanitize(JSON.parse(str), now), ok: true }; }
    catch (e) { return { state: newState(now), ok: false }; }
  }

  const Core = {
    HEROES, STARTER_IDS, UPGRADES, CONST, CRIT_DMG,
    isNum, clampInt, formatNum, formatDuration, heroById, upgradeById,
    stageLabel, enemyHp, enemyAtk, bossHp, bossAtk, killGold, bossGold,
    atkMult, goldMult, critChance, starMult, heroAtk, heroHp, heroDps,
    heroLvCost, heroLvCostBulk, heroLvAffordable, upgradeCost, starNeed,
    partyDps, offlineReward, summon, applySummon, pickupRemainSec, formatRemain,
    newState, cloneState, sanitize, loadFromString,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
