import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/[...legacyPath]/route";

test("the legacy file route serves the Malaysia meeting creator data script", async () => {
  const response = await GET(
    new Request("http://localhost/data/malaysia-meeting-creators.js"),
    { params: Promise.resolve({ legacyPath: ["data", "malaysia-meeting-creators.js"] }) },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/javascript/);
  assert.match(await response.text(), /KMODU_MALAYSIA_MEETING_CREATORS/);
});

test("the legacy file route serves the new Malaysia meeting creator data script", async () => {
  const response = await GET(
    new Request("http://localhost/data/malaysia-new-meeting-creators.js"),
    { params: Promise.resolve({ legacyPath: ["data", "malaysia-new-meeting-creators.js"] }) },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/javascript/);
  assert.match(await response.text(), /KMODU_MALAYSIA_NEW_MEETING_CREATORS/);
});

test("the legacy file route serves the Vietnam artist data script", async () => {
  const response = await GET(
    new Request("http://localhost/data/vietnam-artists.js"),
    { params: Promise.resolve({ legacyPath: ["data", "vietnam-artists.js"] }) },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^text\/javascript/);
  assert.match(await response.text(), /KMODU_VIETNAM_ARTISTS/);
});
