'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const cp = require('node:child_process');
const { createVercelHandler } = require('../lib/vercel-handler.cjs');
const { scenario } = require('./fixtures.cjs');

async function invoke(handler, { url = '/api/scenario', method = 'POST', origin = 'https://whatif-red.vercel.app', headers = {}, body = { question: 'What if our team adopts chiplets?' } } = {}) {
  const req = { url, method, body, headers: { origin, 'content-type': 'application/json', 'x-whatif-request': '1', ...headers }, socket: {} };
  const res = Object.assign(new EventEmitter(), { headersSent: false, writableEnded: false,
    headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headersSent = true; for (const [k, v] of Object.entries(headers)) this.setHeader(k, v); },
    end(data) { this.body = JSON.parse(data); this.writableEnded = true; } });
  await handler(req, res);
  return res;
}
test('Vercel handler accepts parsed request bodies without a listening server and keeps the key private', async () => {
  let calls = 0;
  const handler = createVercelHandler({ log: false, env: { APP_ORIGIN: 'https://whatif-red.vercel.app', GEMINI_API_KEY: 'server-test-key' },
    fetch: async () => { calls++; return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(scenario) }] } }] })); } });
  const ok = await invoke(handler);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.scenario.title, scenario.title);
  assert.ok(!JSON.stringify(ok.body).includes('server-test-key'));
  assert.equal((await invoke(handler, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await invoke(handler, { body: { question: 'x'.repeat(20000) } })).status, 413);
  assert.equal(calls, 1);
});
test('Vercel exposes only non-secret configuration status and actionable setup errors', async () => {
  const handler = createVercelHandler({ log: false, env: { VERCEL_PROJECT_PRODUCTION_URL: 'whatif-red.vercel.app' } });
  const status = await invoke(handler, { url: '/api/status', method: 'GET' });
  assert.equal(status.status, 200);
  assert.equal(status.body.customScenariosConfigured, false);
  assert.equal(status.headers['cache-control'], 'no-store');
  assert.equal((await invoke(handler)).body.code, 'GEMINI_KEY_MISSING');
  const bad = createVercelHandler({ env: { APP_ORIGIN: 'https://whatif-red.vercel.app/' } });
  assert.equal((await invoke(bad)).body.code, 'DEPLOYMENT_CONFIG_INVALID');
});
test('this project’s exact production, deployment and branch origins work; other Vercel sites and spoofed hosts do not', async () => {
  let calls = 0;
  const handler = createVercelHandler({ log: false, env: { APP_ORIGIN: 'https://decisions.example.test',
    VERCEL_URL: 'whatif-test123-svpg.vercel.app', VERCEL_BRANCH_URL: 'whatif-git-main-svpg.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'whatif-red.vercel.app', GEMINI_API_KEY: 'test-key' },
    fetch: async () => { calls++; return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(scenario) }] } }] })); } });
  for (const origin of ['https://decisions.example.test', 'https://whatif-test123-svpg.vercel.app',
    'https://whatif-git-main-svpg.vercel.app', 'https://whatif-red.vercel.app']) {
    assert.equal((await invoke(handler, { origin })).status, 200, origin);
  }
  for (const origin of ['https://another-project.vercel.app', 'https://whatif-red.vercel.app.evil.example',
    'https://whatif-other-svpg.vercel.app']) {
    const result = await invoke(handler, { origin, headers: { host: 'whatif-red.vercel.app', 'x-forwarded-host': 'whatif-test123-svpg.vercel.app' } });
    assert.equal(result.status, 403, origin);
    assert.equal(result.body.code, 'ORIGIN_NOT_ALLOWED');
  }
  assert.equal((await invoke(handler, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal(calls, 4, 'rejected origins must not consume AI quota');
});
test('provider credential, permission, model and quota failures are distinguishable without raw diagnostics', async () => {
  for (const [status, reason, code] of [[400, 'API_KEY_INVALID', 'GEMINI_KEY_INVALID'], [403, null, 'GEMINI_ACCESS_DENIED'],
    [404, null, 'GEMINI_MODEL_UNAVAILABLE'], [429, null, 'GEMINI_QUOTA_EXCEEDED']]) {
    const handler = createVercelHandler({ log: false, env: { APP_ORIGIN: 'https://whatif-red.vercel.app', GEMINI_API_KEY: 'private-test-key' },
      fetch: async () => new Response(JSON.stringify({ error: { message: 'secret-provider-debug', details: [{ reason }] } }), { status }) });
    const response = await invoke(handler);
    assert.equal(response.status, 503);
    assert.equal(response.body.code, code);
    assert.ok(!JSON.stringify(response.body).includes('secret-provider-debug'));
    assert.ok(!JSON.stringify(response.body).includes('private-test-key'));
  }
});
test('deployment builds only frontend assets, with intact intro files and no backend or secrets', () => {
  cp.execFileSync(process.execPath, ['scripts/build-vercel.cjs']);
  for (const file of ['index.html', 'landing.html', 'js/intro.js', 'js/app-ui.js', 'css/app-ui.css']) {
    assert.deepEqual(fs.readFileSync('public/' + file), fs.readFileSync(file));
  }
  for (const name of ['.env', '.git', 'server.cjs', 'lib', 'tests', 'package.json']) assert.equal(fs.existsSync('public/' + name), false);
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'public');
  assert.ok(config.functions['api/*.js'].maxDuration >= 45);
  assert.equal(typeof require('../api/scenario.js'), 'function');
  assert.equal(typeof require('../api/status.js'), 'function');
});
