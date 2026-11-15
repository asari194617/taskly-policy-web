export function objectKey(pathname) {
  if (!/^\/[A-Za-z0-9_./-]*$/.test(pathname)) return null;
  if (pathname.split("/").includes("..")) return null;
  if (pathname === "/") return "index.html";
  const path = pathname.slice(1);
  if (path.endsWith("/")) return `${path}index.html`;
  if (!path.split("/").at(-1).includes(".")) return `${path}/index.html`;
  return path;
}

const slugPattern = /^[a-z][a-z0-9-]*$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function policyRoute(pathname, catalog) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "versions") {
    if (parts.length === 1) return { key: "versions/index.html" };
    if (parts.length === 2 && catalog.releases?.some((release) => release.version === parts[1])) {
      return { key: "versions/index.html" };
    }
    return { missing: true };
  }
  if (parts.length === 1 && parts[0].endsWith(".md")) {
    const slug = parts[0].slice(0, -3);
    if (slugPattern.test(slug) && pathname === `/${slug}.md`) {
      const version = catalog.current?.[slug];
      return version && Object.hasOwn(catalog.documents?.[slug]?.versions ?? {}, version)
        ? { key: `${slug}/${version}.md`, currentAlias: true }
        : { missing: true };
    }
  }
  if (!slugPattern.test(parts[0] ?? "")) return null;
  const slug = parts[0];
  if (!Object.hasOwn(catalog.documents ?? {}, slug)) {
    return { missing: true };
  }
  const document = catalog.documents[slug];
  if (parts.length === 1 && !pathname.endsWith(".md")) {
    return Object.hasOwn(catalog.current ?? {}, slug)
      ? { key: "viewer/index.html" }
      : { missing: true };
  }
  if (parts.length === 2 && parts[1] === "history") {
    return { key: "viewer/index.html" };
  }
  if (parts.length === 2 && parts[1].endsWith(".md") && !pathname.endsWith("/")) {
    const version = parts[1].slice(0, -3);
    return versionPattern.test(version) && Object.hasOwn(document.versions ?? {}, version)
      ? { key: `${slug}/${version}.md` }
      : { missing: true };
  }
  if (
    parts.length === 2 &&
    versionPattern.test(parts[1]) &&
    Object.hasOwn(document.versions ?? {}, parts[1])
  ) {
    return { key: "viewer/index.html" };
  }
  if (parts.length === 3 && parts[1] === "history") {
    const version = parts[2];
    const editions = document.versions ?? {};
    const upcoming = new Set(
      catalog.upcoming?.flatMap((release) =>
        release.policies
          .filter((policy) => policy.slug === slug && policy.revision !== catalog.current[slug])
          .map((policy) => policy.revision),
      ) ?? [],
    );
    const versions = Object.keys(editions)
      .filter((edition) => !upcoming.has(edition))
      .sort((left, right) => {
        if (left === catalog.current[slug]) return -1;
        if (right === catalog.current[slug]) return 1;
        const leftDate = editions[left].revisionDate ?? editions[left].effectiveDate ?? "";
        const rightDate = editions[right].revisionDate ?? editions[right].effectiveDate ?? "";
        return rightDate.localeCompare(leftDate);
      });
    return versionPattern.test(version) &&
      ((upcoming.has(version) && Object.hasOwn(editions, version)) ||
        (versions.indexOf(version) >= 0 && versions.indexOf(version) < versions.length - 1))
      ? { key: "viewer/index.html" }
      : { missing: true };
  }
  return { missing: true };
}

export function contentType(key) {
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  if (key.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (key.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (key.endsWith(".css")) return "text/css; charset=utf-8";
  if (key.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  if (key.endsWith(".svg")) return "image/svg+xml";
  if (key.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

export function cacheControl(key) {
  if (key.startsWith("_next/static/")) return "public, max-age=31536000, immutable";
  if (/^[a-z][a-z0-9-]*\/[^/]+\.md$/.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=300";
}
