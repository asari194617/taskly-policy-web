import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8"));
const base = "https://policies.taskly.iy0306.com";
const lines = [
  "# Taskly policies",
  "",
  "Official Japanese policy documents, available as HTML and Markdown.",
  "",
];
function publishEdition(edition, target) {
  const source = readFileSync(join("content", edition.file), "utf8");
  const markdown = source.replace(/^[ \t]*<empty-block\/>[ \t]*(?:\r?\n|$)/gm, "");
  writeFileSync(target, markdown);
}
for (const [slug, document] of Object.entries(catalog.documents)) {
  const current = catalog.current[slug];
  const currentEdition = document.versions[current];
  for (const [version, edition] of Object.entries(document.versions)) {
    const target = join("out", slug, `${version}.md`);
    mkdirSync(dirname(target), { recursive: true });
    publishEdition(edition, target);
  }
  publishEdition(currentEdition, join("out", `${slug}.md`));
  lines.push(`- [${document.title}](${base}/${slug}/): [Markdown](${base}/${slug}/${current}.md)`);
}
writeFileSync("out/llms.txt", `${lines.join("\n")}\n`);
