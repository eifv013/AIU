# AIU
AIU 이상현상 전담수사팀 — Loop & Lamp Studio 의 방치형 키우기 게임 (세로 화면 전용)

## 구조
- `src/core.js` 게임 규칙만 모은 순수 함수 (요원 능력치, 비용, 오프라인 보상, 소환, 저장 검증). 화면과 분리돼 있어 단위 테스트 가능
- `src/core.test.js` 규칙 단위 테스트
- `src/game.html` 화면과 전투 (지도 전체를 돌아다니는 자동 전투, 미니맵, 요원 탭, 훈련소, 소환)
- `build.js` core.js 와 제작사 로고를 game.html 에 넣어 한 파일짜리 `dist/index.html` 을 만듦
- `docs/` 그림 주문서
- `assets/brand/` 제작사 글자 로고 (수사 3팀과 같은 SVG)

## 명령
```
npm test        # 단위 테스트
npm run build   # dist/index.html 생성
```
