# 베트남 아티스트 7명 작업 노트

- 2026-09-29. 사용자 제공 PPTX에는 Chi Pu, Trang Pháp, Đức Phúc, Hòa Minzy, Isaac, Thiều Bảo Trâm, Văn Mai Hương 총 7명이 있다. SNS 계정 링크와 핸들은 들어 있지 않다.
- 기존 운영 공개 카드 111명과 관리자 명단 50건에서 이 7명과 동일한 이름은 없었다. 이름 기준 확인이므로 공식 계정 확인을 별도로 진행한다.
- PPTX의 팔로워 수는 일부 추정치이며 2026-07 자료다. 사이트 신규 카드에 확정 수치로 옮기지 않는다.
- 기존 말레이시아 14명 작업에서 사용한 인물 없는 배경과 카드 생성 방식을 참고한다. 인물 사진은 각 아티스트의 실제 SNS 게시물에서 확보한다.
- 7명의 Instagram 공개 페이지 제목과 게시물 이미지 설명에 이름·계정이 일치함을 확인했다. 최종 핸들은 `chipupu`, `trang_phap`, `nguyenducphuc_`, `hoaminzy_rose`, `isaaclion`, `thieubaotram`, `vmhuong`이다. `ngxducphuc_`와 `hoa.minzy`는 Instagram에서 이용 불가였고, 특히 `hoa.minzy`는 SNS 자료상 Facebook 계정이므로 사용하지 않았다.
- 최종 사진 7장의 게시물 URL·설명·원본 크기는 `source-manifest.json`에 기록했다. 얼굴을 생성하지 않았고, 원본 사진을 인물 없는 배경에 일반 합성했다. 카드 검토 이미지는 `card-review.jpg`다.
- PPTX에는 TikTok 계정 주소가 없으므로 아티스트 카드에는 확인한 Instagram 링크만 넣었다. PPTX의 2026-07 팔로워 추정치는 게시하지 않고 `—`로 표시한다. 관리자 데이터의 팔로워 수는 스키마에 맞춰 0, 확인일은 null로 저장한다.
- 명단·동기화 테스트 7개, 데이터 경로 테스트 3개, `npm run build`, 인라인 스크립트 검사, Chrome 로컬 렌더링이 통과했다. 실제 카드 118개, 신규 아티스트 카드 7개 및 이미지 21개 HTTP 200을 확인했다.
- 운영 배포 `d812d08`이 Railway `SUCCESS`이고 시작 로그의 curated creator 동기화가 성공했다. 운영 Chrome 실제 렌더링 결과 공개 카드 118개·신규 아티스트 7개, 카드 원본 이미지 7개 모두 HTTP 200이었다. 운영 DB 읽기 전용 확인 결과 신규 관리자 행 7개 모두 이름·Instagram 계정이 일치하고 국가 Vietnam, 팔로워 확인일 null, TikTok 계정 null이다.
