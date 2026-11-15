import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const slugPattern = /^[a-z][a-z0-9-]*$/;
const revisionPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const releasePattern = /^v[A-Za-z0-9][A-Za-z0-9._-]*$/;
const hashPattern = /^[0-9a-f]{64}$/;

function validDate(value) {
  return (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

export function compileReleaseSnapshots(snapshots, readFile, now = new Date()) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error("No published policy Releases");
  }
  const releases = [];
  const documents = {};
  const files = new Map();
  const seenTags = new Set();
  const ordered = [...snapshots].sort(
    (left, right) => Date.parse(left.manifest.effectiveAt) - Date.parse(right.manifest.effectiveAt),
  );
  for (const { release, sha, manifest } of ordered) {
    if (
      !releasePattern.test(release.tag_name) ||
      seenTags.has(release.tag_name) ||
      !/^[0-9a-f]{40}$/.test(sha) ||
      manifest.schemaVersion !== 1 ||
      manifest.version !== release.tag_name ||
      manifest.status !== (release.prerelease ? "upcoming" : "current") ||
      !validDate(manifest.publishedAt) ||
      !validDate(manifest.effectiveAt) ||
      !Array.isArray(manifest.policies) ||
      manifest.policies.length === 0
    ) {
      throw new Error(`Invalid Release manifest: ${release.tag_name}`);
    }
    seenTags.add(release.tag_name);
    const previousCurrent = [...ordered]
      .filter(
        (snapshot) =>
          !snapshot.release.prerelease &&
          Date.parse(snapshot.manifest.effectiveAt) < Date.parse(manifest.effectiveAt),
      )
      .at(-1);
    const previousPolicies = new Map(
      previousCurrent?.manifest.policies.map((policy) => [policy.slug, policy.revision]) ?? [],
    );
    const policySet = new Set();
    const releasePolicies = [];
    for (const policy of manifest.policies) {
      const { slug, revision, path, title, description, changed, sha256 } = policy;
      if (
        !slugPattern.test(slug) ||
        policySet.has(slug) ||
        !revisionPattern.test(revision) ||
        path !== `versions/${revision}/${slug}.md` ||
        typeof title !== "string" ||
        !title.trim() ||
        typeof description !== "string" ||
        typeof changed !== "boolean" ||
        !hashPattern.test(sha256) ||
        (policy.effectiveDate !== undefined &&
          policy.effectiveDate !== null &&
          !/^\d{4}-\d{2}-\d{2}$/.test(policy.effectiveDate)) ||
        (policy.revisionDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(policy.revisionDate))
      ) {
        throw new Error(`Invalid policy entry: ${release.tag_name}/${slug}`);
      }
      if (previousPolicies.size > 0 && changed !== (previousPolicies.get(slug) !== revision)) {
        throw new Error(`Incorrect changed flag: ${release.tag_name}/${slug}`);
      }
      policySet.add(slug);
      const source = readFile(sha, path);
      const actualHash = createHash("sha256").update(source).digest("hex");
      if (actualHash !== sha256) {
        throw new Error(`Policy checksum mismatch: ${release.tag_name}/${slug}`);
      }
      const frontmatter = source.toString("utf8").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!frontmatter && !release.tag_name.endsWith("-import")) {
        throw new Error(`Missing policy front matter: ${release.tag_name}/${slug}`);
      }
      if (frontmatter) {
        const fields = Object.fromEntries(
          frontmatter[1].split(/\r?\n/).map((line) => {
            const separator = line.indexOf(":");
            if (separator < 1) throw new Error(`Invalid front matter: ${release.tag_name}/${slug}`);
            return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
          }),
        );
        if (fields.title !== title || fields.description !== description) {
          throw new Error(`Front matter differs from manifest: ${release.tag_name}/${slug}`);
        }
      }
      const edition = { file: path };
      if (policy.effectiveDate !== undefined) edition.effectiveDate = policy.effectiveDate;
      if (policy.revisionDate !== undefined) edition.revisionDate = policy.revisionDate;
      edition.sha256 = sha256;
      if (!documents[slug]) documents[slug] = { title, versions: {} };
      const document = documents[slug];
      document.title = title;
      const existing = document.versions[revision];
      if (existing && JSON.stringify(existing) !== JSON.stringify(edition)) {
        throw new Error(`Published revision changed: ${slug}@${revision}`);
      }
      document.versions[revision] = edition;
      files.set(path, source);
      releasePolicies.push({ slug, title, description, revision, changed });
    }
    releases.push({
      version: release.tag_name,
      status: manifest.status,
      publishedAt: manifest.publishedAt,
      effectiveAt: manifest.effectiveAt,
      sourceSha: sha,
      policies: releasePolicies,
    });
  }

  const timestamp = now.getTime();
  const active = releases.filter(
    (release) => release.status === "current" && Date.parse(release.effectiveAt) <= timestamp,
  );
  if (active.length === 0) throw new Error("No effective current policy Release");
  const newestDate = Math.max(...active.map((release) => Date.parse(release.effectiveAt)));
  const newest = active.filter((release) => Date.parse(release.effectiveAt) === newestDate);
  if (newest.length !== 1) throw new Error("Ambiguous current policy Release");
  const current = Object.fromEntries(
    newest[0].policies.map(({ slug, revision }) => [slug, revision]),
  );
  const currentManifest = ordered.find(
    (snapshot) => snapshot.release.tag_name === newest[0].version,
  )?.manifest;
  if (!currentManifest) throw new Error("Current Release manifest is missing");
  for (const policy of currentManifest.policies) {
    documents[policy.slug].title = policy.title;
  }
  const upcoming = releases
    .filter((release) => release.status === "upcoming")
    .sort((left, right) => Date.parse(left.effectiveAt) - Date.parse(right.effectiveAt));
  return {
    catalog: { schemaVersion: 1, current, documents, releases, upcoming },
    files,
  };
}

async function listPublishedReleases(token) {
  const releases = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/asari194617/taskly-policy/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "taskly-policy-publisher",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );
    if (!response.ok) throw new Error(`GitHub Releases: HTTP ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Invalid GitHub Releases response");
    releases.push(...batch.filter((release) => !release.draft));
    if (batch.length < 100) return releases;
  }
  throw new Error("Too many policy Releases");
}

export async function buildReleaseSource(repository, destination, token) {
  const releases = await listPublishedReleases(token);
  const snapshots = releases.map((release) => {
    if (!releasePattern.test(release.tag_name)) throw new Error("Invalid Release tag");
    const sha = execFileSync(
      "git",
      ["-C", repository, "rev-parse", `refs/tags/${release.tag_name}^{commit}`],
      { encoding: "utf8" },
    ).trim();
    const manifest = JSON.parse(
      execFileSync("git", ["-C", repository, "show", `${sha}:manifest.json`], {
        encoding: "utf8",
      }),
    );
    return { release, sha, manifest };
  });
  const { catalog, files } = compileReleaseSnapshots(snapshots, (sha, path) =>
    execFileSync("git", ["-C", repository, "show", `${sha}:${path}`], {
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  for (const [path, content] of files) {
    const target = join(destination, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Prepared ${catalog.releases.length} GitHub Releases at fixed commit SHAs`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const repository = resolve(process.argv[2] ?? "upstream/taskly-policy");
  const destination = resolve(process.argv[3] ?? "release-source");
  await buildReleaseSource(repository, destination, process.env.GITHUB_TOKEN);
}
