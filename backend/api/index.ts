/**
 * Vercel serverless entry — wraps Express for a single function.
 * Railway/local still use `src/index.ts` + `npm start`.
 */
import serverless from "serverless-http";
import { app } from "../src/app";

export default serverless(app);
