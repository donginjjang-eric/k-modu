import { readFileSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return false;

  await query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ('admin-default', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'admin',
           updated_at = now()`,
    [email.toLowerCase(), hashPassword(password)],
  );
  return true;
}

export async function POST(request: Request) {
  const token = process.env.DB_SETUP_TOKEN;
  const requestToken = request.headers.get("x-setup-token");
  if (!token || requestToken !== token) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  await query(schema);
  const adminSeeded = await seedAdmin();

  return Response.json({
    ok: true,
    schemaApplied: true,
    adminSeeded,
  });
}
