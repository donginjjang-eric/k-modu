# K-MODU v0.5 전체 점검 보고서 (2026-06-12)

기준: `v0.5` 태그 (커밋 569d03f). 백업: GitHub 태그 + 로컬 아카이브(k-modu-v0.5-backup.tar.gz).
원칙: **갈아엎지 않는다.** 동작하는 시스템 위에 단계적으로 안전벨트 → 체질 개선 → 정돈 순서로 간다.

## 종합 진단

서비스 루프(온보딩 → 콘텐츠 → 공개 노출 → 관리)는 완성됐고 코드 품질도 타입 안전성 등 기본기는 양호.
다만 **"지금 잘 도는 것"과 "쌓여도 잘 도는 것" 사이의 격차**가 핵심 리스크. 미디어가 쌓이면 막히는 지점(볼륨 4.9GB, 백업 부재)과
운영 사고를 부를 지점(요청 중 DDL, 가짜 로그아웃, 무인증 신청 API)이 분명히 존재.

## 영역별 핵심 발견

### A. 인프라 (직접 점검)
| 발견 | 심각도 | 내용 |
|---|---|---|
| 고아 서비스 2개 | 🔴 | `web`(12일째 Crashed 방치), `MySQL`(k-modu가 참조 안 함) — 비용·혼란 유발 |
| 백업 부재 | 🔴 | Postgres 자동 백업 미확인, 볼륨(업로드 이미지) 백업 전략 없음 |
| SEED_DEMO_DATA=true | 🟠 | 데모 계정·상품이 운영 DB에 시드됨 (공개 보드에 데모 상품 4개 섞임) |
| 백업 관리자 부재 | 🟠 | 관리자 = 구글 계정 1개. OAuth 장애 시 콘솔 접근 불가 |
| 배포 방식 | 🟡 | 로컬 트리에서 CLI 배포, 헬스체크 없음(배포 시 수 초 끊김), Git 자동배포 아님 |
| 브랜치 상태 | 🟡 | `work/styling-board-2026-06-02`가 master보다 수십 커밋 앞 — 기준선(master) 머지 필요 |
| 리전 US West | 🟡 | 한국 사용자 레이턴시. 싱가포르 리전 이전은 P2 옵션 |

### B. 미디어 파이프라인 (이미지·영상 누적 관점)
| 발견 | 심각도 | 내용 |
|---|---|---|
| 볼륨 고갈 = 서비스 중단 | 🔴 | 4.9GB 한계, 용량 체크·정리 정책 없음. 가득 차면 업로드·AI 생성이 500 에러 |
| 생성물 정리 정책 없음 | 🟠 | 거부된 AI 룩·고아 파일 영구 잔존. 숏폼 영상 시작 시 월 수백 MB~GB 증가 예상 |
| AI 생성 메모리 스파이크 | 🟠 | 이미지 base64 변환으로 생성 1회당 수십~수백 MB 메모리 점유 |
| orphan URL | 🟡 | DB 캐시 히트 시 실제 파일 존재 미검증 |
| assets 152MB 매 배포 업로드 | 🟡 | 배포 속도·트래픽 비용. CDN/스토리지 분리 대상 |
| 잘된 점 ✅ | | 업로드 검증(8MB, 포맷), sharp 최적화, 스트리밍 서빙, path traversal 방어, 1년 캐시 헤더, 일일 생성 제한 |

### C. 백엔드 (Next.js 앱)
| 발견 | 심각도 | 내용 |
|---|---|---|
| 요청 경로에서 DDL 실행 | 🔴 | ALTER TABLE이 API 호출 중 실행 (db.ts 3곳) — 동시성 경합 위험. 스키마 단일 소스(db/schema.sql) + 부팅 시 1회로 이동 |
| 가짜 로그아웃 | 🔴 | 대시보드 "로그아웃"이 쿠키를 안 지움 (`<Link href="/login">`) — POST 호출로 교체 |
| 신청 API 무인증 | 🟠 | /api/applications가 비로그인 제출 허용 — 화면 게이트와 불일치, 스팸 가능 |
| 세션에 역할 고정 | 🟡 | 역할 변경이 재로그인 전까지 미반영 (오늘 실제로 겪음) — 알려진 트레이드오프로 문서화 |
| db.ts 938줄 + 데모 분기 50곳 | 🟡 | 유지보수 부담. 데모 모드를 시드 기반으로 점진 축소 |
| 인덱스 부재 | 🟡 | products.designer_id, generated_looks.designer_id 등 — 데이터 쌓이기 전 추가 |
| 시드/스키마 불일치 | 🟡 | scripts/db-setup.mjs ↔ db.ts ↔ db/schema.sql 3곳이 따로 놂 |
| 오탐 정정 | | "LoginForm use client 누락" 지적은 오탐 (이미 있음) |

### D. 레거시 프런트
| 발견 | 심각도 | 내용 |
|---|---|---|
| designers.html 비대 | 🟡 | 2,180줄 중 1,891줄이 인라인 JS (샘플 데이터+모달). 데이터 JSON 분리 + JS 모듈화 대상 |
| 헤더 12벌 복붙 | 🟡 | ~480줄 중복. 빌드 시 주입 or 공통 스크립트로 단계적 통합 |
| index.html 인라인 CSS 2,700줄 | 🟡 | platform.css와 중복 — 외부화로 캐싱·용량 개선 |
| 죽은 파일 3개 | 🟢 | designer-studio.html, admin.html, login.html (리다이렉트로 도달 불가) — 제거 |
| assets 정리 | 🟢 | `DISIGNER` 오타 폴더, `KakaoTalk_*.png` 원본명, 미사용 추정 파일 |
| 다크테마 잔재 | 🟢 | platform.css에 24개 dark-theme 블록. **활성화 금지** (부분 적용 버그, 메모리 kmodu-dark-theme-prereq) — 토큰화 선행 전까지 동결 |
| local-static-server.mjs | 🟢 | 레거시 개발 서버 — Next로 충분해지면 제거 |

## 재정비 로드맵 (최적 시나리오)

### P0 — 안전벨트 ✅ 완료 (2026-06-12)
1. ~~고아 서비스 정리~~ ✅ `web` 삭제(사용자), `MySQL` 삭제(데이터 확인: 결제 0·셀러 0·데모 계정뿐) + mysql-volume 6/14 자동 삭제 예약
2. Postgres 자동 백업 — **유일하게 남은 항목**: Railway 대시보드 → Postgres → Backups 활성 확인 (사용자만 가능). 수동 백업 도구는 `scripts/backup-db.mjs` 추가됨 (`railway run --service Postgres node scripts/backup-db.mjs out.json`)
3. ~~`/api/applications` 로그인 요구~~ ✅ 비로그인 401 확인
4. ~~진짜 로그아웃~~ ✅ LogoutButton 4곳 교체
5. ~~SEED_DEMO_DATA=false + 데모 상품 숨김~~ ✅ + 숨김 상품을 되살리던 폴백 병합 코드 제거
6. ~~볼륨 용량 가드~~ ✅ 여유 300MB 미만 저장 거부, 85% 경고

### P1 — 체질 개선 (2026-06-12: 5개 중 4개 완료)
1. ~~DB 스키마 단일 소스화~~ ✅ db/schema.sql이 유일 소스, 부팅 시 ensure-schema.mjs로 멱등 적용. 요청 경로 DDL 9곳 제거, 인덱스 4종 추가
2. ~~Railway Object Storage(버킷) 도입~~ ✅ `kmodu-media`(싱가포르). 업로드·AI 생성물 버킷 저장, presigned 302 서빙(egress 무료), 볼륨 파일 127개(146MB) 이관 완료. 볼륨 원본은 이중 보관. URL·DB 무변경
3. ~~배포 체계~~ ✅ master를 mainline으로 채택(-s ours 머지), GitHub(donginjjang-eric/k-modu, master) 자동 배포 연결, railway.json 헬스체크(/api/auth/me)로 무중단 전환. 첫 자동 배포 SUCCESS 확인
4. 정리 크론: 거부된 룩·고아 파일 주기 삭제, 용량 리포트 — **남음 (다음 작업)**
5. ~~백업 관리자 계정~~ ✅ ceo@markbridge.kr 부팅 시드 (비밀번호는 Railway Variables). 덤: robots.txt 서빙 추가, 도메인이 Cloudflare 프록시 경유임을 확인(CDN 캐싱 무료 옵션 확보)

### P2 — 정돈·확장 (1개월+, 여유 있을 때 하나씩)
1. designers.html 모듈화 (샘플 데이터 JSON 분리 → JS 모듈)
2. 헤더 공통화, index.html CSS 외부화
3. assets 정리 (폴더명·파일명·미사용 제거, 배포 패키지 축소/CDN)
4. 죽은 파일 3종 + local-static-server.mjs 제거
5. db.ts 데모 분기 축소, 입력 검증 유틸 통일
6. 리전(싱가포르) 검토, 이미지 변환 CDN, 숏폼 영상 파이프라인 설계

## 비용 메모
- P0: 추가 비용 없음 (고아 서비스 삭제로 오히려 절감)
- P1 버킷: 저장량 기준 ~$5-10/월 수준에서 시작
- P2 CDN/리전: 트래픽 성장 후 판단
