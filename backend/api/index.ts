/**
 * Vercel serverless entry — export Express app directly (Vercel wraps it).
 * Railway/local still use `src/index.ts` + `npm start`.
 *
 * `vercel.json` must include `src/**` in `includeFiles` or imports from ../src break at runtime.
 */
import { app } from "../src/app";

export default app;
