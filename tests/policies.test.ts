import { describe, expect, it } from "vitest";
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
    expect(isPolicySlug("not-a-policy")).toBe(false);
    expect(getPolicy("terms", "unknown")).toBeNull();
  });

  it("does not invent an effective date for the continuity snapshot", () => {
    expect(getPolicy("continuity")?.effectiveDate).toBeNull();
  });
});
