import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 8765;
const bingxBaseUrl = "https://open-api.bingx.com";

const proxyRoutes = new Map([
  ["/api/bingx/contracts", "/openApi/swap/v2/quote/contracts"],
  ["/api/bingx/funding", "/openApi/swap/v2/quote/premiumIndex"],
  ["/api/bingx/open-interest", "/openApi/swap/v2/quote/openInterest"]
]);

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

    if (proxyRoutes.has(requestUrl.pathname)) {
      await proxyBingX(request, response, requestUrl);
      return;
    }

    await serveStatic(request, response, requestUrl);
  }
  catch (error) {
    console.error(error);
    sendJson(response, 500, { code: -1, msg: "Internal server error" });
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`TICK v0.3.1 running at http://127.0.0.1:${port}`);
});

async function proxyBingX(request, response, requestUrl) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { code: -1, msg: "Method not allowed" });
    return;
  }

  const upstreamPath = proxyRoutes.get(requestUrl.pathname);
  const upstreamUrl = new URL(upstreamPath, bingxBaseUrl);
  upstreamUrl.searchParams.set("timestamp", String(Date.now()));

  if (requestUrl.pathname === "/api/bingx/open-interest") {
    const symbol = String(requestUrl.searchParams.get("symbol") || "").toUpperCase();
    if (!/^[A-Z0-9]+-USDT$/.test(symbol)) {
      sendJson(response, 400, { code: -1, msg: "Invalid USDT contract symbol" });
      return;
    }
    upstreamUrl.searchParams.set("symbol", symbol);
  }

  const upstream = await fetch(upstreamUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });
  const body = await upstream.text();

  response.writeHead(upstream.status, {
    "Cache-Control": requestUrl.pathname === "/api/bingx/contracts"
      ? "public, max-age=300"
      : "no-store",
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

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

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}
