/** Canonical self-contained package contract shared by preview, upload, and installation. */
export const MAX_PACKAGE_BYTES = 256 * 1024;
export const MINI_APP_SDK_VERSION = 1;

export interface MiniAppPackage {
  formatVersion: 1;
  manifest: {
    id: string;
    name: string;
    version: string;
    sdkVersion: 1;
    storageVersion?: number;
    entry: "index.html";
    permissions: "storage"[];
  };
  files: { "index.html": string; "app.css": string; "app.js": string };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function parseMiniAppPackage(source: string): MiniAppPackage {
  if (new TextEncoder().encode(source).byteLength > MAX_PACKAGE_BYTES)
    throw new Error("Preview packages must be 256 KiB or smaller.");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error("Choose a valid Moobi preview JSON package.");
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, ["formatVersion", "manifest", "files"]) ||
    value.formatVersion !== 1 ||
    !isRecord(value.manifest) ||
    !isRecord(value.files)
  )
    throw new Error("Unsupported preview package format.");
  const manifest = value.manifest;
  if (
    !exactKeys(manifest, [
      ...(Object.hasOwn(manifest, "storageVersion") ? ["storageVersion"] : []),
      "id",
      "name",
      "version",
      "sdkVersion",
      "entry",
      "permissions",
    ]) ||
    typeof manifest.id !== "string" ||
    !/^[a-z][a-z0-9.-]{2,63}$/.test(manifest.id) ||
    typeof manifest.name !== "string" ||
    !manifest.name.trim() ||
    manifest.name.length > 60 ||
    typeof manifest.version !== "string" ||
    !/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(
      manifest.version,
    ) ||
    manifest.sdkVersion !== MINI_APP_SDK_VERSION ||
    (manifest.storageVersion !== undefined &&
      (typeof manifest.storageVersion !== "number" ||
        !Number.isSafeInteger(manifest.storageVersion) ||
        manifest.storageVersion < 1 ||
        manifest.storageVersion > 999999)) ||
    manifest.entry !== "index.html" ||
    !Array.isArray(manifest.permissions) ||
    manifest.permissions.length > 1 ||
    !manifest.permissions.every(
      (permission: unknown) => permission === "storage",
    )
  )
    throw new Error("Invalid manifest or unsupported SDK/permissions.");
  const files = value.files;
  if (
    !exactKeys(files, ["index.html", "app.css", "app.js"]) ||
    typeof files["index.html"] !== "string" ||
    typeof files["app.css"] !== "string" ||
    typeof files["app.js"] !== "string"
  )
    throw new Error(
      "Include only index.html, app.css, and app.js as text files.",
    );
  return {
    formatVersion: 1,
    manifest: {
      id: manifest.id,
      name: manifest.name.trim(),
      version: manifest.version,
      sdkVersion: 1,
      ...(typeof manifest.storageVersion === "number"
        ? { storageVersion: manifest.storageVersion }
        : {}),
      entry: "index.html",
      permissions: manifest.permissions.length ? ["storage"] : [],
    },
    files: {
      "index.html": files["index.html"],
      "app.css": files["app.css"],
      "app.js": files["app.js"],
    },
  };
}

export async function packageDigest(app: MiniAppPackage): Promise<string> {
  // Parser produces a canonical key order. Digest identifies bytes, not publisher trust.
  const bytes = new TextEncoder().encode(JSON.stringify(app));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
