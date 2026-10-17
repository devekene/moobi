"use client";
import { LuFileText, LuListTodo } from "react-icons/lu";
import { Tabs, TabsContent, type TabItem } from "@/components/ui/tabs";
import type { NoteType } from "@/types";
import { useNotesStore } from "@/stores/useNotesStore";
import NoteList from "./NoteList";
import NoteDetails from "./NoteDetails";
import TodoDetails from "./TodoDetails";
import TodoComposer from "./TodoComposer";
import styles from "./Notes.module.css";
const tabs: readonly TabItem<NoteType>[] = [
  { value: "note", label: "Notes", icon: <LuFileText /> },
  { value: "todo", label: "Todos", icon: <LuListTodo /> },
];
export default function Notes() {
  const {
    notes,
    selectedId,
    tab,
    setTab,
    storageError,
    composingTodos,
    setComposingTodos,
    createTodoList,
    taskDraftListId,
    taskDraftTitle,
    addTasks,
  } = useNotesStore();
  const selected = notes.find((note) => note.id === selectedId);
  return (
    <div className={styles.app}>
      {storageError && (
        <p className={styles.error} role="alert">
          {storageError}
        </p>
      )}
      {composingTodos ? (
        <TodoComposer
          onCancel={() => setComposingTodos(false)}
          listTitle={taskDraftListId ? taskDraftTitle : undefined}
          onSave={(title, drafts) => {
            if (taskDraftListId) {
              addTasks(taskDraftListId, drafts);
              setComposingTodos(false);
            } else createTodoList(title, drafts);
          }}
        />
      ) : selected ? (
        selected.type === "todo" ? (
          <TodoDetails key={selected.id} note={selected} />
        ) : (
          <NoteDetails key={selected.id} note={selected} />
        )
      ) : (
        <Tabs
          items={tabs}
          value={tab}
          onValueChange={setTab}
          label="Notes app tabs"
          className={styles.tabsRoot}
          listClassName="absolute inset-x-4 bottom-0 z-20"
        >
          <TabsContent value="note" className={styles.tabPanel}>
            <NoteList type="note" />
          </TabsContent>
          <TabsContent value="todo" className={styles.tabPanel}>
            <NoteList type="todo" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
