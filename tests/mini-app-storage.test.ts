import { describe, expect, it } from "vitest";
import { createCipher } from "@/lib/encrypted-storage";
import {
  createMiniAppStorage,
  MAX_APP_VALUE_BYTES,
} from "@/lib/mini-app-storage";

async function setup() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const records = new Map<string, string>();
  const backend = {
    getItem: (name: string) => records.get(name) ?? null,
    setItem: (name: string, value: string) => {
      records.set(name, value);
    },
  };
  const cipher = createCipher(async () => key);
  return {
    records,
    backend,
    cipher,
    storage: createMiniAppStorage(backend, cipher),
  };
}

describe("external preview app storage", () => {
  it("persists encrypted app data across runtime instances without exposing another app", async () => {
    const { storage, records, backend, cipher } = await setup();
    await storage("example.one", "set", "count", "private text");
    expect([...records.values()][0]).not.toContain("private text");
    expect(
      await createMiniAppStorage(backend, cipher)(
        "example.one",
        "get",
        "count",
      ),
    ).toBe("private text");
    expect(await storage("example.two", "get", "count")).toBeNull();
    await storage("example.one", "remove", "count");
    expect(await storage("example.one", "get", "count")).toBeNull();
  });
  it("serializes concurrent writes without losing keys", async () => {
    const { storage } = await setup();
    await Promise.all([
      storage("example.one", "set", "first", "1"),
      storage("example.one", "set", "second", "2"),
    ]);
    expect(await storage("example.one", "get", "first")).toBe("1");
    expect(await storage("example.one", "get", "second")).toBe("2");
  });
  it("rejects value and app quotas while preserving existing data", async () => {
    const { storage } = await setup();
    await storage("example.one", "set", "saved", "keep");
    await expect(
      storage(
        "example.one",
        "set",
        "saved",
        "x".repeat(MAX_APP_VALUE_BYTES + 1),
      ),
    ).rejects.toThrow();
    expect(await storage("example.one", "get", "saved")).toBe("keep");
    for (let index = 0; index < 31; index++)
      await storage("example.one", "set", `key${index}`, "x");
    await expect(
      storage("example.one", "set", "overflow", "x"),
    ).rejects.toThrow("quota");
  });
  it("does not overwrite unreadable data or acknowledge failed writes", async () => {
    const { storage, backend, cipher, records } = await setup();
    records.set("moobi-external-preview:v1:example.one", "broken ciphertext");
    await expect(storage("example.one", "set", "count", "1")).rejects.toThrow();
    expect(records.get("moobi-external-preview:v1:example.one")).toBe(
      "broken ciphertext",
    );
    const failing = createMiniAppStorage(
      {
        ...backend,
        setItem: () => {
          throw new Error("quota");
        },
      },
      cipher,
    );
    await expect(failing("example.two", "set", "count", "1")).rejects.toThrow(
      "quota",
    );
  });
  it("authenticates the app namespace and rejects prototype keys", async () => {
    const { storage, records } = await setup();
    await storage("example.one", "set", "count", "secret");
    records.set(
      "moobi-external-preview:v1:example.two",
      records.get("moobi-external-preview:v1:example.one") ?? "",
    );
    await expect(storage("example.two", "get", "count")).rejects.toThrow();
    await expect(
      storage("example.one", "set", "__proto__", "x"),
    ).rejects.toThrow();
  });
});
