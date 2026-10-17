import type { Note, TodoItem, ToDoPriority } from "@/types";

/** A local calendar date, never an instant or a UTC conversion. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isTaskDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}
export function taskDateLabel(value: string, today = localDateKey()) {
  if (!isTaskDate(value)) return "No date";
  if (value === today) return "Today";
  const tomorrow = new Date(`${today}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === localDateKey(tomorrow)) return "Tomorrow";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(value.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  });
}
export type TaskDraft = {
  text: string;
  priority: ToDoPriority;
  dueDate?: string;
};
export type TaskDraftRow = TaskDraft & { key: string };
export function prepareTasks(drafts: readonly TaskDraft[]): TodoItem[] {
  return drafts
    .filter((draft) => draft.text.trim())
    .map((draft) => ({
      id: crypto.randomUUID(),
      text: draft.text.trim(),
      completed: false,
      priority: draft.priority,
      ...(isTaskDate(draft.dueDate) ? { dueDate: draft.dueDate } : {}),
    }));
}
export type ScheduledTask = TodoItem & {
  dueDate: string;
  listId: string;
  listTitle: string;
};
/** Shared read model for Calendar and future widgets. No duplicated event records. */
export function scheduledTasks(
  notes: readonly Note[],
  date?: string,
): ScheduledTask[] {
  return notes
    .filter((note) => note.type === "todo" && !note.isArchived)
    .flatMap((note) =>
      (note.todos ?? []).flatMap((task) =>
        isTaskDate(task.dueDate) && (!date || task.dueDate === date)
          ? [
              {
                ...task,
                dueDate: task.dueDate,
                listId: note.id,
                listTitle: note.title || "Untitled list",
              },
            ]
          : [],
      ),
    )
    .sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.text.localeCompare(b.text),
    );
}
