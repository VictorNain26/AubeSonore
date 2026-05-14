import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';
import type { User, UserPreferences, PreferredPlatform } from '../db/schema';

interface ServiceResponse<T = UserPreferences> {
  message?: string;
  preferences?: T;
  status?: number;
  error?: string;
}

/**
 * Read preferences, lazily creating the default row on first access.
 * Atomic upsert eliminates the read-then-insert race between concurrent
 * first-time requests.
 */
export async function getUserPreferences({ user }: { user: User }): Promise<UserPreferences> {
  const existing = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, user.id))
    .limit(1)
    .then((res) => res[0]);
  if (existing) return existing;

  // Race-safe creation: another request creating the same row will conflict
  // on the userId PK and we'll get the now-existing row via the follow-up SELECT.
  const [created] = await db
    .insert(schema.userPreferences)
    .values({ userId: user.id, preferredPlatform: 'spotify' })
    .onConflictDoNothing({ target: schema.userPreferences.userId })
    .returning();

  if (created) return created;

  // Conflict path: the row was inserted by the concurrent request.
  const winner = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, user.id))
    .limit(1)
    .then((res) => res[0]);
  if (!winner) throw new Error('Failed to create default preferences');
  return winner;
}

/**
 * Update the preferred platform. The route already validates the platform
 * value via Valibot (picklist), so this layer trusts its input — per the
 * "validate at boundaries, trust internal" convention in CLAUDE.md.
 */
export async function updateUserPreferences({
  user,
  preferredPlatform,
}: {
  user: User;
  preferredPlatform: PreferredPlatform;
}): Promise<ServiceResponse> {
  const [preferences] = await db
    .insert(schema.userPreferences)
    .values({
      userId: user.id,
      preferredPlatform,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userPreferences.userId,
      set: {
        preferredPlatform,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!preferences) {
    return { status: 500, error: 'Failed to update preferences' };
  }

  return {
    message: 'Préférences mises à jour',
    preferences,
  };
}
