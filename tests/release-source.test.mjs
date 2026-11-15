import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { policyList } from "../lib/catalog";
import { compileReleaseSnapshots } from "../scripts/release-source.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const frontmatter = "---\ntitle: 利用規約\ndescription: 利用条件\n---\n\n";
const source = new Map([
  ["versions/1/terms.md", `${frontmatter}# 利用規約\n初版\n`],
  ["versions/2/terms.md", `${frontmatter}# 利用規約\n改定版\n`],
  [
    "versions/3/terms.md",
    "---\ntitle: 次期利用規約\ndescription: 新しい利用条件\n---\n\n# 次期利用規約\n",
  ],
  [
    "versions/1/notice.md",
    "---\ntitle: お知らせ\ndescription: お知らせの方針\n---\n\n# お知らせ\n",
  ],
]);
const terms = (revision, changed) => ({
  slug: "terms",
  path: `versions/${revision}/terms.md`,
  title: "利用規約",
  description: "利用条件",
  revision,
  changed,
  effectiveDate: revision === "1" ? "2026-01-01" : "2026-02-01",
  sha256: sha(source.get(`versions/${revision}/terms.md`)),
});
const release = (version, status, effectiveAt, policies) => ({
  release: { tag_name: version, prerelease: status === "upcoming" },
  sha: "a".repeat(40),
  manifest: {
    schemaVersion: 1,
    version,
    status,
    publishedAt: "2026-01-01T00:00:00Z",
    effectiveAt,
    policies,
  },
});
const readFile = (_sha, path) => Buffer.from(source.get(path) ?? "");
const notice = (changed) => ({
  slug: "notice",
  path: "versions/1/notice.md",
  title: "お知らせ",
  description: "お知らせの方針",
  revision: "1",
  changed,
  sha256: sha(source.get("versions/1/notice.md")),
});

describe("GitHub Release policy manifests", () => {
  it("selects the latest effective normal Release and keeps historical revisions", () => {
    const snapshots = [
      release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]),
      release("v2", "current", "2026-02-01T00:00:00Z", [terms("2", true)]),
      release("v3", "upcoming", "2026-03-01T00:00:00Z", [terms("2", false)]),
    ];
    const { catalog, files } = compileReleaseSnapshots(
      snapshots,
      readFile,
      new Date("2026-11-15T00:00:00Z"),
    );
    expect(catalog.current.terms).toBe("2");
    expect(Object.keys(catalog.documents.terms.versions)).toEqual(["1", "2"]);
    expect(catalog.upcoming.map((entry) => entry.version)).toEqual(["v3"]);
    expect(files.get("versions/1/terms.md").toString()).toContain("初版");
  });

  it("rejects a Release whose tag and manifest disagree", () => {
    const snapshot = release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]);
    snapshot.manifest.version = "v2";
    expect(() => compileReleaseSnapshots([snapshot], readFile)).toThrow(/Invalid Release manifest/);
  });

  it("rejects changed flags that hide a document revision", () => {
    const snapshots = [
      release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]),
      release("v2", "current", "2026-02-01T00:00:00Z", [terms("2", false)]),
    ];
    expect(() => compileReleaseSnapshots(snapshots, readFile)).toThrow(/Incorrect changed flag/);
  });

  it("rejects unsafe paths and edited content", () => {
    const snapshot = release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]);
    snapshot.manifest.policies[0].path = "../private.md";
    expect(() => compileReleaseSnapshots([snapshot], readFile)).toThrow(/Invalid policy entry/);
    snapshot.manifest.policies[0].path = "versions/1/terms.md";
    snapshot.manifest.policies[0].sha256 = "0".repeat(64);
    expect(() => compileReleaseSnapshots([snapshot], readFile)).toThrow(/checksum mismatch/);
  });

  it("requires new policy documents to match the manifest front matter", () => {
    const snapshot = release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]);
    snapshot.manifest.policies[0].description = "別の説明";
    expect(() => compileReleaseSnapshots([snapshot], readFile)).toThrow(/Front matter differs/);
  });

  it("rejects equally effective normal Releases instead of selecting one arbitrarily", () => {
    const snapshots = [
      release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true)]),
      release("v2", "current", "2026-01-01T00:00:00Z", [terms("1", false)]),
    ];
    expect(() => compileReleaseSnapshots(snapshots, readFile)).toThrow(/Ambiguous current/);
  });

  it("keeps current titles and manifest order when an upcoming Release changes them", () => {
    const future = {
      ...terms("2", true),
      revision: "3",
      path: "versions/3/terms.md",
      title: "次期利用規約",
      description: "新しい利用条件",
      sha256: sha(source.get("versions/3/terms.md")),
    };
    const snapshots = [
      release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true), notice(true)]),
      release("v2", "current", "2026-02-01T00:00:00Z", [notice(false), terms("2", true)]),
      release("v3", "upcoming", "2027-01-01T00:00:00Z", [future, notice(false)]),
    ];
    const { catalog } = compileReleaseSnapshots(snapshots, readFile, new Date("2026-11-15"));
    expect(catalog.documents.terms.title).toBe("利用規約");
    expect(policyList(catalog).map((item) => item.slug)).toEqual(["notice", "terms"]);
    expect(catalog.releases.at(-1).policies[0].title).toBe("次期利用規約");
  });

  it("keeps removed documents as accessible archives without listing them as current", () => {
    const snapshots = [
      release("v1", "current", "2026-01-01T00:00:00Z", [terms("1", true), notice(true)]),
      release("v2", "current", "2026-02-01T00:00:00Z", [terms("2", true)]),
    ];
    const { catalog } = compileReleaseSnapshots(snapshots, readFile, new Date("2026-11-15"));
    expect(policyList(catalog).map((item) => item.slug)).toEqual(["terms"]);
    expect(catalog.documents.notice.versions["1"]).toBeDefined();
  });
});
