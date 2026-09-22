/**
 * Vercel serverless entry point for the API.
 *
 * Vercel turns every file in this directory into a function. `vercel.json`
 * rewrites /api/* here, so one function serves the whole Express app and the
 * site can call /api on its own origin — no CORS, no API base URL to configure.
 *
 * The app still mounts its routes under /api, which is the path Vercel passes
 * through, so routing is identical to running the server locally.
 */
export { default } from "../artifacts/api-server/src/app";
