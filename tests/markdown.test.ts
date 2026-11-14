import { describe, expect, it } from "vitest";
import { presentationMarkdown, renderPolicyMarkdown } from "../lib/markdown";

describe("policy Markdown presentation", () => {
  it("removes source metadata only from the HTML presentation", () => {
    const source =
      "---\ntitle: Test\n---\n# Title\n\nVersion: 1\nEffective date: yesterday\nSource: x\nArchived from Notion: x\nAn official version is provided in Japanese. English is not available right now.\nIntro";
    expect(presentationMarkdown(source)).toBe("# Title\n\nIntro");
    expect(source).toContain("Version: 1");
  });

  it("promotes repeated legacy h1 sections to h2 with stable anchors", () => {
    const result = renderPolicyMarkdown("# Title\n\n# 第1条（適用）\n\n# 第1条（適用）\n\n## 詳細");
    expect(result.html).toContain('<h1 id="title">Title</h1>');
    expect(result.html).toContain('<h2 id="第1条-適用">');
    expect(result.html).toContain('<h2 id="第1条-適用-2">');
    expect(result.headings).toHaveLength(3);
    expect(result.headings[2].level).toBe(2);
  });

  it("keeps modern h2 section hierarchy and blocks raw HTML", () => {
    const result = renderPolicyMarkdown("# Title\n\n## Section\n\n<script>alert(1)</script>");
    expect(result.html).toContain('<h2 id="section">');
    expect(result.html).not.toContain("<script>");
  });

  it("removes only the duplicate preamble revision date", () => {
    const source = "# Policy\n\n2026年9月23日改訂\n\n## Changes\n\n2026年9月23日改訂";
    expect(presentationMarkdown(source)).toBe("# Policy\n\n\n## Changes\n\n2026年9月23日改訂");
  });
});
