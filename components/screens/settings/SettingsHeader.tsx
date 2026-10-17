import type { Ref } from "react";
import { LuChevronLeft } from "react-icons/lu";
import styles from "./settings.module.css";

export default function SettingsHeader({
  title,
  headingRef,
  onBack,
}: {
  title: string;
  headingRef?: Ref<HTMLHeadingElement>;
  onBack?: () => void;
}) {
  return (
    <header className={styles.header}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={styles.backButton}
          aria-label="Back to Settings"
        >
          <LuChevronLeft aria-hidden="true" />
        </button>
      )}
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>
        {title}
      </h1>
    </header>
  );
}
