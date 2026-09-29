import assert from "node:assert/strict";
import test from "node:test";

import {
  malaysiaMeetingFollowerTotal,
  syncMalaysiaMeetingCreators,
  toCreatorAccountImportRows,
} from "../scripts/sync-malaysia-meeting-creators.mjs";

class RecordingClient {
  queries = [];

  async query(sql, params) {
    this.queries.push({ sql, params });
    return { rowCount: 1, rows: [] };
  }
}

test("Malaysia meeting roster converts into 24 approved, unclaimed admin imports", async () => {
  const rows = toCreatorAccountImportRows(globalThis.KMODU_MALAYSIA_MEETING_CREATORS);

  assert.equal(rows.length, 24);
  assert.equal(new Set(rows.map((row) => row.creator_key)).size, 24);
  assert.equal(rows.every((row) => row.approval_status === "approved"), true);
  assert.equal(rows.every((row) => row.onboarding_source === "admin"), true);
  assert.equal(rows.every((row) => row.claim_state === "unclaimed"), true);
  assert.equal(rows.every((row) => row.user_id === null), true);
  assert.equal(rows.every((row) => row.google_email === ""), true);
  assert.equal(rows.every((row) => typeof row.instagram_followers === "number"), true);
  assert.equal(rows.every((row) => typeof row.tiktok_followers === "number"), true);
  assert.equal(rows.find((row) => row.creator_key === "bella-roticheesees")?.tiktok_followers, 0);
  assert.equal(rows.every((row) => row.followers_verified_at === "2026-08-24T00:00:00+09:00"), true);
  assert.equal(malaysiaMeetingFollowerTotal(rows), 5_031_738);
});

test("curated creator synchronization adds 45 accounts without replacing account ownership", async () => {
  const client = new RecordingClient();

  await syncMalaysiaMeetingCreators(client, "admin-backup");
  await syncMalaysiaMeetingCreators(client, "admin-backup");

  assert.equal(client.queries.length, 90);
  assert.deepEqual(
    client.queries.slice(0, 45).map(({ params }) => params[0]),
    client.queries.slice(45).map(({ params }) => params[0]),
  );
  assert.equal(new Set(client.queries.slice(0, 45).map(({ params }) => params[0])).size, 45);
  assert.equal(client.queries.slice(24, 38).every(({ params }) => params[19] === null), true);
  assert.equal(client.queries.slice(38, 45).every(({ params }) => params[9] === "Vietnam" && params[16] === null && params[19] === null), true);
  assert.equal(client.queries.every(({ params }) => params[2] === null), true);
  assert.equal(client.queries.every(({ params }) => params[3] === ""), true);
  assert.equal(client.queries.every(({ params }) => params[6] === "unclaimed"), true);
  assert.equal(client.queries.every(({ params }) => params[7] === "admin-backup"), true);

  const conflictUpdate = client.queries[0].sql.split("ON CONFLICT (creator_key) DO UPDATE SET")[1];
  assert.ok(conflictUpdate);
  assert.doesNotMatch(conflictUpdate, /\buser_id\s*=/);
  assert.doesNotMatch(conflictUpdate, /\bclaim_state\s*=/);
  assert.doesNotMatch(conflictUpdate, /\bonboarding_source\s*=/);
  assert.doesNotMatch(conflictUpdate, /\bgoogle_email\s*=/);
  assert.doesNotMatch(conflictUpdate, /\bcreated_by_admin_id\s*=/);
});
