// 한 디자이너의 모든 자료(상품·포트폴리오·AI룩·받은 의뢰)를 다른 디자이너로 이전하는 1회성 마이그레이션.
// 기본은 dry-run(미리보기). 실제 반영은 --apply, 원본 디자이너/데모 계정 삭제는 --delete-source 를 추가한다.
//
// 사용 예 (운영 DB):
//   1) 미리보기:  DATABASE_URL=... node scripts/reassign-designer-content.mjs
//   2) 실제 반영: DATABASE_URL=... node scripts/reassign-designer-content.mjs --apply --delete-source
//
// SOURCE/TARGET 기본값은 "Maison Lune Seoul(데모) → KLARA STUDIO(실계정)" 이전에 맞춰져 있다.
import pg from "pg";

const { Pool } = pg;

const SOURCE = process.env.SOURCE_DESIGNER_ID || "maison-lune-seoul";
const TARGET = process.env.TARGET_DESIGNER_ID || "fe54a0f0-60f9-4635-98aa-883f0c3a638a";
const APPLY = process.argv.includes("--apply");
const DELETE_SOURCE = process.argv.includes("--delete-source");

// 옮길 콘텐츠 테이블 (designers(id) FK). generation_logs(시스템 로그)는 옮기지 않고 원본 삭제 시 SET NULL 처리.
const CONTENT_TABLES = ["products", "designer_portfolio_images", "generated_looks", "collab_requests"];

const databaseUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL(또는 MIGRATION_DATABASE_URL / DATABASE_PUBLIC_URL)이 필요합니다.");
  process.exit(1);
}
if (SOURCE === TARGET) {
  console.error("SOURCE와 TARGET이 같습니다. 중단합니다.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("railway") && !databaseUrl.includes(".railway.internal")
    ? { rejectUnauthorized: false }
    : undefined,
});

const client = await pool.connect();
try {
  await client.query("BEGIN");

  const src = await client.query("SELECT id, brand_name, user_id FROM designers WHERE id = $1", [SOURCE]);
  if (!src.rowCount) throw new Error(`원본 디자이너를 찾을 수 없습니다: ${SOURCE}`);
  const tgt = await client.query("SELECT id, brand_name FROM designers WHERE id = $1", [TARGET]);
  if (!tgt.rowCount) throw new Error(`대상 디자이너를 찾을 수 없습니다: ${TARGET}`);

  console.log(`이전: [${src.rows[0].brand_name}] ${SOURCE}`);
  console.log(`  →  [${tgt.rows[0].brand_name}] ${TARGET}`);

  const counts = {};
  for (const table of CONTENT_TABLES) {
    const r = await client.query(`SELECT count(*)::int AS n FROM ${table} WHERE designer_id = $1`, [SOURCE]);
    counts[table] = r.rows[0].n;
  }
  console.table(counts);

  if (!APPLY) {
    await client.query("ROLLBACK");
    console.log("\nDRY-RUN — 변경 없음. 실제 반영: --apply  (원본 삭제까지: --apply --delete-source)");
    process.exit(0);
  }

  let moved = 0;
  for (const table of CONTENT_TABLES) {
    const r = await client.query(`UPDATE ${table} SET designer_id = $2 WHERE designer_id = $1`, [SOURCE, TARGET]);
    moved += r.rowCount;
    console.log(`  ${table}: ${r.rowCount}건 이전`);
  }
  console.log(`총 ${moved}건 이전 완료.`);

  if (DELETE_SOURCE) {
    const userId = src.rows[0].user_id;
    await client.query("DELETE FROM designers WHERE id = $1", [SOURCE]);
    console.log(`원본 디자이너 삭제: ${SOURCE}`);
    if (userId) {
      // 이 유저가 다른 디자이너에 연결돼 있지 않을 때만 계정 삭제 (데모 'test' 계정 정리)
      const other = await client.query("SELECT 1 FROM designers WHERE user_id = $1 LIMIT 1", [userId]);
      if (!other.rowCount) {
        const u = await client.query("DELETE FROM users WHERE id = $1 RETURNING email", [userId]);
        if (u.rowCount) console.log(`원본 디자이너 계정 삭제: ${u.rows[0].email} (${userId})`);
      } else {
        console.log(`유저 ${userId}는 다른 디자이너에도 연결돼 있어 계정은 보존합니다.`);
      }
    }
  }

  await client.query("COMMIT");
  console.log("\nAPPLIED ✓  커밋 완료.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("\n실패 — 롤백했습니다:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
