import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import catalogData from "../content/catalog.json";
import {
  type Catalog,
  policyHistory as historyFromCatalog,
  isPolicySlug,
  policyList as listFromCatalog,
  type PolicySlug,
} from "./catalog";

export type { PolicySlug };
export { isPolicySlug };

const catalog = catalogData as Catalog;
export const policySlugs = Object.keys(catalog.documents);

export function policyList() {
  return listFromCatalog(catalog);
}

export function allPolicyVersions() {
  return policySlugs.flatMap((slug) =>
    Object.keys(catalog.documents[slug].versions).map((version) => ({ slug, version })),
  );
}

export function policyHistory(slug: PolicySlug) {
  return historyFromCatalog(catalog, slug);
}

export function getPolicy(slug: PolicySlug, version = catalog.current[slug]) {
  const document = catalog.documents[slug];
  if (!document) return null;
  const edition = document.versions[version];
  if (!edition) return null;
  const source = readFileSync(join(process.cwd(), "content", edition.file), "utf8");
  const hash = createHash("sha256").update(source).digest("hex");
  if (hash !== edition.sha256) throw new Error(`Policy checksum mismatch: ${slug}@${version}`);
  return {
    slug,
    title: document.title,
    version,
    current: version === catalog.current[slug],
    effectiveDate: edition.effectiveDate,
    revisionDate: edition.revisionDate,
    markdownPath: `/${slug}/${version}.md`,
    source,
  };
}
