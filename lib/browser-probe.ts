import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList } from "node:net";
import { browserUrl } from "./browser";
import { deniesEmbedding, type BrowserProbe } from "./browser-embedding";

const privateNetworks = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const)
  privateNetworks.addSubnet(address, prefix, "ipv4");

export function publicProbeUrl(input: string): URL | null {
  const value = browserUrl(input);
  if (!value) return null;
  const url = new URL(value);
  return url.protocol === "https:" && (!url.port || url.port === "443")
    ? url
    : null;
}

export async function probeWebsite(
  input: string,
  parent: URL,
  signal: AbortSignal,
): Promise<BrowserProbe> {
  let url = publicProbeUrl(input);
  for (let redirects = 0; url && redirects <= 4; redirects++) {
    signal.throwIfAborted();
    const { address } = await lookup(url.hostname, { family: 4 });
    signal.throwIfAborted();
    if (privateNetworks.check(address, "ipv4")) return "unknown";
    // Pin the validated public address so redirects and DNS rebinding cannot reach private hosts.
    const response = await new Promise<{ status: number; headers: Headers }>(
      (resolve, reject) => {
        const req = request(
          url!,
          {
            method: "HEAD",
            signal,
            family: 4,
            lookup: (_hostname, _options, done) => done(null, address, 4),
            headers: { Accept: "text/html" },
          },
          (res) => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(res.headers)) {
              if (value)
                headers.set(
                  key,
                  Array.isArray(value) ? value.join(",") : value,
                );
            }
            res.resume();
            resolve({ status: res.statusCode || 0, headers });
          },
        );
        req.on("error", reject);
        req.end();
      },
    );
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      url = location ? publicProbeUrl(new URL(location, url).href) : null;
      continue;
    }
    if (deniesEmbedding(response.headers, url, parent)) return "blocked";
    return response.status >= 200 && response.status < 300 ? "ok" : "unknown";
  }
  return "unknown";
}
