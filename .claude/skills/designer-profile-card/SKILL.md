---
name: designer-profile-card
description: Use when the user supplies a folder of designer/brand profile photos (e.g. assets/DISIGNER/D_4) and wants them placed into a card on the K-MODU designers page — replacing or adding a card with a cover image + portfolio gallery and fitting Korean copy.
---

# Designer Profile Card (K-MODU) — v2

디자이너 페이지(`designers.html`)의 카드 한 장을, 사용자가 올린 사진 폴더로 교체/추가하는 절차. 사진을 직접 보고 이름·설명·태그를 사진에 맞게 새로 쓴다. (v2: 파일명 정리 + 폴더 단위 타깃 최적화 추가)

## 데이터 구조
카드는 `designers.html`의 `const designerProfiles = [...]` 배열(대략 line 237~)에 튜플로 정의됨:

```
[variant, mainImage, name, kicker, description, [tags], { cta, gallery:[...] }, slug?]
```
- `variant`: 세로(portrait) 사진이면 **'tall'**, 가로면 'wide'.
- `mainImage`: 카드 표지 1장.
- `{ gallery: [...] }`: 클릭 시 제안 시트 포트폴리오. 렌더가 `[mainImage, ...gallery]`로 합치므로(`getProposalGalleryImages`) **gallery엔 메인 제외한 나머지만** 넣는다 → 표지 1 + 갤러리 N = 전체.
- `slug`(8번째): **넣지 말 것**(전용 페이지 없는 slug는 클릭 라우팅 깨질 수 있음). 생략하면 표준 제안 시트가 갤러리와 함께 열림.
- 갤러리 썸네일 레일은 `kfashion-card` 클래스일 때만 카드 면에 노출. 일반 카드는 표지만 보이고 갤러리는 클릭 후 포트폴리오에 보임(Maison Lune index 0 = 동일 패턴).

## 순서
1. **사진 확인**: 폴더 이미지 3~5장을 Read로 직접 본다(옷/제품 종류·컬러·무드, 같은 룩 멀티컷인지 여러 룩인지).
2. **파일명 정리**: 지저분한 이름(KakaoTalk_… 등)이면 **`1.png ~ N.png`로 리네임**. base(접미사 없는 것)=1, `_01`=2 … 순. 예:
   ```bash
   cd assets/DISIGNER/D_N
   mv "KakaoTalk_..._.png" 1.png
   for i in 1 2 3 4 5 6 7 8 9; do mv "KakaoTalk_..._0$i.png" "$((i+1)).png"; done
   ```
   (이미 `1.png~`면 생략)
3. **최적화(폴더 단위, 큰 이미지만)**: 폴더에 >1MB 또는 >1600px 이미지가 있으면 **그 폴더만** 제자리 최적화. **전역 `npm run optimize:images`는 기존 127장을 다시 건드려 git 노이즈 → 쓰지 말 것.** 타깃 명령:
   ```bash
   node -e "
   const sharp=require('sharp'),fs=require('fs');const dir='assets/DISIGNER/D_N';
   (async()=>{let b=0,a=0;for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.png'))){const p=dir+'/'+f,before=fs.statSync(p).size;
   const buf=await sharp(fs.readFileSync(p),{failOn:'none'}).resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9,palette:true,quality:80,effort:10}).toBuffer();
   if(buf.length<before)fs.writeFileSync(p,buf);b+=before;a+=Math.min(buf.length,before);}
   console.log((b/1048576).toFixed(2)+'MB ->',(a/1048576).toFixed(2)+'MB');})();
   "
   ```
   최적화 후 대표 1장을 Read로 열어 밴딩/품질 확인.
4. **대상 카드 지정**: 위치(“2번째”)는 PC/모바일 masonry가 달라 신뢰 금지 — **카드 이름**으로 지정. 사용자가 스샷으로 가리키면 그 카드 현재 `name`을 찾아 매칭.
5. **카피 작성**: 사진에 맞는 `name`(영문 브랜드풍), `kicker`(예: 'Tailored Bermuda / Street'), 한국어 `description`(주변 카드 톤 동일), `tags` 3개.
6. **튜플 교체**: 기존 카드 라인을 Edit로 교체. main=`1.png`, gallery=`2.png`…`N.png`. 세로 사진이면 `variant`='tall'. 경로 **대소문자 정확히**(리눅스 case-sensitive — 폴더명 `DISIGNER` 오타까지 그대로).
7. **검증(로컬)**: `node` vm로 인라인 JS 구문 체크 → `PORT=80xx node local-static-server.mjs`로 `/designers.html` 200, 모든 사진 200. (확장자 없는 `/designers`는 레거시 서버 404 — 정상, Next에서만 동작)
8. **커밋+배포**: 커밋·푸시 후 `railway up --detach`. CLI가 `operation timed out` 떠도 업로드는 성공 — `railway deployment list`로 새 SUCCESS 확인. 자세히 [[railway-deploy-quirk]].
9. **프로덕션 검증 + 캐시 안내**: `https://www.k-modu.co.kr/designers`에 새 카드명 + 사진 200 확인. 사용자에겐 `Ctrl+Shift+R`(첫 접속 Cloudflare MISS→이후 HIT). 같은 경로 이미지 교체 시 Cloudflare Purge — [[cloudflare-asset-cache]].

## 참고
- 운영 공통 규칙: [[railway-deploy-quirk]], [[cloudflare-asset-cache]].
- 적용 예: `D_2`→"Maille Atelier Seoul"(commit 43ebefe), `D_3`(1~10.png, 15.85MB→5.85MB)→"Bermuda Line Studio"(commit 2c5d06b).
