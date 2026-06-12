// 운영 Postgres 전체 테이블을 JSON으로 덤프하는 백업 스크립트 (읽기 전용)
// 사용: railway run --service Postgres node backup-db.mjs <출력파일경로>
import { writeFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
const outPath = process.argv[2] || "k-modu-db-backup.json";
if (!url) {
  console.log("no db url in env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("railway") ? { rejectUnauthorized: false } : undefined,
});

const tables = await pool.query(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`,
);

const dump = {};
for (const { table_name } of tables.rows) {
  const rows = await pool.query(`SELECT * FROM "${table_name}"`);
  dump[table_name] = rows.rows;
  console.log(`${table_name}: ${rows.rowCount} rows`);
}

writeFileSync(outPath, JSON.stringify(dump, null, 1));
console.log(`saved: ${outPath}`);
await pool.end();
