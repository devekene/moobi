/** Evaluate declared frame restrictions; iframe load events cannot report a blocked page. */
export function deniesEmbedding(
  headers: Headers,
  target: URL,
  parent: URL,
): boolean {
  const policy = headers.get("content-security-policy");
  const directives =
    policy
      ?.split(",")
      .flatMap((part) => part.split(";"))
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name.toLowerCase() === "frame-ancestors") || [];
  if (directives.length)
    return directives.some(
      ([, ...sources]) =>
        !sources.some((source) => {
          if (source === "*") return true;
          if (source === "'self'") return target.origin === parent.origin;
          if (source === parent.protocol) return true;
          if (source.startsWith("'")) return false;
          try {
            const allowed = new URL(
              source.includes("://") ? source : `${target.protocol}//${source}`,
            );
            const host = allowed.hostname;
            return (
              allowed.protocol === parent.protocol &&
              (host.startsWith("*.")
                ? parent.hostname.endsWith(host.slice(1))
                : host === parent.hostname) &&
              (allowed.port || "") === (parent.port || "")
            );
          } catch {
            return false;
          }
        }),
    );
  const options = headers.get("x-frame-options")?.trim().toLowerCase();
  return Boolean(
    options &&
    (options.includes("deny") ||
      (options.includes("sameorigin") && target.origin !== parent.origin)),
  );
}
export type BrowserProbe = "ok" | "blocked" | "unknown";
