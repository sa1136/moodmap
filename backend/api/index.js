/**
 * Vercel serverless entry. Export the Express `app` directly (Vercel wraps it).
 * Loads compiled app from ./dist (copied by `npm run vercel-build`).
 * Local / Railway: `npm start` → `dist/index.js` (unchanged).
 */
"use strict";

const { app } = require("./dist/app.js");

module.exports = app;
