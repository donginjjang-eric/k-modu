// 뷰티 간편 가입의 입력, 중복 방지, 작업공간 생성 동작을 검증합니다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { createBeautySignup, validateBeautySignupInput } from "../src/lib/beauty-signup.ts";

const valid = {
  brandName: "테스트 뷰티",
  managerName: "담당자",
  category: "스킨케어",
  contactEmail: "hello@example.com",
  channelUrl: "https://example.com",
  consent: true,
};

test("간편 가입은 사업자 증빙 없이 필요한 정보만 받는다", () => {
  assert.deepEqual(validateBeautySignupInput(valid), { ok: true, value: valid });
  assert.equal(validateBeautySignupInput({ ...valid, consent: false }).ok, false);
  assert.equal(validateBeautySignupInput({ ...valid, category: "패션" }).ok, false);
  assert.equal(validateBeautySignupInput({ ...valid, channelUrl: "javascript:alert(1)" }).ok, false);
  assert.equal(validateBeautySignupInput({ ...valid, channelUrl: "" }).ok, true);
});

test("같은 계정의 같은 브랜드는 다시 만들지 않는다", async () => {
  const statements = [];
  const client = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("FROM designers")) return { rows: [{ id: "existing", approval_status: "approved" }] };
      return { rows: [{ id: "user" }] };
    },
  };
  const result = await createBeautySignup(client, "user", valid);
  assert.equal(result.duplicate, true);
  assert.equal(result.designerId, "existing");
  assert.equal(statements.length, 2);
  assert.match(statements[0].sql, /FOR UPDATE/);
});

test("신규 가입은 브랜드·활성 작업공간·감사 기록을 하나의 트랜잭션에 쓴다", async () => {
  const statements = [];
  const client = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql.includes("FROM designers")) return { rows: [] };
      if (sql.includes("INSERT INTO designers")) return { rows: [{ id: "brand-1" }] };
      if (sql.includes("INSERT INTO user_workspace_memberships")) return { rows: [{ id: "workspace-1" }] };
      return { rows: [] };
    },
  };
  const result = await createBeautySignup(client, "user-1", valid);
  assert.deepEqual(result, { duplicate: false, designerId: "brand-1", membershipId: "workspace-1" });
  assert.match(statements[2].sql, /'K-뷰티'.*'approved'/s);
  assert.match(statements[3].sql, /'beauty_partner'.*'active'/s);
  assert.match(statements[4].sql, /beauty_self_signup/);
});

test("실제 가입 화면의 스크립트가 파싱되고 뷰티 전용 경로로 제공된다", async () => {
  const [html, legacy, beauty] = await Promise.all([
    readFile("beauty-join.html", "utf8"),
    readFile("src/app/[...legacyPath]/route.ts", "utf8"),
    readFile("beauty.html", "utf8"),
  ]);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  new vm.Script(scripts[0][1]);
  assert.match(legacy, /"beauty\/join": "beauty-join.html"/);
  assert.match(beauty, /href="\/beauty\/join"/);
  assert.match(html, /fetch\("\/api\/beauty\/signup"/);
});
