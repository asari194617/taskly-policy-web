import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import worker from "../worker/index.mjs";

const port = Number(process.env.PORT || 4173);
const bucket = {
  async get(key) {
    try {
      const body = await readFile(join("out", key));
      return {
        body,
        httpEtag: '"local"',
        json: async () => JSON.parse(body.toString("utf8")),
        writeHttpMetadata() {},
      };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  },
};
createServer(async (request, response) => {
  const result = await worker.fetch(
    new Request(`http://127.0.0.1:${port}${request.url || "/"}`, { method: request.method }),
    { POLICY_ASSETS: bucket },
  );
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(result.body ? Buffer.from(await result.arrayBuffer()) : undefined);
}).listen(port, "127.0.0.1", () => console.log(`Serving out on http://127.0.0.1:${port}`));
