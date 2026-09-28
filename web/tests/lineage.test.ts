import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inflateIfGzipped } from "../src/blob/gzip";
import { readLineage } from "../src/blob/lineage";

async function witness() {
  const bytes = new Uint8Array(readFileSync(new URL("fixtures/lineage.bin.gz", import.meta.url)));
  return readLineage(await inflateIfGzipped(bytes));
}

describe("readLineage", () => {
  it("reads the one edge the witnesses carry", async () => {
    const lineage = await witness();
    expect(lineage.count).toBe(1);
    // Joy Division (row 6) to New Order (row 8), three shared musicians.
    expect(lineage.src[0]).toBe(6);
    expect(lineage.dst[0]).toBe(8);
    expect(lineage.shared[0]).toBe(3);
  });

  it("refuses a blob that is not a lineage", () => {
    const buffer = new ArrayBuffer(16);
    new Uint8Array(buffer).set([0x4d, 0x46, 0x5a, 0x31]);
    expect(() => readLineage(buffer)).toThrow(/MLN1/);
  });

  it("refuses a buffer too short to hold a lineage header", () => {
    const buffer = new ArrayBuffer(11);
    const view = new Uint8Array(buffer);
    view.set([0x4d, 0x4c, 0x4e, 0x31]);
    new DataView(buffer).setUint16(4, 1, true);
    expect(() => readLineage(buffer)).toThrow(
      /lineage.bin: expected a header of at least 12 bytes, got 11/,
    );
  });

  it("refuses a truncated lineage blob", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("fixtures/lineage.bin.gz", import.meta.url)));
    const full = await inflateIfGzipped(bytes);
    const truncated = full.slice(0, full.byteLength - 2);
    expect(() => readLineage(truncated)).toThrow(/lineage.bin: expected 21 bytes, got 19/);
  });
});
