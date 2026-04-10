/**
 * Vercel only reliably bundles files under `api/`. Copy tsc output here after build.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "dist");
const destDir = path.join(root, "api", "dist");

if (!fs.existsSync(srcDir)) {
  console.error("copy-dist-for-vercel: missing dist/. Run tsc first.");
  process.exit(1);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });
const appJs = path.join(destDir, "app.js");
if (!fs.existsSync(appJs)) {
  console.error("copy-dist-for-vercel: api/dist/app.js missing after copy.");
  process.exit(1);
}
console.log("copy-dist-for-vercel: dist -> api/dist (ok)");
