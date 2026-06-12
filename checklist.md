# 공개 디자이너 리스트 DB 기반 전환 체크리스트

작업 브랜치: `work/styling-board-2026-06-02` (기준 커밋 a0d7632)

- [x] DB 헬퍼: `getApprovedDesigner(id)` 추가 (승인된 디자이너만 반환)
- [x] DB 헬퍼: 승인 디자이너 일괄 포트폴리오 조회 `getApprovedPortfolioImagesForDesigners(ids)` 추가
- [x] 신규 공개 API `GET /api/public/designers` (승인 디자이너 + 승인 포트폴리오 이미지)
- [x] 공개 API 승인 게이트: `/api/public/styling-board`, `/api/public/designer-portfolio`
- [x] 공개 상세 페이지 `/designers/[id]` 승인 게이트
- [x] designers.html: 하드코딩 카드 배열을 샘플 폴백으로 강등 (`sampleDesignerProfiles`)
- [x] designers.html: `/api/public/designers` 기반 카드 자동 생성 + 카드별 `data-designer-id` 연결
- [x] designers.html: 카드 이벤트/리빌 옵저버를 렌더 함수로 이동 (비동기 렌더 대응)
- [x] designers.html: index 0 하드코딩 특례(`getProposalGalleryImages`/`getProposalAssetImages`)를 샘플 모드에서만 적용
- [x] `npm run build` 통과 확인
- [x] 런타임 검증: `/api/public/designers` 응답, 승인 게이트 200/404, `designerToProfile` 변환 로직
- [x] 의미 단위 커밋 (헬퍼+API / 승인 게이트 / DB 기반 보드) 및 푸시
- [x] 배포 후 운영(<https://www.k-modu.co.kr/designers>)에서 승인 디자이너 카드 노출 확인 (수동) — 2026-06-12 Railway 배포(928e78ba) 후 API 200/카드 1건 확인

## 모달 노출 규칙 정리 (A+B) 체크리스트

작업 브랜치: `work/styling-board-2026-06-02` (기준 커밋 031c5c3)

### A. 표시 규칙 — designers.html 단독 (DB 카드만, 샘플 카드는 현행 유지)

- [x] `groupLivePortfolioImages`: gallery를 profile+lookbook으로 제한 (product/sample 제외, 둘 다 없으면 product+sample로 폴백)
- [x] `renderProposalAssetPreviews`: 빈 Hero Products / Available Samples 섹션 숨김
- [x] `loadProposalPortfolioForDesigner`: 갤러리 이미지 재사용 폴백 제거 (분류 그대로 전달)
- [x] `openProposalSheet`: DB 카드는 초기 에셋을 빈 상태로 렌더 (API 도착 전 재사용 이미지 노출 방지)
- [x] `openProposalSheet`: DB 카드 메타는 실데이터 항목만 (Designer/City) — Season/Hero Product 생성값 숨김
- [x] `node --check`로 인라인 스크립트 구문 검증 + `groupLivePortfolioImages` 단독 실행 3케이스 확인

### B. 승인 AI 룩 → 모달 스타일링 보드 탭

- [x] `/api/public/styling-board` 응답에 `approvedLooks` 추가 (`getApprovedGeneratedLooksForDesigner` 재사용)
- [x] designers.html: `designerApprovedLooks` 배열 추가, 세션 생성 히스토리와 합성 렌더 (localStorage 미저장)
- [x] `renderStylingBoard`(샘플)에서 초기화, `renderStylingBoardFromApi`(DB)에서 채움
- [x] `npm run build` 통과
- [x] 로컬 데모 모드 런타임 검증 (styling-board API에 `approvedLooks: []` 포함, 페이지 200, 수정 JS 서빙 확인)
- [x] 의미 단위 커밋 2건 (A: 표시 규칙 / B: 승인 룩 노출)
- [x] Railway 배포 후 운영 확인 — 2026-06-12 배포(c0682d4b): styling-board에 approvedLooks 1건, A+B 스크립트 서빙 확인. 승인 포트폴리오는 아직 0장이라 에셋 섹션 숨김이 정상 동작

## 구글 로그인 (P0: 디자이너 온보딩) 체크리스트

작업 브랜치: `work/styling-board-2026-06-02` (기준 커밋 99ceb47)

배경: 디자이너 계정을 만드는 경로가 앱에 없음 (시드 스크립트뿐). 구글 OAuth로 셀프 온보딩.

- [x] `src/lib/google-oauth.ts`: 인증 URL 생성 / 코드→토큰 교환 / userinfo 조회 헬퍼
- [x] `GET /api/auth/google`: state 쿠키 발급 후 구글 동의 화면으로 리다이렉트
- [x] `GET /api/auth/google/callback`: state 검증 → 토큰 교환 → 이메일 확인 → 사용자 조회/자동 등록 → 세션 쿠키 발급
- [x] db 헬퍼 `findOrCreateGoogleUser`: 기존 user면 로그인, 신규면 user 생성(랜덤 비번) + 지원서(designers.contact_email) 자동 연결, 없으면 pending 디자이너 자동 생성
- [x] LoginForm: "Google로 계속하기" 버튼 (미설정 시 숨김 — 서버에서 prop 전달) + error/notice 쿼리 파라미터 메시지 표시
- [x] `npm run build` 통과
- [x] 로컬 검증: 미설정 시 /api/auth/google → 302 /login?error=google_not_configured, 로그인 페이지 버튼 숨김 확인
- [x] 커밋 + Google Cloud Console 설정 가이드 전달 (GOOGLE_CLIENT_ID/SECRET → Railway 환경변수)
- [x] (사용자) Google Cloud Console OAuth 클라이언트 생성 → Railway 환경변수 등록 → 배포 완료
- [ ] 구글 로그인 실패(google_failed) 원인 추적 — 콜백 에러 로깅 배포함, 재시도 후 로그 확인 필요

## 공개 헤더 인증 메뉴 재정비 체크리스트

- [x] `/api/auth/me`: 디자이너 승인 상태(approvalStatus) 포함
- [x] 공통 스크립트 `auth-nav.js`: 비로그인=로그인 / admin=관리자 콘솔 / 승인 디자이너=디자이너 스튜디오 / 미승인=승인 대기중 + 로그아웃 버튼 주입
- [x] index.html 인라인 syncAuthLinks 제거 (승인 여부 무시하던 버그 소스)
- [x] 9개 공개 페이지: `data-auth-link` 부여, `/login.html` → `/login` 통일, 스크립트 포함
- [x] `/login.html` 307 → `/login` 리다이렉트 (옛 로그인 페이지 차단)
- [x] `npm run build` + 로컬 검증 (js 서빙·리다이렉트·me 응답·index 와이어링)
- [ ] 배포 후 운영에서 로그인/로그아웃/스튜디오 버튼 상태 확인
