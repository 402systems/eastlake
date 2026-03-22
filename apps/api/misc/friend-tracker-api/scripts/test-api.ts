/**
 * End-to-end test for the friend-tracker API.
 * Runs against a live wrangler dev server.
 *
 * Usage:
 *   npx tsx scripts/test-api.ts <email> <password>
 *   FT_EMAIL=… FT_PASSWORD=… npx tsx scripts/test-api.ts
 *
 * Assumes wrangler dev is running on localhost:8787.
 */

import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:8787';
const SUPABASE_URL = 'https://sgsbfelkbsoueiickbrk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_BIXr0dVqTzDWsXnfblaIvg_kp2gHCdZ';

const email = process.argv[2] || process.env.FT_EMAIL;
const password = process.argv[3] || process.env.FT_PASSWORD;

if (!email || !password) {
  console.error('Usage: npx tsx scripts/test-api.ts <email> <password>');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.headers.get('content-type')?.includes('json')
    ? await res.json()
    : null;
  return { status: res.status, json };
}

async function main() {
  // Auth
  console.log('Signing in…');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error('Auth failed:', error.message);
    process.exit(1);
  }
  const token = data.session.access_token;
  console.log('');

  // 1. Auth errors
  console.log('Auth errors');
  const noAuth = await fetch(`${BASE}/friends`);
  assert(noAuth.status === 401, 'GET /friends without token → 401');

  const badAuth = await fetch(`${BASE}/friends`, {
    headers: { Authorization: 'Bearer bad-token' },
  });
  assert(badAuth.status === 401, 'GET /friends with bad token → 401');
  console.log('');

  // 2. List (empty or existing)
  console.log('GET /friends');
  const list = await api('GET', '/friends', token);
  assert(list.status === 200, 'returns 200');
  assert(Array.isArray(list.json), 'returns an array');
  const initialCount = (list.json as unknown[]).length;
  console.log('');

  // 3. Create
  console.log('POST /friends');
  const created = await api('POST', '/friends', token, {
    name: '__test_friend__',
    phone_number: '555-0000',
    birthday: '2000-01-01',
  });
  assert(created.status === 201, 'returns 201');
  assert(created.json.name === '__test_friend__', 'name matches');
  assert(Array.isArray(created.json.groups), 'groups is an array');
  const id: string = created.json.id;
  console.log('');

  // 4. Hangout
  console.log('POST /friends/:id/hangout');
  const hangout = await api('POST', `/friends/${id}/hangout`, token);
  assert(hangout.status === 200, 'returns 200');
  assert(
    typeof hangout.json.last_action === 'string',
    'last_action is a date string'
  );
  console.log('');

  // 5. Add to group
  console.log('PUT /friends/:id/groups/:name');
  const addGroup = await api('PUT', `/friends/${id}/groups/test-group`, token);
  assert(addGroup.status === 200, 'returns 200');
  assert(
    addGroup.json.groups.includes('test-group'),
    'groups contains test-group'
  );

  const addGroup2 = await api('PUT', `/friends/${id}/groups/test-group`, token);
  assert(
    addGroup2.json.groups.filter((g: string) => g === 'test-group').length ===
      1,
    'no duplicate on re-add'
  );
  console.log('');

  // 6. Remove from group
  console.log('DELETE /friends/:id/groups/:name');
  const rmGroup = await api(
    'DELETE',
    `/friends/${id}/groups/test-group`,
    token
  );
  assert(rmGroup.status === 200, 'returns 200');
  assert(!rmGroup.json.groups.includes('test-group'), 'group removed');
  console.log('');

  // 7. Delete group from all friends
  console.log('DELETE /groups/:name');
  await api('PUT', `/friends/${id}/groups/bulk-test`, token);
  const bulkDel = await api('DELETE', '/groups/bulk-test', token);
  assert(bulkDel.status === 204, 'returns 204');
  const afterBulk = await api('GET', '/friends', token);
  const friend = (afterBulk.json as { id: string; groups: string[] }[]).find(
    (f) => f.id === id
  );
  assert(!friend?.groups.includes('bulk-test'), 'group removed from friend');
  console.log('');

  // 8. Delete friend
  console.log('DELETE /friends/:id');
  const del = await api('DELETE', `/friends/${id}`, token);
  assert(del.status === 204, 'returns 204');
  const afterDel = await api('GET', '/friends', token);
  assert(
    (afterDel.json as unknown[]).length === initialCount,
    'back to initial count'
  );
  console.log('');

  // 9. 404
  console.log('404 fallback');
  const notFound = await api('GET', '/nope', token);
  assert(notFound.status === 404, 'unknown route → 404');
  console.log('');

  // Summary
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
