import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { contentType, objectKey } from "../worker/routing.mjs";

const port = Number(process.env.PORT || 4173);
createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  const key = objectKey(pathname);
  if (!key) {
    response.writeHead(400);
    response.end();
    return;
  }
  try {
    const data = await readFile(join("out", key));
    response.writeHead(200, { "Content-Type": contentType(key), "X-Robots-Tag": "noindex" });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile("out/404.html"));
  }
}).listen(port, "127.0.0.1", () => console.log(`Serving out on http://127.0.0.1:${port}`));
