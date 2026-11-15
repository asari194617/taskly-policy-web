export type PolicySlug = string;

export type Edition = {
  file: string;
  effectiveDate?: string | null;
  revisionDate?: string;
  sha256: string;
  publishedSha256?: string;
};

export type PolicyRelease = {
  version: string;
  status: "current" | "upcoming";
  publishedAt: string;
  effectiveAt: string;
  sourceSha: string;
  policies: { slug: string; revision: string; changed: boolean }[];
};

export type Catalog = {
  schemaVersion: number;
  current: Record<string, string>;
  documents: Record<string, { title: string; versions: Record<string, Edition> }>;
  releases?: PolicyRelease[];
  upcoming?: PolicyRelease[];
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
  const upcoming = new Set(
    catalog.upcoming?.flatMap((release) =>
      release.policies
        .filter((policy) => policy.slug === slug && policy.revision !== current)
        .map((policy) => policy.revision),
    ) ?? [],
  );
  const byDate = (left: string, right: string) => {
    const leftDate = editions[left].revisionDate ?? editions[left].effectiveDate ?? "";
    const rightDate = editions[right].revisionDate ?? editions[right].effectiveDate ?? "";
    return rightDate.localeCompare(leftDate);
  };
  const upcomingVersions = [...upcoming].sort(byDate);
  const publishedVersions = Object.keys(editions)
    .filter((version) => !upcoming.has(version))
    .sort((left, right) => {
      if (left === current) return -1;
      if (right === current) return 1;
      return byDate(left, right);
    });
  return [...upcomingVersions, ...publishedVersions].map((version) => ({
    version,
    current: version === current,
    upcoming: upcoming.has(version),
    previousVersion: upcoming.has(version)
      ? current
      : (publishedVersions[publishedVersions.indexOf(version) + 1] ?? null),
    date: editions[version].revisionDate ?? editions[version].effectiveDate ?? null,
  }));
}
