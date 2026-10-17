# Notes and Todos

Notes and Todos share app tabs, but have separate editors. Notes save text as you
type. Todos opens a dedicated task-list workspace with completion, progress,
priority, due dates, and All / To do / Done filters. Legacy list text remains
available under List notes; existing task IDs and completion are preserved.

## Task entry

Compose from Todos to prepare a new named list, or choose Add tasks in an existing
list. Add several rows before saving, press Enter to append a row, or paste one
task per line. Each row has its own optional due date and priority. Today and
Tomorrow shortcuts use the visitor's local calendar day. Save commits the batch;
Cancel creates no empty list. Unsaved entry survives app switching during the
current page session, but is not persisted through a browser refresh.

## Calendar and widgets

`TodoItem.dueDate` is an optional validated `YYYY-MM-DD` local date, not a UTC
instant. The shared `scheduledTasks` read model in `lib/todos.ts` exposes stable
list/task IDs, list title, priority, date, and completion for Calendar and future
widgets. Calendar marks scheduled days, shows tasks for the selected day, supports
completion, and opens the source list. It reads the Notes store directly: no
copied events, polling, or two-way sync process. Archived lists are excluded;
completed scheduled tasks remain visible as completed. Undated tasks stay in Todos.
No notifications, background reminders, times, recurrence, or external calendar
sync are implied by assigning a date.

## Storage and controls

Saved content is local to this browser in `moobi-notes` localStorage. It survives
app switches and refreshes, but is not a cloud backup or cross-device sync.
Clearing site data removes it. A write failure displays a warning and keeps the
in-memory edits. Delete is permanent. Old invalid task dates are cleared when
restoring saved data while the task itself is preserved.

Both lists support search, date groups, pinning, gallery/list views, sort order,
selection, and an archive. Plain notes also offer find, ruled lines, text export,
and browser share/clipboard fallback. Revert restores text to when the current
note detail view opened. Conversion to a checklist retains the note's content.

The shell supplies safe-area insets once. Notes owns contained scrolling;
Calendar uses the shell's scroll viewport. All new surfaces use phone theme tokens.

Checks: `npm run test -- tests/todos.test.ts tests/notes.test.ts tests/tabs.test.ts`,
`npm run lint`, `npm run typecheck`, `npm run build -- --webpack`.
