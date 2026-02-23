import webPush from 'web-push';
import { db, schema } from '../db/index';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

// Initialize web-push with VAPID keys
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    'mailto:contact@aubesonore.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || null;
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

export async function sendToAll(
  title: string,
  body: string,
  url?: string
): Promise<{ sent: number; failed: number }> {
  const subs = await db.select().from(schema.pushSubscriptions);

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webPush.sendNotification(
        pushSubscription,
        JSON.stringify({ title, body, url: url || '/' })
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — clean up
        await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, sub.id));
      }
      failed++;
    }
  }

  return { sent, failed };
}
