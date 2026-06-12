# 컨텍스트 노트 — 공개 디자이너 리스트 DB 기반 전환

날짜: 2026-06-12 / 브랜치: `work/styling-board-2026-06-02`

## 배경
- designers.html(공개 디자이너 보드)은 ~40개 카드를 `designerProfiles` 배열에 하드코딩.
- 첫 번째 카드만 `data-designer-id="maison-lune-seoul"`로 실제 DB 계정과 연결돼 있었음.
- 디자이너 스튜디오(상품/포트폴리오/AI 룩)는 이미 로그인한 designer.id로 스코프됨.

## 결정과 이유
1. **공개 리스트는 `GET /api/public/designers`로 자동 생성.** designers.html은 정적 파일로 서빙되므로(`[...legacyPath]/route.ts`) 클라이언트 fetch가 유일한 DB 연동 방법. 서버 컴포넌트 전환은 페이지 전면 재작성이라 범위 밖.
2. **하드코딩 배열은 삭제하지 않고 `sampleDesignerProfiles` 폴백으로 강등.** API 실패 또는 승인 디자이너 0명일 때만 샘플 카드를 보여줘서 운영 페이지가 빈 화면이 되는 사고를 방지. DB에 승인 디자이너가 1명이라도 있으면 DB 카드만 노출(= 하드코딩 카드 미노출).
3. **카드 데이터 형태는 기존 튜플 포맷 유지.** `getProposalGalleryImages` 등 index 기반 헬퍼들이 `designerProfiles[index]` 튜플을 직접 읽기 때문에, DB 디자이너도 같은 튜플로 변환(`designerToProfile`)해 하위 로직 수정을 최소화.
4. **index 0 특례(마종룬 하드코딩 포트폴리오/에셋)는 샘플 모드에서만 적용.** DB 모드에서 0번 카드는 임의의 디자이너이므로 `isSampleBoard` 플래그로 분기.
5. **공개 노출은 승인(approved) 디자이너만.** `/api/public/styling-board`, `/api/public/designer-portfolio`, `/designers/[id]`에 `getApprovedDesigner` 게이트 추가. `/api/public/generate-tryon`은 이미 승인 검사를 하고 있었음.
6. **카드 메타(디자이너 이름)는 DB 값 우선.** DB 카드에는 `data-designer-name`을 심고, 제안 시트의 Designer 필드는 가짜 생성값 대신 실제 designer_name을 사용.
7. **데모 폴백(DATABASE_URL 없음, 비프로덕션)은 기존 패턴 유지.** 새 API도 demo Maison Lune 데이터를 반환해 로컬 개발이 깨지지 않게 함.

## 주의사항
- 미추적 파일(`etc/`, `outputs/`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `*.docx`)은 건드리지 않음.
- Railway 배포, 운영 도메인 https://www.k-modu.co.kr.
- 커밋은 (1) 승인 게이트, (2) DB 기반 공개 리스트 두 단위로 분리.

---

# 컨텍스트 노트 — 모달 노출 규칙 정리 (A+B)

날짜: 2026-06-12 / 브랜치: `work/styling-board-2026-06-02` (기준 031c5c3, Railway 배포 완료 상태에서 시작)

## 배경
- 스튜디오 포트폴리오는 이미 kind(`profile|lookbook|product|sample`)로 분류 업로드되는데, 모달이 (1) 전 분류를 한 갤러리로 합치고 (2) 빈 영역을 갤러리 이미지 재사용으로 채워서 "비슷한 모델 이미지 반복" 문제 발생.
- 협업 루프 C(샘플 요청→받은 의뢰)와 협업 조건 D는 이번 범위에서 제외하기로 결정 (사용자 선택: A+B만).

## 결정과 이유
1. **모달 왼쪽 캐러셀 + Portfolio Preview는 한 컴포넌트(gallery)라 profile+lookbook으로 통합 제한.** 캐러셀과 썸네일이 같은 배열을 공유하는 기존 구조를 유지(분리는 리빌드)하되, product/sample 컷을 제외해 분류 의미를 살림. profile/lookbook이 0장인 디자이너는 product+sample로 폴백해 빈 캐러셀 방지.
2. **Hero Products / Available Samples는 kind 그대로, 0건이면 섹션 숨김.** 갤러리 재사용 폴백(`getProposalAssetImages` slice 재활용)은 DB 카드에서 제거. 샘플 카드(폴백 보드)는 기존 연출 유지.
3. **Hero Products 소스는 포트폴리오 kind=product 유지 (products 테이블 아님).** "제품 컷"은 연출 사진, products 테이블은 스타일링 보드 보유 제품 목록으로 역할 분리 (사용자 합의).
4. **DB 카드 메타는 실데이터만 (Designer, City).** `getDesignerMeta`의 인덱스 순환 가짜값(Season 'Capsule 01' 등)은 샘플 카드 전용으로 강등.
5. **승인 AI 룩은 `/api/public/styling-board` 응답 확장으로 노출.** 별도 API 대신 기존 호출에 `approvedLooks` 필드 추가 (`getApprovedGeneratedLooksForDesigner` 헬퍼 이미 존재). 데모 모드는 빈 배열 — 데모에 승인 룩 데이터가 없어서이며 의도된 동작.
6. **승인 룩은 localStorage 히스토리와 분리된 `designerApprovedLooks` 배열로 합성 렌더.** 기존 `generatedLooks`는 디자이너 구분 없는 전역 세션 히스토리라 거기에 넣으면 다른 디자이너 모달로 누수됨. 합성 시 세션 생성분이 앞, 중복 src는 제거.

## 주의사항
- 기존 `generatedLooks`(localStorage)가 디자이너 구분 없이 공유되는 것은 기존 동작이라 이번에 손대지 않음.

---

# 컨텍스트 노트 — 구글 로그인 (디자이너 셀프 온보딩)

날짜: 2026-06-12 / 브랜치: `work/styling-board-2026-06-02`

## 배경
- 실제 디자이너가 스튜디오에 로그인할 계정을 만드는 경로가 앱에 없음. users 생성은 시드 스크립트(db-setup)뿐. 지원서(/api/applications)는 designers 행만 만들고, 관리자 승인도 상태만 변경.
- 사용자 결정: 임시 비밀번호 발급 대신 구글 OAuth. 신규 이메일은 자동 디자이너 등록(pending) 방식.

## 결정과 이유
1. **NextAuth 대신 직접 구현 (라우트 2개 + 헬퍼 1개).** 기존 인증이 자체 HMAC 세션 쿠키(`kmodu_session`)라서, 라이브러리를 들이면 세션 체계가 둘이 됨. Authorization Code Flow는 fetch 두 번이면 충분.
2. **id_token 디코딩 대신 userinfo 엔드포인트 호출.** JWT 서명 검증(JWKS 캐싱 등) 없이 TLS로 신뢰 가능. email_verified가 false면 거부.
3. **신규 사용자는 무조건 designer 역할.** admin은 기존 비밀번호 로그인 유지. 신규 user의 password_hash는 랜덤 32바이트를 정식 해시해 저장 → 비밀번호 로그인 사실상 불가, 구글 전용 계정.
4. **기존 지원서와 자동 연결.** 신규 구글 가입 시 `designers.contact_email`이 일치하고 user_id가 비어 있는 프로필이 있으면 그 프로필에 연결(지원→승인→구글로그인 동선 보존). 없으면 pending 디자이너 자동 생성(브랜드명은 구글 이름으로 임시 설정, 스튜디오에서 수정).
5. **pending 디자이너도 세션은 발급하되 /login?notice=approval_pending으로 안내.** 기존 requireApprovedDesigner 게이트가 미승인자를 어차피 차단하므로 이중 안전.
6. **버튼은 서버에서 GOOGLE_CLIENT_ID 존재 여부를 prop으로 내려 미설정 시 숨김.** 자격증명 발급 전에 배포해도 로그인 페이지가 깨지지 않음.
7. **redirect URI는 요청 헤더(x-forwarded-proto/host)에서 유도.** 운영(k-modu.co.kr)과 로컬(localhost:8010)을 환경변수 없이 모두 지원. Google Console에 두 URI 모두 등록 필요.

## 필요한 외부 설정 (사용자 작업)
- Google Cloud Console에서 OAuth 클라이언트 생성 → GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET을 Railway 환경변수로 등록. (완료: 마크브릿지 계정, 2026-06-12)
- 승인된 리디렉션 URI: https://www.k-modu.co.kr/api/auth/google/callback, http://localhost:8010/api/auth/google/callback

## 결정 번복 (2026-06-12, 사용자 피드백)
- ~~신규 이메일 자동 디자이너 등록~~ → **구글 로그인은 인증 전용.** 디자이너 등록은 기존 신청 페이지(/apply)가 담당.
  - 이유: 등록 신청 → 관리자 승인 → 로그인이라는 기존 동선이 이미 있고, 구글 로그인이 멋대로 프로필을 만들면 신청 절차가 무의미해짐.
  - 신청서 이메일(designers.contact_email)과 구글 이메일이 일치하면 user_id 자동 연결 (최초 로그인 또는 이후 로그인 어느 쪽이 먼저든 동작).
  - 신청 내역 없는 구글 계정 → /login?notice=apply_required 로 /apply 안내. user 행은 생성·유지(나중 신청과 연결용).
- 로그인 상태 가시화: /login은 로그인돼 있으면 폼 대신 상태 카드(이메일 + 다음 행동 + 로그아웃). 공개 헤더(auth-nav.js)는 비로그인=로그인 / 신청전=디자이너 신청 / 대기=승인 대기중 / 승인=디자이너 스튜디오 / admin=관리자 콘솔 + 로그아웃.
- ~~부산물: 구버전 자동 등록이 만든 디자이너 프로필 1건이 남아 있음~~ → 로그 확인 결과 오판. 운영 designers 테이블에 contact_email 컬럼이 없어서(지연 마이그레이션이 한 번도 안 돌았음) 자동 등록 INSERT/연결 UPDATE가 모두 실패했었음. 만들어진 것은 users 행 1건뿐.
- 버그 픽스: `linkDesignerByEmail`도 createDesignerApplication과 같은 ALTER TABLE 지연 마이그레이션을 먼저 실행하도록 수정 (column "contact_email" does not exist 해결).

## 확정된 접속 룰 (2026-06-12, 사용자 합의)
- 영역: 메인(누구나) / 스튜디오 `/studio`(승인 디자이너 + 프로필 연결된 관리자) / 관리자 `/admin`(admin 역할).
- 로그인은 구글 단일. 이메일/비밀번호 폼은 UI에서 제거(쓸 수 있는 계정 0개였음). API(/api/auth/login)는 백업용으로 유지.
- 로그인 후: 기본은 보던 페이지(메인) 복귀 + 환영 토스트(welcome=1). /admin·/studio·/apply 입구로 온 경우만 그 목적지로 (next 파라미터).
- 권한 불일치는 쫓아내지 않고 로그인 페이지 카드에서 안내 + 계정 전환 버튼.
- 관리자도 /apply로 본인 디자이너 프로필을 만들 수 있음 (겸직). admin은 연결 프로필 있으면 스튜디오 입장, 없으면 콘솔로 안내.
- 인앱 브라우저(카톡 등)는 구글 OAuth 차단 → 로그인 페이지가 자동으로 외부 브라우저 탈출 (kakaotalk://web/openExternal, Android intent).
- 관리자 콘솔 구성: 운영 홈 / 회원 관리(가입자 전체, 신청 전 포함) / 디자이너 승인(대기 우선 정렬, 상태별 액션) / 상품 검수 / AI 검수.
