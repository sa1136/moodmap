/**
 * Vercel serverless entry (plain JS so the runtime loads compiled output reliably).
 * Requires `npm run build` before deploy so `../dist/app.js` exists.
 * Railway/local: use `npm start` → `dist/index.js` (unchanged).
 */
"use strict";

const { app } = require("../dist/app.js");

module.exports = app;
