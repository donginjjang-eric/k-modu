// 부팅 1단계: 필수 환경변수와 위험 설정을 검증한다.
// 치명적(없으면 서비스 불가/비보안) 누락은 exit 1로 부팅을 막고, 권장 항목은 크게 경고만 한다.
const isProd = process.env.NODE_ENV === "production";

// 없으면 서비스가 동작하지 않거나 보안이 깨지는 항목 — 운영에서 누락 시 부팅 차단
const critical = [
  ["DATABASE_URL", () => Boolean(process.env.DATABASE_URL)],
  ["AUTH_SECRET", () => Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)],
];

// 없어도 부팅은 되지만 기능이 조용히 죽는 항목 — 크게 경고
const recommended = [
  ["OPENAI_API_KEY", () => Boolean(process.env.OPENAI_API_KEY)],
  ["GOOGLE_CLIENT_ID", () => Boolean(process.env.GOOGLE_CLIENT_ID)],
  ["GOOGLE_CLIENT_SECRET", () => Boolean(process.env.GOOGLE_CLIENT_SECRET)],
  ["S3_BUCKET / 버킷 자격증명", () => Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)],
];

const missingCritical = critical.filter(([, ok]) => !ok()).map(([name]) => name);
const missingRecommended = recommended.filter(([, ok]) => !ok()).map(([name]) => name);

// 운영에서 데모 데이터가 켜지면 가짜 디자이너/상품이 노출될 수 있다 — 절대 금지
const demoLeak = isProd && process.env.KMODU_ENABLE_DEMO === "true";

if (isProd && missingRecommended.length) {
  console.warn(`[startup] WARNING — 다음 기능이 비활성 상태로 시작됩니다(환경변수 누락): ${missingRecommended.join(", ")}`);
}

// 부팅 차단은 운영에서만 (개발은 DB 없이 데모로 도는 게 정상)
if (demoLeak) {
  console.error("[startup] FATAL — 운영 환경에서 KMODU_ENABLE_DEMO=true 입니다. 가짜 데모 데이터가 공개될 수 있어 부팅을 중단합니다. 이 변수를 제거하세요.");
  process.exit(1);
}
if (isProd && missingCritical.length) {
  console.error(`[startup] FATAL — 필수 환경변수 누락: ${missingCritical.join(", ")}. 설정 후 다시 배포하세요.`);
  process.exit(1);
}

console.log(isProd ? "[startup] env OK (운영 필수 충족)" : "[startup] dev 모드 — env 검증 생략");
process.exit(0);
