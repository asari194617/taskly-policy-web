export type PolicySlug = string;

export type Edition = {
  file: string;
  effectiveDate?: string | null;
  revisionDate?: string;
  sha256: string;
  publishedSha256?: string;
};

export type Catalog = {
  schemaVersion: number;
  current: Record<string, string>;
  documents: Record<string, { title: string; versions: Record<string, Edition> }>;
};

export function isPolicySlug(value: string): value is PolicySlug {
  return /^[a-z][a-z0-9-]*$/.test(value);
}

export function policyList(catalog: Catalog) {
  return Object.keys(catalog.documents).map((slug) => {
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

export function policyHistory(catalog: Catalog, slug: PolicySlug) {
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
