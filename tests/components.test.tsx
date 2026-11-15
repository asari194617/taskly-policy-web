import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyView } from "../components/policy-view";
import catalogData from "../content/catalog.json";
import { type Catalog, policyHistory, policyList } from "../lib/catalog";
import { getPolicy } from "../lib/policies";
import { getPolicyDiff } from "../lib/policy-diff";

describe("policy presentation", () => {
  const catalog = catalogData as Catalog;
  const propsFor = (slug: string) => ({
    history: policyHistory(catalog, slug),
    otherPolicies: policyList(catalog).filter((item) => item.slug !== slug),
  });
  it("renders the current privacy edition, TOC, Markdown and archived links", () => {
    const policy = getPolicy("privacy");
    if (!policy) throw new Error("missing privacy policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} {...propsFor("privacy")} />);
    expect(html).toContain("2026-09-23.1");
    expect(html).toContain("現行版");
    expect(html).toContain("ページ内目次");
    expect(html).toContain("/privacy/2026-09-23.1.md");
    expect(html).toContain("/terms/");
  });

  it("labels old editions as archived and lists later versions", () => {
    const policy = getPolicy("privacy", "2026-09-22.1");
    if (!policy) throw new Error("missing archived privacy policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} {...propsFor("privacy")} />);
    expect(html).toContain("保存版");
    expect(html).toContain("2026-09-23.1");
  });

  it("does not display an effective date for the continuity source snapshot", () => {
    const policy = getPolicy("continuity");
    if (!policy) throw new Error("missing continuity policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} {...propsFor("continuity")} />);
    expect(html).not.toContain("施行日");
  });

  it("compares the privacy revision with the previous edition", () => {
    const diff = getPolicyDiff("privacy", "2026-09-23.1");
    expect(diff?.before.version).toBe("2026-09-22.1");
    expect(diff?.hunks.some((hunk) => hunk.lines.some((line) => line.kind === "added"))).toBe(true);
    expect(getPolicyDiff("terms", "2026-09-22.1")).toBeNull();
  });
});
