import { describe, expect, it } from "vitest";
import { createNotesStore } from "@/stores/useNotesStore";
import {
  isTaskDate,
  localDateKey,
  prepareTasks,
  scheduledTasks,
  taskDateLabel,
} from "@/lib/todos";
import type { StateStorage } from "zustand/middleware";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CalendarGrid from "@/components/screens/calendar/CalendarGrid";
function setup() {
  const data = new Map<string, string>();
  const storage: StateStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return { store: createNotesStore(storage), storage, data };
}
describe("task dates", () => {
  it("uses local dates and validates real calendar dates", () => {
    expect(localDateKey(new Date(2026, 9, 15, 0, 1))).toBe("2026-10-15");
    expect(isTaskDate("2028-02-29")).toBe(true);
    for (const date of [
      "2026-02-29",
      "2026-13-01",
      "2026-10-32",
      "2026-1-1",
      "2026-10-15T00:00:00Z",
      "",
      undefined,
    ])
      expect(isTaskDate(date)).toBe(false);
    expect(taskDateLabel("2026-12-31", "2026-12-31")).toBe("Today");
    expect(taskDateLabel("2027-01-01", "2026-12-31")).toBe("Tomorrow");
  });
  it("prepares distinct tasks, trims text, skips blanks and omits invalid dates", () => {
    const tasks = prepareTasks([
      { text: " One ", priority: "high", dueDate: "2026-10-15" },
      { text: "Two", priority: "low", dueDate: "invalid" },
      { text: " ", priority: "medium" },
    ]);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({
      text: "One",
      priority: "high",
      dueDate: "2026-10-15",
      completed: false,
    });
    expect(tasks[1].dueDate).toBeUndefined();
    expect(tasks[0].id).not.toBe(tasks[1].id);
  });
});
describe("task lifecycle", () => {
  it("keeps a draft through app switching and cancels without creating a list", () => {
    const { store } = setup();
    store.getState().startTaskEntry();
    store.getState().setTaskDraftTitle("Launch");
    store
      .getState()
      .setTaskDrafts([{ key: "draft", text: "Plan", priority: "high" }]);
    store.getState().setTab("note");
    expect(store.getState().taskDrafts[0].text).toBe("Plan");
    store.getState().setComposingTodos(false);
    expect(store.getState().notes).toEqual([]);
    expect(
      store
        .getState()
        .createTodoList("Empty", [{ text: " ", priority: "low" }]),
    ).toBeNull();
  });
  it("saves a batch atomically and adds more tasks without overwriting existing tasks", () => {
    const { store, storage } = setup();
    const id = store.getState().createTodoList(" Launch ", [
      { text: "Plan", priority: "high", dueDate: "2026-10-15" },
      { text: "Ship", priority: "medium", dueDate: "2026-10-16" },
    ])!;
    expect(store.getState().notes[0].title).toBe("Launch");
    expect(store.getState()).toMatchObject({
      selectedId: id,
      tab: "todo",
      composingTodos: false,
    });
    store.getState().addTasks(id, [{ text: "Review", priority: "low" }]);
    const restored = createNotesStore(storage);
    expect(
      restored.getState().notes[0].todos?.map((task) => task.text),
    ).toEqual(["Plan", "Ship", "Review"]);
    expect(restored.getState().notes[0].todos?.[0].dueDate).toBe("2026-10-15");
  });
  it("shares completion, rescheduling, archiving and deletion with Calendar", () => {
    const { store } = setup();
    const id = store
      .getState()
      .createTodoList("Errands", [
        { text: "Groceries", priority: "medium", dueDate: "2026-10-15" },
      ])!;
    const task = store.getState().notes[0].todos![0];
    expect(
      scheduledTasks(store.getState().notes, "2026-10-15")[0],
    ).toMatchObject({ listId: id, listTitle: "Errands", id: task.id });
    store
      .getState()
      .updateTask(id, task.id, { completed: true, dueDate: "2026-10-16" });
    expect(scheduledTasks(store.getState().notes, "2026-10-15")).toEqual([]);
    expect(
      scheduledTasks(store.getState().notes, "2026-10-16")[0].completed,
    ).toBe(true);
    store.getState().updateTask(id, task.id, { dueDate: "2026-02-30" });
    expect(store.getState().notes[0].todos?.[0].dueDate).toBe("2026-10-16");
    store.getState().updateNote(id, { isArchived: true });
    expect(scheduledTasks(store.getState().notes)).toEqual([]);
    store.getState().updateNote(id, { isArchived: false });
    store.getState().updateTask(id, task.id, { dueDate: "" });
    expect(scheduledTasks(store.getState().notes)).toEqual([]);
    store.getState().deleteTask(id, task.id);
    expect(store.getState().notes[0].todos).toEqual([]);
  });
  it("preserves legacy lists and removes invalid legacy dates without dropping their tasks", () => {
    const { store, storage, data } = setup();
    store
      .getState()
      .createTodoList("Legacy", [{ text: "Keep", priority: "medium" }]);
    data.set(
      "moobi-notes",
      JSON.stringify({
        state: {
          notes: store
            .getState()
            .notes.map((note) => ({
              ...note,
              content: "Retain old note content",
              todos: note.todos?.map((task) => ({
                ...task,
                dueDate: "bad-date",
              })),
            })),
        },
        version: 0,
      }),
    );
    const note = createNotesStore(storage).getState().notes[0];
    expect(note.content).toBe("Retain old note content");
    expect(note.todos?.[0].text).toBe("Keep");
    expect(note.todos?.[0].dueDate).toBeUndefined();
  });
});
describe("Calendar task discovery", () => {
  it("includes the final days of six-week months and labels dates with tasks", () => {
    const markup = renderToStaticMarkup(
      createElement(CalendarGrid, {
        currentDate: new Date(2026, 7, 1),
        selectedDate: "2026-08-31",
        setSelectedDate: () => {},
        getEventsForDate: () => [],
        taskDates: new Set(["2026-08-31"]),
      }),
    );
    expect(markup.match(/<button/g)).toHaveLength(42);
    expect(markup).toContain('aria-label="2026-08-31, scheduled todos"');
  });
});
