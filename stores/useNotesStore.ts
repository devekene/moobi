import { encryptedStorage } from "@/lib/encrypted-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type { Note, NoteType, TodoItem } from "@/types";
import {
  prepareTasks,
  isTaskDate,
  type TaskDraft,
  type TaskDraftRow,
} from "@/lib/todos";
import { isNote } from "@/lib/notes";

type NotesState = {
  notes: Note[];
  selectedId: string | null;
  tab: NoteType;
  storageError: string | null;
  composingTodos: boolean;
  taskDrafts: TaskDraftRow[];
  taskDraftTitle: string;
  taskDraftListId: string | null;
  startTaskEntry: (listId?: string) => void;
  setTaskDrafts: (rows: TaskDraftRow[]) => void;
  setTaskDraftTitle: (title: string) => void;
  setComposingTodos: (open: boolean) => void;
  createTodoList: (
    title: string,
    drafts: readonly TaskDraft[],
  ) => string | null;
  addTasks: (listId: string, drafts: readonly TaskDraft[]) => void;
  updateTask: (
    listId: string,
    taskId: string,
    patch: Partial<
      Pick<TodoItem, "text" | "completed" | "priority" | "dueDate">
    >,
  ) => void;
  deleteTask: (listId: string, taskId: string) => void;
  createNote: (type: NoteType) => string;
  updateNote: (
    id: string,
    patch: Partial<Omit<Note, "id" | "createdAt">>,
  ) => void;
  deleteNotes: (ids: string[]) => void;
  selectNote: (id: string | null) => void;
  setTab: (tab: NoteType) => void;
};
export const createNotesStore = (storage: StateStorage) =>
  create<NotesState>()(
    persist(
      (set) => ({
        notes: [],
        selectedId: null,
        tab: "note",
        storageError: null,
        composingTodos: false,
        taskDrafts: [],
        taskDraftTitle: "",
        taskDraftListId: null,
        startTaskEntry: (listId) =>
          set((state) => ({
            composingTodos: true,
            taskDraftListId: listId ?? null,
            taskDraftTitle:
              state.notes.find((note) => note.id === listId)?.title ?? "",
            taskDrafts: [
              { key: crypto.randomUUID(), text: "", priority: "medium" },
            ],
          })),
        setTaskDrafts: (taskDrafts) => set({ taskDrafts }),
        setTaskDraftTitle: (taskDraftTitle) => set({ taskDraftTitle }),
        setComposingTodos: (composingTodos) => set({ composingTodos }),
        createTodoList: (title, drafts) => {
          const todos = prepareTasks(drafts);
          if (!todos.length) return null;
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          set((state) => ({
            notes: [
              {
                id,
                title: title.trim() || "My tasks",
                type: "todo",
                content: "",
                todos,
                createdAt: now,
                updatedAt: now,
                isPinned: false,
                isArchived: false,
              },
              ...state.notes,
            ],
            selectedId: id,
            tab: "todo",
            composingTodos: false,
          }));
          return id;
        },
        addTasks: (listId, drafts) => {
          const tasks = prepareTasks(drafts);
          if (!tasks.length) return;
          set((state) => ({
            notes: state.notes.map((note) =>
              note.id === listId && note.type === "todo"
                ? {
                    ...note,
                    todos: [...(note.todos ?? []), ...tasks],
                    updatedAt: new Date().toISOString(),
                  }
                : note,
            ),
          }));
        },
        updateTask: (listId, taskId, patch) => {
          if (
            patch.dueDate !== undefined &&
            patch.dueDate !== "" &&
            !isTaskDate(patch.dueDate)
          )
            return;
          set((state) => ({
            notes: state.notes.map((note) =>
              note.id === listId && note.type === "todo"
                ? {
                    ...note,
                    updatedAt: new Date().toISOString(),
                    todos: note.todos?.map((task) =>
                      task.id === taskId
                        ? {
                            ...task,
                            ...patch,
                            ...("dueDate" in patch
                              ? { dueDate: patch.dueDate || undefined }
                              : {}),
                          }
                        : task,
                    ),
                  }
                : note,
            ),
          }));
        },
        deleteTask: (listId, taskId) =>
          set((state) => ({
            notes: state.notes.map((note) =>
              note.id === listId
                ? {
                    ...note,
                    todos: note.todos?.filter((task) => task.id !== taskId),
                    updatedAt: new Date().toISOString(),
                  }
                : note,
            ),
          })),
        createNote: (type) => {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          set((state) => ({
            notes: [
              {
                id,
                title: "",
                content: "",
                type,
                createdAt: now,
                updatedAt: now,
                isPinned: false,
                isArchived: false,
                todos: type === "todo" ? [] : undefined,
              },
              ...state.notes,
            ],
            selectedId: id,
            tab: type,
          }));
          return id;
        },
        updateNote: (id, patch) =>
          set((state) => ({
            ...(state.selectedId === id && patch.type
              ? { tab: patch.type }
              : {}),
            notes: state.notes.map((note) =>
              note.id === id
                ? { ...note, ...patch, updatedAt: new Date().toISOString() }
                : note,
            ),
          })),
        deleteNotes: (ids) =>
          set((state) => ({
            notes: state.notes.filter((note) => !ids.includes(note.id)),
            selectedId:
              state.selectedId && ids.includes(state.selectedId)
                ? null
                : state.selectedId,
          })),
        selectNote: (selectedId) => set({ selectedId }),
        setTab: (tab) => set({ tab, selectedId: null }),
      }),
      {
        name: "moobi-notes",
        storage: createJSONStorage(() => storage),
        skipHydration: storage === encryptedStorage,
        partialize: ({ notes }) => ({ notes }),
        merge: (saved, current) => ({
          ...current,
          notes:
            saved &&
            typeof saved === "object" &&
            "notes" in saved &&
            Array.isArray(saved.notes)
              ? saved.notes.filter(isNote).map((note) => ({
                  ...note,
                  todos: note.todos?.map((task) => ({
                    ...task,
                    dueDate: isTaskDate(task.dueDate)
                      ? task.dueDate
                      : undefined,
                  })),
                }))
              : [],
        }),
      },
    ),
  );
export const useNotesStore = createNotesStore(encryptedStorage);
