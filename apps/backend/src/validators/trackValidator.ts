import { object, string, url, minLength, pipe, optional, type InferOutput } from 'valibot';

// ─────────────────────────────────────────────
// Schéma de validation pour liker un morceau
// ─────────────────────────────────────────────

export const likeTrackSchema = object({
  title: pipe(string(), minLength(1, 'Titre requis')),
  artist: pipe(string(), minLength(1, 'Artiste requis')),
  album: optional(string()),
  artworkUrl: optional(pipe(string(), url('Artwork doit être une URL valide'))),
  youtubeUrl: pipe(string(), url('Lien YouTube invalide')),
  isrc: optional(string()),
});

export type LikeTrackData = InferOutput<typeof likeTrackSchema>;

// ─────────────────────────────────────────────
// Schéma pour vérifier si un morceau est liké
// ─────────────────────────────────────────────

export const checkLikedSchema = object({
  title: pipe(string(), minLength(1, 'Titre requis')),
  artist: pipe(string(), minLength(1, 'Artiste requis')),
});

export type CheckLikedData = InferOutput<typeof checkLikedSchema>;
