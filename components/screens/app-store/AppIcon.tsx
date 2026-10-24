import type { RegisteredMiniApp } from "@/lib/app-registry";
import styles from "./store.module.css";

export default function AppIcon({
  app,
  large = false,
}: {
  app: RegisteredMiniApp;
  large?: boolean;
}) {
  const Icon = app.icon;
  return (
    <span
      className={styles.appIcon}
      data-app={app.id}
      data-large={large}
      data-presentation={app.iconPresentation ?? "contained"}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
