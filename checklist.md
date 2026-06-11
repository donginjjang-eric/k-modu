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
- [ ] 의미 단위 커밋 (헬퍼+API / 승인 게이트 / DB 기반 보드) 및 푸시
- [ ] 배포 후 운영(https://www.k-modu.co.kr/designers)에서 승인 디자이너 카드 노출 확인 (수동)
