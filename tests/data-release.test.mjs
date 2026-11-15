import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporary = [];
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true });
});

function prepare(source, output) {
  execFileSync(process.execPath, ["scripts/prepare-data.mjs", source, output]);
}

describe("independent policy data release", () => {
  it("publishes a new edition from source data without a Next.js build", () => {
    const root = mkdtempSync(join(tmpdir(), "taskly-policy-data-"));
    temporary.push(root);
    const source = join(root, "source");
    cpSync("content", source, { recursive: true });
    const originalOutput = join(root, "original");
    prepare(source, originalOutput);
    const catalog = JSON.parse(readFileSync(join(source, "catalog.json"), "utf8"));
    const markdown = "# 利用規約\n\n新しい版の本文です。\n";
    const newVersion = "2026-10-01.1";
    const editionDir = join(source, "versions", newVersion);
    mkdirSync(editionDir, { recursive: true });
    writeFileSync(join(editionDir, "terms.md"), markdown);
    catalog.documents.terms.versions[newVersion] = {
      file: `versions/${newVersion}/terms.md`,
      effectiveDate: "2026-10-01",
      sha256: createHash("sha256").update(markdown).digest("hex"),
    };
    catalog.current.terms = newVersion;
    writeFileSync(join(source, "catalog.json"), JSON.stringify(catalog));
    const newOutput = join(root, "new");
    prepare(source, newOutput);
    execFileSync(process.execPath, [
      "scripts/check-data-update.mjs",
      join(originalOutput, "data", "catalog.json"),
      join(newOutput, "data", "catalog.json"),
    ]);
    expect(readFileSync(join(newOutput, "terms", `${newVersion}.md`), "utf8")).toBe(markdown);
    expect(
      JSON.parse(readFileSync(join(newOutput, "data", "catalog.json"), "utf8")).current.terms,
    ).toBe(newVersion);
  });

  it("rejects edits to an already published edition", () => {
    const root = mkdtempSync(join(tmpdir(), "taskly-policy-data-"));
    temporary.push(root);
    const source = join(root, "source");
    cpSync("content", source, { recursive: true });
    const originalOutput = join(root, "original");
    prepare(source, originalOutput);
    const changed = JSON.parse(readFileSync(join(originalOutput, "data", "catalog.json"), "utf8"));
    changed.documents.terms.versions[changed.current.terms].effectiveDate = "2099-01-01";
    const changedFile = join(root, "changed.json");
    writeFileSync(changedFile, JSON.stringify(changed));
    expect(() =>
      execFileSync(
        process.execPath,
        [
          "scripts/check-data-update.mjs",
          join(originalOutput, "data", "catalog.json"),
          changedFile,
        ],
        { stdio: "pipe" },
      ),
    ).toThrow();
  });
});
