import { object, string, minLength, pipe, type InferOutput } from 'valibot';

export const artistQuerySchema = object({
  name: pipe(string(), minLength(1, 'Nom artiste requis')),
});

export type ArtistQueryData = InferOutput<typeof artistQuerySchema>;
