# Enable custom questions on Vercel

The four examples run entirely in the browser. New questions need both the deployed `/api/scenario` function and a Gemini key in the **Vercel project environment**. A key in your local `.env` does not configure the hosted website.

This repository now includes the Vercel functions and deployment configuration. The landing page, theme and cinematic renderer do not need to change.

## 1. Add the production variables

Open the [whatif project's Environment Variables](https://vercel.com/svpg/whatif/settings/environment-variables). If you use a different Vercel team/project, select the one serving `whatif-red.vercel.app`.

Add these variables for **Production**:

| Name | Value |
| --- | --- |
| `GEMINI_API_KEY` | Your real Gemini API key. Enter it privately in Vercel. |
| `APP_ORIGIN` | `https://whatif-red.vercel.app` — no trailing slash. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite`, or a structured-output model your account can access. |

Use your existing key, or follow [Google's API-key setup instructions](https://ai.google.dev/gemini-api/docs/api-key). A model-access check with the local key succeeded during this fix; that does not copy it to Vercel or guarantee that the hosted environment has the same value.

Keep the key in a server-side variable. Do not add it to frontend JavaScript, GitHub, a `VITE_`/`NEXT_PUBLIC_` variable, or a public input field. If the key has API restrictions, they must permit the Generative Language API and server-side calls. Configure provider quotas suitable for this public endpoint.

`APP_ORIGIN` falls back to Vercel's trusted `VERCEL_PROJECT_PRODUCTION_URL` when that system variable is exposed. The function also accepts the exact `VERCEL_URL` and `VERCEL_BRANCH_URL` assigned to this deployment by Vercel. It does not accept every `*.vercel.app` site or trust incoming Host headers. Preview deployments need the key available in the Preview environment.

Use **https://whatif-red.vercel.app/** for the current production version. Individual deployment URLs are immutable: an older deployment keeps its old code even after a fix is published to the production domain.

## 2. Redeploy

In Vercel, open **Deployments**, select the latest deployment, and choose **Redeploy** after saving the variables. Changes to environment variables apply to a new deployment.

The repository's `vercel.json` selects the Other framework preset, runs `node scripts/build-vercel.cjs`, publishes the generated `public` directory, and deploys `api/*.js` as Node functions with a 60-second maximum duration. The Gemini request itself has a shorter 40-second deadline. No additional npm package is required.

## 3. Check the deployment

Open [the configuration status endpoint](https://whatif-red.vercel.app/api/status).

```json
{
  "customScenariosConfigured": true,
  "provider": "gemini",
  "model": "gemini-3.5-flash-lite"
}
```

`true` means the server has a nonempty key; it does not spend quota or validate the key with Google. The key itself is never returned. Then submit one new question on the website to verify model access, quota, response generation and validation together.

## If it still fails

| Result | Meaning and next action |
| --- | --- |
| `/api/scenario` returns 404 | The function is missing. Deploy the latest repository commit to the correct project. |
| `ORIGIN_NOT_ALLOWED` | Open the current production domain. Check APP_ORIGIN and the deployment's Vercel system URL variables; an old deployment URL may still be running old code. |
| `DEPLOYMENT_CONFIG_INVALID` | Set the exact HTTPS `APP_ORIGIN`; check model and positive integer request-limit settings, then redeploy. |
| `GEMINI_KEY_MISSING` | Add `GEMINI_API_KEY` to the correct Vercel environment and redeploy. |
| `GEMINI_KEY_INVALID` | Replace the server-side key with a valid key, then redeploy. |
| `GEMINI_ACCESS_DENIED` | Check Google project/API permissions and key restrictions. |
| `GEMINI_MODEL_UNAVAILABLE` | Choose an accessible `GEMINI_MODEL`, then redeploy. |
| `GEMINI_QUOTA_EXCEEDED` | Review Google account/project quotas and billing, or wait for a temporary rate limit. |
| HTTP 429 from WhatIf | The app's request limits have been reached; wait or use an example. |
| Valid key, but malformed/incomplete AI output | Retry. The server rejects incomplete or invalid scenarios instead of showing fabricated results. |

Vercel can run multiple function instances. In-memory request counters apply to one warm instance, so they are not a shared production spending cap. Use provider quotas and shared abuse controls appropriate to the audience. The API does not authenticate visitors.

## Local development

Copy `.env.example` to `.env`, enter your key there, and run `npm start`. The local server and Vercel functions use the same request validation, response validation, Google client and error handling. Tests mock Google and do not spend API quota.

Official references: [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).
