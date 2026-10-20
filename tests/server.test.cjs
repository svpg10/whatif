'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server.cjs');
const { scenario } = require('./fixtures.cjs');

async function app(t, options = {}) {
  let calls = 0;
  const server = createApp({ env: { GEMINI_API_KEY: 'test-key', ...options.env }, log: false,
    upstreamTimeoutMs: options.upstreamTimeoutMs,
    fetch: options.fetch || (async (url, init) => {
      calls++;
      assert.ok(url.startsWith('https://generativelanguage.googleapis.com/'));
      assert.equal(init.headers['x-goog-api-key'], 'test-key');
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(scenario) }] } }] }));
    }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (body = { question: 'What if I open a neighborhood bakery?' }, headers = {}) => fetch(origin + '/api/scenario', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-WhatIf-Request': '1', Origin: origin, ...headers }, body: JSON.stringify(body)
  });
  return { origin, post, calls: () => calls };
}
test('custom questions return a validated scenario and never the key', async t => {
  const { post, calls } = await app(t);
  const response = await post(); assert.equal(response.status, 200);
  assert.equal((await response.json()).scenario.title, scenario.title);
  assert.equal(calls(), 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('server denies secrets, repository internals, backend and traversal paths', async t => {
  const { origin } = await app(t);
  for (const pathname of ['/.env', '/.git/config', '/server.cjs', '/package.json', '/lib/scenario-schema.cjs', '/js/../.env', '/assets/%2e%2e%5c.env', '/%2eenv']) {
    const response = await fetch(origin + pathname);
    assert.equal(response.status, 404, pathname);
    assert.ok(!(await response.text()).includes('GEMINI_API_KEY'));
  }
  const response = await fetch(origin + '/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /object-src 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
test('cross-site, missing header, invalid input and oversized bodies fail before AI calls', async t => {
  const { post, calls } = await app(t);
  assert.equal((await post(undefined, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(undefined, { 'X-WhatIf-Request': '' })).status, 403);
  assert.equal((await post({ question: 'tiny' })).status, 400);
  assert.equal((await post({ question: 'x'.repeat(2001) })).status, 400);
  assert.equal((await post({ question: 'x'.repeat(20000) })).status, 413);
  assert.equal((await post({ question: 'A valid question', key: 'injected' })).status, 400);
  assert.equal(calls(), 0);
});
test('rate and global limits bound paid calls', async t => {
  const { post, calls } = await app(t, { env: { MAX_REQUESTS_PER_IP: '1', MAX_REQUESTS_PER_HOUR: '2' } });
  assert.equal((await post()).status, 200);
  const limited = await post(); assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));
  assert.equal(calls(), 1);
});
test('provider failures and malformed AI outputs do not leak upstream errors', async t => {
  for (const upstream of [new Response('secret-provider-debug test-key', { status: 500 }),
    new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"title":"incomplete"}' }] } }] }))]) {
    const { post } = await app(t, { fetch: async () => upstream });
    const response = await post(); assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('test-key'));
  }
});
test('missing API configuration fails explicitly; production requires a pinned HTTPS origin', async t => {
  const { post } = await app(t, { env: { GEMINI_API_KEY: '' } });
  assert.equal((await post()).status, 503);
  assert.throws(() => createApp({ env: { NODE_ENV: 'production' } }), /APP_ORIGIN/);
});
test('upstream deadline fails safely and global budget stops additional calls', async t => {
  const timeout = await app(t, { upstreamTimeoutMs: 20, fetch: async (url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  }) });
  assert.equal((await timeout.post()).status, 504);
  const capped = await app(t, { env: { MAX_REQUESTS_PER_IP: '10', MAX_REQUESTS_PER_HOUR: '1' } });
  assert.equal((await capped.post()).status, 200);
  assert.equal((await capped.post()).status, 429);
  assert.equal(capped.calls(), 1);
});
