/** Only web addresses may enter the embedded browser. */
export function browserUrl(value: string): string | null {
  const text = value.trim();
  if (/\s/.test(text) || !text) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text))
    return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!url.hostname.includes(".") || url.username || url.password)
      return null;
    return url.href;
  } catch {
    return null;
  }
}

export function browserHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}
