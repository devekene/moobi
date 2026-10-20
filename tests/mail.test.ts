import { describe, expect, it, vi } from "vitest";
import { createMailStore } from "@/stores/useMailStore";
import {
  isMailMessage,
  searchMail,
  validateMail,
  type MailFields,
} from "@/lib/mail";
import type { StateStorage } from "zustand/middleware";

const fields: MailFields = {
  from: " me@example.com ",
  to: "you@example.com",
  subject: "A hello",
  body: "Hope you’re well.",
};
function setup(transport = vi.fn(async () => {})) {
  const values = new Map<string, string>();
  const storage: StateStorage = {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
  return {
    store: createMailStore(storage, transport),
    storage,
    values,
    transport,
  };
}

describe("Mail workspace", () => {
  it("validates both addresses, rejects recipient lists, and permits an empty subject", () => {
    expect(validateMail({ ...fields, subject: "" })).toEqual({});
    expect(
      validateMail({
        ...fields,
        from: "bad",
        to: "one@a.com,two@b.com",
        body: "  ",
      }),
    ).toEqual({
      from: expect.any(String),
      to: expect.any(String),
      body: expect.any(String),
    });
  });
  it("keeps independently editable drafts across store recreation", () => {
    const { store, storage } = setup();
    const first = store.getState().createDraft(fields);
    const second = store.getState().createDraft();
    store.getState().updateDraft(first, { body: "Edited" });
    const restored = createMailStore(storage);
    expect(
      restored.getState().messages.find((message) => message.id === first)
        ?.body,
    ).toBe("Edited");
    expect(
      restored.getState().messages.find((message) => message.id === second)
        ?.body,
    ).toBe("");
    expect(restored.getState().sendingId).toBeNull();
  });
  it("records sent mail only after service acceptance and remembers the sender", async () => {
    const { store, transport, storage } = setup();
    const id = store.getState().createDraft(fields);
    await store.getState().send(id);
    expect(transport).toHaveBeenCalledOnce();
    expect(store.getState().messages[0].folder).toBe("sent");
    expect(createMailStore(storage).getState().messages[0].folder).toBe("sent");
    const newId = store.getState().createDraft();
    expect(
      store.getState().messages.find((message) => message.id === newId),
    ).toMatchObject({ from: "me@example.com", to: "", body: "" });
    await expect(store.getState().send(id)).rejects.toThrow(
      "no longer available",
    );
  });
  it("retains a rejected draft unchanged and releases the send lock", async () => {
    const { store } = setup(
      vi.fn(async () => {
        throw new Error("Offline");
      }),
    );
    const id = store.getState().createDraft(fields);
    await expect(store.getState().send(id)).rejects.toThrow("Offline");
    expect(store.getState().sendingId).toBeNull();
    expect(store.getState().messages[0]).toMatchObject({
      ...fields,
      folder: "drafts",
    });
  });
  it("blocks duplicate submissions, deletion and editing while a request is pending", async () => {
    let accept = () => {};
    const { store, transport } = setup(
      vi.fn(
        () =>
          new Promise<void>((resolve) => {
            accept = resolve;
          }),
      ),
    );
    const id = store.getState().createDraft(fields);
    const request = store.getState().send(id);
    expect(store.getState().messages[0].folder).toBe("drafts");
    await expect(store.getState().send(id)).rejects.toThrow("already");
    store.getState().updateDraft(id, { body: "Changed" });
    store.getState().remove(id);
    expect(store.getState().messages[0].body).toBe(fields.body);
    accept();
    await request;
    expect(transport).toHaveBeenCalledOnce();
    expect(store.getState().messages[0].folder).toBe("sent");
  });
  it("does not send invalid content", async () => {
    const { store, transport } = setup();
    const id = store.getState().createDraft();
    await expect(store.getState().send(id)).rejects.toThrow("Check");
    expect(transport).not.toHaveBeenCalled();
  });
  it("filters folders and stars and searches full message content without case sensitivity", async () => {
    const { store } = setup();
    const first = store.getState().createDraft(fields);
    store.getState().createDraft({ ...fields, body: "Other message" });
    await store.getState().send(first);
    store.getState().toggleStar(first);
    expect(
      searchMail(store.getState().messages, "sent", " WELL ", true).map(
        (message) => message.id,
      ),
    ).toEqual([first]);
    expect(
      searchMail(store.getState().messages, "drafts", "well", true),
    ).toEqual([]);
    store.getState().remove(first);
    expect(store.getState().messages).toHaveLength(1);
  });
  it("rejects malformed saved messages and never hydrates an active send", () => {
    const { storage, values } = setup();
    values.set(
      "moobi-mail",
      JSON.stringify({
        state: {
          messages: [
            {
              ...fields,
              id: "broken",
              folder: "sent",
              starred: false,
              updatedAt: "bad",
            },
            {
              ...fields,
              id: "good",
              folder: "drafts",
              starred: true,
              updatedAt: new Date().toISOString(),
            },
          ],
          sendingId: "good",
          sender: 12,
        },
        version: 0,
      }),
    );
    const restored = createMailStore(storage);
    expect(restored.getState().messages.map((message) => message.id)).toEqual([
      "good",
    ]);
    expect(restored.getState().sendingId).toBeNull();
    expect(restored.getState().sender).toBe("");
    expect(isMailMessage(null)).toBe(false);
  });
});
