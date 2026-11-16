// 뷰티 브랜드가 패션 디자이너 공개 화면에 섞이지 않고 브랜드 작업공간을 구별하는지 검증합니다.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeBrandCategory } from "../src/lib/brand-partner-center.js";
import { isBeautyProductCategory } from "../src/lib/db.ts";

test("브랜드 분야는 뷰티와 패션을 구별한다", () => {
  assert.equal(normalizeBrandCategory("K-뷰티"), "beauty");
  assert.equal(normalizeBrandCategory("K-패션"), "fashion");
  assert.equal(normalizeBrandCategory("복합"), "hybrid");
});

test("상품 분야도 뷰티와 패션을 구별한다", () => {
  for (const category of ["스킨케어", "메이크업", "헤어·바디", "기타", "skincare"]) {
    assert.equal(isBeautyProductCategory(category), true, category);
  }
  for (const category of ["상의", "하의", "악세서리", "top", "outerwear"]) {
    assert.equal(isBeautyProductCategory(category), false, category);
  }
});

test("공개 디자이너 경로는 뷰티 전용 브랜드를 제외한다", async () => {
  const files = await Promise.all([
    "src/lib/db.ts",
    "src/app/api/public/styling-board/route.ts",
    "src/app/api/public/designer-portfolio/route.ts",
    "src/app/designers/[id]/page.tsx",
    "src/app/dashboard/beauty/layout.tsx",
  ].map((path) => readFile(path, "utf8")));
  assert.match(files[0], /return designers\.filter\(\(designer\) => normalizeBrandCategory\(designer\.brand_category\) !== "beauty"\)/);
  for (const source of files.slice(1, 4)) assert.match(source, /getApprovedFashionDesigner/);
  assert.match(files[4], /const publicHref = "\/beauty"/);
});

test("여러 브랜드가 있으면 이름을 보고 고르고 상품 관리에서도 현재 브랜드를 확인한다", async () => {
  const [access, auth, selection, manager] = await Promise.all([
    "src/lib/workspace-access.ts",
    "src/lib/auth.ts",
    "src/app/dashboard/workspaces/page.tsx",
    "src/components/ProductManager.tsx",
  ].map((path) => readFile(path, "utf8")));
  assert.match(access, /designers\.brand_name AS brand_name/);
  assert.doesNotMatch(auth, /isMasterAdminEmail\(user\.email\) && matching\.length > 0/);
  assert.match(selection, /membership\.brand_name/);
  assert.match(manager, /현재 브랜드/);
  assert.match(manager, /다른 브랜드 선택/);
});

test("오른쪽 문의 버튼은 노란색 대신 파란색으로 구분한다", async () => {
  const script = await readFile("auth-nav.js", "utf8");
  assert.match(script, /\.kakao-quick-banner \{[\s\S]*?background: #2458df;/);
  assert.doesNotMatch(script, /background: #fee500;/);
});

test("상품 목록과 수정 API가 선택한 센터의 상품만 다룬다", async () => {
  const [db, collection, item] = await Promise.all([
    "src/lib/db.ts",
    "src/app/api/products/route.ts",
    "src/app/api/products/[id]/route.ts",
  ].map((path) => readFile(path, "utf8")));
  assert.match(db, /return workspaceType \? products\.filter\(\(product\) => isBeautyProductCategory/);
  assert.match(db, /lower\(trim\(products\.category\)\) = ANY\(\$2::text\[\]\)/);
  assert.match(collection, /getProductsForDesigner\(designer\.id, workspace\.workspace_type\)/);
  assert.match(collection, /isBeautyProductCategory\(category\)/);
  assert.match(item, /getProductForDesigner\(designer\.id, id, auth\.workspace\.workspace_type\)/);
  assert.match(item, /if \(!current\) return Response\.json\(\{ ok: false, error: "Product not found\." \}, \{ status: 404 \}\)/);
});
