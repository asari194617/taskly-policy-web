export function objectKey(pathname) {
  if (!/^\/[A-Za-z0-9_./-]*$/.test(pathname)) return null;
  if (pathname.split("/").includes("..")) return null;
  if (pathname === "/") return "index.html";
  const path = pathname.slice(1);
  if (path.endsWith("/")) return `${path}index.html`;
  if (!path.split("/").at(-1).includes(".")) return `${path}/index.html`;
  return path;
}

export function contentType(key) {
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  if (key.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (key.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (key.endsWith(".css")) return "text/css; charset=utf-8";
  if (key.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  if (key.endsWith(".svg")) return "image/svg+xml";
  if (key.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

export function cacheControl(key) {
  if (key.startsWith("_next/static/")) return "public, max-age=31536000, immutable";
  if (/^(terms|privacy|security|continuity)\/[^/]+\.md$/.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  if (/^(terms|privacy|security|continuity)\/[^/]+\/index\.html$/.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=300";
}
