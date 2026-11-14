import MarkdownIt from "markdown-it";

export type Heading = { id: string; text: string; level: number };

function removeFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

export function presentationMarkdown(source: string) {
  let seenTitle = false;
  let seenSection = false;
  return removeFrontmatter(source)
    .split(/\r?\n/)
    .filter((line) => {
      if (/^#{1,6}\s/.test(line)) {
        if (seenTitle) seenSection = true;
        else seenTitle = true;
      }
      if (/^(Version:|Effective date:|Source:|Archived from Notion:)/.test(line)) return false;
      if (
        line === "An official version is provided in Japanese. English is not available right now."
      )
        return false;
      if (seenTitle && !seenSection && /^\d{4}年\d{1,2}月\d{1,2}日改訂$/.test(line)) return false;
      return true;
    })
    .join("\n");
}

export function renderPolicyMarkdown(source: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  const tokens = md.parse(presentationMarkdown(source), {});
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  let titleFound = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "heading_open") continue;
    const originalLevel = Number(token.tag.slice(1));
    const level = titleFound && originalLevel === 1 ? 2 : originalLevel;
    titleFound = true;
    token.tag = `h${level}`;
    const close = tokens[i + 2];
    if (close?.type === "heading_close") close.tag = token.tag;
    const text = tokens[i + 1]?.content ?? "";
    const base =
      text
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    token.attrSet("id", id);
    if (level > 1) headings.push({ id, text, level });
  }

  return { html: md.renderer.render(tokens, md.options, {}), headings };
}
