import { object, string, url, minLength, pipe, type InferOutput } from 'valibot';

// ✅ Schéma de validation pour liker un morceau
export const likeTrackSchema = object({
  title: pipe(string(), minLength(1, 'Titre requis')),
  artist: pipe(string(), minLength(1, 'Artiste requis')),
  artwork: pipe(string(), url('Artwork doit être une URL valide')),
  youtubeUrl: pipe(string(), url('Lien YouTube invalide')),
});

// Type inféré du schéma
export type LikeTrackData = InferOutput<typeof likeTrackSchema>;
