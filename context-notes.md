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
