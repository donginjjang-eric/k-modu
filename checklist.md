<!-- #6 스타일 토큰 리팩터 진행 체크리스트 -->
# 체크리스트 — 스타일 토큰 리팩터 (#6)

## A. Font-weight 정규화 (먼저, 안전) — 완료 (커밋 92bcb4c)
- [x] platform.css `:root`에 weight 토큰 추가 (`--fw-regular`~`--fw-black` + `--fw-hero`)
- [x] index.html 인라인 `:root`에 동일 토큰 미러
- [x] font-weight 리터럴 → `var(--fw-*)` 치환 (platform.css / index.html / apply.html / apply-complete.html)
- [x] 변종 정규화: 560 → semibold(600), 720 → bold(700)
- [x] git diff 검증(font-weight 줄만 변경) → 시각 검증(computed weight) → 커밋

## B. 색상 토큰화 (신중) — index.html 완료 / platform.css 보류(사유 기록)
- [x] index.html 색상 토큰화 (#050505/#f7f7f4/#101010 → --ink/--paper/--outer, no-op) — 커밋 9f077fe
- [~] platform.css 색상 토큰화 **보류(회귀로 revert)**. 정밀 검증에서 creator-detail 다크 모드 기준 `color:#050505`→`var(--ink)` 치환 시 4개는 가시화(fix)되나 12개(nav/타이틀/스탯)는 라이트-온-라이트로 사라짐. 원인은 다크테마가 부분적으로만 적용(토픽바/일부 표면이 다크로 안 바뀜)되기 때문.
- [ ] (선결조건) 다크테마 표면/토픽바 미적용 버그 수정 → 그 후 platform.css 색상 토큰화 안전 진행 가능
- 비고: platform.css는 이미 견고한 토큰 시스템 보유(--ink/--paper/--accent/--panel/--input-bg/--card-dark-* 등 + 다크 오버라이드, apply/apply-complete 인라인은 토큰 사용 중). 남은 리터럴 다수는 일회성 그림자/오버레이 알파라 강제 토큰화 가치 낮음.

## C. 마무리
- [ ] HANDOFF.md 갱신(#6 완료 반영, 남은 색상 미세항목 명시)
- [ ] 메모리(kmodu-type-scale)에 weight 토큰 추가 기록
