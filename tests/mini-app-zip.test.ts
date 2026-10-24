import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readMiniAppZip } from "@/lib/server/mini-app-zip";
import { SAMPLE_PACKAGE } from "@/lib/mini-app-sample";

interface ZipEntry {
  name: string;
  data: string;
  mode?: number;
  flags?: number;
  compressed?: boolean;
  declaredSize?: number;
}
function zipFixture(entries: ZipEntry[]) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const plain = Buffer.from(entry.data);
    const data = entry.compressed ? deflateRawSync(plain) : plain;
    let crc = 0xffffffff;
    for (const byte of plain) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags || 0, 6);
    local.writeUInt16LE(entry.compressed ? 8 : 0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.declaredSize ?? plain.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50);
    directory.writeUInt16LE(0x0314, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt16LE(entry.flags || 0, 8);
    directory.writeUInt16LE(entry.compressed ? 8 : 0, 10);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(data.length, 20);
    directory.writeUInt32LE(entry.declaredSize ?? plain.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(((entry.mode ?? 0x81a4) * 65536) >>> 0, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += local.length + name.length + data.length;
  }
  const index = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(index.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, index, end]);
}
const files = (): ZipEntry[] => [
  { name: "manifest.json", data: JSON.stringify(SAMPLE_PACKAGE.manifest) },
  ...Object.entries(SAMPLE_PACKAGE.files).map(([name, data]) => ({
    name,
    data,
  })),
];

describe("bounded ZIP package ingestion", () => {
  it("reads standard stored and deflated packages through the shared manifest validator", async () => {
    expect(await readMiniAppZip(zipFixture(files()))).toEqual(SAMPLE_PACKAGE);
    expect(
      await readMiniAppZip(
        zipFixture(files().map((entry) => ({ ...entry, compressed: true }))),
      ),
    ).toEqual(SAMPLE_PACKAGE);
  });
  it.each(["../app.js", "/app.js", "nested/app.js", "app\\js", "extra.js"])(
    "rejects path or extra file %s",
    async (name) => {
      const entries = files();
      entries[3] = { name, data: "x" };
      await expect(readMiniAppZip(zipFixture(entries))).rejects.toThrow();
    },
  );
  it("rejects duplicates, symlinks, encryption and unsupported SDK versions", async () => {
    const duplicate = files();
    duplicate[3] = duplicate[2];
    await expect(readMiniAppZip(zipFixture(duplicate))).rejects.toThrow();
    const link = files();
    link[3] = { ...link[3], mode: 0xa1ff };
    await expect(readMiniAppZip(zipFixture(link))).rejects.toThrow();
    const encrypted = files();
    encrypted[3] = { ...encrypted[3], flags: 1 };
    await expect(readMiniAppZip(zipFixture(encrypted))).rejects.toThrow();
    const sdk = files();
    sdk[0].data = JSON.stringify({ ...SAMPLE_PACKAGE.manifest, sdkVersion: 2 });
    await expect(readMiniAppZip(zipFixture(sdk))).rejects.toThrow();
  });
  it("rejects corrupted CRC metadata instead of publishing altered archive content", async () => {
    const bytes = zipFixture(files());
    const directory = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    bytes.writeUInt32LE(0, directory + 16);
    await expect(readMiniAppZip(bytes)).rejects.toThrow("checksum");
  });
  it("bounds decompression even when central-directory sizes lie", async () => {
    const oversized = files();
    oversized[3] = {
      ...oversized[3],
      data: "x".repeat(300_000),
      compressed: true,
    };
    await expect(readMiniAppZip(zipFixture(oversized))).rejects.toThrow();
    const forged = files();
    forged[3] = { ...forged[3], declaredSize: 1 };
    await expect(readMiniAppZip(zipFixture(forged))).rejects.toThrow();
    await expect(readMiniAppZip(new Uint8Array(524289))).rejects.toThrow(
      "512 KiB",
    );
    await expect(readMiniAppZip(Buffer.from("not a zip"))).rejects.toThrow(
      "Invalid ZIP",
    );
  });
});
