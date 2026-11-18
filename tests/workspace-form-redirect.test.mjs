// 실제 센터 선택 요청이 프록시 뒤에서도 서비스 도메인에 머무는지 검증합니다.
import assert from "node:assert/strict";
import { mock, test } from "node:test";

const memberships = [
  { id: "beauty-1", workspace_type: "beauty_partner" },
  { id: "creator-1", workspace_type: "creator" },
];
const cookieWrites = [];
const cookieDeletes = [];
let signedIn = true;

mock.module("@/lib/auth", {
  namedExports: {
    getCurrentUser: async () => signedIn ? { id: "test-user" } : null,
    sessionCookieName: "kmodu_session",
  },
});
mock.module("@/lib/workspace-access", {
  namedExports: {
    listUserWorkspaces: async () => memberships,
    resolveUserWorkspace: async ({ membershipId }) => memberships.find(({ id }) => id === membershipId),
  },
});
mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      set: (...args) => cookieWrites.push(args),
      delete: (name) => cookieDeletes.push(name),
    }),
  },
});

const { POST } = await import("../src/app/api/workspaces/select/route.ts");
const internalUrl = "https://0.0.0.0:8080/api/workspaces/select";

test("뷰티와 크리에이터 센터 선택 폼은 공개 도메인에서 상대 경로로 이동한다", async () => {
  for (const [membershipId, next, expected] of [
    ["beauty-1", "", "/dashboard/beauty"],
    ["creator-1", "", "/dashboard/creator"],
    ["beauty-1", "/dashboard/beauty/products", "/dashboard/beauty/products"],
    ["creator-1", "/dashboard/beauty/products", "/dashboard/creator"],
  ]) {
    const response = await POST(new Request(internalUrl, {
      method: "POST",
      body: new URLSearchParams({ membershipId, next }),
    }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), expected);
    assert.deepEqual(cookieWrites.at(-1)?.slice(0, 2), ["kmodu_workspace", membershipId]);
  }
});

test("가입 화면의 기존 뷰티 센터 버튼은 같은 JSON 응답을 받는다", async () => {
  const response = await POST(new Request(internalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipId: "beauty-1", next: "/dashboard/beauty/products" }),
  }));
  assert.deepEqual(await response.json(), { ok: true, redirectTo: "/dashboard/beauty/products" });
});

test("더 이상 열 수 없는 센터와 만료된 로그인은 안내 화면으로 이동한다", async () => {
  const unavailable = await POST(new Request(internalUrl, {
    method: "POST",
    body: new URLSearchParams({ membershipId: "no-longer-available" }),
  }));
  assert.equal(unavailable.status, 303);
  assert.equal(unavailable.headers.get("location"), "/dashboard/workspaces?error=selection");

  signedIn = false;
  try {
    const expired = await POST(new Request(internalUrl, {
      method: "POST",
      body: new URLSearchParams({ membershipId: "creator-1" }),
    }));
    assert.equal(expired.status, 303);
    assert.equal(expired.headers.get("location"), "/login?next=%2Fdashboard%2Fworkspaces");
  } finally {
    signedIn = true;
  }
});

test("다른 구글 계정으로 바꿀 때도 공개 도메인에서 인증을 다시 시작한다", async () => {
  const { POST: switchGoogleAccount } = await import("../src/app/api/auth/google/switch/route.ts");
  const response = await switchGoogleAccount(new Request("https://0.0.0.0:8080/api/auth/google/switch", { method: "POST" }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/api/auth/google");
  assert.deepEqual(cookieDeletes, ["kmodu_session", "kmodu_oauth_state", "kmodu_oauth_next"]);
});
