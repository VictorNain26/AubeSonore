import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readFriezeIds } from "../src/blob/ids";

function witness() {
  const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze_ids.bin", import.meta.url)));
  return readFriezeIds(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

describe("readFriezeIds", () => {
  it("reads one mbid per frieze row", () => {
    const ids = witness();
    expect(ids.count).toBe(22);
    // The Beatles, frieze row 0.
    expect(ids.mbid(0)).toBe("b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d");
  });

  it("renders every mbid as a hyphenated 36-character uuid", () => {
    const ids = witness();
    for (let i = 0; i < ids.count; i++) {
      expect(ids.mbid(i)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it("refuses a stale cached file", () => {
    const buffer = new ArrayBuffer(16);
    new Uint8Array(buffer).set([0x4d, 0x46, 0x5a, 0x31]);
    expect(() => readFriezeIds(buffer)).toThrow(/MID1/);
  });

  it("refuses a buffer too short to hold a frieze_ids header", () => {
    const buffer = new ArrayBuffer(15);
    const view = new Uint8Array(buffer);
    view.set([0x4d, 0x49, 0x44, 0x31]);
    new DataView(buffer).setUint16(4, 1, true);
    expect(() => readFriezeIds(buffer)).toThrow(
      /frieze_ids.bin: expected a header of at least 16 bytes, got 15/,
    );
  });

  it("refuses a truncated frieze_ids blob", () => {
    const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze_ids.bin", import.meta.url)));
    const full = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const truncated = full.slice(0, full.byteLength - 5);
    expect(() => readFriezeIds(truncated)).toThrow(/frieze_ids.bin: expected 368 bytes, got 363/);
  });
});
