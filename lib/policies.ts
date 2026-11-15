import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import catalogData from "../content/catalog.json";

export type PolicySlug = "terms" | "privacy" | "security" | "continuity";
export const policySlugs: PolicySlug[] = ["terms", "privacy", "security", "continuity"];

type Edition = {
  file: string;
  effectiveDate?: string | null;
  revisionDate?: string;
  sha256: string;
};
type Catalog = {
  current: Record<PolicySlug, string>;
  documents: Record<PolicySlug, { title: string; versions: Record<string, Edition> }>;
};
const catalog = catalogData as Catalog;

export function isPolicySlug(value: string): value is PolicySlug {
  return policySlugs.includes(value as PolicySlug);
}

export function policyList() {
  return policySlugs.map((slug) => {
    const version = catalog.current[slug];
    const document = catalog.documents[slug];
    return {
      slug,
      title: document.title,
      version,
      effectiveDate: document.versions[version].effectiveDate,
      revisionDate: document.versions[version].revisionDate,
      htmlPath: `/${slug}/`,
      versionPath: `/${slug}/${version}/`,
      markdownPath: `/${slug}/${version}.md`,
    };
  });
}

export function allPolicyVersions() {
  return policySlugs.flatMap((slug) =>
    Object.keys(catalog.documents[slug].versions).map((version) => ({ slug, version })),
  );
}

export function policyHistory(slug: PolicySlug) {
  const editions = catalog.documents[slug].versions;
  const current = catalog.current[slug];
  const versions = Object.keys(editions).sort((left, right) => {
    if (left === current) return -1;
    if (right === current) return 1;
    const leftDate = editions[left].revisionDate ?? editions[left].effectiveDate ?? "";
    const rightDate = editions[right].revisionDate ?? editions[right].effectiveDate ?? "";
    return rightDate.localeCompare(leftDate);
  });
  return versions.map((version, index) => ({
    version,
    current: version === current,
    previousVersion: versions[index + 1] ?? null,
    date: editions[version].revisionDate ?? editions[version].effectiveDate ?? null,
  }));
}

export function getPolicy(slug: PolicySlug, version = catalog.current[slug]) {
  const document = catalog.documents[slug];
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
