import webPush from 'web-push';
import { db, schema } from '../db/index';
import { eq, and, inArray, lt } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

const pushEnabled = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webPush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY as string,
    env.VAPID_PRIVATE_KEY as string
  );
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export function isPushEnabled(): boolean {
  return pushEnabled;
}

export async function subscribe(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  // Atomic upsert: relies on the unique constraint on `endpoint` to dedupe
  // across concurrent inserts (double-tap, retry-on-network). Without this,
  // a select+insert race produces 23505 unique violations that bubble up as 500s.
  await db
    .insert(schema.pushSubscriptions)
    .values({
      id: randomUUID(),
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoNothing({ target: schema.pushSubscriptions.endpoint });
}

export async function unsubscribe(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      )
    );
}

const PUSH_CHUNK_SIZE = 50;

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToSubscriptions(
  subs: SubscriptionRow[],
  payload: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const deadSubIds: string[] = [];

  for (let i = 0; i < subs.length; i += PUSH_CHUNK_SIZE) {
    const chunk = subs.slice(i, i + PUSH_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          return true;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // Defer deletion so we can batch them into a single DELETE later.
            deadSubIds.push(sub.id);
          }
          throw err;
        }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') sent++;
      else failed++;
    }
  }

  // Batch-prune expired subscriptions in one DELETE rather than N round-trips.
  if (deadSubIds.length > 0) {
    await db
      .delete(schema.pushSubscriptions)
      .where(inArray(schema.pushSubscriptions.id, deadSubIds));
  }

  return { sent, failed };
}

export async function sendToAll(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number }> {
  const subs = await db
    .select({
      id: schema.pushSubscriptions.id,
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
    })
    .from(schema.pushSubscriptions);

  return sendToSubscriptions(subs, JSON.stringify({ title, body, url: url ?? '/' }));
}

export async function sendToUsers(
  userIds: string[],
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number }> {
  if (userIds.length === 0) return { sent: 0, failed: 0 };

  const subs = await db
    .select({
      id: schema.pushSubscriptions.id,
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
    })
    .from(schema.pushSubscriptions)
    .where(inArray(schema.pushSubscriptions.userId, userIds));

  return sendToSubscriptions(subs, JSON.stringify({ title, body, url: url ?? '/' }));
}

/**
 * Periodically delete sessions and verification rows past their expires_at.
 * Better Auth never purges its own tables, so unbounded growth is the default.
 */
export async function purgeExpiredAuthRows(): Promise<{ sessions: number; verifications: number }> {
  const now = new Date();
  const sessionsResult = await db
    .delete(schema.session)
    .where(lt(schema.session.expiresAt, now))
    .returning({ id: schema.session.id });
  const verificationsResult = await db
    .delete(schema.verification)
    .where(lt(schema.verification.expiresAt, now))
    .returning({ id: schema.verification.id });
  return {
    sessions: sessionsResult.length,
    verifications: verificationsResult.length,
  };
}
