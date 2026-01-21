import { object, picklist, type InferOutput } from 'valibot';

// ─────────────────────────────────────────────
// Schéma de validation pour les préférences
// ─────────────────────────────────────────────

export const updatePreferencesSchema = object({
  preferredPlatform: picklist(
    [
      'spotify',
      'appleMusic',
      'deezer',
      'youtubeMusic',
      'tidal',
      'amazonMusic',
      'soundcloud',
      'youtube',
    ],
    'Plateforme invalide'
  ),
});

export type UpdatePreferencesData = InferOutput<typeof updatePreferencesSchema>;
