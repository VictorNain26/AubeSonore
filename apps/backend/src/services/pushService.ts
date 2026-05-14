import webPush from 'web-push';
import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';
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
  // Check if already subscribed with this endpoint
  const existing = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, subscription.endpoint)
      )
    )
    .limit(1)
    .then((res) => res[0]);

  if (existing) return;

  await db.insert(schema.pushSubscriptions).values({
    id: randomUUID(),
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
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

  const payload = JSON.stringify({ title, body, url: url ?? '/' });
  let sent = 0;
  let failed = 0;

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
            await db
              .delete(schema.pushSubscriptions)
              .where(eq(schema.pushSubscriptions.id, sub.id));
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

  return { sent, failed };
}
