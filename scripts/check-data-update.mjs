import { readFileSync } from "node:fs";

const oldFile = process.argv[2];
const newFile = process.argv[3];
if (!oldFile || !newFile)
  throw new Error("Usage: check-data-update <existing-catalog> <new-catalog>");
const oldCatalog = JSON.parse(readFileSync(oldFile, "utf8"));
const newCatalog = JSON.parse(readFileSync(newFile, "utf8"));
for (const [slug, document] of Object.entries(oldCatalog.documents)) {
  const next = newCatalog.documents[slug];
  if (!next) throw new Error(`Published document removed: ${slug}`);
  for (const [version, edition] of Object.entries(document.versions)) {
    const nextEdition = next.versions[version];
    if (!nextEdition || JSON.stringify(nextEdition) !== JSON.stringify(edition)) {
      throw new Error(`Published edition changed or removed: ${slug}@${version}`);
    }
  }
}
console.log("Published editions remain immutable");
