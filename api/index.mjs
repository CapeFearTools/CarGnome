/**
 * Vercel serverless entry point for the API.
 *
 * This imports the API server's *built* bundle rather than its TypeScript
 * source on purpose. Vercel type-checks any .ts it finds here using its own
 * module settings — it forces node16 resolution because the root package.json
 * is not an ES module — and those settings disagree with how the server is
 * written. Handing it a finished .mjs bundle removes that step entirely.
 *
 * `pnpm --filter @workspace/api-server run build` produces dist/app.mjs, and
 * vercel.json runs it before the site build.
 *
 * The app still mounts its routes under /api, which is the path Vercel passes
 * through, so routing matches running the server locally.
 */
export { default } from "../artifacts/api-server/dist/app.mjs";
