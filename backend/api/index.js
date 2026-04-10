/**
 * Vercel `api/` serverless entry (classic Node handler). Uses serverless-http to
 * adapt Express. Compiled app lives in ./dist (see `npm run vercel-build`).
 * Local / Railway: `npm start` → `dist/index.js`.
 */
"use strict";

const serverless = require("serverless-http");
const { app } = require("./dist/app.js");

module.exports = serverless(app);
