import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const revision = readFileSync("content/SOURCE_REVISION", "utf8").trim();
if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error("SOURCE_REVISION must be a full git SHA");
const root = process.argv[2];
if (!root) throw new Error("Usage: node scripts/verify-upstream.mjs <checked-out-taskly-policy>");
const checkoutRevision = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (checkoutRevision !== revision)
  throw new Error(`Wrong policy source revision: ${checkoutRevision}`);

const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8"));
const paths = ["catalog.json"];
for (const document of Object.values(catalog.documents)) {
  for (const edition of Object.values(document.versions)) paths.push(edition.file);
}
for (const path of paths) {
  const own = readFileSync(join("content", path));
  const upstream = readFileSync(join(root, path));
  if (!own.equals(upstream)) throw new Error(`Upstream source drift: ${path}`);
}
console.log(`Pinned policy source ${revision}: ${paths.length} files match byte for byte`);
