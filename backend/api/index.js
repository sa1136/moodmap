/**
 * Vercel serverless entry. Loads app from ./dist (copied by `npm run vercel-build`).
 * Railway/local: `npm start` uses root `dist/index.js` (unchanged).
 */
"use strict";

const serverless = require("serverless-http");
const { app } = require("./dist/app.js");

module.exports = serverless(app);
