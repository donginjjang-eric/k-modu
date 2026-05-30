<!-- K-MODU 작업 핸드오프 문서 — 다음 세션/담당자가 이어받기 위한 요약 -->
# K-MODU 핸드오프 (2026-05-30)

## 1. 프로젝트 개요
- **K-MODU**: 한국 디자이너 브랜드를 글로벌 패션/뷰티 크리에이터와 연결하는 **정적 HTML 사이트** (빌드 도구 없음, 순수 HTML/CSS/JS).
- 운영사: 마크브릿지(Markbridge).
- 경로: `C:\Users\user\Desktop\Markbridge\K-MODE_NEW1`

## 2. Git / 배포
- 브랜치: **`codex-kmodu-designer-profiles`** (master 아님). origin에 **push 완료** (최신 `c6ebcb6`).
- ✅ 원격 정리 완료: origin이 새 **`https://github.com/donginjjang-eric/k-modu.git`** 로 set-url 됨(fetch/push 정상).
- 로컬에 untracked 백업 파일 다수(`*.tar.gz`, `server-backup/`, `COMPANY/` 등) — 세션 이전부터 있던 것, 건드리지 않음.

## 3. 로컬 미리보기 (중요)
- **`serve.py`** = no-cache 헤더를 보내는 개발 서버 (브라우저 캐시 때문에 수정이 안 보이는 문제 방지). `.claude/launch.json`에 등록됨.
- 실행: `python serve.py 8080` → http://localhost:8080
- 일반 새로고침(F5)으로 최신 반영됨 (하드 리프레시 불필요).

## 4. 페이지 구조 / CSS 아키텍처
- **`index.html`** = 홈. **독립 페이지**로 platform.css를 링크하지 않고 자체 인라인 `<style>`을 씀. → 공용 토큰/스타일을 **별도로 미러링**해야 함(아래 디자인 시스템 참고).
- **`platform.css`** = 공용 스타일. 사용 페이지: `creators / designers / designer-brief / apply / apply-complete / admin / login / brand-detail / creator-detail / designer-match`.
- 전 페이지 **Pretendard** 로드(과거엔 index/creators만 링크돼 폰트가 달라 보였음 → 전부 추가함).

## 5. 디자인 시스템 (이번 세션 핵심)
- **타입 스케일 토큰**: `:root`의 `--fs-display ~ --fs-nano` (platform.css + index.html `:root` 동일 미러링). 폰트 크기 조절은 **이 토큰만 바꾸면 전 페이지 일관 적용**됨. 대부분 `font-size: var(--fs-*)` 사용.
  - 값: display clamp(60-116), h1(50-86), h2(34-74), h3 32, title 26, title-sm 23, lead clamp(16-20), body-lg 19, body 15, sm 14, xs 13, label 12, label-sm 11, micro 10, nano 9.
- **히어로 타이틀**(about/designers/creators)은 토큰과 별개로 통일: `clamp(34px,4.2vw,62px)`, weight **520**. 셀렉터: `.designer-hero .page-title`, `.creator-brief h1`, index `.inside-title`.
- **상단 네비**(전 페이지 통일): 라벨 **한글**(소개/디자이너/크리에이터/문의), 링크 15px·weight 600·.08em, 버튼(.pill/.login-btn) 채워진 다크 + 모던 호버(lift+shadow), KR/US 활성 진하게·비활성 흐리게. in-page 앵커는 `scroll-behavior: smooth`.
- **로고**: `assets/k-modu-logo.png` (세리프 워드마크, 투명배경). `.brand img{height:28px}`. 다크테마는 `body.dark-theme .brand img{filter:invert(1)}`로 흰 로고 처리.
- 색/매직넘버 정리는 후속(타이포 범위 밖).

## 6. 주요 기능 흐름
- **designers.html**: 디자이너 브랜드 보드(카드). 카드 클릭 → 제안 시트(포트폴리오/Hero Products/샘플 사진은 **풀스크린 스와이프 갤러리**로 열림) → "이 브랜드와 협업하기" → designer-brief.
- **creators.html**: 크리에이터 매칭 보드.
  - 필터: 우측 **슬라이드 드로어**(검색/정렬/Status/Platform/Type/Market/Fit). 트리거는 보드 우측 "필터🔍".
  - 카테고리: 모바일은 가로 스크롤 칩, 데스크톱은 카드.
  - 카드 클릭 → **제안 상세 시트**(배지 + 메트릭 + 추천 협업형태 + **협업 진행 단계 타임라인** + 안내 + "이 크리에이터에게 제안하기"). PC 2단, 모바일 통합 스크롤.
  - **시딩 인플루언서 20인** 통합(`.market-card.is-seeding`, JS `seedingCreators` 배열). ⚠️ **프로필 이미지는 임시 플레이스홀더**(us-female-*/mainmodel 순환) — 실제 이미지 20장 확보 시 `seedingImgs` 교체.
- **모델 A 흐름 완성**: 크리에이터 카드 → 제안하기 → `designer-brief.html?creator=<name>` → 브리프에 "제안 대상" 칩 + Brief Name 프리필.

## 7. 핵심 의사결정 (에이전트 회의 결과)
- **협업 모델 = 단계적 하이브리드**: A(브랜드가 데이터 기반으로 크리에이터에게 먼저 제안) 먼저 구현(완료). B(크리에이터 자발 지원)는 **상태저장·알림 필요 → 백엔드 도입 후**. B 경로 UI는 아직 만들지 말 것.

## 8. 남은 일 (우선순위)
> 2026-05-30 세션 업데이트 — ✅는 이번에 처리(로컬 커밋, **푸시는 "깃업" 대기**).
1. **시딩 인플루언서 실제 프로필 이미지 20장** 확보 → 플레이스홀더 교체. (보류 — 이미지 확보 시)
2. ✅ 원격 URL `k-modu.git`로 업데이트 완료.
3. ✅ Creators↔Designers 상호 참조 링크(보드 푸터) 추가. (커밋 `c34152d`)
4. ✅ favicon(K 모노그램)/og:image 로고 기반 추가 + 전 페이지 메타. (커밋 `c34152d`) ⚠️ `og:image`는 배포 도메인 확정 후 **절대 URL**로 교체 필요.
5. ✅ 본문 영문 디스플레이 타이틀 — **영문 유지** 확정(변경 없음).
6. font-weight·색상 토큰화:
   - ✅ font-weight 토큰화+정규화 완료(`--fw-*`, 560→600·720→700). (커밋 `92bcb4c`)
   - ✅ index.html 색상 토큰화(다크테마 없음 = no-op). (커밋 `9f077fe`)
   - ⏸ platform.css 색상 토큰화 **보류** — 선결: 아래 8번(다크테마 버그) 수정 후라야 안전. 무지성 치환 시 다크 모드에서 nav/타이틀이 라이트-온-라이트로 사라짐.
7. **B 경로**(크리에이터 자발 지원) — 백엔드 도입 시.
8. 🆕 **다크테마 대비 버그 수정**(platform.css 색상 토큰화의 선결과제): admin/creator-detail 등에서 topbar·일부 카드/표면이 다크로 전환 안 돼 라이트-온-라이트로 텍스트가 사라짐. (핸드오프 #9의 "다크테마 대비 확인 필요"와 동일 이슈)

## 9. 주의사항(Gotchas)
- **index.html은 platform.css 미연결** → 토큰/공용 스타일 수정 시 index 인라인도 같이 미러링.
- 폰트 크기 일괄 조절은 `:root --fs-*`만 건드리면 됨(둘 다).
- 다크테마(`body.dark-theme`)는 admin/apply/apply-complete/creator-detail에 토글 있음 — 로고/대비 확인 필요.
- 미리보기 캐시 이슈 → 항상 `serve.py`(no-cache) 사용.
- 시딩 인플루언서 데이터는 개인정보(이메일/전화) 미노출 원칙. ER/Fit 없으면 `—` (추정치 금지).

## 10. 메모리 (다음 세션 자동 로드)
`C:\Users\user\.claude\projects\C--Users-user-Desktop-Markbridge-K-MODE-NEW1\memory\` 에 핵심 결정 기록됨: `kmodu-collab-model`, `kmodu-seeding-data`, `kmodu-type-scale`.

## 11. 새 세션 빠르게 시작하기 (복붙용)
새 창에서 이 프로젝트 폴더로 Claude Code를 열고, 아래 한 줄을 그대로 붙여넣으면 됨. (메모리는 자동 로드되지만 HANDOFF를 먼저 읽게 하면 가장 빠름.)

**① 기본 이어가기**
```
K-MODU 이어서 작업할게. 먼저 HANDOFF.md 읽고 현재 상태/남은 일 파악한 다음, serve.py로 미리보기(8080) 띄워줘. 준비되면 알려줘.
```

**② 바로 특정 작업 (예: 시딩 이미지 교체)**
```
K-MODU 이어서 할게. HANDOFF.md 읽고, creators.html의 seedingCreators 시딩 인플루언서 플레이스홀더 이미지를 [경로/폴더]의 실제 이미지 20장으로 교체해줘. serve.py로 확인까지.
```

**③ 폰트/디자인 미세조정**
```
K-MODU 이어서. HANDOFF.md 참고해서 platform.css :root의 --fs-* 토큰만 조절해 전체 폰트 [키우기/줄이기]. index.html :root 미러도 같이.
```

빠르게 하는 팁:
- 항상 **HANDOFF.md 읽으라고 먼저 지시** → 구조/주의사항을 즉시 파악.
- 미리보기는 **`serve.py`(no-cache)** 로 띄우라고 명시 → 캐시 문제 없음.
- 폰트/스타일은 "토큰만 바꿔라", index는 "미러도 같이"라고 콕 집어주면 실수 없음.
- 큰 작업/QA는 "에이전트팀 꾸려서"라고 하면 병렬로 빠르게 처리.
- 끝나면 "깃업"이라고 하면 push (원격은 `k-modu.git`).
