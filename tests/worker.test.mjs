import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index.mjs";
import { cacheControl, contentType, objectKey, policyRoute } from "../worker/routing.mjs";

const catalog = {
  current: { terms: "v1" },
  documents: { terms: { title: "利用規約", versions: { v1: {} } } },
};

function bucket(objects = {}) {
  return {
    get: vi.fn(async (key) => {
      if (!(key in objects)) return null;
      return {
        body: objects[key],
        json: async () => JSON.parse(objects[key]),
        httpEtag: '"etag"',
        writeHttpMetadata: (headers) => headers.set("Content-Language", "ja"),
      };
    }),
  };
}

describe("R2 routing", () => {
  it("maps HTML routes and Markdown objects", () => {
    expect(objectKey("/")).toBe("index.html");
    expect(objectKey("/terms/")).toBe("terms/index.html");
    expect(objectKey("/terms")).toBe("terms/index.html");
    expect(objectKey("/terms/2026-09-22.1/")).toBe("terms/2026-09-22.1/index.html");
    expect(objectKey("/terms/2026-09-22.1.md")).toBe("terms/2026-09-22.1.md");
    expect(objectKey("/../secret")).toBeNull();
    expect(objectKey("/a/%2e%2e/b")).toBeNull();
    expect(objectKey("/日本語")).toBeNull();
  });

  it("assigns safe content types and cache lifetimes", () => {
    expect(contentType("x.html")).toContain("text/html");
    expect(contentType("x.md")).toContain("text/markdown");
    expect(contentType("x.txt")).toContain("text/plain");
    expect(contentType("x.css")).toContain("text/css");
    expect(contentType("x.js")).toContain("text/javascript");
    expect(contentType("x.json")).toContain("application/json");
    expect(contentType("x.svg")).toBe("image/svg+xml");
    expect(contentType("x.woff2")).toBe("font/woff2");
    expect(contentType("x.unknown")).toBe("application/octet-stream");
    expect(cacheControl("_next/static/x.js")).toContain("immutable");
    expect(cacheControl("terms/2026-09-22.1.md")).toContain("immutable");
    expect(cacheControl("viewer/index.html")).toContain("max-age=300");
    expect(cacheControl("terms/index.html")).toContain("max-age=300");
    expect(policyRoute("/terms/v1/", catalog).key).toBe("viewer/index.html");
    expect(policyRoute("/terms/v1.md", catalog).key).toBe("terms/v1.md");
    expect(policyRoute("/terms.md", catalog).key).toBe("terms/v1.md");
    expect(policyRoute("/terms/history/", catalog).key).toBe("viewer/index.html");
    expect(policyRoute("/terms/unknown/", catalog).missing).toBe(true);
    expect(policyRoute("/unknown/", catalog).missing).toBe(true);
    expect(policyRoute("/terms/v1/history/", catalog).missing).toBe(true);
  });
});

describe("R2 Worker responses", () => {
  it("serves HTML with noindex header and metadata", async () => {
    const store = bucket({ "index.html": "<h1>Home</h1>" });
    const response = await worker.fetch(new Request("https://policies.taskly.iy0306.com/"), {
      POLICY_ASSETS: store,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(response.headers.get("Content-Language")).toBe("ja");
    expect(await response.text()).toContain("Home");
  });

  it("supports HEAD, real 404 and disallows writes", async () => {
    const store = bucket({
      "404.html": "missing",
      "viewer/index.html": "terms",
      "data/catalog.json": JSON.stringify(catalog),
    });
    const head = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms/", { method: "HEAD" }),
      { POLICY_ASSETS: store },
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    const missing = await worker.fetch(new Request("https://policies.taskly.iy0306.com/missing"), {
      POLICY_ASSETS: store,
    });
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("missing");
    const denied = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/", { method: "POST" }),
      { POLICY_ASSETS: store },
    );
    expect(denied.status).toBe(405);
    expect(denied.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("fails closed on bad paths and storage errors", async () => {
    const store = bucket();
    const bad = await worker.fetch(new Request("https://policies.taskly.iy0306.com/%20"), {
      POLICY_ASSETS: store,
    });
    expect(bad.status).toBe(400);
    const broken = await worker.fetch(new Request("https://policies.taskly.iy0306.com/"), {
      POLICY_ASSETS: {
        get: async () => {
          throw new Error("offline");
        },
      },
    });
    expect(broken.status).toBe(503);
  });

  it("accepts a newly published version without changing Worker code", async () => {
    const updated = {
      current: { terms: "v2" },
      documents: { terms: { title: "利用規約", versions: { v1: {}, v2: {} } } },
    };
    const store = bucket({
      "data/catalog.json": JSON.stringify(updated),
      "viewer/index.html": "viewer",
      "terms/v2.md": "# New terms",
    });
    const html = await worker.fetch(new Request("https://policies.taskly.iy0306.com/terms/v2/"), {
      POLICY_ASSETS: store,
    });
    expect(html.status).toBe(200);
    expect(await html.text()).toBe("viewer");
    const markdown = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms.md"),
      {
        POLICY_ASSETS: store,
      },
    );
    expect(markdown.status).toBe(200);
    expect(await markdown.text()).toBe("# New terms");
    expect(markdown.headers.get("Cache-Control")).toBe("no-store");
  });

  it("accepts v query URLs and rejects ambiguous or unknown versions", async () => {
    const store = bucket({
      "data/catalog.json": JSON.stringify(catalog),
      "404.html": "missing",
    });
    const env = { POLICY_ASSETS: store };
    const query = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms/?v=v1"),
      env,
    );
    expect(query.status).toBe(308);
    expect(query.headers.get("Location")).toBe("/terms/v1/");
    expect(query.headers.get("X-Robots-Tag")).toBe("noindex");
    const unknown = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms/?v=v2"),
      env,
    );
    expect(unknown.status).toBe(404);
    for (const path of ["/terms/?v=", "/terms/?v=v1&v=v2", "/terms/v1/?v=v1", "/?v=v1"]) {
      const invalid = await worker.fetch(
        new Request(`https://policies.taskly.iy0306.com${path}`),
        env,
      );
      expect(invalid.status).toBe(400);
    }
  });

  it("serves the live catalog, dynamically generated AI index, and diff routes", async () => {
    const updated = {
      current: { terms: "v2", notice: "v1" },
      documents: {
        terms: {
          title: "利用規約",
          versions: { v1: { effectiveDate: "2026-01-01" }, v2: { effectiveDate: "2026-02-01" } },
        },
        notice: { title: "新しい方針", versions: { v1: {} } },
      },
    };
    const store = bucket({
      "data/catalog.json": JSON.stringify(updated),
      "viewer/index.html": "viewer",
      "404.html": "missing",
    });
    const env = { POLICY_ASSETS: store };
    const catalogResponse = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/data/catalog.json"),
      env,
    );
    expect(catalogResponse.headers.get("Cache-Control")).toBe("no-store");
    expect((await catalogResponse.json()).current.notice).toBe("v1");
    const llms = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/llms.txt"),
      env,
    );
    expect(await llms.text()).toContain("/notice/v1.md");
    expect(llms.headers.get("Cache-Control")).toBe("no-store");
    const newDocument = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/notice/"),
      env,
    );
    expect(newDocument.status).toBe(200);
    const diff = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms/history/v2/"),
      env,
    );
    expect(diff.status).toBe(200);
    const noDiff = await worker.fetch(
      new Request("https://policies.taskly.iy0306.com/terms/history/v1/"),
      env,
    );
    expect(noDiff.status).toBe(404);
  });
});
