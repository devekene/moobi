// @ts-check
// Deploy this service on a separate, cookie-free HTTPS hostname. Never put
// Supabase credentials or Moobi authentication code in this process.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

/** @param {{ appOrigin: string }} options */
export function createRuntimeServer({ appOrigin }) {
  const allowed = new URL(appOrigin);
  if (!/^https?:$/.test(allowed.protocol) || allowed.origin !== appOrigin)
    throw new Error("MOOBI_APP_ORIGIN must be an exact HTTP(S) origin.");
  const policy = `sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline' data:; img-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; media-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${appOrigin}`;
  const server = createServer(async (request, response) => {
    response.setHeader("Content-Security-Policy", policy);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), display-capture=(), clipboard-read=(), clipboard-write=(), payment=(), usb=(), serial=(), bluetooth=()",
    );
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.method === "GET" && request.url === "/bootstrap") {
      response.end("<!doctype html><title>Moobi isolated runtime</title>");
      return;
    }
    if (request.method !== "POST" || request.url !== "/render") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    if (
      request.headers.origin !== appOrigin ||
      !request.headers["content-type"]?.startsWith(
        "application/x-www-form-urlencoded",
      )
    ) {
      response.writeHead(403);
      response.end("Moobi origin required");
      return;
    }
    try {
      const declared = Number(request.headers["content-length"] || 0);
      if (!Number.isFinite(declared) || declared > 2 * 1024 * 1024)
        throw new Error("Oversized document");
      /** @type {Buffer[]} */
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        if (!Buffer.isBuffer(chunk)) throw new Error("Invalid body");
        size += chunk.length;
        if (size > 2 * 1024 * 1024) throw new Error("Oversized document");
        chunks.push(chunk);
      }
      const body = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
      const encoded = body.get("document");
      if (
        body.size !== 1 ||
        !encoded ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
      )
        throw new Error("Invalid document");
      const bytes = Buffer.from(encoded, "base64");
      if (bytes.length > 768 * 1024 || bytes.toString("base64") !== encoded)
        throw new Error("Invalid document");
      const document = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!document.startsWith("<!doctype html>"))
        throw new Error("Invalid document");
      response.end(document);
    } catch {
      response.writeHead(400);
      response.end("Invalid or oversized runtime document");
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const appOrigin =
    process.env.MOOBI_APP_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (
    !appOrigin ||
    (process.env.NODE_ENV === "production" &&
      new URL(appOrigin).protocol !== "https:")
  )
    throw new Error("Set MOOBI_APP_ORIGIN to the HTTPS Moobi site origin.");
  const port = Number(process.env.PORT || 4100);
  const host = process.env.HOST || "127.0.0.1";
  createRuntimeServer({ appOrigin }).listen(port, host, () => {
    console.log(`Moobi isolated runtime listening on ${host}:${port}`);
  });
}
