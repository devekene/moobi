import { LuArrowUpRight } from "react-icons/lu";
import type { RegisteredMiniApp } from "@/lib/app-registry";
import AppIcon from "./AppIcon";
import styles from "./store.module.css";

export default function AppSections({
  title,
  subtitle,
  apps,
  onSelect,
  onOpen,
}: {
  title: string;
  subtitle?: string;
  apps: readonly RegisteredMiniApp[];
  onSelect: (app: RegisteredMiniApp, trigger: HTMLButtonElement) => void;
  onOpen: (app: RegisteredMiniApp) => void;
}) {
  return (
    <section className={styles.section} aria-label={title}>
      <header className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span>{String(apps.length).padStart(2, "0")}</span>
      </header>
      <ul className={styles.appList}>
        {apps.map((app) => (
          <li key={app.id}>
            <button
              type="button"
              className={styles.appInfo}
              onClick={(event) => onSelect(app, event.currentTarget)}
              aria-label={`About ${app.name}`}
              data-store-entry={`${title}-${app.id}`}
            >
              <AppIcon app={app} />
              <span>
                <strong>{app.name}</strong>
                <small>{app.store?.tagline ?? app.description}</small>
                <em>{app.category}</em>
              </span>
            </button>
            <button
              type="button"
              className={styles.openPill}
              onClick={() => onOpen(app)}
              aria-label={`Open ${app.name}`}
            >
              Open
              <LuArrowUpRight aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
