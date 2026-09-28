import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readFrieze } from "../src/blob/frieze";
import { inflateIfGzipped } from "../src/blob/gzip";

async function witness() {
  const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze.bin.gz", import.meta.url)));
  return readFrieze(await inflateIfGzipped(bytes));
}

describe("readFrieze", () => {
  it("reads the cardinalities", async () => {
    const frieze = await witness();
    expect(frieze.count).toBe(22);
    expect(frieze.pairs).toBe(139);
  });

  it("reads names without the separator the writer appends", async () => {
    const frieze = await witness();
    expect(frieze.name(0)).toBe("The Beatles");
    expect(frieze.name(6)).toBe("Joy Division");
    expect(frieze.name(21)).toBe("Lethal Shöck");
  });

  it("unpacks the flags out of the high bit of each span", async () => {
    const frieze = await witness();
    expect(frieze.y0[0]).toBe(1960);
    expect(frieze.y1[0]).toBe(1970);
    expect(frieze.ended[0]).toBe(1);
    expect(frieze.yEndIsDeclared[0]).toBe(1);
  });

  it("keeps an end that is over from an end that was never declared", async () => {
    const frieze = await witness();
    // Flesh Field: the band is over, but y1 was inferred from its last album.
    expect(frieze.name(13)).toBe("Flesh Field");
    expect(frieze.ended[13]).toBe(1);
    expect(frieze.yEndIsDeclared[13]).toBe(0);
    // ROD: one-year bar, and no evidence of an end at all.
    expect(frieze.name(14)).toBe("ROD");
    expect(frieze.y0[14]).toBe(1996);
    expect(frieze.y1[14]).toBe(1996);
    expect(frieze.ended[14]).toBe(0);
    expect(frieze.yEndIsDeclared[14]).toBe(0);
  });

  it("reads the album counts", async () => {
    const frieze = await witness();
    expect(frieze.nAlbums[0]).toBe(84);
    expect(frieze.nAlbums[14]).toBe(0);
  });

  it("slices a band's genres out of the shared array", async () => {
    const frieze = await witness();
    expect(frieze.genreOffsets[0]).toBe(0);
    expect(frieze.genreOffsets[1]).toBe(12);
    expect(Array.from(frieze.genreIds.subarray(0, 5))).toEqual([4, 39, 33, 57, 11]);
  });

  it("refuses a blob that is not a frieze", async () => {
    const buffer = new ArrayBuffer(16);
    new Uint8Array(buffer).set([0x4d, 0x4c, 0x4e, 0x31]);
    expect(() => readFrieze(buffer)).toThrow(/MFZ1/);
  });

  it("refuses a version it does not know", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze.bin.gz", import.meta.url)));
    const buffer = await inflateIfGzipped(bytes);
    new DataView(buffer).setUint16(4, 2, true);
    expect(() => readFrieze(buffer)).toThrow(/version 2/);
  });

  it("refuses a blob whose genre offsets do not match the header pairs count", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze.bin.gz", import.meta.url)));
    const buffer = await inflateIfGzipped(bytes);
    new DataView(buffer).setUint32(12, 99, true);
    expect(() => readFrieze(buffer)).toThrow(/genres section has 99 pairs, offsets end at 139/);
  });

  it("refuses a buffer too short to hold a frieze header", () => {
    const buffer = new ArrayBuffer(15);
    const view = new Uint8Array(buffer);
    view.set([0x4d, 0x46, 0x5a, 0x31]);
    new DataView(buffer).setUint16(4, 1, true);
    expect(() => readFrieze(buffer)).toThrow(
      /frieze.bin: expected a header of at least 16 bytes, got 15/,
    );
  });

  it("refuses a blob truncated before the names section", async () => {
    const bytes = new Uint8Array(readFileSync(new URL("fixtures/frieze.bin.gz", import.meta.url)));
    const buffer = await inflateIfGzipped(bytes);
    // Fixed part is 24 + 13*count + 2*pairs = 24 + 13*22 + 2*139 = 588 bytes.
    const truncated = buffer.slice(0, 500);
    expect(() => readFrieze(truncated)).toThrow(/frieze.bin: expected at least 588 bytes, got 500/);
  });
});
