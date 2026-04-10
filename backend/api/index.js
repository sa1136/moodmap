/**
 * Vercel `api/` serverless entry. Loads the esbuild bundle from `vercel-build`
 * (`api/bundled-app.cjs`). Local / Railway: `npm start` → `dist/index.js`.
 */
"use strict";

const serverless = require("serverless-http");
const { app } = require("./bundled-app.cjs");

module.exports = serverless(app);
