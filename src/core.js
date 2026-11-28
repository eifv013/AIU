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
  //            mark 표식(받는 피해 증가) / exorcise 근원체 특효 + 즉시 처리 / shield 보호막과 도발 / cage 격리 / execute 처형
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
    // ---------- 50명 확장 (0.26.0) ----------
    { id: 'patrol', name: '패트롤', kind: '사람', role: '순찰', type: '방어', grade: '희귀', baseAtk: 10, baseHp: 170, atkSpd: 1.0, range: 'melee',
      skill: { name: '경찰봉 제압', cd: 6, kind: 'single', mult: 4.5 } },
    { id: 'sniff', name: '스니프', kind: '사람', role: '추적', type: '지원', grade: '희귀', baseAtk: 8, baseHp: 95, atkSpd: 1.2, range: 'ranged',
      skill: { name: '냄새 추적', cd: 8, kind: 'mark', mult: 1.2, amp: 0.25, dur: 5 } },
    { id: 'rookie', name: '루키', kind: '사람', role: '신입', type: '공격', grade: '희귀', baseAtk: 10, baseHp: 90, atkSpd: 1.4, range: 'ranged',
      skill: { name: '연사', cd: 7, kind: 'multi', mult: 1.2, hits: 4 } },
    { id: 'flare', name: '플레어', kind: '사람', role: '조명', type: '광역', grade: '희귀', baseAtk: 9, baseHp: 85, atkSpd: 1.0, range: 'ranged',
      skill: { name: '조명탄', cd: 9, kind: 'aoe', mult: 2.5, rad: 160, slow: 2 } },
    { id: 'medic', name: '메딕', kind: '사람', role: '구급', type: '지원', grade: '희귀', baseAtk: 6, baseHp: 110, atkSpd: 0.9, range: 'ranged',
      skill: { name: '진통제', cd: 10, kind: 'buff', mult: 0.3, dur: 3, heal: 0.2 } },
    { id: 'bulwark', name: '불워크', kind: '사람', role: '경비', type: '방어', grade: '희귀', baseAtk: 9, baseHp: 200, atkSpd: 0.8, range: 'melee',
      skill: { name: '방패 벽', cd: 12, kind: 'shield', mult: 0.3, dur: 4 } },
    { id: 'wire', name: '와이어', kind: '사람', role: '덫', type: '지원', grade: '희귀', baseAtk: 9, baseHp: 95, atkSpd: 1.0, range: 'ranged',
      skill: { name: '와이어 덫', cd: 11, kind: 'cage', mult: 4, dur: 2 } },
    { id: 'tracer', name: '트레이서', kind: '사람', role: '추격', type: '공격', grade: '희귀', baseAtk: 12, baseHp: 120, atkSpd: 1.3, range: 'melee',
      skill: { name: '추격 베기', cd: 6, kind: 'single', mult: 5 } },
    { id: 'static', name: '스태틱', kind: '사람', role: '전기', type: '광역', grade: '희귀', baseAtk: 10, baseHp: 90, atkSpd: 0.9, range: 'ranged',
      skill: { name: '테이저 그물', cd: 9, kind: 'aoe', mult: 2.5, rad: 110, stun: 1 } },
    { id: 'crowbar', name: '크로우바', kind: '사람', role: '해체', type: '방어', grade: '희귀', baseAtk: 11, baseHp: 180, atkSpd: 0.9, range: 'melee',
      skill: { name: '지렛대 강타', cd: 8, kind: 'aoe', mult: 2.8, rad: 80, stun: 1.2 } },
    { id: 'lens', name: '렌즈', kind: '사람', role: '감식', type: '지원', grade: '희귀', baseAtk: 8, baseHp: 90, atkSpd: 1.1, range: 'ranged',
      skill: { name: '감식 조명', cd: 8, kind: 'mark', mult: 1.4, amp: 0.3, dur: 5 } },
    { id: 'hound', name: '하운드', kind: '사람', role: '사냥', type: '공격', grade: '희귀', baseAtk: 12, baseHp: 130, atkSpd: 1.2, range: 'melee',
      skill: { name: '물어뜯기', cd: 8, kind: 'execute', mult: 3, hits: 2, under: 0.25 } },
    { id: 'smoke', name: '스모크', kind: '사람', role: '연막', type: '광역', grade: '희귀', baseAtk: 9, baseHp: 95, atkSpd: 1.0, range: 'ranged',
      skill: { name: '연막탄', cd: 10, kind: 'aoe', mult: 2.2, rad: 180, slow: 3 } },
    { id: 'salt', name: '솔트', kind: '사람', role: '정화', type: '공격', grade: '희귀', baseAtk: 10, baseHp: 95, atkSpd: 1.1, range: 'ranged',
      skill: { name: '소금탄', cd: 9, kind: 'exorcise', mult: 4, low: 2, kill: 0.08 } },
    { id: 'viper', name: '바이퍼', kind: '사람', role: '독', type: '공격', grade: '영웅', baseAtk: 16, baseHp: 120, atkSpd: 1.3, range: 'melee',
      skill: { name: '독침', cd: 7, kind: 'multi', mult: 1.8, hits: 4 } },
    { id: 'thunder', name: '썬더', kind: '사람', role: '전격', type: '광역', grade: '영웅', baseAtk: 15, baseHp: 90, atkSpd: 0.8, range: 'ranged',
      skill: { name: '낙뢰', cd: 10, kind: 'aoe', mult: 4.5, rad: 140, stun: 0.8 } },
    { id: 'warden', name: '워든', kind: '사람', role: '교도관', type: '방어', grade: '영웅', baseAtk: 13, baseHp: 260, atkSpd: 0.8, range: 'melee',
      skill: { name: '봉쇄 진압', cd: 11, kind: 'shield', mult: 0.35, dur: 4 } },
    { id: 'chapel', name: '채플', kind: '사람', role: '성직', type: '지원', grade: '영웅', baseAtk: 9, baseHp: 120, atkSpd: 0.9, range: 'ranged',
      skill: { name: '축복', cd: 11, kind: 'buff', mult: 0.5, dur: 5, heal: 0.35 } },
    { id: 'frost', name: '프로스트', kind: '사람', role: '냉각', type: '광역', grade: '영웅', baseAtk: 14, baseHp: 95, atkSpd: 0.8, range: 'ranged',
      skill: { name: '액체 질소', cd: 10, kind: 'aoe', mult: 3.5, rad: 200, slow: 4 } },
    { id: 'raven', name: '레이븐', kind: '사람', role: '정찰', type: '공격', grade: '영웅', baseAtk: 16, baseHp: 100, atkSpd: 1.5, range: 'ranged',
      skill: { name: '까마귀 떼', cd: 8, kind: 'multi', mult: 1.5, hits: 6 } },
    { id: 'anchor', name: '앵커', kind: '사람', role: '잠수', type: '방어', grade: '영웅', baseAtk: 14, baseHp: 240, atkSpd: 0.8, range: 'melee',
      skill: { name: '닻 내리기', cd: 9, kind: 'aoe', mult: 3.5, rad: 100, stun: 1.5 } },
    { id: 'cipher', name: '사이퍼', kind: '사람', role: '해독', type: '지원', grade: '영웅', baseAtk: 12, baseHp: 100, atkSpd: 1.1, range: 'ranged',
      skill: { name: '약점 해독', cd: 9, kind: 'mark', mult: 2, amp: 0.4, dur: 6 } },
    { id: 'jackal', name: '재칼', kind: '사람', role: '추적자', type: '공격', grade: '영웅', baseAtk: 17, baseHp: 140, atkSpd: 1.2, range: 'melee',
      skill: { name: '사냥 개시', cd: 8, kind: 'execute', mult: 3.5, hits: 3, under: 0.3 } },
    { id: 'mirror', name: '미러', kind: '사람', role: '거울', type: '지원', grade: '영웅', baseAtk: 13, baseHp: 110, atkSpd: 1.0, range: 'ranged',
      skill: { name: '거울 감옥', cd: 11, kind: 'cage', mult: 5, dur: 3 } },
    { id: 'inferno', name: '인페르노', kind: '사람', role: '화염방사', type: '광역', grade: '영웅', baseAtk: 16, baseHp: 130, atkSpd: 0.7, range: 'aoe',
      skill: { name: '화염 방사', cd: 9, kind: 'aoe', mult: 4, rad: 130 } },
    { id: 'saint', name: '세인트', kind: '사람', role: '퇴마', type: '공격', grade: '영웅', baseAtk: 15, baseHp: 110, atkSpd: 1.0, range: 'ranged',
      skill: { name: '성수탄', cd: 9, kind: 'exorcise', mult: 6, low: 3, kill: 0.1 } },
    { id: 'dozer', name: '도저', kind: '사람', role: '장갑', type: '방어', grade: '영웅', baseAtk: 12, baseHp: 300, atkSpd: 0.7, range: 'melee',
      skill: { name: '장갑 돌진', cd: 8, kind: 'single', mult: 6 } },
    { id: 'pulse', name: '펄스', kind: '사람', role: '의료', type: '지원', grade: '영웅', baseAtk: 8, baseHp: 130, atkSpd: 0.9, range: 'ranged',
      skill: { name: '심박 회복', cd: 10, kind: 'buff', mult: 0.3, dur: 4, heal: 0.45 } },
    { id: 'vortex', name: '볼텍스', kind: '사람', role: '중력', type: '광역', grade: '영웅', baseAtk: 15, baseHp: 100, atkSpd: 0.8, range: 'ranged',
      skill: { name: '중력장', cd: 11, kind: 'aoe', mult: 3.5, rad: 220, stun: 1 } },
    { id: 'judge', name: '저지', kind: '사람', role: '심판', type: '공격', grade: '전설', baseAtk: 34, baseHp: 200, atkSpd: 0.9, range: 'ranged',
      skill: { name: '최종 판결', cd: 9, kind: 'execute', mult: 5, hits: 2, under: 0.35 } },
    { id: 'aegis', name: '이지스', kind: '사람', role: '방호', type: '방어', grade: '전설', baseAtk: 20, baseHp: 450, atkSpd: 0.8, range: 'melee',
      skill: { name: '절대 방벽', cd: 12, kind: 'shield', mult: 0.5, dur: 6 } },
    { id: 'oracle', name: '오라클', kind: '사람', role: '예지', type: '지원', grade: '전설', baseAtk: 24, baseHp: 230, atkSpd: 0.9, range: 'ranged',
      skill: { name: '예지', cd: 11, kind: 'buff', mult: 0.8, dur: 6, heal: 0.4 } },
    { id: 'eclipse', name: '이클립스', kind: '사람', role: '일식', type: '광역', grade: '전설', baseAtk: 30, baseHp: 210, atkSpd: 0.8, range: 'ranged',
      skill: { name: '일식', cd: 10, kind: 'aoe', mult: 8, rad: 260 } },
    { id: 'reaper', name: '리퍼', kind: '사람', role: '수확', type: '공격', grade: '전설', baseAtk: 38, baseHp: 190, atkSpd: 1.2, range: 'melee',
      skill: { name: '사신의 낫', cd: 8, kind: 'aoe', mult: 6, rad: 120 } },
    { id: 'vault', name: '볼트', kind: '사람', role: '봉인', type: '지원', grade: '전설', baseAtk: 27, baseHp: 250, atkSpd: 0.8, range: 'ranged',
      skill: { name: '봉인 금고', cd: 11, kind: 'cage', mult: 7, dur: 4 } },
    { id: 'phantom', name: '팬텀', kind: '사람', role: '환영', type: '공격', grade: '전설', baseAtk: 35, baseHp: 175, atkSpd: 1.4, range: 'melee',
      skill: { name: '환영 난무', cd: 8, kind: 'multi', mult: 3, hits: 6 } },
    { id: 'titan', name: '타이탄', kind: '사람', role: '거인', type: '방어', grade: '전설', baseAtk: 22, baseHp: 480, atkSpd: 0.7, range: 'melee',
      skill: { name: '대지 진동', cd: 11, kind: 'aoe', mult: 4, rad: 160, stun: 2 } },
    { id: 'exorcist', name: '엑소시스트', kind: '사람', role: '대퇴마', type: '광역', grade: '전설', baseAtk: 31, baseHp: 220, atkSpd: 0.8, range: 'ranged',
      skill: { name: '대퇴마', cd: 10, kind: 'exorcise', mult: 10, low: 5, kill: 0.2 } },
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
    BOSS_GEMS: 5,            // 근원체 처치 보석 (조금씩. 보석은 임무, 패스, 상점이 주 공급원)
    /* 뽑기 세 가지
     * - 요원 호출: 호출권으로 뽑음(전투에서 계속 쌓임). 소환 레벨은 여기서만 오르고, 희귀 요원은 여기서만 나옴
     * - 정예 호출: 보석(또는 정예 호출권). 희귀 없이 영웅 이상, 전설 2%. 소환 레벨과 상관없음
     * - 특별 채용: 보석(또는 정예 호출권). 소환 레벨 3부터 열림(세나 키우기 픽업과 같음). 전설 2%는 모두 그 기간의 전설,
     *   누적 RELAY 회째에 그 전설 확정 */
    CALL_COST: 1,            // 요원 호출 1회 = 호출권 1장
    SUMMON_MAX: 1000,        // 한 번에 호출할 수 있는 최대 횟수 (최대 호출)
    PREMIUM_COST: 150,       // 정예 호출, 특별 채용 1회 = 보석 150 (10회 1,500)
    PREMIUM_LEGEND: 0.005,   // 정예 호출, 특별 채용 전설 확률 0.5% (특별 채용은 200회 확정이 따로 있음)
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
    // 스테이지마다 10%씩 (예전 15%는 80스테이지쯤 이상체 한 마리가 수사력 강화 몇 번 값이라 너무 많았음)
    return 3 * Math.pow(1.10, clampInt(stage, 1, 1e6, 1) - 1) * goldMult(goldLv);
  }
  function bossGold(stage, goldLv) { return killGold(stage, goldLv) * 10; }
  /** 요원 경험치 (요원 레벨업 재화, 세나 키우기 영웅 경험치와 같음). 골드는 훈련소에만 씀 */
  // 스테이지마다 8%씩 (예전 15%는 이상체 한 마리가 요원 1레벨 값이었음)
  function killExp(stage) { return 2 * Math.pow(1.08, clampInt(stage, 1, 1e6, 1) - 1); }
  function bossExp(stage) { return killExp(stage) * 10; }

  /* ---------- 4. 성장 공식 ---------- */

  function atkMult(atkLv)   { return 1 + 0.1 * clampInt(atkLv, 0, 1e6, 0); }
  function goldMult(goldLv) { return 1 + 0.1 * clampInt(goldLv, 0, 1e6, 0); }
  /** 치명타 확률(0~0.5). 기본 5% + 레벨당 1% */
  function critChance(critLv) { return Math.min(0.5, 0.05 + 0.01 * clampInt(critLv, 0, 1e6, 0)); }
  const CRIT_DMG = 2;

  /** 별(★) 배율: ★1=1, ★2=1.5, ★3=2 ... */
  /* 각성: 전설 요원이 ★5 다음에 한 번 더 올라가는 단계 (등급 표시도 '각성'으로). 내부적으로는 ★6 */
  const AWAKE_STAR = 6, AWAKE_NEED = 10;
  function starMult(stars) { const s = clampInt(stars, 1, AWAKE_STAR, 1); return s >= AWAKE_STAR ? 4.2 : 1 + 0.5 * (s - 1); }
  const maxStars = grade => grade === '전설' ? AWAKE_STAR : CONST.MAX_STARS;
  /** 화면에 보일 등급 (각성한 전설은 '각성') */
  function heroGrade(state, id) { const h = heroById(id), d = state.heroes[id]; return h.grade === '전설' && d && d.stars >= AWAKE_STAR ? '각성' : h.grade; }

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
  /** 요원 레벨 상한: ★1 100, 별마다 +50 (★5 300, 각성 350). 초반 스테이지는 막지 않고, 후반에 승급이 필요해지게 */
  // 고정 상한은 후반에 스테이지를 막아서 없앰 (레벨 비용이 점점 커지는 것으로 속도를 조절). 함수는 남겨 둠
  function heroLvCap(stars) { return 99999; }
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
  /* ---------- 수사력 단계 (세나 키우기 영향력처럼) ----------
   * 단계마다 강화 상한이 있음 (사격, 협상은 단계 x10, 급소는 단계 x3). 세 가지를 모두 상한까지 올리면
   * 골드를 내고 다음 단계로 승급, 상한이 올라가고 보석 보상 */
  const TSTEP = { LV: 10, CRIT: 3, COST: 3000, GROW: 1.7, BONUS: 0.05 };   // BONUS: 단계마다 팀 공격력, 체력 +5%
  function tstepOf(state) { return clampInt(state && state.tstep, 1, 9999, 1); }
  /** 현재 단계에서 이 강화의 상한 레벨 */
  function upCap(state, id) { const u = upgradeById(id), t = tstepOf(state); return Math.min(u.max, t * (id === 'crit' ? TSTEP.CRIT : TSTEP.LV)); }
  /** 단계 상한을 반영한 강화 비용 (상한이면 Infinity) */
  function upCost(state, id, lv) { return lv >= upCap(state, id) ? Infinity : upgradeCost(id, lv); }
  /** 단계 진행: 현재 단계 안에서 올린 수 / 필요한 수 */
  function tstepProg(state) {
    const t = tstepOf(state); let cur = 0, need = 0;
    for (const u of UPGRADES) { const cap = upCap(state, u.id), lo = Math.min(cap, (t - 1) * (u.id === 'crit' ? TSTEP.CRIT : TSTEP.LV)); need += cap - lo; cur += Math.max(0, Math.min(cap, state.up[u.id]) - lo); }
    return { cur, need, ready: UPGRADES.every(u => state.up[u.id] >= upCap(state, u.id)) };
  }
  function tstepCost(state) { return Math.floor(TSTEP.COST * Math.pow(TSTEP.GROW, tstepOf(state) - 1)); }
  /** 단계 승급. 상태를 바꾸고 받은 보석 수 반환 */
  function tstepUp(state) {
    if (!tstepProg(state).ready) throw new RangeError('세 가지 강화를 모두 상한까지 올려야 해요');
    const c = tstepCost(state); if (state.gold < c) throw new RangeError('골드가 부족해요');
    state.gold -= c; state.tstep = tstepOf(state) + 1;
    return TSTEP.BONUS;   // 보석은 주지 않음. 단계마다 팀 공격력과 체력이 영구로 오름
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
  const STAR_NEED = { 희귀: [10, 30, 80, 200], 영웅: [5, 15, 40, 100], 전설: [2, 4, 8, 15] }   // 전설도 승급마다 복사본이 꽤 필요 (예전 1,2,3,5는 너무 쉬웠음);
  function starNeed(stars, grade = '희귀') {
    const mx = maxStars(grade), s = clampInt(stars, 1, mx, 1);
    if (s >= mx) return Infinity;
    if (s === CONST.MAX_STARS) return AWAKE_NEED;   // 전설 ★5 → 각성
    const t = STAR_NEED[grade] || STAR_NEED['희귀'];
    return t[s - 1];
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
  /* ---------- 핵심 버프: 출전 요원 유형 조합 (세나 키우기 편성 핵심 버프처럼) ---------- */
  const SYNERGY = [
    { type: '공격', need: [2, 3], text: n => `공격력 +${n * 10}%`, atk: [0.1, 0.2] },
    { type: '광역', need: [2, 3], text: n => `공격력 +${n * 8}%`, atk: [0.08, 0.16] },
    { type: '방어', need: [2, 3], text: n => `체력 +${n * 15}%`, hp: [0.15, 0.3] },
    { type: '지원', need: [2, 3], text: n => `기술 재사용 -${n * 10}%`, cd: [0.1, 0.2] },
  ];
  /** 현재 편성의 핵심 버프. lines 는 화면 표시용 (유형, 인원, 단계, 문구) */
  function synergy(state) {
    const cnt = {}; for (const id of partyIds(state)) { const h = heroById(id); cnt[h.type] = (cnt[h.type] || 0) + 1; }
    const out = { atk: 1, hp: 1, cd: 1, lines: [] };
    for (const r of SYNERGY) {
      const n = cnt[r.type] || 0, lv = r.need.filter(k => n >= k).length;
      out.lines.push({ type: r.type, n, lv, next: r.need[lv] || null, text: r.text(Math.max(1, lv)) });
      if (!lv) continue;
      if (r.atk) out.atk += r.atk[lv - 1]; if (r.hp) out.hp += r.hp[lv - 1]; if (r.cd) out.cd -= r.cd[lv - 1];
    }
    const all = TYPES.every(t => cnt[t]);
    out.lines.push({ type: '전체', n: TYPES.filter(t => cnt[t]).length, lv: all ? 1 : 0, next: all ? null : 4, text: '공격력 +10%, 체력 +10%' });
    if (all) { out.atk += 0.1; out.hp += 0.1; }
    return out;
  }

  /* ---------- 가방: 시간 보급품 (쓰면 그 시간만큼 사냥한 보상) ---------- */
  const ITEMS = { g2: { name: '골드 보급품', sub: '2시간 사냥 골드', key: 'gold' }, e2: { name: '경험치 보급품', sub: '2시간 사냥 경험치', key: 'exp' } };
  /* ---------- 상점과 광고 자리 (결제, 광고는 출시 전에 실제 연결. 지금은 무료 상품과 광고 보상만 동작) ---------- */
  const SHOP = {
    // 일일 상점 (세나 키우기 일일 상점): 9칸, 매일 0시 초기화. tag는 칸 왼쪽 위 띠
    daily: [
      { id: 'free1', name: '일일 무료 패키지', rw: { tix: 5, gems: 20 }, pay: 'ad', lim: 1, tag: 'Event' },
      { id: 'gem2', name: '일일 정예 호출권', rw: { ptix: 1 }, pay: 'gems', cost: 300, lim: 2, tag: 'Hot' },
      { id: 'gem1', name: '일일 보급품 꾸러미', rw: { g2: 2, e2: 2 }, pay: 'gems', cost: 100, lim: 3, tag: 'Hot' },
      { id: 'd_tix', name: '일일 호출권 상자', rw: { tix: 30 }, pay: 'gems', cost: 60, lim: 5 },
      { id: 'd_gold', name: '일일 골드 주머니', rw: { gold: 50000 }, pay: 'gems', cost: 50, lim: 5 },
      { id: 'd_exp', name: '일일 경험치 꾸러미', rw: { exp: 20000 }, pay: 'gems', cost: 50, lim: 5 },
      { id: 'gem3', name: '일일 구급상자 묶음', rw: { med: 20 }, pay: 'gems', cost: 80, lim: 3 },
      { id: 'd_g2', name: '일일 수사 장비', rw: { g2: 5 }, pay: 'gems', cost: 120, lim: 1 },
      { id: 'd_e2', name: '일일 분석 키트', rw: { e2: 5 }, pay: 'gems', cost: 120, lim: 1 },
    ],
    // 상점 탭 일일 광고 상점: 광고 한 편에 한 번
    ad: [
      { id: 'ad1', name: '보석 30개', rw: { gems: 30 }, pay: 'ad', lim: 3 },
      { id: 'ad2', name: '호출권 10장', rw: { tix: 10 }, pay: 'ad', lim: 2 },
      { id: 'ad3', name: '구급상자 10개', rw: { med: 10 }, pay: 'ad', lim: 2 },
      { id: 'ad4', name: '골드 3만', rw: { gold: 30000 }, pay: 'ad', lim: 2 },
      { id: 'ad5', name: '경험치 1만', rw: { exp: 10000 }, pay: 'ad', lim: 2 },
      { id: 'ad6', name: '수사 장비 2개', rw: { g2: 2 }, pay: 'ad', lim: 2 },
    ],
    // 상점 탭 보석 상점: 보석으로 사는 묶음 (매일 초기화)
    gshop: [
      { id: 'gs_tix', name: '호출권 100장', rw: { tix: 100 }, pay: 'gems', cost: 180, lim: 5, tag: 'Hot' },
      { id: 'gs_ptix', name: '정예 호출권 10장', rw: { ptix: 10 }, pay: 'gems', cost: 2700, lim: 1 },
      { id: 'gs_med', name: '구급상자 50개', rw: { med: 50 }, pay: 'gems', cost: 180, lim: 5 },
    ],
    packs: [
      { id: 'p_new', name: '신입 수사관 환영 패키지', sub: '한 번만 살 수 있어요', rw: { gems: 1000, ptix: 5, tix: 50 }, price: 1100, tag: '추천' },
      { id: 'p_lv', name: '소환 레벨 지원 패키지', sub: '호출권을 넉넉하게', rw: { tix: 300, gems: 500 }, price: 9900, tag: '인기' },
      { id: 'p_ptix', name: '정예 호출 지원 패키지', sub: '정예 호출권을 한 번에', rw: { ptix: 30, gems: 1000 }, price: 14900, tag: 'Hot' },
    ],
    gems: [[60, 1200], [300, 5900], [650, 12000], [1350, 25000], [2800, 49000], [6000, 99000]],
  };
  /** 오늘 산 횟수 (날이 바뀌면 0) */
  function shopCount(state, id, now) {
    const k = dayKey(now); if (state.shop.day !== k) { state.shop.day = k; state.shop.n = {}; }
    return state.shop.n[id] || 0;
  }
  /* ---------- 유료 보석과 무료 보석 (세나 키우기 유료/무료 루비처럼). 쓸 때는 유료 보석부터 ---------- */
  const gemTotal = state => (state.gems || 0) + (state.pgems || 0);
  function spendGems(state, n) {
    if (gemTotal(state) < n) throw new RangeError('보석이 부족해요');
    const a = Math.min(state.pgems || 0, n); state.pgems -= a; state.gems -= n - a; return n;
  }
  /* 첫 결제 보너스: 처음 결제한 날부터 3일 동안 하루에 한 번 */
  const FIRST_PAY = [{ gems: 300, tix: 20 }, { ptix: 3, g2: 3 }, { gems: 500, med: 30 }];
  function firstPayStart(state, now) { if (!state.fp.start) state.fp.start = dayKey(now); }
  /** 받을 수 있는 날 번호 (0,1,2) 또는 -1 */
  function firstPayReady(state, now) {
    if (!state.fp.start) return -1;
    const d0 = new Date(state.fp.start + 'T00:00:00'), d = new Date(dayKey(now) + 'T00:00:00');
    const day = Math.round((d - d0) / 864e5);
    for (let i = 0; i <= Math.min(day, 2); i++) if (!state.fp.got.includes(i)) return i;
    return -1;
  }
  function firstPayClaim(state, now) { const i = firstPayReady(state, now); if (i < 0) return null; state.fp.got.push(i); giveReward(state, FIRST_PAY[i]); return FIRST_PAY[i]; }

  /** 무료, 광고, 보석 상품 사기. 실제 돈 결제(packs, gems)는 여기서 하지 않음 */
  const shopItem = id => SHOP.daily.find(x => x.id === id) || SHOP.ad.find(x => x.id === id) || SHOP.gshop.find(x => x.id === id);
  function shopBuy(state, id, now) {
    const it = shopItem(id); if (!it) throw new RangeError('살 수 없는 상품이에요');
    if (shopCount(state, id, now) >= it.lim) throw new RangeError('오늘은 다 샀어요');
    if (it.pay === 'gems') spendGems(state, it.cost);
    state.shop.n[id] = (state.shop.n[id] || 0) + 1;
    // 일일 상점에서 산 날은 누적 구매일 1일 (하루에 한 번만, 최대 7일)
    if (SHOP.daily.includes(it)) { const k = dayKey(now); if (state.sk.day !== k && state.sk.n < STREAK.length) { state.sk.day = k; state.sk.n++; } }
    giveReward(state, it.rw); return it.rw;
  }
  /* ---------- 일일 상점 누적 구매일 보상 (세나 키우기 누적 구매일 1일차 ~ 7일차) ---------- */
  const STREAK = [{ tix: 30 }, { gems: 200 }, { gems: 300 }, { ptix: 1 }, { gems: 400 }, { gems: 500 }, { ptix: 3 }];
  /** i일차 보상 받기. 누적 구매일이 모자라거나 이미 받았으면 null */
  function streakClaim(state, i) {
    if (!Number.isInteger(i) || i < 0 || i >= STREAK.length || i >= state.sk.n || state.sk.got.includes(i)) return null;
    state.sk.got.push(i); giveReward(state, STREAK[i]);
    if (state.sk.got.length >= STREAK.length) state.sk = { n: 0, day: state.sk.day, got: [] };   // 7일차까지 받으면 처음부터
    return STREAK[i];
  }
  /* ---------- 재화 탭 골드 충전: 보석으로 사는 월간 한정 골드 (한 달에 한 번씩) ---------- */
  const GOLD_PACKS = [[100000, 15], [440000, 44], [990000, 99], [2900000, 290], [4900000, 490], [9900000, 990]].map(([gold, cost], i) => ({ id: 'mg' + i, gold, cost }));
  function goldPackCount(state, id, now) { const m = monthKey(now); if (state.shopM.m !== m) state.shopM = { m, n: {} }; return state.shopM.n[id] || 0; }
  function goldPackBuy(state, id, now) {
    const pk = GOLD_PACKS.find(x => x.id === id); if (!pk) throw new RangeError('살 수 없는 상품이에요');
    if (goldPackCount(state, id, now) >= 1) throw new RangeError('이번 달에는 다 샀어요');
    spendGems(state, pk.cost); state.shopM.n[id] = 1; state.gold += pk.gold; return { gold: pk.gold };
  }
  /* ---------- 정기권 (세나 키우기 주간 정액, 월정액): 사면 바로 보상, 기간 동안 매일 보상. 다시 사면 기간이 더해짐 ---------- */
  const PLANS = [
    { id: 'w_sum', kind: 'week', name: '매일 호출권 주간 혜택', price: 25000, days: 7, now: { gems: 2500 }, daily: { tix: 100, ptix: 3 },
      perks: ['7일간 매일 호출권 100장, 모두 700장', '7일간 매일 정예 호출권 3장, 모두 21장', '사자마자 보석 2,500개'] },
    { id: 'p_noad', kind: 'month', name: '광고 제거 월정액', price: 7500, days: 28, now: { gems: 750 }, daily: { gems: 100 },
      perks: ['28일간 광고를 보지 않고 모든 광고 보상', '28일간 접속하면 매일 보석 100개', '사자마자 보석 750개'] },
    { id: 'p_month', kind: 'month', name: '골드 버프 월정액', price: 7500, days: 28, now: { gems: 750 }, daily: { gems: 100 }, gold: 0.3,
      perks: ['28일간 골드 획득 30% 증가', '28일간 접속하면 매일 보석 100개', '사자마자 보석 750개'] },
  ];
  const planById = id => PLANS.find(p => p.id === id);
  const dayNum = k => Math.round(new Date(k + 'T00:00:00') / 864e5);
  /** 남은 날 (오늘 포함). 없으면 0 */
  function planLeft(state, id, now) { const e = state.plans[id] && state.plans[id].end; return e ? Math.max(0, dayNum(e) - dayNum(dayKey(now)) + 1) : 0; }
  /** 결제가 끝난 뒤 호출: 기간 더하고 바로 보상 */
  function planBuy(state, id, now) {
    const pl = planById(id); if (!pl) throw new RangeError('살 수 없는 상품이에요');
    const left = planLeft(state, id, now), base = dayNum(dayKey(now)) + left;
    const end = new Date((base + pl.days - 1) * 864e5); const ek = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    state.plans[id] = { end: ek, got: (state.plans[id] && state.plans[id].got) || '' };
    giveReward(state, pl.now); return pl.now;
  }
  /** 오늘 몫 받기. 기간이 아니거나 오늘 받았으면 null */
  function planClaim(state, id, now) {
    const pl = planById(id), k = dayKey(now); if (!pl || planLeft(state, id, now) <= 0 || state.plans[id].got === k) return null;
    state.plans[id].got = k; giveReward(state, pl.daily); return pl.daily;
  }
  /** 광고 보상 골드 버프: 8시간 동안 골드 +10% (만료 시각 ms) */
  const AD_BUFF_MS = 8 * 3600e3;
  function adBuffOn(state, nowMs) { return (state.adBuff || 0) > nowMs; }

  /* 수사 패스: 스테이지 단계마다 무료 보상 + 유료(패스 구매) 보상 */
  const PASS = [5, 10, 15, 20, 30, 40, 50, 60, 80, 100].map((st, i) => ({ st, free: i % 2 ? { tix: 10 } : { gems: 50 }, paid: i % 3 === 2 ? { ptix: 2 } : { gems: 200 } }));
  const PASS_PRICE = 9900;
  /* ---------- 성장 패스 여러 개 (세나 키우기 성장 패스들처럼): 기준 값에 닿을 때마다 무료 보상, 패스를 사면 추가 보상 ---------- */
  const mkSteps = (vals, f, pd) => vals.map((v, i) => ({ v, free: f(i), paid: pd(i) }));
  const PASSES = {
    level: { name: '팀 레벨 패스', unit: '레벨', desc: '수사팀 레벨이 오를 때마다 받아요.', price: 9900, val: s => s.acc.lv,
      steps: mkSteps([3, 5, 8, 10, 13, 15, 18, 20, 25, 30, 35, 40], i => i % 2 ? { tix: 20 } : { gems: 60 }, i => i % 3 === 2 ? { ptix: 3 } : { gems: 300 }) },
    summon: { name: '호출 패스', unit: '회', desc: '요원 호출 누적 횟수로 받아요.', price: 9900, val: s => s.pulls.total,
      steps: mkSteps([30, 60, 100, 150, 200, 300, 400, 500, 700, 1000, 1500, 2000], i => i % 2 ? { tix: 30 } : { gems: 80 }, i => i % 2 ? { ptix: 3 } : { gems: 400 }) },
    rift: { name: '균열 패스', unit: '층', desc: '균열 심층을 돌파한 층수로 받아요.', price: 9900, val: s => s.tower,
      steps: mkSteps([5, 10, 15, 20, 30, 40, 50, 60, 80, 100, 130, 160], i => i % 2 ? { med: 20 } : { gems: 80 }, i => i % 3 === 2 ? { ptix: 3 } : { gems: 400 }) },
  };
  const pxVal = (state, id) => PASSES[id].val(state) || 0;
  function pxClaim(state, id, i, track) {
    const P = PASSES[id], r = P && P.steps[i], x = state.px[id]; if (!r || pxVal(state, id) < r.v) return null;
    if (track === 'paid' && !x.paid) return null;
    const got = x[track === 'paid' ? 'p' : 'f']; if (got.includes(i)) return null;
    got.push(i); const w = r[track === 'paid' ? 'paid' : 'free']; giveReward(state, w); return w;
  }
  function pxReady(state, id) { const P = PASSES[id], x = state.px[id], v = pxVal(state, id), out = []; P.steps.forEach((r, i) => { if (v < r.v) return; if (!x.f.includes(i)) out.push([i, 'free']); if (x.paid && !x.p.includes(i)) out.push([i, 'paid']); }); return out; }
  function pxBuy(state, id) { if (!PASSES[id]) throw new RangeError('없는 패스예요'); state.px[id].paid = true; }
  function passClaim(state, i, track) {
    const r = PASS[i]; if (!r || state.stage < r.st) return null;
    if (track === 'paid' && !state.pass.paid) return null;
    const got = state.pass[track === 'paid' ? 'p' : 'f']; if (got.includes(i)) return null;
    got.push(i); giveReward(state, r[track === 'paid' ? 'paid' : 'free']); return r[track === 'paid' ? 'paid' : 'free'];
  }
  /** 받을 수 있는 패스 보상 모두 */
  function passReady(state) { const out = []; PASS.forEach((r, i) => { if (state.stage < r.st) return; if (!state.pass.f.includes(i)) out.push([i, 'free']); if (state.pass.paid && !state.pass.p.includes(i)) out.push([i, 'paid']); }); return out; }

  /** 편성 프리셋 바꾸기: 현재 편성을 지금 칸에 저장하고, 고른 칸의 편성을 불러옴 (빈 칸이면 현재 편성 그대로) */
  function switchPreset(state, i) {
    const k = clampInt(i, 0, 2, 0);
    state.pre[state.preI] = partyIds(state).slice();
    state.preI = k;
    if (state.pre[k] && state.pre[k].length) state.party = state.pre[k].slice();
    state.party = partyIds(state);
    return state.party;
  }
  function useItem(state, id, n = 1) {
    const it = ITEMS[id]; const k = clampInt(n, 1, 999, 1);
    if (!it || (state.bag[id] || 0) < k) return null;
    // 보급품: 현재 스테이지에서 2시간 사냥한 만큼 (팀이 약해도 최소 20초에 1마리 기준, 세나 키우기 보급품처럼 스테이지 기준)
    const rate = Math.max(0.05, Math.min(CONST.MAX_KILLS_PER_SEC, partyDps(state) / enemyHp(state.stage)));
    const kills = rate * 7200, per = it.key === 'gold' ? killGold(state.stage, state.up.gold) : killExp(state.stage);
    const v = Math.max(1, Math.floor(kills * per)) * k;
    state.bag[id] -= k; state[it.key] += v;
    return { [it.key]: v };
  }

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
  /** 현재 재화로 한 번에 호출할 수 있는 최대 횟수 (정예 호출권이 있으면 그것만, 없으면 보석) */
  function summonMaxN(state, kind) {
    const m = kind === 'call' ? Math.floor(state.tix / CONST.CALL_COST) : state.ptix > 0 ? state.ptix : Math.floor(gemTotal(state) / CONST.PREMIUM_COST);
    return Math.max(0, Math.min(CONST.SUMMON_MAX, m));
  }
  function doSummon(state, n, kind, rng) {
    if (!['call', 'elite', 'pickup'].includes(kind)) throw new TypeError('뽑기 종류가 올바르지 않습니다: ' + kind);
    // 1회, 10회, 30회, 최대(가진 만큼, 1000회까지) 모두 받음. 정수가 아니거나 범위 밖이면 오류
    if (!Number.isInteger(n) || n < 1 || n > CONST.SUMMON_MAX) throw new RangeError(`호출 횟수는 1에서 ${CONST.SUMMON_MAX} 사이여야 합니다`);
    const cnt = n;
    const lv0 = summonLevel(state.pulls.total);
    if (kind === 'pickup' && lv0 < CONST.PICKUP_OPEN_LV) throw new RangeError(`특별 채용은 소환 레벨 ${CONST.PICKUP_OPEN_LV}부터 열립니다`);
    let paid;
    if (kind === 'call') { if (state.tix < cnt * CONST.CALL_COST) throw new RangeError('호출권이 부족해요'); paid = 'tix'; }
    else if (state.ptix >= cnt) paid = 'ptix';
    else if (gemTotal(state) >= cnt * CONST.PREMIUM_COST) paid = 'gems';
    else throw new RangeError('보석이 부족해요');
    const ids = [];
    let total = state.pulls.total, relay = state.pulls.relay, relayHit = false;
    for (let i = 0; i < cnt; i++) {
      let id;
      if (kind === 'call') { id = summon(1, rng, summonLevel(total))[0]; }
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
      ids.push(id); total++;   // 요원 호출, 정예 호출, 특별 채용 모두 소환 레벨에 쌓임
    }
    const res = applySummon(state, ids), st = res.state;
    if (paid === 'tix') st.tix -= cnt * CONST.CALL_COST; else if (paid === 'ptix') st.ptix -= cnt; else spendGems(st, cnt * CONST.PREMIUM_COST);
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
  /* 요원 도감: 요원 레벨 10마다 한 번씩 보석 (세나 키우기 영웅 도감 달성 보상처럼) */
  const CODEX_STEP = 10, CODEX_TIERS = 10;
  const codexGems = tier => 20 * tier;
  /** 다음에 받을 단계 (모두 받았으면 null) */
  function codexNext(state, id) {
    const d = state.heroes[id]; if (!d || !d.owned) return null;
    const t = (state.cdx[id] || 0) + 1; if (t > CODEX_TIERS) return null;
    return { tier: t, lv: t * CODEX_STEP, ready: d.lv >= t * CODEX_STEP, gems: codexGems(t) };
  }
  /** 받을 수 있는 도감 보상을 모두 받기. 받은 보석 수 */
  function codexClaim(state, only) {
    let g = 0;
    for (const h of HEROES) {
      if (only && h.id !== only) continue;
      let n;
      while ((n = codexNext(state, h.id)) && n.ready) { state.cdx[h.id] = n.tier; g += n.gems; }
    }
    state.gems += g; return g;
  }
  /* 우편함: 운영 선물 (받으면 끝) */
  const MAILS = [
    { id: 'welcome', from: 'AIU 본부', title: '신입 수사관 환영 선물', rw: { gems: 300 } },
    { id: 'u033', from: 'AIU 본부', title: '상점 개편 기념 선물', rw: { tix: 30, gems: 200 } },
    { id: 'rain', from: '나이트폴', title: '비 오는 날의 보급품', rw: { ptix: 1 } },
    { id: 'supply', from: 'AIU 본부', title: '현장 보급품 지급', rw: { g2: 3, e2: 3 } },
    { id: 'medkit', from: '헤일로', title: '구급상자 보급', rw: { med: 30 } },
  ];
  function mailClaim(state, id) {
    const m = MAILS.find(x => x.id === id);
    if (!m || state.mail.includes(id)) return null;
    state.mail.push(id); giveReward(state, m.rw); return m.rw;
  }
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
    for (const k of Object.keys(ITEMS)) if (r[k]) state.bag[k] = (state.bag[k] || 0) + r[k];
    if (r.med) state.med = (state.med || 0) + clampInt(r.med, 0, 1e6, 0);   // 구급상자
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
    if (best < 1) throw new RangeError('첫 클리어 후 소탕할 수 있어요');
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
    if (state.mis) state.mis.m.pts += MIS_PT_DAILY;
    return m.gems;
  }
  /** 모두 받았으면 보너스 (정예 호출권) */
  function missionBonus(state) {
    if (state.daily.bonus || state.daily.got.length < MISSIONS.length) return 0;
    state.daily.bonus = true; state.ptix += CONST.MISSION_BONUS_PTIX;
    return CONST.MISSION_BONUS_PTIX;
  }
  /* ---------- 주간, 월간, 반복 임무 + 임무 패스 (세나 키우기 미션 창처럼) ----------
   * 주간은 월요일 0시, 월간은 1일 0시에 새로 시작. 반복은 끝없이 다시 받음.
   * 일일, 주간, 월간 임무를 받으면 임무 점수가 쌓이고, 점수로 임무 패스 단계가 오름 (매달 새로) */
  const WEEKLY = [
    { kind: 'kill',    text: '이상체 처리',    need: 3000, rw: { gems: 100 }, pt: 20 },
    { kind: 'boss',    text: '근원체 봉쇄',    need: 20,   rw: { gems: 100 }, pt: 20 },
    { kind: 'lvup',    text: '요원 강화',      need: 50,   rw: { tix: 20 },   pt: 20 },
    { kind: 'summon',  text: '요원 호출',      need: 60,   rw: { gems: 150 }, pt: 20 },
    { kind: 'dungeon', text: '일일 작전 완료', need: 15,   rw: { g2: 2, e2: 2 }, pt: 20 },
    { kind: 'train',   text: '수사력 강화',    need: 30,   rw: { med: 20 },   pt: 20 },
  ];
  const MONTHLY = [
    { kind: 'kill',    text: '이상체 처리',    need: 15000, rw: { gems: 500 }, pt: 50 },
    { kind: 'boss',    text: '근원체 봉쇄',    need: 80,    rw: { ptix: 3 },   pt: 50 },
    { kind: 'summon',  text: '요원 호출',      need: 250,   rw: { gems: 600 }, pt: 50 },
    { kind: 'dungeon', text: '일일 작전 완료', need: 60,    rw: { tix: 100 },  pt: 50 },
    { kind: 'star',    text: '요원 승급',      need: 10,    rw: { ptix: 2 },   pt: 50 },
  ];
  const REPEAT = [
    { kind: 'kill',   text: '이상체 처리', need: 500, rw: { tix: 3 } },
    { kind: 'boss',   text: '근원체 봉쇄', need: 5,   rw: { gems: 20 } },
    { kind: 'summon', text: '요원 호출',   need: 30,  rw: { gems: 30 } },
    { kind: 'lvup',   text: '요원 강화',   need: 20,  rw: { g2: 1 } },
  ];
  const MIS_PT_DAILY = 10;   // 일일 임무 하나 받을 때 점수
  const MPASS = Array.from({ length: 12 }, (_, i) => ({ pt: (i + 1) * 60, free: i % 3 === 2 ? { ptix: 1 } : i % 2 ? { tix: 10 } : { gems: 80 }, paid: i % 3 === 2 ? { ptix: 3 } : { gems: 300 } }));
  const MPASS_PRICE = 5500;
  function weekKey(now) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); }
  function monthKey(now) { return dayKey(now).slice(0, 7); }
  const freshMis = () => ({ w: { k: '', p: {}, got: [] }, m: { k: '', p: {}, got: [], pts: 0, pf: [], pp: [] }, r: { p: {}, got: {} }, paid: '' });
  /** 주와 달이 바뀌었으면 새로 시작 */
  function misReset(state, now) {
    const mi = state.mis, wk = weekKey(now), mk = monthKey(now);
    if (mi.w.k !== wk) mi.w = { k: wk, p: {}, got: [] };
    if (mi.m.k !== mk) mi.m = { k: mk, p: {}, got: [], pts: 0, pf: [], pp: [] };
  }
  const MIS_LIST = { w: WEEKLY, m: MONTHLY, r: REPEAT };
  function misAdd(state, kind, amount) {
    const mi = state.mis; if (!mi) return;
    for (const per of ['w', 'm']) { const m = MIS_LIST[per].find(x => x.kind === kind); if (m) mi[per].p[kind] = Math.min(m.need, (mi[per].p[kind] || 0) + amount); }
    if (REPEAT.some(x => x.kind === kind)) mi.r.p[kind] = (mi.r.p[kind] || 0) + amount;
  }
  /** 반복 임무: 지금 받을 수 있는 횟수 */
  function repeatReady(state, i) { const m = REPEAT[i], mi = state.mis; return Math.floor((mi.r.p[m.kind] || 0) / m.need) - (mi.r.got[i] || 0); }
  /** 주간(w), 월간(m), 반복(r) 임무 받기. 받은 보상 (없으면 null) */
  function misClaim(state, per, i) {
    const mi = state.mis, list = MIS_LIST[per], m = list && list[i]; if (!m) return null;
    if (per === 'r') {
      const n = repeatReady(state, i); if (n <= 0) return null;
      mi.r.got[i] = (mi.r.got[i] || 0) + n;
      const rw = Object.fromEntries(Object.entries(m.rw).map(([k, v]) => [k, v * n])); giveReward(state, rw); return rw;
    }
    const box = mi[per]; if (box.got.includes(i) || (box.p[m.kind] || 0) < m.need) return null;
    box.got.push(i); mi.m.pts += m.pt; giveReward(state, m.rw); return m.rw;
  }
  function misReadyCount(state, per) {
    if (per === 'r') return REPEAT.reduce((a, _, i) => a + (repeatReady(state, i) > 0 ? 1 : 0), 0);
    const box = state.mis[per]; return MIS_LIST[per].filter((m, i) => !box.got.includes(i) && (box.p[m.kind] || 0) >= m.need).length;
  }
  /** 임무 패스 */
  function mpassClaim(state, i, track) {
    const r = MPASS[i], mm = state.mis.m; if (!r || mm.pts < r.pt) return null;
    const paid = track === 'paid'; if (paid && state.mis.paid !== mm.k) return null;
    const got = paid ? mm.pp : mm.pf; if (got.includes(i)) return null;
    got.push(i); const rw = paid ? r.paid : r.free; giveReward(state, rw); return rw;
  }
  function mpassReady(state) { const mm = state.mis.m, out = []; MPASS.forEach((r, i) => { if (mm.pts < r.pt) return; if (!mm.pf.includes(i)) out.push([i, 'free']); if (state.mis.paid === mm.k && !mm.pp.includes(i)) out.push([i, 'paid']); }); return out; }

  /** 가이드 퀘스트와 일일, 주간, 월간, 반복 임무를 함께 올림 */
  function progress(state, kind, amount = 1) { if (state.st && isNum(amount) && amount > 0) state.st[kind] = (state.st[kind] || 0) + amount; questAdd(state, kind, amount); missionAdd(state, kind, amount); misAdd(state, kind, amount); }

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
    // 반복 퀘스트 보석은 조금씩 (예전 100~250은 정예 호출을 공짜로 돌릴 만큼 많았음)
    { kind: 'lvup',   text: '요원 강화',     need: 5,  gems: 10 },
    { kind: 'kill',   text: '이상체 처리',   need: 30, gems: 10 },
    { kind: 'boss',   text: '근원체 봉쇄',   need: 1,  gems: 20 },
    { kind: 'train',  text: '수사력 강화',   need: 3,  gems: 10 },
    { kind: 'summon', text: '요원 호출',     need: 1,  gems: 10 },
    { kind: 'lvup',   text: '요원 강화',     need: 20, gems: 15 },
    { kind: 'boss',   text: '근원체 봉쇄',   need: 3,  gems: 30 },
    { kind: 'kill',   text: '이상체 처리',   need: 150, gems: 20 },
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
    { kind: 'train',   text: '수사력 강화',         need: 3,  rw: { gold: 500 } },
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
      unl: [],
      mail: [],
      bag: {},
      pgems: 0,           // 유료 보석 (결제로 산 보석)
      fp: { start: '', got: [] },   // 첫 결제 보너스
      mis: freshMis(),    // 주간, 월간, 반복 임무와 임무 패스
      pass: { paid: false, f: [], p: [] },   // 수사 패스
      px: { level: { paid: false, f: [], p: [] }, summon: { paid: false, f: [], p: [] }, rift: { paid: false, f: [], p: [] } },   // 성장 패스들
      owned: [],          // 산 패키지 (한 번만)
      shop: { day: '', n: {} },   // 상점 오늘 산 횟수
      sk: { n: 0, day: '', got: [] },   // 일일 상점 누적 구매일, 마지막으로 센 날, 받은 일차
      shopM: { m: '', n: {} },          // 골드 충전 이번 달 산 것
      plans: {},                        // 정기권 { id: { end: 마지막 날, got: 마지막으로 받은 날 } }
      adBuff: 0,          // 광고 골드 버프 끝나는 시각
      med: 20,            // 구급상자 (자동 회복)
      medOn: true, medHp: 50,   // 자동 사용, 체력 % 이하일 때
      pre: [null, null, null], preI: 0,   // 편성 프리셋 3개            // 가방 (보급품 개수)           // 받은 우편
      cdx: {},            // 요원 도감 받은 단계            // 받은 수사 수첩 보상
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
      st: {},                   // 누적 기록 (처리, 근원체, 호출 등) → 칭호 조건
      tt: [], ttEq: '',         // 얻은 칭호, 장착 칭호
      cdxs: {},                 // 요원 도감 승급 단계 받은 수
      cards: {}, deck: [],      // 증거 카드 { id: { n: 장수, s: 별 } }, 편성 10칸
      cos: [], cosEq: {},       // 산 복장, 요원별 입은 복장
      lore: [],                 // 읽은 요원 기록
      acc: { lv: 1, xp: 0 },    // 수사팀 레벨
      uid: '', tname: 'AIU 수사팀', tnameAt: 0,   // 수사팀 번호, 이름, 이름 바꾼 시각
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
    s.cdx = {}; if (raw.cdx && typeof raw.cdx === 'object') for (const h of HEROES) if (isNum(raw.cdx[h.id])) s.cdx[h.id] = clampInt(raw.cdx[h.id], 0, CODEX_TIERS, 0);
    s.med = isNum(raw.med) ? clampInt(raw.med, 0, 1e6, 0) : base.med;
    s.medOn = raw.medOn !== false;
    s.medHp = [30, 50, 70].includes(raw.medHp) ? raw.medHp : 50;
    s.pre = [0, 1, 2].map(i => Array.isArray(raw.pre) && Array.isArray(raw.pre[i]) ? raw.pre[i].filter(id => HEROES.some(h => h.id === id)).slice(0, CONST.PARTY_MAX) : null);
    s.preI = clampInt(raw.preI, 0, 2, 0);
    s.shop = { day: raw.shop && typeof raw.shop.day === 'string' ? raw.shop.day.slice(0, 10) : '', n: {} };
    s.sk = { n: 0, day: '', got: [] };
    if (raw.sk && typeof raw.sk === 'object') s.sk = { n: clampInt(raw.sk.n, 0, STREAK.length, 0), day: typeof raw.sk.day === 'string' ? raw.sk.day.slice(0, 10) : '', got: Array.isArray(raw.sk.got) ? [...new Set(raw.sk.got.filter(i => Number.isInteger(i) && i >= 0 && i < STREAK.length))] : [] };
    s.shopM = { m: raw.shopM && typeof raw.shopM.m === 'string' ? raw.shopM.m.slice(0, 7) : '', n: {} };
    if (raw.shopM && raw.shopM.n && typeof raw.shopM.n === 'object') for (const g of GOLD_PACKS) if (raw.shopM.n[g.id]) s.shopM.n[g.id] = 1;
    s.plans = {}; if (raw.plans && typeof raw.plans === 'object') for (const pl of PLANS) { const r = raw.plans[pl.id]; if (r && typeof r.end === 'string' && /^\d{4}-\d\d-\d\d$/.test(r.end)) s.plans[pl.id] = { end: r.end, got: typeof r.got === 'string' ? r.got.slice(0, 10) : '' }; }
    if (raw.shop && raw.shop.n && typeof raw.shop.n === 'object') for (const it of [...SHOP.daily, ...SHOP.ad, ...SHOP.gshop]) if (isNum(raw.shop.n[it.id])) s.shop.n[it.id] = clampInt(raw.shop.n[it.id], 0, 99, 0);
    s.adBuff = isNum(raw.adBuff) ? raw.adBuff : 0;
    const okIdx = a => Array.isArray(a) ? [...new Set(a.filter(i => Number.isInteger(i) && i >= 0 && i < PASS.length))] : [];
    s.pass = { paid: !!(raw.pass && raw.pass.paid === true), f: okIdx(raw.pass && raw.pass.f), p: okIdx(raw.pass && raw.pass.p) };
    s.px = {}; for (const id of Object.keys(PASSES)) { const r = raw.px && raw.px[id]; const ok = a => Array.isArray(a) ? [...new Set(a.filter(i => Number.isInteger(i) && i >= 0 && i < PASSES[id].steps.length))] : []; s.px[id] = { paid: !!(r && r.paid === true), f: ok(r && r.f), p: ok(r && r.p) }; }
    s.owned = Array.isArray(raw.owned) ? raw.owned.filter(x => typeof x === 'string').slice(0, 50) : [];
    s.mis = freshMis();
    if (raw.mis && typeof raw.mis === 'object') {
      const R2 = raw.mis, okP = (o, list) => { const out = {}; if (o && typeof o === 'object') for (const m of list) if (isNum(o[m.kind])) out[m.kind] = clampInt(o[m.kind], 0, 1e9, 0); return out; };
      const okI = (a, n) => Array.isArray(a) ? [...new Set(a.filter(i => Number.isInteger(i) && i >= 0 && i < n))] : [];
      if (R2.w) s.mis.w = { k: String(R2.w.k || '').slice(0, 10), p: okP(R2.w.p, WEEKLY), got: okI(R2.w.got, WEEKLY.length) };
      if (R2.m) s.mis.m = { k: String(R2.m.k || '').slice(0, 7), p: okP(R2.m.p, MONTHLY), got: okI(R2.m.got, MONTHLY.length), pts: isNum(R2.m.pts) ? clampInt(R2.m.pts, 0, 1e6, 0) : 0, pf: okI(R2.m.pf, MPASS.length), pp: okI(R2.m.pp, MPASS.length) };
      if (R2.r) { s.mis.r.p = okP(R2.r.p, REPEAT); if (R2.r.got && typeof R2.r.got === 'object') for (let i = 0; i < REPEAT.length; i++) if (isNum(R2.r.got[i])) s.mis.r.got[i] = clampInt(R2.r.got[i], 0, 1e9, 0); }
      s.mis.paid = typeof R2.paid === 'string' ? R2.paid.slice(0, 7) : '';
    }
    s.pgems = isNum(raw.pgems) && raw.pgems >= 0 ? Math.floor(raw.pgems) : 0;
    s.fp = { start: raw.fp && typeof raw.fp.start === 'string' ? raw.fp.start.slice(0, 10) : '', got: raw.fp && Array.isArray(raw.fp.got) ? [...new Set(raw.fp.got.filter(i => [0, 1, 2].includes(i)))] : [] };
    s.bag = {}; if (raw.bag && typeof raw.bag === 'object') for (const k of Object.keys(ITEMS)) if (isNum(raw.bag[k])) s.bag[k] = clampInt(raw.bag[k], 0, 1e6, 0);
    s.mail = Array.isArray(raw.mail) ? raw.mail.filter(x => MAILS.some(m => m.id === x)) : [];
    s.unl = Array.isArray(raw.unl) ? raw.unl.filter(x => ROADMAP.some(r => r.id === x)) : [];
    s.face = typeof raw.face === 'string' && HEROES.some(h => h.id === raw.face) ? raw.face : '';
    if (raw.att && typeof raw.att === 'object') s.att = { n: clampInt(raw.att.n, 0, 1e6, 0), last: typeof raw.att.last === 'string' ? raw.att.last.slice(0, 10) : '' };
    s.lastSeen = isNum(raw.lastSeen) && raw.lastSeen > 0 ? raw.lastSeen : base.lastSeen;
    if (raw.up && typeof raw.up === 'object') {
      for (const u of UPGRADES) s.up[u.id] = clampInt(raw.up[u.id], 0, u.max, 0);
    }
    // 수사력 단계: 저장값이 없으면 현재 강화 레벨이 들어가는 단계로 맞춤 (기존 진행이 깎이지 않게)
    const needT = Math.max(1, Math.ceil(s.up.atk / TSTEP.LV), Math.ceil(s.up.gold / TSTEP.LV), Math.ceil(s.up.crit / TSTEP.CRIT));
    s.tstep = Math.max(needT, clampInt(raw.tstep, 1, 9999, 1));
    if (raw.heroes && typeof raw.heroes === 'object') {
      for (const h of HEROES) {
        const r = raw.heroes[h.id];
        if (!r || typeof r !== 'object') continue;
        s.heroes[h.id] = {
          // 시작 요원은 항상 보유
          owned: STARTER_IDS.includes(h.id) ? true : r.owned === true,
          lv: clampInt(r.lv, 1, 1e6, 1),
          stars: clampInt(r.stars, 1, maxStars(h.grade), 1),
          shards: clampInt(r.shards, 0, 1e6, 0),
        };
      }
    }
    // 수집 시스템
    s.st = {}; if (raw.st && typeof raw.st === 'object') for (const k of Object.keys(raw.st).slice(0, 40)) if (/^[a-z]{1,12}$/.test(k) && isNum(raw.st[k])) s.st[k] = clampInt(raw.st[k], 0, 1e12, 0);
    s.tt = Array.isArray(raw.tt) ? [...new Set(raw.tt.filter(id => TITLES.some(t => t.id === id)))] : [];
    s.ttEq = s.tt.includes(raw.ttEq) ? raw.ttEq : '';
    s.cdxs = {}; if (raw.cdxs && typeof raw.cdxs === 'object') for (const h of HEROES) if (isNum(raw.cdxs[h.id])) s.cdxs[h.id] = clampInt(raw.cdxs[h.id], 0, 5, 0);
    s.cards = {}; if (raw.cards && typeof raw.cards === 'object') for (const c of CARDS) { const r = raw.cards[c.id]; if (r && typeof r === 'object' && isNum(r.n) && r.n > 0) s.cards[c.id] = { n: clampInt(r.n, 1, 1e6, 1), s: clampInt(r.s, 1, CARD_MAX, 1) }; }
    s.deck = Array.isArray(raw.deck) ? [...new Set(raw.deck.filter(id => s.cards[id]))].slice(0, CARD_SLOTS) : [];
    s.cos = Array.isArray(raw.cos) ? [...new Set(raw.cos.filter(id => COSTUMES.some(c => c.id === id)))] : [];
    s.cosEq = {}; if (raw.cosEq && typeof raw.cosEq === 'object') for (const h of HEROES) { const c = raw.cosEq[h.id]; if (s.cos.includes(c) && costumeById(c).hero === h.id) s.cosEq[h.id] = c; }
    s.lore = Array.isArray(raw.lore) ? [...new Set(raw.lore.filter(id => HEROES.some(h => h.id === id)))] : [];
    if (raw.acc && typeof raw.acc === 'object') s.acc = { lv: clampInt(raw.acc.lv, 1, 1e6, 1), xp: clampInt(raw.acc.xp, 0, 1e12, 0) };
    s.uid = typeof raw.uid === 'string' && /^[A-Z0-9]{6}$/.test(raw.uid) ? raw.uid : '';
    s.tname = typeof raw.tname === 'string' && !teamNameError(raw.tname) ? raw.tname.trim() : base.tname;
    s.tnameAt = isNum(raw.tnameAt) && raw.tnameAt > 0 ? raw.tnameAt : 0;
    // 파티: 보유한 요원만, 중복 없이 최대 5명. 예전 저장(파티 없음)은 보유 요원 앞에서부터
    s.party = Array.isArray(raw.party) ? raw.party.filter(id => typeof id === 'string') : null;
    s.party = partyIds(s);
    return s;
  }


  /* ============================================================
   * 수집 시스템 (세나 키우기의 칭호, 도감, 기사단 카드, 코스튬, 고유 능력을 AIU식으로)
   *  - 모든 보너스는 statBonus(state) 하나로 모아 전투(공격력, 체력, 치명타, 근원체 피해, 골드)에 반영
   *  - 상태: st(누적 기록), tt(얻은 칭호), ttEq(장착 칭호), cdxs(도감 승급 단계), cards, deck, cos, cosEq, lore, acc(수사팀 레벨), uid, tname, tnameAt
   * ============================================================ */
  // 능력치 종류: 화면 이름과 설명 (요원 상세 능력치 칸, 프로필 수사팀 능력치에서 같이 씀)
  const STATS = {
    atk:  { name: '공격력',        pct: true, desc: '요원이 주는 피해의 기준이 돼요.' },
    hp:   { name: '체력',          pct: true, desc: '체력이 0이 되면 요원이 쓰러져요.' },
    crit: { name: '치명타 확률',   pct: true, desc: '공격이 치명타로 들어갈 확률이에요.' },
    cdmg: { name: '치명타 피해',   pct: true, desc: '치명타가 터졌을 때 더 들어가는 피해예요.' },
    boss: { name: '근원체 피해',   pct: true, desc: '근원체에게 주는 피해가 늘어나요.' },
    gold: { name: '골드 획득',     pct: true, desc: '이상체를 처리하고 받는 골드가 늘어나요.' },
  };
  // 소속: 요원 도감을 나누는 묶음 (세나 키우기 영웅 도감의 세력처럼)
  const SQUADS = [
    { id: 'first',  name: '창설 1팀',     sub: 'AIU를 처음 만든 요원들', ids: ['dark', 'mage', 'archer', 'knight', 'priest', 'scanner', 'breaker', 'echo'] },
    { id: 'special', name: '특수 대응반', sub: '근원체만 쫓는 정예 요원들', ids: ['requiem', 'ironside', 'blackbox', 'ghost', 'judge', 'aegis', 'oracle', 'eclipse', 'reaper', 'vault', 'phantom', 'titan', 'exorcist'] },
    { id: 'patrol', name: '현장 순찰반',  sub: '골목마다 먼저 달려가는 요원들', ids: ['patrol', 'sniff', 'rookie', 'flare', 'medic', 'bulwark', 'wire', 'tracer', 'static', 'crowbar', 'lens', 'hound', 'smoke', 'salt'] },
    { id: 'ally',   name: '외부 협력관',  sub: '다른 기관에서 파견 온 요원들', ids: ['viper', 'thunder', 'warden', 'chapel', 'frost', 'raven', 'anchor', 'cipher', 'jackal', 'mirror', 'inferno', 'saint', 'dozer', 'pulse', 'vortex'] },
  ];
  function squadOf(id) { return SQUADS.find(q => q.ids.includes(id)) || SQUADS[0]; }

  /* ---------- 요원 도감: 레벨 단계 (10~100) + 승급 단계 ----------
   * 레벨 단계마다 보석과 함께 영구 능력치. 능력치 종류는 요원 유형으로 정함 */
  const CODEX_STAT = { 공격: 'cdmg', 광역: 'atk', 방어: 'hp', 지원: 'crit' };
  const CODEX_VAL = { cdmg: 0.009, atk: 0.004, hp: 0.005, crit: 0.0015 };
  const CODEX_STAR_VAL = { cdmg: 0.02, atk: 0.01, hp: 0.012, crit: 0.004 };
  function codexStat(id) { return CODEX_STAT[heroById(id).type]; }
  /** 승급 도감: 다음 받을 별 단계 (★2부터, 전설은 각성까지) */
  function codexStarNext(state, id) {
    const h = heroById(id), d = state.heroes[id]; if (!d || !d.owned) return null;
    const got = (state.cdxs && state.cdxs[id]) || 0, star = got + 2;
    if (star > maxStars(h.grade)) return null;
    return { tier: got + 1, star, ready: d.stars >= star, gems: 30 * (got + 1) };
  }
  function codexStarClaim(state, only) {
    let g = 0;
    for (const h of HEROES) {
      if (only && h.id !== only) continue;
      let n;
      while ((n = codexStarNext(state, h.id)) && n.ready) { state.cdxs[h.id] = n.tier; g += n.gems; }
    }
    state.gems += g; return g;
  }

  /* ---------- 칭호 ----------
   * cat: 분류 (필터), k: 누적 기록 종류, n: 목표, hold: 보유 효과, eq: 장착 효과(장착한 하나만). hidden 은 얻기 전까지 조건을 숨김 */
  const TITLE_CATS = ['수집', '성장', '전투', '명성', '소모', '출석', '히든', '기타'];
  const T = (id, name, cat, k, n, hs, hv, es, ev, hidden) => ({ id, name, cat, k, n, hold: { [hs]: hv }, eq: { [es]: ev }, hidden: !!hidden });
  const TITLES = [
    T('new',      '신입 수사관',     '기타', 'stage',  1,     'atk', 0.005, 'atk', 0.02),
    T('kill1',    '첫 처리',         '전투', 'kill',   100,   'atk', 0.005, 'gold', 0.03),
    T('kill2',    '골목 청소부',     '전투', 'kill',   1000,  'atk', 0.005, 'gold', 0.05),
    T('kill3',    '밤거리의 사냥꾼', '전투', 'kill',   10000, 'atk', 0.01,  'atk', 0.05),
    T('kill4',    '이상체의 악몽',   '전투', 'kill',   50000, 'atk', 0.01,  'cdmg', 0.1),
    T('boss1',    '근원 추적자',     '전투', 'boss',   10,    'boss', 0.01, 'boss', 0.04),
    T('boss2',    '봉쇄 전문가',     '전투', 'boss',   50,    'boss', 0.01, 'boss', 0.06),
    T('boss3',    '근원체 사냥꾼',   '전투', 'boss',   200,   'boss', 0.015, 'boss', 0.1),
    T('stage1',   '현장 배치',       '명성', 'stage',  21,    'hp', 0.005, 'hp', 0.03),
    T('stage2',   '구역 담당관',     '명성', 'stage',  51,    'hp', 0.005, 'hp', 0.04),
    T('stage3',   '도시의 방패',     '명성', 'stage',  101,   'hp', 0.01,  'hp', 0.06),
    T('stage4',   '전설의 수사관',   '명성', 'stage',  201,   'hp', 0.01,  'atk', 0.08),
    T('tower1',   '균열 탐사자',     '명성', 'tower',  10,    'crit', 0.002, 'crit', 0.01),
    T('tower2',   '심층 잠수부',     '명성', 'tower',  30,    'crit', 0.003, 'crit', 0.015),
    T('tower3',   '심연을 본 자',    '명성', 'tower',  60,    'crit', 0.004, 'crit', 0.02),
    T('own1',     '팀 꾸리기',       '수집', 'own',    5,     'hp', 0.005, 'atk', 0.02),
    T('own2',     '든든한 명단',     '수집', 'own',    15,    'hp', 0.005, 'hp', 0.04),
    T('own3',     '인사 담당',       '수집', 'own',    30,    'atk', 0.01, 'atk', 0.05),
    T('own4',     'AIU 전원 집합',   '수집', 'own',    50,    'atk', 0.015, 'cdmg', 0.12),
    T('leg1',     '전설을 만나다',   '수집', 'legend', 1,     'cdmg', 0.01, 'cdmg', 0.05),
    T('leg2',     '전설의 동료들',   '수집', 'legend', 5,     'cdmg', 0.015, 'cdmg', 0.08),
    T('card1',    '증거 수집가',     '수집', 'cards',  10,    'gold', 0.01, 'gold', 0.04),
    T('card2',    '증거 보관소장',   '수집', 'cards',  30,    'gold', 0.015, 'gold', 0.06),
    T('lv1',      '꾸준한 훈련',     '성장', 'lvup',   100,   'atk', 0.005, 'atk', 0.02),
    T('lv2',      '성장의 시간',     '성장', 'lvup',   1000,  'atk', 0.01, 'atk', 0.04),
    T('star1',    '첫 승급',         '성장', 'star',   1,     'hp', 0.005, 'hp', 0.02),
    T('star2',    '별을 모으는 자',  '성장', 'star',   30,    'hp', 0.01, 'hp', 0.05),
    T('awk',      '한계를 넘은 자',  '성장', 'awaken', 1,     'cdmg', 0.02, 'cdmg', 0.1),
    T('train1',   '사격장 단골',     '성장', 'train',  100,   'crit', 0.002, 'crit', 0.01),
    T('sum1',     '첫 호출',         '소모', 'summon', 10,    'gold', 0.005, 'gold', 0.02),
    T('sum2',     '호출 담당관',     '소모', 'summon', 100,   'gold', 0.01, 'gold', 0.04),
    T('sum3',     '인재 사냥꾼',     '소모', 'summon', 1000,  'atk', 0.01, 'atk', 0.05),
    T('dg1',      '작전 수행자',     '소모', 'dungeon', 20,   'gold', 0.01, 'gold', 0.04),
    T('att1',     '출근 도장',       '출석', 'att',    7,     'hp', 0.005, 'gold', 0.03),
    T('att2',     '개근 수사관',     '출석', 'att',    30,    'hp', 0.01,  'hp', 0.05),
    T('h_night',  '밤의 그림자',     '히든', 'night',  1,     'cdmg', 0.01, 'cdmg', 0.06, true),
    T('h_lose',   '포기를 모르는',   '히든', 'lose',   10,    'hp', 0.01,  'hp', 0.06, true),
    T('h_reset',  '처음부터 다시',   '히든', 'reset',  1,     'atk', 0.005, 'atk', 0.03, true),
    T('h_name',   '이름을 바꾼 자',  '히든', 'rename', 1,     'gold', 0.005, 'gold', 0.03, true),
    T('h_lore',   '기록 보관 담당',  '히든', 'lore',   10,    'crit', 0.003, 'crit', 0.015, true),
  ];
  const TITLE_LV_NEED = 2;   // 칭호 도감 레벨: 칭호 2개마다 1레벨 (최대 20)
  const TITLE_LV_MAX = 20;
  // 칭호 도감 레벨 효과 (레벨마다 하나씩, 누적)
  const TITLE_LV_FX = Array.from({ length: TITLE_LV_MAX }, (_, i) => { const L = i + 1, k = ['atk', 'hp', 'crit', 'cdmg', 'boss'][i % 5]; return { lv: L, stat: k, v: { atk: 0.01, hp: 0.01, crit: 0.002, cdmg: 0.02, boss: 0.015 }[k] * (L > 10 ? 2 : 1) }; });
  function titleById(id) { return TITLES.find(t => t.id === id); }
  /** 칭호 조건에 쓰는 현재 값 */
  function titleProgress(state, t) {
    const st = state.st || {};
    switch (t.k) {
      case 'stage': return state.stage;
      case 'tower': return state.tower || 0;
      case 'own': return HEROES.filter(h => state.heroes[h.id] && state.heroes[h.id].owned).length;
      case 'legend': return HEROES.filter(h => h.grade === '전설' && state.heroes[h.id] && state.heroes[h.id].owned).length;
      case 'awaken': return HEROES.filter(h => heroGrade(state, h.id) === '각성').length;
      case 'cards': return CARDS.filter(c => state.cards && state.cards[c.id]).length;
      case 'att': return (state.att && state.att.n) || 0;
      case 'lore': return (state.lore || []).length;
      default: return st[t.k] || 0;
    }
  }
  /** 새로 조건을 채운 칭호를 얻음. 새로 얻은 칭호 목록 */
  function titleCheck(state) {
    const out = [];
    for (const t of TITLES) if (!state.tt.includes(t.id) && titleProgress(state, t) >= t.n) { state.tt.push(t.id); out.push(t); }
    return out;
  }
  function titleLevel(state) { return Math.min(TITLE_LV_MAX, Math.floor(state.tt.length / TITLE_LV_NEED)); }
  function titleEquip(state, id) {
    if (!state.tt.includes(id)) throw new RangeError('보유하지 않은 칭호예요');
    state.ttEq = id; return true;
  }

  /* ---------- 증거 카드 (세나 키우기 기사단 카드처럼) ----------
   * 10장을 편성해야 효과가 켜짐. 같은 등급 3장을 합성하면 30% 확률로 위 등급, 실패하면 같은 등급 다른 카드
   * 카드마다 별(1~5). 같은 카드가 더 있으면 승급 */
  const CARD_GRADES = ['일반', '희귀', '영웅', '전설'];
  const CARD_BASE = { 일반: 0.004, 희귀: 0.008, 영웅: 0.016, 전설: 0.03 };
  const CARD_STAT_K = { atk: 1, hp: 1, crit: 0.25, cdmg: 2, boss: 1.5, gold: 1.5 };
  const CARD_NEED = [1, 2, 3, 4];   // ★n → ★n+1 에 드는 같은 카드 수
  const CARD_MAX = 5;
  const CK = (id, name, grade, stat, icon) => ({ id, name, grade, stat, icon });
  const CARDS = [
    CK('c_shell', '탄피', '일반', 'atk', 'shell'), CK('c_print', '지문', '일반', 'crit', 'print'), CK('c_tape', '녹음 테이프', '일반', 'gold', 'tape'), CK('c_photo', '현장 사진', '일반', 'hp', 'photo'),
    CK('c_key', '낡은 열쇠', '일반', 'boss', 'key'), CK('c_ticket', '버스표', '일반', 'gold', 'ticket'), CK('c_lighter', '라이터', '일반', 'cdmg', 'lighter'), CK('c_glove', '고무장갑', '일반', 'hp', 'glove'),
    CK('c_badge', '경찰 배지', '일반', 'atk', 'badge'), CK('c_map', '구역 지도', '일반', 'boss', 'map'), CK('c_note', '쪽지', '일반', 'crit', 'note'), CK('c_coin', '이상한 동전', '일반', 'gold', 'coin'),
    CK('c_rose', '시든 장미', '희귀', 'cdmg', 'rose'), CK('c_watch', '멈춘 시계', '희귀', 'boss', 'watch'), CK('c_mask', '깨진 가면', '희귀', 'atk', 'mask'), CK('c_film', '필름 한 롤', '희귀', 'crit', 'film'),
    CK('c_ring', '반지', '희귀', 'hp', 'ring'), CK('c_bullet', '은탄환', '희귀', 'boss', 'bullet'), CK('c_diary', '피해자 일기', '희귀', 'gold', 'diary'), CK('c_lens', '돋보기', '희귀', 'crit', 'lens'),
    CK('c_doll', '저주 인형', '영웅', 'cdmg', 'doll'), CK('c_mirror', '흐린 거울', '영웅', 'atk', 'mirror'), CK('c_bell', '은방울', '영웅', 'hp', 'bell'), CK('c_cross', '녹슨 십자가', '영웅', 'boss', 'cross'),
    CK('c_box', '봉인 상자', '영웅', 'gold', 'box'), CK('c_eye', '유리 눈', '영웅', 'crit', 'eye'),
    CK('c_omega', '오메가 문서', '전설', 'atk', 'omega'), CK('c_core', '근원체 파편', '전설', 'boss', 'core'), CK('c_heart', '검은 심장', '전설', 'cdmg', 'heart'), CK('c_crown', '균열 왕관', '전설', 'hp', 'crown'),
  ];
  const CARD_SLOTS = 10;
  const COMBINE_UP = 0.3;
  function cardById(id) { return CARDS.find(c => c.id === id); }
  function cardValue(id, star) { const c = cardById(id); return CARD_BASE[c.grade] * CARD_STAT_K[c.stat] * (1 + 0.5 * (clampInt(star, 1, CARD_MAX, 1) - 1)); }
  function cardAdd(state, id, n = 1) { const c = state.cards[id] || (state.cards[id] = { n: 0, s: 1 }); c.n += n; return c; }
  /** 카드 뽑기: 등급 확률 일반 70, 희귀 22, 영웅 7, 전설 1 */
  function cardRoll(rng, grade) {
    const r = rng(); const g = grade || (r < 0.01 ? '전설' : r < 0.08 ? '영웅' : r < 0.3 ? '희귀' : '일반');
    const L = CARDS.filter(c => c.grade === g); return L[Math.floor(rng() * L.length) % L.length].id;
  }
  /** 승급: 같은 카드 n장으로 별 하나 (n은 CARD_NEED). 보유 1장은 남김 */
  function cardStarNeed(c) { return c.s >= CARD_MAX ? Infinity : CARD_NEED[c.s - 1]; }
  function cardStarUp(state, id) {
    const c = state.cards[id]; if (!c) return false;
    const need = cardStarNeed(c); if (c.n - 1 < need) return false;
    c.n -= need; c.s++; return true;
  }
  function cardStarAll(state) { let k = 0; for (const id of Object.keys(state.cards)) while (cardStarUp(state, id)) k++; return k; }
  /** 합성: 같은 등급 카드 3장 (남는 장만, 편성용 1장은 남김) → 결과 카드 id */
  function cardSpare(state, id) { const c = state.cards[id]; return c ? c.n - 1 : 0; }
  function cardCombine(state, ids, rng) {
    if (!Array.isArray(ids) || ids.length !== 3) throw new RangeError('카드 3장을 넣어 주세요');
    const g = cardById(ids[0]).grade;
    if (g === '전설') throw new RangeError('전설 카드는 합성할 수 없어요');
    if (!ids.every(id => cardById(id).grade === g)) throw new RangeError('같은 등급 카드만 합성할 수 있어요');
    const use = {}; for (const id of ids) use[id] = (use[id] || 0) + 1;
    for (const id of Object.keys(use)) if (cardSpare(state, id) < use[id]) throw new RangeError('남는 카드가 부족해요');
    for (const id of Object.keys(use)) state.cards[id].n -= use[id];
    const up = rng() < COMBINE_UP, out = cardRoll(rng, up ? CARD_GRADES[CARD_GRADES.indexOf(g) + 1] : g);
    cardAdd(state, out, 1); return { id: out, up };
  }
  /** 일괄 합성: 한 등급에서 남는 카드를 3장씩 계속 합성 */
  function cardCombineAll(state, grade, rng) {
    const out = [];
    for (let k = 0; k < 500; k++) {
      const pool = []; for (const c of CARDS) if (c.grade === grade) for (let i = 0; i < cardSpare(state, c.id); i++) pool.push(c.id);
      if (pool.length < 3) break; out.push(cardCombine(state, pool.slice(0, 3), rng));
    }
    return out;
  }
  function deckToggle(state, id) {
    const i = state.deck.indexOf(id);
    if (i >= 0) { state.deck.splice(i, 1); return 'out'; }
    if (!state.cards[id]) throw new RangeError('보유하지 않은 카드예요');
    if (state.deck.length >= CARD_SLOTS) return 'full';
    state.deck.push(id); return 'in';
  }
  function deckAuto(state) {
    const score = id => { const c = state.cards[id], k = cardById(id).stat; return cardValue(id, c.s) / CARD_STAT_K[k] * ({ atk: 1.2, cdmg: 1, boss: 1, hp: 0.8, crit: 1, gold: 0.6 })[k]; };
    state.deck = Object.keys(state.cards).filter(id => state.cards[id].n > 0).sort((a, b) => score(b) - score(a)).slice(0, CARD_SLOTS);
    return state.deck.length;
  }
  const deckOn = state => state.deck.length >= CARD_SLOTS;

  /* ---------- 복장 (세나 키우기 코스튬처럼): 사면 보유 효과, 입으면 그림이 바뀜 ---------- */
  const COSTUMES = [
    { id: 'dark_rain',  hero: 'dark',   name: '빗속의 추적자', price: 2000, hold: { atk: 0.03, hp: 0.03 } },
    { id: 'dark_gala',  hero: 'dark',   name: '가면 무도회',   price: 3000, hold: { cdmg: 0.06 } },
    { id: 'mage_biker', hero: 'mage',   name: '심야 라이더',   price: 2000, hold: { atk: 0.03, hp: 0.03 } },
    { id: 'mage_suit',  hero: 'mage',   name: '정장 차림',     price: 3000, hold: { boss: 0.05 } },
    { id: 'archer_rf',  hero: 'archer', name: '옥상 저격수',   price: 2000, hold: { atk: 0.03, hp: 0.03 } },
    { id: 'archer_off', hero: 'archer', name: '비번 날',       price: 3000, hold: { crit: 0.01 } },
    { id: 'knight_riot', hero: 'knight', name: '진압 기동대',  price: 2000, hold: { atk: 0.03, hp: 0.03 } },
    { id: 'knight_coat', hero: 'knight', name: '트렌치코트',   price: 3000, hold: { hp: 0.06 } },
    { id: 'priest_er',  hero: 'priest', name: '응급실 당직',   price: 2000, hold: { atk: 0.03, hp: 0.03 } },
    { id: 'priest_nun', hero: 'priest', name: '수녀원 잠입',   price: 3000, hold: { gold: 0.06 } },
  ];
  function costumeById(id) { return COSTUMES.find(c => c.id === id); }
  function costumeBuy(state, id) {
    const c = costumeById(id); if (!c) throw new RangeError('없는 복장이에요');
    if (state.cos.includes(id)) throw new RangeError('이미 보유한 복장이에요');
    if (!spendGems(state, c.price)) throw new RangeError('보석이 부족해요');
    state.cos.push(id); return true;
  }
  function costumeWear(state, heroId, cosId) {
    if (cosId && (!state.cos.includes(cosId) || costumeById(cosId).hero !== heroId)) throw new RangeError('보유하지 않은 복장이에요');
    if (cosId) state.cosEq[heroId] = cosId; else delete state.cosEq[heroId];
    return true;
  }

  /* ---------- 고유 능력: 출전 중이고 스테이지 조건을 넘으면 팀 전체에 켜짐 ---------- */
  const PASSIVE = { 공격: { stat: 'cdmg', v: 0.08, name: '급소 간파' }, 광역: { stat: 'boss', v: 0.06, name: '현장 장악' }, 방어: { stat: 'hp', v: 0.06, name: '불굴' }, 지원: { stat: 'atk', v: 0.04, name: '작전 지휘' } };
  const PASSIVE_OPEN = { 희귀: 41, 영웅: 81, 전설: 121 };
  const PASSIVE_MUL = { 희귀: 1, 영웅: 1.5, 전설: 2, 각성: 3 };
  function passiveOf(state, id) {
    const h = heroById(id), p = PASSIVE[h.type], g = heroGrade(state, id);
    return { name: p.name, stat: p.stat, v: p.v * PASSIVE_MUL[g], open: PASSIVE_OPEN[h.grade], on: state.stage >= PASSIVE_OPEN[h.grade] };
  }

  /* ---------- 요원 기록 (이야기 한 편 읽으면 보석 한 번) ---------- */
  const LORE_GEMS = 30;
  function loreRead(state, id) { heroById(id); if (state.lore.includes(id)) return 0; state.lore.push(id); state.gems += LORE_GEMS; return LORE_GEMS; }

  /* ---------- 레벨 초기화: 쓴 경험치를 모두 돌려받고 Lv.1 ---------- */
  function heroLvRefund(lv) { return heroLvCostBulk(1, clampInt(lv, 1, 1e6, 1) - 1); }
  function heroLvReset(state, id) {
    const d = state.heroes[id]; if (!d || !d.owned || d.lv <= 1) return 0;
    const back = heroLvRefund(d.lv); state.exp += back; d.lv = 1; return back;
  }

  /* ---------- 수사팀 레벨 (처리할 때마다 경험치) ---------- */
  function accNeed(lv) { return Math.floor(60 * Math.pow(clampInt(lv, 1, 1e6, 1), 1.35)); }
  function accAdd(state, xp) {
    const a = state.acc; a.xp += xp; let up = 0;
    while (a.xp >= accNeed(a.lv)) { a.xp -= accNeed(a.lv); a.lv++; up++; }
    return up;
  }

  /* ---------- 수사팀 이름 ---------- */
  const TNAME_COOL = 24 * 3600e3;
  /** 이름 검사: 2~8자, 한글/영문/숫자만. 문제가 있으면 안내 문구 */
  function teamNameError(name) {
    if (typeof name !== 'string') return '수사팀 이름을 입력해 주세요';
    const s = name.trim();
    if (!s) return '수사팀 이름을 입력해 주세요';
    if ([...s].length < 2) return '수사팀 이름이 너무 짧아요';
    if ([...s].length > 8) return '수사팀 이름이 너무 길어요';
    if (!/^[가-힣A-Za-z0-9]+$/.test(s)) return '한글, 영문, 숫자만 쓸 수 있어요';
    return '';
  }
  function teamRename(state, name, nowMs) {
    const err = teamNameError(name); if (err) throw new RangeError(err);
    if (state.tnameAt && nowMs - state.tnameAt < TNAME_COOL) throw new RangeError('바꾼 뒤 24시간이 지나야 다시 바꿀 수 있어요');
    state.tname = name.trim(); state.tnameAt = nowMs; state.st.rename = (state.st.rename || 0) + 1; return true;
  }
  function makeUid(rng) { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(rng() * A.length) % A.length]; return s; }

  /* ---------- 보너스 합계 (전투에 쓰는 값). src 는 출처별 (프로필 수사팀 능력치 필터) ---------- */
  function statBonus(state) {
    const z = () => ({ atk: 0, hp: 0, crit: 0, cdmg: 0, boss: 0, gold: 0 });
    const src = { 칭호: z(), 도감: z(), '증거 카드': z(), 복장: z(), '고유 능력': z(), 수사력: z() };
    { const t = tstepOf(state) - 1; src.수사력.atk += TSTEP.BONUS * t; src.수사력.hp += TSTEP.BONUS * t; }
    const add = (o, k, v) => { o[k] += v; };
    // 칭호: 보유 효과 전부 + 장착 효과 하나 + 도감 레벨 효과
    for (const id of state.tt) { const t = titleById(id); if (t) for (const k in t.hold) add(src.칭호, k, t.hold[k]); }
    const eq = titleById(state.ttEq); if (eq && state.tt.includes(eq.id)) for (const k in eq.eq) add(src.칭호, k, eq.eq[k]);
    const tl = titleLevel(state); for (const f of TITLE_LV_FX) if (f.lv <= tl) add(src.칭호, f.stat, f.v);
    // 요원 도감: 레벨 단계, 승급 단계
    for (const h of HEROES) { const k = codexStat(h.id); add(src.도감, k, CODEX_VAL[k] * ((state.cdx && state.cdx[h.id]) || 0)); add(src.도감, k, CODEX_STAR_VAL[k] * ((state.cdxs && state.cdxs[h.id]) || 0)); }
    // 증거 카드: 10장 편성했을 때만
    if (deckOn(state)) for (const id of state.deck) { const c = state.cards[id]; if (c) add(src['증거 카드'], cardById(id).stat, cardValue(id, c.s)); }
    // 복장: 보유 효과
    for (const id of state.cos) { const c = costumeById(id); if (c) for (const k in c.hold) add(src.복장, k, c.hold[k]); }
    // 고유 능력: 출전 요원
    for (const id of partyIds(state)) { const p = passiveOf(state, id); if (p.on) add(src['고유 능력'], p.stat, p.v); }
    const all = z(); for (const s of Object.values(src)) for (const k in s) all[k] += s[k];
    return { ...all, src };
  }

  /** 전투 배율 한 번에: 편성 핵심 버프 × 수집 보너스 */
  function battleMods(state, now = new Date()) {
    const y = synergy(state), b = statBonus(state);
    const pg = planLeft(state, 'p_month', now) > 0 ? planById('p_month').gold : 0;   // 골드 버프 월정액
    return { atk: y.atk * (1 + b.atk), hp: y.hp * (1 + b.hp), cd: y.cd, crit: b.crit, cdmg: b.cdmg, boss: 1 + b.boss, gold: (1 + b.gold) * (1 + pg), lines: y.lines };
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
    AWAKE_STAR, AWAKE_NEED, maxStars, heroGrade, gemTotal, spendGems, FIRST_PAY, firstPayStart, firstPayReady, firstPayClaim, WEEKLY, MONTHLY, REPEAT, MPASS, MPASS_PRICE, misReset, misClaim, misReadyCount, repeatReady, mpassClaim, mpassReady, weekKey, monthKey, PASS, PASS_PRICE, passClaim, passReady, PASSES, pxVal, pxClaim, pxReady, pxBuy, giveReward, SHOP, shopCount, shopBuy, AD_BUFF_MS, adBuffOn, switchPreset, SYNERGY, synergy, ITEMS, useItem, MAILS, mailClaim, codexNext, codexClaim, ROADMAP, roadClaim, roadReady, stageLabel, killExp, bossExp, enemyHp, enemyAtk, bossHp, bossAtk, killGold, bossGold,
    atkMult, goldMult, critChance, starMult, heroAtk, heroHp, heroDps,
    heroLvCap, heroLvCost, heroLvCostBulk, heroLvAffordable, upgradeCost, upCap, upCost, tstepOf, tstepProg, tstepCost, tstepUp, TSTEP, starNeed, STAR_NEED,
    partyDps, offlineReward, summon, summonLevel, summonRates, doSummon, summonMaxN, addTickets, shopItem, STREAK, streakClaim, GOLD_PACKS, goldPackCount, goldPackBuy, PLANS, planById, planLeft, planBuy, planClaim, levelReward, applySummon, pickupRemainSec, formatRemain,
    newState, cloneState, sanitize, loadFromString, QUESTS, GUIDE, questAt, questAdd, questClaim,
    DUNGEONS, MISSIONS, ATTEND, dayKey, dailyReset, dungeonById, dungeonStage, dungeonReward, towerStage, towerReward,
    STATS, SQUADS, squadOf, CODEX_STAT, CODEX_VAL, CODEX_STAR_VAL, CODEX_TIERS, CODEX_STEP, codexStat, codexStarNext, codexStarClaim,
    TITLES, TITLE_CATS, TITLE_LV_NEED, TITLE_LV_MAX, TITLE_LV_FX, titleById, titleProgress, titleCheck, titleLevel, titleEquip,
    CARDS, CARD_GRADES, CARD_SLOTS, CARD_MAX, COMBINE_UP, cardById, cardValue, cardAdd, cardRoll, cardStarNeed, cardStarUp, cardStarAll, cardSpare, cardCombine, cardCombineAll, deckToggle, deckAuto, deckOn,
    COSTUMES, costumeById, costumeBuy, costumeWear, PASSIVE, PASSIVE_OPEN, passiveOf, LORE_GEMS, loreRead, heroLvRefund, heroLvReset, accNeed, accAdd, teamNameError, teamRename, makeUid, statBonus, battleMods,
    chalHp, chalAtk, clearDungeon, sweepDungeon, clearTower, missionAdd, missionClaim, missionBonus, progress, canAttend, attend,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== 'undefined' ? window : globalThis);
