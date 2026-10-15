const AppSearch = ({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) => (
  <label className="block">
    <span className="sr-only">Search mini apps</span>
    <input
      value={query}
      onChange={(event) => onQueryChange(event.currentTarget.value)}
      placeholder="Search mini apps"
      type="search"
      className="phone-border w-full rounded-xl border bg-[var(--phone-surface)] px-4 py-3 text-sm text-[var(--phone-text)] placeholder:text-[var(--phone-text-muted)]"
    />
  </label>
);

export default AppSearch;
