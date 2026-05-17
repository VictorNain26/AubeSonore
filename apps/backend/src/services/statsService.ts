import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';
import type { User } from '../db/schema';
import type { StatsState } from '@aubesonore/shared-types/stats';

export async function getUserStats({ user }: { user: User }): Promise<StatsState | null> {
  const row = await db
    .select()
    .from(schema.userStats)
    .where(eq(schema.userStats.userId, user.id))
    .limit(1)
    .then((res) => res[0]);
  return row?.snapshot ?? null;
}

export async function upsertUserStats({
  user,
  snapshot,
}: {
  user: User;
  snapshot: StatsState;
}): Promise<void> {
  await db
    .insert(schema.userStats)
    .values({ userId: user.id, snapshot, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.userStats.userId,
      set: { snapshot, updatedAt: new Date() },
    });
}
