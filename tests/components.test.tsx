import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PolicyView } from "../components/policy-view";
import { ThemeToggle } from "../components/theme-toggle";
import { getPolicy } from "../lib/policies";

describe("policy presentation", () => {
  it("renders the current privacy edition, TOC, Markdown and archived links", () => {
    const policy = getPolicy("privacy");
    if (!policy) throw new Error("missing privacy policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} />);
    expect(html).toContain("2026-09-23.1");
    expect(html).toContain("現行版");
    expect(html).toContain("ページ内目次");
    expect(html).toContain("/privacy/2026-09-23.1.md");
    expect(html).toContain("/terms/");
  });

  it("labels old editions as archived and lists later versions", () => {
    const policy = getPolicy("privacy", "2026-09-22.1");
    if (!policy) throw new Error("missing archived privacy policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} />);
    expect(html).toContain("保存版");
    expect(html).toContain("2026-09-23.1");
  });

  it("does not display an effective date for the continuity source snapshot", () => {
    const policy = getPolicy("continuity");
    if (!policy) throw new Error("missing continuity policy");
    const html = renderToStaticMarkup(<PolicyView policy={policy} />);
    expect(html).not.toContain("施行日");
  });

  it("exposes a labelled theme control", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('aria-label="ダークテーマを使用"');
    expect(html).toContain("<button");
  });
});
