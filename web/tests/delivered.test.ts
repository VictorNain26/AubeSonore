import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readFrieze } from "../src/blob/frieze";
import { inflateIfGzipped } from "../src/blob/gzip";
import { readFriezeIds } from "../src/blob/ids";
import { readLineage } from "../src/blob/lineage";

function delivered(name: string) {
  const bytes = new Uint8Array(readFileSync(new URL(`../public/data/${name}`, import.meta.url)));
  return bytes;
}

// 174516 and 104859 are read back from the manifest as it stood when this
// suite was written; tests/test_baseline.py is the single point of authority
// for these figures should the dump ever move.
describe("the delivered blobs", () => {
  it("hold the frieze population the baseline freezes", async () => {
    const frieze = readFrieze(await inflateIfGzipped(delivered("frieze.bin.gz")));
    expect(frieze.count).toBe(174516);
  });

  it("hold the lineage edges the baseline freezes", async () => {
    const lineage = readLineage(await inflateIfGzipped(delivered("lineage.bin.gz")));
    expect(lineage.count).toBe(104859);
  });

  it("carry rows ordered on (y0, mbid), the key both writers sort by", async () => {
    const frieze = readFrieze(await inflateIfGzipped(delivered("frieze.bin.gz")));
    const bytes = delivered("frieze_ids.bin");
    const ids = readFriezeIds(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    expect(ids.count).toBe(frieze.count);
    // write_frieze_blob and write_frieze_ids both order rows by (y0, mbid), so
    // a shift or a permutation between the two blobs breaks that order in at
    // least one of them. Non-decreasing y0, and mbid strictly increasing
    // within equal y0, is what a correct pairing looks like; a single
    // violating index is enough to prove misalignment without asserting on
    // all 84,262 rows.
    let violation = -1;
    for (let i = 1; i < frieze.count; i++) {
      const sameYear = frieze.y0[i] === frieze.y0[i - 1];
      const ordered =
        frieze.y0[i] > frieze.y0[i - 1] || (sameYear && ids.mbid(i) > ids.mbid(i - 1));
      if (!ordered) {
        violation = i;
        break;
      }
    }
    expect(violation).toBe(-1);
  });

  it("index a genre vocabulary that covers every pair", async () => {
    const frieze = readFrieze(await inflateIfGzipped(delivered("frieze.bin.gz")));
    const vocabulary = JSON.parse(
      new TextDecoder().decode(await inflateIfGzipped(delivered("genres.json.gz"))),
    ) as { genre_mbid: string[] };
    let highest = 0;
    for (const id of frieze.genreIds) {
      if (id > highest) {
        highest = id;
      }
    }
    expect(highest).toBeLessThan(vocabulary.genre_mbid.length);
  });

  it("keep every lineage endpoint inside the frieze population", async () => {
    const frieze = readFrieze(await inflateIfGzipped(delivered("frieze.bin.gz")));
    const lineage = readLineage(await inflateIfGzipped(delivered("lineage.bin.gz")));
    for (let i = 0; i < lineage.count; i++) {
      expect(lineage.src[i]).toBeLessThan(frieze.count);
      expect(lineage.dst[i]).toBeLessThan(frieze.count);
    }
  });
});
