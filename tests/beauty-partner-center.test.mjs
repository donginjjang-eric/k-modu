import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("beauty routes use the guarded partner identity and owner-scoped existing data", async () => {
  const [layout, home, brand, products] = await Promise.all([
    source("../src/app/dashboard/beauty/layout.tsx"),
    source("../src/app/dashboard/beauty/page.tsx"),
    source("../src/app/dashboard/beauty/brand/page.tsx"),
    source("../src/app/dashboard/beauty/products/page.tsx"),
  ]);

  for (const routeSource of [layout, home, brand, products]) {
    assert.match(routeSource, /requireBeautyPartner\(\)/);
    assert.doesNotMatch(routeSource, /requireApprovedDesigner\(/);
  }
  assert.match(home, /getProductsForDesigner\(designer\.id, "beauty_partner"\)/);
  assert.match(home, /getPortfolioImagesForDesigner\(designer\.id\)/);
  assert.match(brand, /getPortfolioImagesForDesigner\(designer\.id\)/);
  assert.match(products, /getProductsForDesigner\(designer\.id, "beauty_partner"\)/);
  assert.match(brand, /<BrandProfileStudio[\s\S]*mode="beauty"/);
  assert.match(products, /<ProductManager[\s\S]*mode="beauty"/);
});

test("beauty shell is distinct, responsive, and exposes only real current data", async () => {
  const [layout, home, nav, css] = await Promise.all([
    source("../src/app/dashboard/beauty/layout.tsx"),
    source("../src/components/BeautyPartnerHome.tsx"),
    source("../src/components/BeautyPartnerNav.tsx"),
    source("../src/app/dashboard/beauty/beauty.css"),
  ]);

  assert.match(layout, /K-MODU/);
  assert.match(layout, /뷰티 파트너 센터/);
  assert.match(layout, /BeautyPartnerSideNav/);
  assert.match(layout, /BeautyPartnerMobileNav/);
  assert.match(home, /profileCompleted/);
  assert.match(home, /productCount/);
  assert.match(home, /publishedProductCount/);
  assert.doesNotMatch(home, /매출|조회수|전환율/);
  assert.match(nav, /aria-disabled="true"/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("fashion studio shell resolves the selected fashion workspace", async () => {
  const [layout, nav] = await Promise.all([
    source("../src/app/dashboard/designer/layout.tsx"),
    source("../src/components/StudioNav.tsx"),
  ]);
  assert.match(layout, /requireFashionPartner\(\)/);
  assert.doesNotMatch(layout, /requireApprovedDesigner\(/);
  assert.match(layout, /active="fashion_partner"/);
  assert.match(nav, /\/dashboard\/designer\/brand/);
  assert.doesNotMatch(nav, /\/dashboard\/beauty/);
});

test("existing product mutations use the selected workspace owner guard", async () => {
  const [collection, item] = await Promise.all([
    source("../src/app/api/products/route.ts"),
    source("../src/app/api/products/[id]/route.ts"),
  ]);
  assert.match(collection, /getSelectedPartnerForApi\(request\)/);
  assert.doesNotMatch(collection, /getApprovedDesignerForApi/);
  assert.match(collection, /createProductForDesigner\(\{[\s\S]*designerId:\s*designer\.id/);
  assert.match(item, /getSelectedPartnerForApi\(request\)/);
  assert.doesNotMatch(item, /getApprovedDesignerForApi/);
  assert.match(item, /getProductForDesigner\(designer\.id, id, auth\.workspace\.workspace_type\)/);
  assert.match(item, /updateProductForDesigner\(designer\.id, id/);
  assert.match(item, /updateProductForDesigner\(designer\.id, id, \{ status: "hidden" \}\)/);
});
