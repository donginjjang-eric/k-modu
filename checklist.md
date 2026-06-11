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
- [ ] Railway 배포 후 운영 확인 (수동)
