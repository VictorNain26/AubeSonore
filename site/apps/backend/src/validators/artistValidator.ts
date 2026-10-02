import { safeParse, string, uuid, pipe } from 'valibot';

// Artist ids are generated with randomUUID; anything else never reaches the DB.
const ArtistIdSchema = pipe(string(), uuid('identifiant artiste invalide'));

export function isValidArtistId(value: unknown): value is string {
  return safeParse(ArtistIdSchema, value).success;
}
