import { object, picklist, type InferOutput } from 'valibot';
import { PREFERRED_PLATFORMS } from '@aubesonore/shared-types/client';

// ─────────────────────────────────────────────
// Schéma de validation pour les préférences
// ─────────────────────────────────────────────
// The picklist is derived from PREFERRED_PLATFORMS so adding a platform is
// a one-line edit in shared-types — no chance of the type, the validator and
// the UI label list drifting from each other.

export const updatePreferencesSchema = object({
  preferredPlatform: picklist(PREFERRED_PLATFORMS, 'Plateforme invalide'),
});

export type UpdatePreferencesData = InferOutput<typeof updatePreferencesSchema>;
