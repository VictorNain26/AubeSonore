import { db, schema } from '../src/db/index';
import { snapshotCover } from '../src/services/coverService';
import { eq } from 'drizzle-orm';
import { env } from '../src/config/env';

const CHUNK = 5;
const DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!env.COVERS_PUBLIC_URL) throw new Error('COVERS_PUBLIC_URL not set — configure R2 first.');
  const base = env.COVERS_PUBLIC_URL;

  const rows = await db
    .select({ id: schema.likedTracks.id, artworkUrl: schema.likedTracks.artworkUrl })
    .from(schema.likedTracks);

  const pending = rows.filter((r) => r.artworkUrl && !r.artworkUrl.startsWith(base));
  let migrated = 0;
  let unrecoverable = 0;

  for (let i = 0; i < pending.length; i += CHUNK) {
    const batch = pending.slice(i, i + CHUNK);
    await Promise.all(
      batch.map(async (row) => {
        const durable = await snapshotCover(row.artworkUrl as string);
        if (durable) {
          await db
            .update(schema.likedTracks)
            .set({ artworkUrl: durable })
            .where(eq(schema.likedTracks.id, row.id));
          migrated++;
        } else {
          unrecoverable++;
        }
      })
    );
    if (i + CHUNK < pending.length) await sleep(DELAY_MS);
  }

  console.log(
    `Backfill done: ${migrated} migrated, ${unrecoverable} unrecoverable, ${rows.length} total.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
