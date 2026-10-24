import { fromBuffer, type Entry, type ZipFile } from "yauzl";
import {
  MAX_PACKAGE_BYTES,
  parseMiniAppPackage,
  type MiniAppPackage,
} from "@/lib/mini-app-package";
import { StoreError } from "@/lib/server/private-store-http";

export const MAX_ZIP_BYTES = 512 * 1024;
/** Extracts four allowlisted text files in memory. Nothing is written to disk. */
export async function readMiniAppZip(
  bytes: Uint8Array,
): Promise<MiniAppPackage> {
  if (bytes.byteLength > MAX_ZIP_BYTES)
    throw new StoreError("ZIP must be 512 KiB or smaller.", 413);
  const zip = await new Promise<ZipFile>((resolve, reject) => {
    fromBuffer(
      Buffer.from(bytes),
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, archive) => {
        if (error || !archive) reject(new StoreError("Invalid ZIP archive."));
        else resolve(archive);
      },
    );
  });
  return new Promise<MiniAppPackage>((resolve, reject) => {
    const files = new Map<string, string>();
    let total = 0;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(
        error instanceof StoreError
          ? error
          : new StoreError("Invalid or oversized ZIP content."),
      );
    };
    zip.on("error", fail);
    zip.on("entry", (entry: Entry) => {
      const fileType = (entry.externalFileAttributes >>> 16) & 0xf000;
      if (
        !["manifest.json", "index.html", "app.css", "app.js"].includes(
          entry.fileName,
        ) ||
        files.has(entry.fileName) ||
        (entry.generalPurposeBitFlag & 1) !== 0 ||
        (entry.externalFileAttributes & 0x10) !== 0 ||
        ![0, 8].includes(entry.compressionMethod) ||
        (fileType !== 0 && fileType !== 0x8000) ||
        entry.uncompressedSize > MAX_PACKAGE_BYTES ||
        total + entry.uncompressedSize > MAX_PACKAGE_BYTES
      ) {
        fail(
          new StoreError(
            "ZIP must contain only manifest.json, index.html, app.css, and app.js as regular files, up to 256 KiB total.",
          ),
        );
        return;
      }
      zip.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          fail(error);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        let crc = 0xffffffff;
        stream.on("error", fail);
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (
            size > entry.uncompressedSize ||
            total + size > MAX_PACKAGE_BYTES
          ) {
            stream.destroy();
            fail(new StoreError("ZIP expansion limit exceeded.", 413));
          } else {
            chunks.push(chunk);
            for (const byte of chunk) {
              crc ^= byte;
              for (let bit = 0; bit < 8; bit++)
                crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
            }
          }
        });
        stream.on("end", () => {
          if (settled) return;
          try {
            if ((crc ^ 0xffffffff) >>> 0 !== entry.crc32)
              throw new StoreError("ZIP checksum mismatch.");
            files.set(
              entry.fileName,
              new TextDecoder("utf-8", { fatal: true }).decode(
                Buffer.concat(chunks),
              ),
            );
            total += size;
            zip.readEntry();
          } catch (failure) {
            fail(failure);
          }
        });
      });
    });
    zip.on("end", () => {
      if (settled) return;
      try {
        if (files.size !== 4)
          throw new StoreError("ZIP is missing required files.");
        const manifest: unknown = JSON.parse(
          files.get("manifest.json") ?? "null",
        );
        const app = parseMiniAppPackage(
          JSON.stringify({
            formatVersion: 1,
            manifest,
            files: {
              "index.html": files.get("index.html"),
              "app.css": files.get("app.css"),
              "app.js": files.get("app.js"),
            },
          }),
        );
        settled = true;
        zip.close();
        resolve(app);
      } catch (failure) {
        fail(failure);
      }
    });
    if (zip.entryCount !== 4)
      fail(new StoreError("ZIP must contain exactly four files."));
    else zip.readEntry();
  });
}
