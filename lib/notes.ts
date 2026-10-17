import type { Note, NoteType } from "@/types";

export type NotesSort = "edited" | "created" | "title";
export function visibleNotes(
  notes: Note[],
  type: NoteType,
  query: string,
  archived: boolean,
  sort: NotesSort,
) {
  const search = query.trim().toLocaleLowerCase();
  return notes
    .filter(
      (note) =>
        note.type === type &&
        note.isArchived === archived &&
        [
          note.title,
          note.content ?? "",
          ...(note.todos?.map((todo) => todo.text) ?? []),
        ].some((text) => text.toLocaleLowerCase().includes(search)),
    )
    .sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        (sort === "title"
          ? a.title.localeCompare(b.title)
          : Date.parse(sort === "created" ? b.createdAt : b.updatedAt) -
            Date.parse(sort === "created" ? a.createdAt : a.updatedAt)),
    );
}
export function groupNotes(
  notes: Note[],
  grouped: boolean,
  now = new Date(),
  sort: NotesSort = "edited",
) {
  const groups = new Map<string, Note[]>();
  for (const note of notes) {
    const date = new Date(sort === "created" ? note.createdAt : note.updatedAt);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((today.getTime() - day.getTime()) / 86400000);
    const label = note.isPinned
      ? "Pinned"
      : !grouped
        ? "All Notes"
        : days <= 0
          ? "Today"
          : days === 1
            ? "Yesterday"
            : days < 7
              ? "Previous 7 Days"
              : days < 30
                ? "Previous 30 Days"
                : date.toLocaleDateString("en-GB", {
                    month: "long",
                    ...(date.getFullYear() !== now.getFullYear()
                      ? { year: "numeric" }
                      : {}),
                  });
    groups.set(label, [...(groups.get(label) ?? []), note]);
  }
  return [...groups].map(([label, notes]) => ({ label, notes }));
}
export function notePreview(note: Note) {
  return note.type === "todo"
    ? `${note.todos?.filter((todo) => todo.completed).length ?? 0} of ${note.todos?.length ?? 0} completed`
    : (note.content ?? "").split("\n").find((line) => line.trim()) ||
        "No additional text";
}
export function isNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    (!("content" in value) ||
      value.content === undefined ||
      typeof value.content === "string") &&
    "type" in value &&
    (value.type === "note" || value.type === "todo") &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt)) &&
    "isPinned" in value &&
    typeof value.isPinned === "boolean" &&
    "isArchived" in value &&
    typeof value.isArchived === "boolean" &&
    (!("todos" in value) ||
      value.todos === undefined ||
      (Array.isArray(value.todos) &&
        value.todos.every(
          (todo: unknown) =>
            !!todo &&
            typeof todo === "object" &&
            "id" in todo &&
            typeof todo.id === "string" &&
            "text" in todo &&
            typeof todo.text === "string" &&
            "completed" in todo &&
            typeof todo.completed === "boolean" &&
            "priority" in todo &&
            ["low", "medium", "high"].includes(String(todo.priority)),
        )))
  );
}
