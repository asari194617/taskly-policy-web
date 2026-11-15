import { createHash } from "node:crypto";

const base = process.env.POLICY_BASE_URL ?? "https://policies.taskly.iy0306.com";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function read(path, expectedStatus = 200) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status !== expectedStatus) throw new Error(`HTTP ${response.status}`);
      if (!response.headers.get("x-robots-tag")?.includes("noindex")) {
        throw new Error("X-Robots-Tag noindex missing");
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await pause(5_000);
    }
  }
  throw new Error(`${path}: ${lastError}`);
}

await read("/");
await read("/llms.txt");
const catalog = await (await read("/data/catalog.json")).json();
if (catalog.schemaVersion !== 1) throw new Error("Unsupported published catalog");
if (catalog.releases?.length) {
  await read("/versions/");
  for (const release of catalog.releases) {
    await read(`/versions/${release.version}/`);
  }
  const selected = catalog.releases.at(-1);
  const alias = await fetch(`${base}/?v=${encodeURIComponent(selected.version)}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (alias.status !== 308 || alias.headers.get("location") !== `/versions/${selected.version}/`) {
    throw new Error("Release version query does not select its snapshot");
  }
}
let editions = 0;
for (const [slug, document] of Object.entries(catalog.documents)) {
  const current = catalog.current[slug];
  if (current && !document.versions[current]) throw new Error(`${slug}: current version missing`);
  if (current) {
    await read(`/${slug}/`);
    await read(`/${slug}.md`);
  }
  await read(`/${slug}/history/`);
  for (const [version, edition] of Object.entries(document.versions)) {
    await read(`/${slug}/${version}/`);
    const response = await read(`/${slug}/${version}.md`);
    if (!response.headers.get("content-type")?.includes("text/markdown")) {
      throw new Error(`${slug}@${version}: Markdown content type missing`);
    }
    const digest = createHash("sha256")
      .update(Buffer.from(await response.arrayBuffer()))
      .digest("hex");
    if (digest !== edition.publishedSha256)
      throw new Error(`${slug}@${version}: published hash mismatch`);
    editions += 1;
  }
}
await read("/does-not-exist/", 404);
console.log(`Healthy: ${Object.keys(catalog.documents).length} policies and ${editions} editions`);
