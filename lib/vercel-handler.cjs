'use strict';

const { createHandler } = require('../server.cjs');

// Reuse the same validation, quota checks and Gemini client as local development.
// No listener or localhost forwarding is needed in a Vercel Function.
function createVercelHandler(options = {}) {
  let handler;
  const env = options.env || process.env;
  return async (req, res) => {
    if (!handler) {
      try {
        const origin = env.APP_ORIGIN || (env.VERCEL_PROJECT_PRODUCTION_URL ?
          `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
        handler = createHandler({ ...options, env: { ...env, APP_ORIGIN: origin, NODE_ENV: 'production' } });
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff' });
        return res.end(JSON.stringify({ code: 'DEPLOYMENT_CONFIG_INVALID',
          error: 'The site owner needs to configure APP_ORIGIN as the exact HTTPS website origin, check the model and request limits, and redeploy.' }));
      }
    }
    return handler(req, res);
  };
}
module.exports = { createVercelHandler };
