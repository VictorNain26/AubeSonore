import { object, string, minLength, pipe, optional, url, check, type InferOutput } from 'valibot';

const httpsUrl = pipe(
  string(),
  url('endpoint doit être une URL valide'),
  check((value) => value.startsWith('https://'), 'endpoint doit utiliser HTTPS')
);

export const subscribeSchema = object({
  endpoint: httpsUrl,
  keys: object({
    p256dh: pipe(string(), minLength(1, 'p256dh requis')),
    auth: pipe(string(), minLength(1, 'auth requis')),
  }),
});

export type SubscribeData = InferOutput<typeof subscribeSchema>;

export const sendPushSchema = object({
  title: pipe(string(), minLength(1, 'Titre requis')),
  body: pipe(string(), minLength(1, 'Corps requis')),
  url: optional(pipe(string(), url('URL invalide'))),
});

export type SendPushData = InferOutput<typeof sendPushSchema>;

export const unsubscribeSchema = object({
  endpoint: httpsUrl,
});

export type UnsubscribeData = InferOutput<typeof unsubscribeSchema>;
