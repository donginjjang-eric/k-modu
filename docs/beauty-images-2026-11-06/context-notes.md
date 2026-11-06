# 뷰티 상품 이미지 복구 조사 기록

2026-11-06. `master`와 `origin/master`가 모두 `7ab98eb`이고 추적 파일 수정은 없었다. 기존 미추적 파일은 유지한다.

운영 `/api/public/beauty-products`는 29개 상품을 반환한다. 첫 상품의 `/uploads/products/...png`는 302로 Railway 버킷의 서명 URL에 연결되고, GET 결과는 403 XML `SignatureDoesNotMatch`였다. 앞의 다섯 상품 이미지는 HEAD 결과 모두 403이다. 서명 범위의 리전은 `sin`이다. Railway 공식 문서의 버킷 자격증명 예시는 서명 리전 `auto`를 사용한다. 따라서 서버가 Railway 버킷 URL을 `sin`으로 서명하는 설정 차이를 먼저 검증한다. 지역 자체를 변경하지 않으며 업로드 이미지 데이터도 건드리지 않는다.

Railway CLI 인증은 현재 만료되어 `Unauthorized`가 나온다. GitHub 푸시 후 실제 공개 이미지와 화면으로 배포 결과를 확인한다.

서명 회귀 테스트는 수정 전 `sin !== auto`로 실패했고, 수정 후 통과했다. `tests/public-beauty-catalog.test.mjs` 2개도 통과했다. 첫 `npm run build`는 Windows `.next` junction 충돌, Webpack 빌드는 `.next` 폴더의 권한 오류로 실패했다. 동일한 Turbopack 빌드를 권한 제한 없이 다시 실행하자 TypeScript와 70개 정적 페이지 생성까지 성공했다. 기존 `src/lib/storage.ts`의 넓은 파일 추적 경고는 여전히 출력된다.

운영 확인. 수정 커밋 `17221c2`를 GitHub에 올린 뒤 공개 상품 이미지의 서명 범위가 `sin`에서 `auto`로 바뀌었다. 첫 상품 GET은 403에서 이미지 200(1,550,288바이트)으로 회복됐다. 운영 공개 API의 앞 10개 이미지가 모두 200이고 실제 Chrome 화면에서 앞 5개 카드 사진이 정상 표시됐다. 검증 스크린샷은 로컬 `tmp/beauty-images-2026-11-06/live.png`에 있다. Railway CLI 인증이 만료돼 배포 상태 자체는 읽지 못했지만 실제 운영 응답과 화면으로 반영을 검증했다.
