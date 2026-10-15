import type { RegisteredMiniApp } from "@/lib/app-registry";

const AppSections = ({
  title,
  apps,
  onSelect,
}: {
  title: string;
  apps: readonly RegisteredMiniApp[];
  onSelect: (app: RegisteredMiniApp) => void;
}) => (
  <section aria-label={title} className="space-y-2">
    <h2 className="text-base font-semibold text-[var(--phone-text)]">{title}</h2>
    {apps.length === 0 ? (
      <p className="rounded-xl bg-[var(--phone-surface)] p-4 text-sm text-[var(--phone-text-muted)]">
        No mini apps to show here yet.
      </p>
    ) : (
      <ul className="space-y-2">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <li key={app.id}>
              <button
                type="button"
                onClick={() => onSelect(app)}
                className="flex w-full items-center gap-3 rounded-xl bg-[var(--phone-surface)] p-3 text-left transition-colors hover:bg-[var(--phone-surface-elevated)]"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${app.color}`}>
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[var(--phone-text)]">
                    {app.name}
                  </span>
                  <span className="block truncate text-xs capitalize text-[var(--phone-text-muted)]">
                    {app.category} · {app.version}
                  </span>
                </span>
                {app.availability === "preview" && (
                  <span className="shrink-0 rounded-full bg-[var(--phone-surface-elevated)] px-2 py-1 text-[10px] text-[var(--phone-text-secondary)]">
                    Preview
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export default AppSections;
