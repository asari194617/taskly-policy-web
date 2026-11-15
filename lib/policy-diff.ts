import { structuredPatch } from "diff";
import { presentationMarkdown } from "./markdown";
import { getPolicy, type PolicySlug, policyHistory } from "./policies";

export function getPolicyDiff(slug: PolicySlug, version: string) {
  const entry = policyHistory(slug).find((item) => item.version === version);
  if (!entry?.previousVersion) return null;
  const before = getPolicy(slug, entry.previousVersion);
  const after = getPolicy(slug, version);
  if (!before || !after) return null;

  const patch = structuredPatch(
    `${slug}/${entry.previousVersion}.md`,
    `${slug}/${version}.md`,
    presentationMarkdown(before.source, before.revisionDate),
    presentationMarkdown(after.source, after.revisionDate),
    undefined,
    undefined,
    { context: 3 },
  );
  const hunks = patch.hunks.map((hunk) => {
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;
    return {
      header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      lines: hunk.lines
        .filter((line) => !line.startsWith("\\"))
        .map((line) => {
          const kind = line[0] === "+" ? "added" : line[0] === "-" ? "removed" : "context";
          const result = {
            kind,
            content: line.slice(1),
            oldLine: kind === "added" ? null : oldLine,
            newLine: kind === "removed" ? null : newLine,
          };
          if (kind !== "added") oldLine += 1;
          if (kind !== "removed") newLine += 1;
          return result;
        }),
    };
  });
  return { before, after, hunks };
}
