// 신규 미팅 크리에이터 명단과 실물 사진 카드의 연결을 검증한다.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import "../data/malaysia-meeting-creators.js";
import "../data/malaysia-new-meeting-creators.js";

test("14 new creators have unique handles, source photos, and no public rates or guessed followers", () => {
  const creators = globalThis.KMODU_MALAYSIA_NEW_MEETING_CREATORS;
  const old = globalThis.KMODU_MALAYSIA_MEETING_CREATORS;
  const manifest = JSON.parse(readFileSync("docs/creator-roster-2026-09-29/source-manifest.json", "utf8"));
  assert.equal(creators.length, 14);
  assert.equal(manifest.length, 14);
  assert.equal(new Set([...old, ...creators].map((creator) => creator.slug)).size, 38);
  assert.equal(new Set([...old, ...creators].map((creator) => creator.instagram)).size, 38);
  for (const creator of creators) {
    const source = manifest.find((item) => item.slug === creator.slug);
    assert.ok(source);
    assert.equal(source.instagram, creator.instagram);
    assert.equal(source.tiktok, creator.tiktok);
    assert.match(source.sourcePostUrl, new RegExp(`^https://www\\.instagram\\.com/${creator.instagram.replaceAll(".", "\\.")}/`));
    assert.ok(existsSync(source.sourceFile));
    assert.ok(existsSync(creator.image));
    for (const size of [360, 720]) assert.ok(existsSync(`assets/creator-thumbnails/${creator.slug}-${size}.webp`));
    assert.equal(creator.totalFollowers, null);
    assert.equal(creator.followersVerifiedAt, null);
  }
  const publicCode = readFileSync("data/malaysia-new-meeting-creators.js", "utf8");
  assert.doesNotMatch(publicCode, /RM\s*\d|\bprice\b|\brate\b/i);
});
