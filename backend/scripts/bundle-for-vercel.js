/**
 * Single-file bundle for Vercel `api/index.js` so the function does not depend
 * on file tracing into api/dist (gitignored copied tree).
 */
const path = require("path");
const { build } = require("esbuild");

const root = path.join(__dirname, "..");
const entry = path.join(root, "dist", "app.js");
const outfile = path.join(root, "api", "bundled-app.cjs");

build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  logLevel: "info",
})
  .then(() => {
    const { app } = require(outfile);
    if (!app || typeof app.use !== "function") {
      console.error("bundle-for-vercel: bundled app invalid");
      process.exit(1);
    }
    console.log("bundle-for-vercel: wrote api/bundled-app.cjs (ok)");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
