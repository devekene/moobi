import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  limitedBody,
  runtimeOrigin,
  sameOriginMutation,
} from "@/lib/server/private-store-http";

afterEach(() => vi.unstubAllEnvs());
describe("private store HTTP guards", () => {
  it("rejects missing or cross-site mutation origins", () => {
    vi.stubEnv("MOOBI_APP_ORIGIN", "https://moobi.example");
    expect(() =>
      sameOriginMutation(
        new NextRequest("https://moobi.example/api/private-store/apps", {
          method: "POST",
        }),
      ),
    ).toThrow();
    expect(() =>
      sameOriginMutation(
        new NextRequest("https://moobi.example/api/private-store/apps", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      sameOriginMutation(
        new NextRequest("https://moobi.example/api/private-store/apps", {
          method: "POST",
          headers: { origin: "https://moobi.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("requires a separate HTTPS runtime in production and allows distinct loopback hostnames in development", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOOBI_APP_ORIGIN", "https://moobi.example");
    vi.stubEnv("NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN", "https://moobi.example");
    expect(() => runtimeOrigin()).toThrow();
    vi.stubEnv("NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN", "http://runtime.example");
    expect(() => runtimeOrigin()).toThrow();
    vi.stubEnv(
      "NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN",
      "https://runtime.example",
    );
    expect(runtimeOrigin()).toBe("https://runtime.example");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MOOBI_APP_ORIGIN", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN", "http://localhost:4100");
    expect(() => runtimeOrigin()).toThrow();
    vi.stubEnv("NEXT_PUBLIC_MINI_APP_RUNTIME_ORIGIN", "http://127.0.0.1:4100");
    expect(runtimeOrigin()).toBe("http://127.0.0.1:4100");
  });
  it("bounds streamed bodies without trusting Content-Length", async () => {
    const request = new Request("https://moobi.example", {
      method: "POST",
      body: "x".repeat(16),
    });
    await expect(limitedBody(request, 10)).rejects.toThrow("too large");
    await expect(
      limitedBody(
        new Request("https://moobi.example", {
          method: "POST",
          headers: { "content-length": "100" },
          body: "small",
        }),
        10,
      ),
    ).rejects.toThrow("too large");
  });
});
