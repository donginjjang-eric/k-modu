<!-- #6 스타일 토큰 리팩터 — 결정 기록(이어가는 세션용) -->
# 컨텍스트 노트 — 스타일 토큰 리팩터 (#6)

## 배경
- 사용자 지시: "전체"(잔여작업 전부) → 그중 #6은 "둘 다 지금 진행"(weight 정규화 + 색상 토큰화).
- 회귀 위험이 커서 **weight 먼저(안전), 색상 나중(신중)** 으로 분리.

## 현황 조사 결과
- 인라인 `<style>` 보유 페이지: index.html, apply.html, apply-complete.html. 나머지는 platform.css 링크.
- index.html은 platform.css 미연결(독립) → `:root` 토큰 별도 미러 필요. 다크테마 규칙 0개.
- 다크테마 규칙: platform.css 24, apply 6, apply-complete 4, admin/creator-detail 3.

## Font-weight 스케일(확정)
- `--fw-regular:400 / --fw-medium:500 / --fw-hero:520 / --fw-semibold:600 / --fw-bold:700 / --fw-extrabold:800 / --fw-black:900`
- `--fw-hero(520)`는 문서화된 히어로/페이지 타이틀 전용 의도라 별도 보존.
- 변종 정규화: **560 → 600**(`.board-head h2`, 대형 섹션 제목 — 히어로 520과 구분 위해 semibold), **720 → 700**(`.market-card h3`).

## 색상 토큰화 방침(예정)
- platform.css `:root`에 이미 토큰 다수 존재: --paper/--ink/--muted/--line/--panel(#fff)/--black(#050505)/--dark(#0b0b0b)/--blue-black/--accent/--accent-ink/--topbar-bg/--input-bg/--card-dark-bg/--card-dark-border. 다크테마 전부 오버라이드.
- 다크테마에서 토큰이 뒤집히므로(예: --ink #050505→#f7f7f4) 리터럴→토큰 치환은 **용례별 의미 확인 필수**. 무지성 치환 금지.
- 원칙: 같은 값→같은 토큰만 통합. **다른 알파값을 한 토큰으로 병합 금지**(시각 변화). freq=1 변종은 보류.
- index.html(다크테마 없음)은 순수 no-op이라 안전.

## 색상 토큰화 실행 결과(중요)
- index.html: 안전 토큰화 완료(다크테마 없음 = no-op). 커밋 9f077fe.
- platform.css: **보류**. `color:#050505`→`var(--ink)` 20곳 시도 후 다크테마 정밀 검증에서 회귀 확인 → revert.
  - 검증법: 다크 모드에서 `color:rgb(5,5,5)` 요소를 찾아 유효 배경 명도 측정. creator-detail 기준 4개는 다크 배경 위(현재 안 보임→토큰화하면 fix), 12개(nav/page-title/스탯)는 **라이트 배경 위**(현재 보임→토큰화하면 라이트-온-라이트로 사라짐).
  - 근본 원인: **다크테마가 부분적으로만 적용됨**(topbar/일부 표면이 라이트 유지). 핸드오프 #57 "다크테마 대비 확인 필요"와 동일 이슈.
  - 결론: 다크테마 표면 미적용을 먼저 고친 뒤라야 platform.css 색상 토큰화가 안전. 그 전에는 무지성 치환 금지.

## 발견한 선결 버그(후속)
- 다크테마 미완성: admin/creator-detail 등에서 topbar·일부 카드/표면이 다크로 전환되지 않아, 라이트 배경 위 라이트 텍스트로 가독성 깨짐(다수). 색상 토큰화의 선결 과제.

## 주의
- 라인엔딩: 작업본 LF, git이 체크아웃 시 CRLF 변환(기존 repo 설정). 스크립트 수정 시 newline='' 유지로 디프 청결.
- 푸시는 사용자 "깃업" 시에만. 로컬 커밋은 의미 단위로 진행.
