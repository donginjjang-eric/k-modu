import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public beauty catalog only exposes active products from approved beauty partners', async () => {
  const db = await readFile(new URL('../src/lib/db.ts', import.meta.url), 'utf8');
  const route = await readFile(new URL('../src/app/api/public/beauty-products/route.ts', import.meta.url), 'utf8');

  assert.match(db, /export async function getPublicBeautyProducts/);
  assert.match(db, /products\.status = 'active'/);
  assert.match(db, /designers\.approval_status = 'approved'/);
  assert.match(db, /beauty_partner/);
  assert.match(db, /memberships\.status = 'active'/);
  assert.match(route, /getPublicBeautyProducts/);
  assert.doesNotMatch(route, /contact_email|contact_phone|supply_price/);
});

test('beauty board replaces samples with real database products when available', async () => {
  const moduleSource = await readFile(new URL('../beauty-products.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../beauty.html', import.meta.url), 'utf8');

  assert.match(moduleSource, /fetch\('\/api\/public\/beauty-products'/);
  assert.match(moduleSource, /normalizePublicBeautyProduct/);
  assert.match(moduleSource, /boardProducts = publicProducts/);
  assert.match(moduleSource, /등록 상품/);
  assert.match(html, /beauty-products\.js\?v=[^"']+/);
});
