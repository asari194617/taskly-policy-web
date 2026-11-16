import { describe, expect, it } from "vitest";
import { type Catalog, policyHistory, policyList as publishedPolicyList } from "../lib/catalog";
import { allPolicyVersions, getPolicy, isPolicySlug, policyList } from "../lib/policies";

describe("policy catalog", () => {
  it("publishes all four canonical documents with fixed version URLs", () => {
    const policies = policyList();
    expect(policies).toHaveLength(4);
    expect(policies.map((item) => item.slug)).toEqual([
      "terms",
      "privacy",
      "security",
      "continuity",
    ]);
    for (const policy of policies) {
      expect(policy.htmlPath).toBe(`/${policy.slug}/`);
      expect(policy.versionPath).toBe(`/${policy.slug}/${policy.version}/`);
      expect(policy.markdownPath).toBe(`/${policy.slug}/${policy.version}.md`);
      expect(getPolicy(policy.slug)?.source.length).toBeGreaterThan(100);
    }
  });

  it("keeps old consent privacy edition accessible after publication revision", () => {
    expect(getPolicy("privacy")?.version).toBe("2026-09-23.1");
    expect(getPolicy("privacy", "2026-09-22.1")?.current).toBe(false);
    expect(allPolicyVersions()).toContainEqual({ slug: "privacy", version: "2026-09-22.1" });
  });

  it("rejects invalid slugs and versions", () => {
    expect(isPolicySlug("terms")).toBe(true);
    expect(isPolicySlug("new-policy")).toBe(true);
    expect(isPolicySlug("../secret")).toBe(false);
    expect(getPolicy("terms", "unknown")).toBeNull();
    expect(getPolicy("not-a-policy")).toBeNull();
  });

  it("does not invent an effective date for the continuity snapshot", () => {
    expect(getPolicy("continuity")?.effectiveDate).toBeNull();
  });

  it("compares an upcoming revision against the current edition", () => {
    const catalog: Catalog = {
      schemaVersion: 1,
      current: { terms: "2" },
      documents: {
        terms: {
          title: "利用規約",
          versions: {
            "1": { file: "versions/1/terms.md", sha256: "a" },
            "2": { file: "versions/2/terms.md", sha256: "b" },
            "3": { file: "versions/3/terms.md", sha256: "c" },
          },
        },
      },
      upcoming: [
        {
          version: "v3",
          status: "upcoming",
          publishedAt: "2026-11-15T00:00:00Z",
          effectiveAt: "2027-01-01T00:00:00Z",
          sourceSha: "a".repeat(40),
          policies: [{ slug: "terms", revision: "3", changed: true }],
        },
      ],
    };
    expect(
      policyHistory(catalog, "terms").map((entry) => [entry.version, entry.previousVersion]),
    ).toEqual([
      ["3", "2"],
      ["2", "1"],
      ["1", null],
    ]);
  });

  it("uses the current edition's Release description on the home page", () => {
    const catalog: Catalog = {
      schemaVersion: 1,
      current: { terms: "2026-11-16.1" },
      documents: {
        terms: {
          title: "利用規約",
          versions: {
            "2026-11-16.1": { file: "versions/2026-11-16.1/terms.md", sha256: "a" },
          },
        },
      },
      releases: [
        {
          version: "v2026-11-16.1",
          status: "current",
          publishedAt: "2026-11-16T05:00:00Z",
          effectiveAt: "2026-11-16T00:00:00+09:00",
          sourceSha: "a".repeat(40),
          policies: [
            {
              slug: "terms",
              revision: "2026-11-16.1",
              changed: true,
              description: "Tasklyの各サービスに共通する利用条件を定めます。",
            },
          ],
        },
      ],
    };
    expect(publishedPolicyList(catalog)[0].description).toBe(
      "Tasklyの各サービスに共通する利用条件を定めます。",
    );
  });
});
