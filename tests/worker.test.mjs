import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index.mjs";
import { cacheControl, contentType, objectKey } from "../worker/routing.mjs";

function bucket(objects = {}) {
  return {
    get: vi.fn(async (key) => {
      if (!(key in objects)) return null;
      return {
        body: objects[key],
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
    expect(cacheControl("terms/2026-09-22.1/index.html")).toContain("immutable");
    expect(cacheControl("terms/index.html")).toContain("max-age=300");
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
    const store = bucket({ "404.html": "missing", "terms/index.html": "terms" });
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
});
