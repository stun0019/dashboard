import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 8765;
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    await serveStatic(request, response, requestUrl);
  }
  catch (error) {
    console.error(error);
    sendJson(response, 500, { code: -1, msg: "Internal server error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`TICK v0.3.3 running at http://127.0.0.1:${port}`);
});

async function serveStatic(request, response, requestUrl) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.writeHead(405);
    response.end();
    return;
  }

  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const relativePath = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const hasHiddenSegment = relativePath
    .split(/[/\\]/)
    .some(segment => segment.startsWith("."));
  if (relativePath.startsWith("..") || relativePath.includes("\0") || hasHiddenSegment) {
    response.writeHead(403);
    response.end();
    return;
  }

  const filePath = join(root, relativePath);
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const body = await readFile(filePath);
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff"
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(body);
}
