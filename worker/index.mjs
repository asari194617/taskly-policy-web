import { cacheControl, contentType, objectKey, policyRoute } from "./routing.mjs";

const sharedHeaders = {
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { ...sharedHeaders, Allow: "GET, HEAD" },
      });
    }

    const path = new URL(request.url).pathname;
    const requestedKey = objectKey(path);
    if (requestedKey === null)
      return new Response("Bad Request", { status: 400, headers: sharedHeaders });

    try {
      let key = requestedKey;
      let currentAlias = false;
      if (
        (/^\/[a-z][a-z0-9-]*(?:$|\/|\.md$)/.test(path) &&
          !/^\/(data|viewer|_next)(?:\/|$)/.test(path)) ||
        path === "/llms.txt"
      ) {
        const catalogObject = await env.POLICY_ASSETS.get("data/catalog.json");
        if (!catalogObject)
          return new Response("Service Unavailable", { status: 503, headers: sharedHeaders });
        const catalog = await catalogObject.json();
        if (path === "/llms.txt") {
          const base = new URL(request.url).origin;
          const lines = [
            "# Taskly policies",
            "",
            "Official Japanese policy documents, available as HTML and Markdown.",
            "",
          ];
          for (const [slug, document] of Object.entries(catalog.documents)) {
            const version = catalog.current[slug];
            lines.push(
              `- [${document.title}](${base}/${slug}/): [Markdown](${base}/${slug}/${version}.md)`,
            );
          }
          return new Response(request.method === "HEAD" ? null : `${lines.join("\n")}\n`, {
            headers: {
              ...sharedHeaders,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        const route = policyRoute(path, catalog);
        if (route?.missing) return notFound(request, env);
        if (route?.key) {
          key = route.key;
          currentAlias = Boolean(route.currentAlias);
        }
      }
      const asset = await env.POLICY_ASSETS.get(key);
      if (asset) {
        const headers = new Headers(sharedHeaders);
        asset.writeHttpMetadata(headers);
        headers.set("Content-Type", contentType(key));
        headers.set(
          "Cache-Control",
          currentAlias || key === "data/catalog.json" ? "no-store" : cacheControl(key),
        );
        headers.set("ETag", asset.httpEtag);
        return new Response(request.method === "HEAD" ? null : asset.body, { headers });
      }
      return notFound(request, env);
    } catch (error) {
      console.error(JSON.stringify({ event: "policy_asset_failure", path, error: String(error) }));
      return new Response("Service Unavailable", { status: 503, headers: sharedHeaders });
    }
  },
};

async function notFound(request, env) {
  const fallback = await env.POLICY_ASSETS.get("404.html");
  const headers = new Headers({ ...sharedHeaders, "Content-Type": "text/html; charset=utf-8" });
  return new Response(request.method === "HEAD" ? null : (fallback?.body ?? "Not Found"), {
    status: 404,
    headers,
  });
}
