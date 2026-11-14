import { cacheControl, contentType, objectKey } from "./routing.mjs";

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
    const key = objectKey(path);
    if (key === null) return new Response("Bad Request", { status: 400, headers: sharedHeaders });

    try {
      const asset = await env.POLICY_ASSETS.get(key);
      if (asset) {
        const headers = new Headers(sharedHeaders);
        asset.writeHttpMetadata(headers);
        headers.set("Content-Type", contentType(key));
        headers.set("Cache-Control", cacheControl(key));
        headers.set("ETag", asset.httpEtag);
        return new Response(request.method === "HEAD" ? null : asset.body, { headers });
      }
      const fallback = await env.POLICY_ASSETS.get("404.html");
      const headers = new Headers({ ...sharedHeaders, "Content-Type": "text/html; charset=utf-8" });
      return new Response(request.method === "HEAD" ? null : (fallback?.body ?? "Not Found"), {
        status: 404,
        headers,
      });
    } catch (error) {
      console.error(JSON.stringify({ event: "policy_asset_failure", path, error: String(error) }));
      return new Response("Service Unavailable", { status: 503, headers: sharedHeaders });
    }
  },
};
