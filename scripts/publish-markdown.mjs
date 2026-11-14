import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const catalog = JSON.parse(readFileSync("content/catalog.json", "utf8"));
const base = "https://policies.taskly.iy0306.com";
const lines = [
  "# Taskly policies",
  "",
  "Official Japanese policy documents, available as HTML and Markdown.",
  "",
];
for (const [slug, document] of Object.entries(catalog.documents)) {
  const current = catalog.current[slug];
  const currentEdition = document.versions[current];
  for (const [version, edition] of Object.entries(document.versions)) {
    const target = join("out", slug, `${version}.md`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join("content", edition.file), target);
  }
  copyFileSync(join("content", currentEdition.file), join("out", `${slug}.md`));
  lines.push(`- [${document.title}](${base}/${slug}/): [Markdown](${base}/${slug}/${current}.md)`);
}
writeFileSync("out/llms.txt", `${lines.join("\n")}\n`);
