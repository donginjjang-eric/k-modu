---
name: designer-profile-card
description: Use when the user supplies a folder of designer/brand profile photos (e.g. assets/DISIGNER/D_3) and wants them placed into a card on the K-MODU designers page — replacing or adding a card with a cover image + portfolio gallery and fitting Korean copy.
---

# Designer Profile Card (K-MODU)

디자이너 페이지(`designers.html`)의 카드 한 장을, 사용자가 올린 사진 폴더로 교체/추가하는 절차. 사진을 직접 보고 이름·설명·태그를 사진에 맞게 새로 쓴다.

## 데이터 구조
카드는 `designers.html`의 `const designerProfiles = [...]` 배열(대략 line 237~)에 튜플로 정의됨:

```
[variant, mainImage, name, kicker, description, [tags], { cta, gallery:[...] }, slug?]
```
- `variant`: 세로(portrait) 사진이면 **'tall'**, 가로면 'wide'. (상품형 카드는 'tall kfashion-card ...' + price/colors/status — 일반 런웨이/룩북 카드엔 불필요)
- `mainImage`: 카드 표지 1장
- `{ gallery: [...] }`: 클릭 시 제안 시트 포트폴리오에 표시. 렌더가 `[mainImage, ...gallery]`로 합치므로(`getProposalGalleryImages`) **gallery엔 메인 제외한 나머지**만 넣는다 → 표지 1 + 갤러리 N = 전체.
- `slug`(8번째): 넣지 말 것. 전용 페이지 없는 slug는 클릭 시 라우팅 깨질 수 있음. 생략하면 표준 제안 시트가 갤러리와 함께 열림.
- 갤러리 썸네일 레일은 `kfashion-card` 클래스일 때만 카드 면에 노출됨. 일반 카드는 표지만 보이고 갤러리는 클릭 후 포트폴리오에서 보인다(Maison Lune 카드와 동일 패턴 — index 0 참고).

## 순서
1. **사진 확인**: 올린 폴더의 이미지 3~5장을 Read로 직접 본다 (옷/제품 종류, 컬러, 무드). 같은 룩 멀티컷인지, 여러 룩인지 파악.
2. **대상 카드 지정**: 위치(“2번째”)는 PC/모바일 masonry가 달라 신뢰 금지 — **카드 이름**으로 지정. 사용자가 스샷으로 가리키면 그 카드의 현재 `name`을 찾아 매칭.
3. **카피 작성**: 사진에 맞는 `name`(영문 브랜드풍), `kicker`(예: 'Soft Knit Runway / Seoul'), 한국어 `description`(주변 카드 톤과 동일하게), `tags` 3개.
4. **튜플 교체**: 기존 카드 라인을 새 튜플로 Edit 교체. main=첫 사진, gallery=나머지. 경로는 **대소문자 정확히**(리눅스 서버 case-sensitive — 폴더명 `DISIGNER` 등 오타까지 그대로).
5. **이미지 최적화**: 큰 이미지(>1MB 또는 >1600px)면 `npm run optimize:images`(제자리, sharp). 이미 작으면(수백 KB, ≤512px 등) 생략 — 단 전체 스크립트는 기존 127장을 다시 건드리니, 새 폴더만 클 때는 그 폴더만 타깃 최적화.
6. **검증(로컬)**: `node` vm로 인라인 JS 구문 체크 → `PORT=80xx node local-static-server.mjs` 띄워 `/designers.html` 200, 모든 사진 200 확인. (확장자 없는 `/designers`는 레거시 서버에서 404 — 정상, Next에서만 동작)
7. **커밋 + 배포**: 커밋·푸시 후 `railway up --detach`. CLI가 `operation timed out` 떠도 업로드는 성공함 — `railway deployment list`로 새 SUCCESS 확인. 자세히는 [[railway-deploy-quirk]].
8. **프로덕션 검증**: `https://www.k-modu.co.kr/designers`에 새 카드명 노출 + 사진 200 확인.
9. **캐시 안내**: 새 이미지는 Cloudflare 첫 요청 MISS→이후 HIT. 사용자에겐 `Ctrl+Shift+R`. 이미지를 교체(같은 경로)했다면 Cloudflare Purge 필요 — [[cloudflare-asset-cache]].

## 참고
- 검증·배포·캐시 공통 운영 규칙은 [[railway-deploy-quirk]], [[cloudflare-asset-cache]] 메모리 참조.
- 실제 적용 예: `assets/DISIGNER/D_2` 10장 → "Maille Atelier Seoul" 카드(commit 43ebefe).
