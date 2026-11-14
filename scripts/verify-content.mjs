import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";

const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8"));
const allowedSlugs = ["terms", "privacy", "security", "continuity"];
if (catalog.schemaVersion !== 1) throw new Error("Unsupported policy catalog schema");
if (Object.keys(catalog.documents).sort().join() !== [...allowedSlugs].sort().join()) {
  throw new Error("Policy catalog documents do not match required set");
}
for (const slug of allowedSlugs) {
  const doc = catalog.documents[slug];
  const current = catalog.current[slug];
  if (!doc.versions[current]) throw new Error(`No current edition for ${slug}`);
  for (const [version, edition] of Object.entries(doc.versions)) {
    const normalized = normalize(edition.file);
    if (!normalized.startsWith(`versions/${version}/`) || !normalized.endsWith(`/${slug}.md`)) {
      throw new Error(`Invalid source path for ${slug}@${version}`);
    }
    const source = readFileSync(join("content", normalized));
    const digest = createHash("sha256").update(source).digest("hex");
    if (digest !== edition.sha256) throw new Error(`Checksum mismatch for ${slug}@${version}`);
  }
}
console.log(`Verified ${allowedSlugs.length} policy documents and immutable source hashes`);
