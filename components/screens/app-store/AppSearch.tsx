import { LuSearch, LuX } from "react-icons/lu";
import styles from "./store.module.css";

export default function AppSearch({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  return (
    <div className={styles.search}>
      <LuSearch aria-hidden="true" />
      <input
        aria-label="Search store apps"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder="Find your next favorite"
        type="search"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onQueryChange("")}
        >
          <LuX aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
