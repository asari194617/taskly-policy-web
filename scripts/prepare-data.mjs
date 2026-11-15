import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const sourceRoot = resolve(process.argv[2] ?? "content");
const outputRoot = resolve(process.argv[3] ?? "out");
const catalog = JSON.parse(readFileSync(join(sourceRoot, "catalog.json"), "utf8"));
if (catalog.schemaVersion !== 1 || !catalog.documents || !catalog.current) {
  throw new Error("Unsupported policy catalog");
}
const slugPattern = /^[a-z][a-z0-9-]*$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
for (const [slug, document] of Object.entries(catalog.documents)) {
  if (!slugPattern.test(slug) || typeof document.title !== "string" || !document.versions) {
    throw new Error(`Invalid document: ${slug}`);
  }
  if (!Object.hasOwn(document.versions, catalog.current[slug])) {
    throw new Error(`Current version is missing: ${slug}`);
  }
  for (const [version, edition] of Object.entries(document.versions)) {
    if (!versionPattern.test(version) || edition.file !== `versions/${version}/${slug}.md`) {
      throw new Error(`Invalid edition path: ${slug}@${version}`);
    }
    const source = readFileSync(join(sourceRoot, edition.file));
    const hash = createHash("sha256").update(source).digest("hex");
    if (hash !== edition.sha256) throw new Error(`Policy checksum mismatch: ${slug}@${version}`);
    const target = join(outputRoot, slug, `${version}.md`);
    mkdirSync(dirname(target), { recursive: true });
    const published = source
      .toString("utf8")
      .replace(/^[ \t]*<empty-block\/>[ \t]*(?:\r?\n|$)/gm, "");
    edition.publishedSha256 = createHash("sha256").update(published).digest("hex");
    writeFileSync(target, published);
  }
}
const target = join(outputRoot, "data", "catalog.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `Prepared ${Object.keys(catalog.documents).length} policy documents from ${sourceRoot}`,
);
