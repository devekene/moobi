import { describe, expect, it } from "vitest";
import { createNotesStore } from "@/stores/useNotesStore";
import { groupNotes, visibleNotes } from "@/lib/notes";
import type { Note } from "@/types";
import type { StateStorage } from "zustand/middleware";
function setup() {
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
  return { store: createNotesStore(storage), storage, values };
}
const note = (id: string, date: string, patch: Partial<Note> = {}): Note => ({
  id,
  title: id,
  content: "",
  type: "note",
  isPinned: false,
  isArchived: false,
  createdAt: date,
  updatedAt: date,
  ...patch,
});
describe("Notes state and persistence", () => {
  it("creates separate notes and todos without carrying content into a new note", () => {
    const { store } = setup();
    const id = store.getState().createNote("note");
    store.getState().updateNote(id, { title: "First", content: "Keep this" });
    const second = store.getState().createNote("todo");
    expect(second).not.toBe(id);
    expect(store.getState().notes[0]).toMatchObject({
      title: "",
      content: "",
      type: "todo",
      todos: [],
    });
    expect(store.getState().notes[1].content).toBe("Keep this");
  });
  it("persists edits, completion and priority across remounts", () => {
    const { store, storage } = setup();
    const id = store.getState().createNote("todo");
    store.getState().updateNote(id, {
      title: "Errands",
      todos: [
        { id: "task", text: "Groceries", completed: true, priority: "high" },
      ],
    });
    store.getState().setTab("note");
    const restored = createNotesStore(storage);
    expect(restored.getState().notes).toEqual(store.getState().notes);
    expect(restored.getState().selectedId).toBeNull();
  });
  it("archives and pins without dropping content and deletes only selected notes", () => {
    const { store } = setup();
    const a = store.getState().createNote("note");
    const b = store.getState().createNote("note");
    store
      .getState()
      .updateNote(a, { isArchived: true, isPinned: true, content: "Retained" });
    store.getState().deleteNotes([b]);
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().notes).toHaveLength(1);
    expect(store.getState().notes[0]).toMatchObject({
      id: a,
      content: "Retained",
      isArchived: true,
      isPinned: true,
    });
  });
  it("returns a converted note to its matching tab and retains tasks", () => {
    const { store } = setup();
    const id = store.getState().createNote("todo");
    store
      .getState()
      .updateNote(id, {
        todos: [
          { id: "task", text: "Keep", completed: false, priority: "medium" },
        ],
      });
    store.getState().updateNote(id, { type: "note" });
    store.getState().selectNote(null);
    expect(store.getState().tab).toBe("note");
    expect(store.getState().notes[0].todos?.[0].text).toBe("Keep");
  });
  it("ignores malformed saved entries", () => {
    const { storage, values } = setup();
    values.set(
      "moobi-notes",
      JSON.stringify({
        state: {
          notes: [null, { id: "invalid" }, note("valid", "2026-10-15")],
        },
        version: 0,
      }),
    );
    expect(
      createNotesStore(storage)
        .getState()
        .notes.map((item) => item.id),
    ).toEqual(["valid"]);
  });
});
describe("Notes lists", () => {
  it("searches todo text, excludes archives from active tabs, and sorts pins first without mutating", () => {
    const notes = [
      note("B", "2026-10-15"),
      note("A", "2026-09-01", { isPinned: true }),
      note("Archive", "2026-10-15", { isArchived: true }),
      note("Todo", "2026-10-15", {
        type: "todo",
        todos: [
          { id: "t", text: "Buy Milk", completed: false, priority: "low" },
        ],
      }),
    ];
    expect(
      visibleNotes(notes, "note", "", false, "edited").map((item) => item.id),
    ).toEqual(["A", "B"]);
    expect(
      visibleNotes(notes, "todo", " milk ", false, "title").map(
        (item) => item.id,
      ),
    ).toEqual(["Todo"]);
    expect(
      visibleNotes(notes, "note", "", true, "edited").map((item) => item.id),
    ).toEqual(["Archive"]);
    expect(notes[0].id).toBe("B");
  });
  it("groups by calendar day and keeps previous years separate", () => {
    const notes = [
      note("today", "2026-10-15T01:00:00"),
      note("yesterday", "2026-10-14T23:00:00"),
      note("week", "2026-10-10"),
      note("month", "2026-09-25"),
      note("old", "2025-08-01"),
    ];
    expect(
      groupNotes(notes, true, new Date("2026-10-15T15:00:00")).map(
        (group) => group.label,
      ),
    ).toEqual([
      "Today",
      "Yesterday",
      "Previous 7 Days",
      "Previous 30 Days",
      "August 2025",
    ]);
    expect(groupNotes(notes, false)).toHaveLength(1);
  });
});
