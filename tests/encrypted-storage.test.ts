import { describe, expect, it, vi } from "vitest";
import { createCipher, createEncryptedStorage } from "@/lib/encrypted-storage";
import { createNotesStore } from "@/stores/useNotesStore";
import type { StateStorage } from "zustand/middleware";

async function setup() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const cipher = createCipher(async () => key);
  const values = new Map<string, string>();
  const backend: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
  const onError = vi.fn();
  return {
    key,
    cipher,
    values,
    backend,
    onError,
    storage: createEncryptedStorage(backend, cipher, onError),
  };
}
const bytes = (value: string) => new TextEncoder().encode(value).buffer;
const text = (value: ArrayBuffer) => new TextDecoder().decode(value);

describe("authenticated browser storage", () => {
  it("encrypts Unicode with a fresh IV each time and a non-exportable key", async () => {
    const { key, cipher } = await setup();
    const first = await cipher.encrypt(bytes("Private note 🔐"), "notes");
    const second = await cipher.encrypt(bytes("Private note 🔐"), "notes");
    expect(first).not.toContain("Private");
    expect(first).not.toBe(second);
    expect(text(await cipher.decrypt(first, "notes"))).toBe("Private note 🔐");
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });
  it("rejects tampering, truncation, unsupported versions and record swapping", async () => {
    const { cipher } = await setup();
    const saved = await cipher.encrypt(bytes("secret"), "notes");
    const parts = saved.split(":");
    const ciphertext = parts.at(-1)!;
    parts[parts.length - 1] =
      (ciphertext[0] === "A" ? "B" : "A") + ciphertext.slice(1);
    for (const invalid of [
      parts.join(":"),
      saved.slice(0, -8),
      saved.replace("v1:", "v2:"),
    ])
      await expect(cipher.decrypt(invalid, "notes")).rejects.toThrow();
    await expect(cipher.decrypt(saved, "pin")).rejects.toThrow();
    const { cipher: otherCipher } = await setup();
    await expect(otherCipher.decrypt(saved, "notes")).rejects.toThrow();
  });
  it("round-trips binary wallpaper bytes and authenticates their MIME context", async () => {
    const { cipher } = await setup();
    const payload = new Uint8Array([0, 255, 4, 128, 18]);
    const saved = await cipher.encrypt(payload.buffer, "wallpaper:image/webp");
    expect(
      new Uint8Array(await cipher.decrypt(saved, "wallpaper:image/webp")),
    ).toEqual(payload);
    await expect(
      cipher.decrypt(saved, "wallpaper:image/png"),
    ).rejects.toThrow();
  });
  it("migrates existing JSON and the legacy website theme without retaining plaintext", async () => {
    const { storage, values, backend, cipher } = await setup();
    values.set("notes", '{"content":"private"}');
    values.set("theme", "light");
    expect(await storage.getItem("notes")).toBe('{"content":"private"}');
    expect(values.get("notes")).not.toContain("private");
    expect(await storage.getItem("theme")).toBe('"light"');
    expect(values.get("theme")).toMatch(/^moobi:encrypted:v1:/);
    const reopened = createEncryptedStorage(backend, cipher);
    expect(await reopened.getItem("notes")).toBe('{"content":"private"}');
  });
  it("preserves unreadable records and blocks subsequent default writes", async () => {
    const { storage, values, onError } = await setup();
    values.set("notes", "moobi:encrypted:v2:unreadable");
    await expect(storage.getItem("notes")).rejects.toThrow();
    await storage.setItem("notes", "defaults");
    expect(values.get("notes")).toBe("moobi:encrypted:v2:unreadable");
    expect(onError).toHaveBeenLastCalledWith("notes", true);
  });
  it("never writes plaintext when encryption is unavailable", async () => {
    const { values, backend, onError } = await setup();
    const unavailable = createCipher(async () => {
      throw new Error("No key");
    });
    const storage = createEncryptedStorage(backend, unavailable, onError);
    await storage.setItem("notes", "secret");
    expect(values.has("notes")).toBe(false);
    expect(onError).toHaveBeenLastCalledWith("notes", true);
  });
  it("keeps legacy records intact on quota failure and permits read retry", async () => {
    const { backend, values, cipher, onError } = await setup();
    values.set("notes", '{"content":"keep"}');
    const write = vi.spyOn(backend, "setItem").mockImplementationOnce(() => {
      throw new Error("Quota");
    });
    const storage = createEncryptedStorage(backend, cipher, onError);
    await expect(storage.getItem("notes")).rejects.toThrow("Quota");
    expect(values.get("notes")).toBe('{"content":"keep"}');
    expect(await storage.getItem("notes")).toBe('{"content":"keep"}');
    expect(write).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenLastCalledWith("notes", false);
  });
  it("serializes rapid updates/deletion and retries the latest unsaved value", async () => {
    const { storage, values, backend, onError } = await setup();
    await Promise.all([
      storage.setItem("notes", "first"),
      storage.setItem("notes", "latest"),
    ]);
    expect(await storage.getItem("notes")).toBe("latest");
    const write = vi.spyOn(backend, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    await storage.setItem("notes", "unsaved");
    await storage.setItem("notes", "newest");
    write.mockRestore();
    await storage.retryWrites();
    expect(await storage.getItem("notes")).toBe("newest");
    expect(onError).toHaveBeenLastCalledWith("notes", false);
    await Promise.all([
      storage.setItem("notes", "last"),
      storage.removeItem("notes"),
    ]);
    expect(values.has("notes")).toBe(false);
  });
  it("does not replay a stale failed edit when retry races a newer save", async () => {
    const { storage, backend } = await setup();
    const write = vi.spyOn(backend, "setItem").mockImplementationOnce(() => {
      throw new Error("Quota");
    });
    await storage.setItem("notes", "old failed edit");
    write.mockRestore();
    const newer = storage.setItem("notes", "newer edit");
    const retry = storage.retryWrites();
    await Promise.all([newer, retry]);
    expect(await storage.getItem("notes")).toBe("newer edit");
  });
  it("restores actual Notes state through encrypted asynchronous hydration", async () => {
    const { storage, values } = await setup();
    const store = createNotesStore(storage);
    await store.persist.rehydrate();
    const id = store.getState().createNote("note");
    store.getState().updateNote(id, { title: "Private", content: "My note" });
    // Reading the shared adapter drains preceding saves for this record.
    await storage.getItem("moobi-notes");
    expect(values.get("moobi-notes")).not.toContain("My note");
    const reopened = createNotesStore(storage);
    await reopened.persist.rehydrate();
    expect(reopened.getState().notes[0]).toMatchObject({
      id,
      title: "Private",
      content: "My note",
    });
  });
});
