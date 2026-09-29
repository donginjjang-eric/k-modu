// 베트남 아티스트 7명의 계정과 실제 사진 카드 연결을 검증한다.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import "../data/malaysia-meeting-creators.js";
import "../data/malaysia-new-meeting-creators.js";
import "../data/vietnam-artists.js";

test("seven Vietnam artists have distinct Instagram accounts and attributable source photos", () => {
  const artists = globalThis.KMODU_VIETNAM_ARTISTS;
  const previous = [...globalThis.KMODU_MALAYSIA_MEETING_CREATORS, ...globalThis.KMODU_MALAYSIA_NEW_MEETING_CREATORS];
  const manifest = JSON.parse(readFileSync("docs/vietnam-artists-2026-09-29/source-manifest.json", "utf8"));
  assert.equal(artists.length, 7);
  assert.equal(manifest.length, 7);
  assert.equal(new Set([...previous, ...artists].map((item) => item.slug)).size, 45);
  assert.equal(new Set([...previous, ...artists].map((item) => item.instagram)).size, 45);
  for (const artist of artists) {
    const source = manifest.find((item) => item.slug === artist.slug);
    assert.ok(source);
    assert.equal(source.name, artist.name);
    assert.equal(source.instagram, artist.instagram);
    assert.ok(source.sourcePostUrl.startsWith(`https://www.instagram.com/${artist.instagram}/`));
    assert.ok(existsSync(source.sourceFile));
    assert.ok(existsSync(artist.image));
    for (const width of [360, 720]) assert.ok(existsSync(`assets/creator-thumbnails/${artist.slug}-${width}.webp`));
    assert.equal(artist.totalFollowers, null);
    assert.equal(artist.followersVerifiedAt, null);
    assert.equal(artist.market, "Vietnam");
  }
});
