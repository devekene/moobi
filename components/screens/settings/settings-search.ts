export function matchesSettingsSearch(
  category: { title: string; subtitle: string },
  query: string,
): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/);
  const text = `${category.title} ${category.subtitle}`.toLocaleLowerCase();
  return terms.every((term) => text.includes(term));
}
