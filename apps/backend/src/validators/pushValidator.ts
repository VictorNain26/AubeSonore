import { object, string, minLength, pipe, optional, type InferOutput } from 'valibot';

export const subscribeSchema = object({
  endpoint: pipe(string(), minLength(1, 'Endpoint requis')),
  keys: object({
    p256dh: pipe(string(), minLength(1, 'p256dh requis')),
    auth: pipe(string(), minLength(1, 'auth requis')),
  }),
});

export type SubscribeData = InferOutput<typeof subscribeSchema>;

export const sendPushSchema = object({
  title: pipe(string(), minLength(1, 'Titre requis')),
  body: pipe(string(), minLength(1, 'Corps requis')),
  url: optional(string()),
});

export type SendPushData = InferOutput<typeof sendPushSchema>;
