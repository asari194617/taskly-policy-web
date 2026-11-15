import MarkdownIt from "markdown-it";

export type Heading = { id: string; text: string; level: number };

function removeFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

export function presentationMarkdown(source: string, revisionDate?: string) {
  let seenTitle = false;
  let seenSection = false;
  const dateParts = revisionDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const duplicatedDate = dateParts
    ? `${dateParts[1]}年${Number(dateParts[2])}月${Number(dateParts[3])}日改訂`
    : null;
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
      if (seenTitle && !seenSection && line === duplicatedDate) return false;
      if (line.trim() === "<empty-block/>") return false;
      return true;
    })
    .join("\n");
}

export function renderPolicyMarkdown(source: string, revisionDate?: string) {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  md.disable("image");
  const renderLink =
    md.renderer.rules.link_open ??
    ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet("href");
    if (href && /^https?:\/\//i.test(href)) {
      tokens[index].attrSet("rel", "noopener noreferrer");
    }
    return renderLink(tokens, index, options, env, self);
  };
  const tokens = md.parse(presentationMarkdown(source, revisionDate), {});
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
