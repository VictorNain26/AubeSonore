import { db, schema } from '../db/index';
import { eq } from 'drizzle-orm';
import type { User, UserPreferences, PreferredPlatform } from '../db/schema';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ServiceResponse<T = UserPreferences> {
  message?: string;
  preferences?: T;
  status?: number;
  error?: string;
}

// ─────────────────────────────────────────────
// Récupérer les préférences utilisateur
// ─────────────────────────────────────────────

export async function getUserPreferences({ user }: { user: User }): Promise<UserPreferences> {
  const preferences = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, user.id))
    .limit(1)
    .then((res) => res[0]);

  // Créer les préférences par défaut si elles n'existent pas
  if (!preferences) {
    const [newPreferences] = await db
      .insert(schema.userPreferences)
      .values({
        userId: user.id,
        preferredPlatform: 'spotify',
      })
      .returning();

    if (!newPreferences) {
      throw new Error('Failed to create default preferences');
    }
    return newPreferences;
  }

  return preferences;
}

// ─────────────────────────────────────────────
// Mettre à jour les préférences utilisateur
// ─────────────────────────────────────────────

export async function updateUserPreferences({
  user,
  preferredPlatform,
}: {
  user: User;
  preferredPlatform: PreferredPlatform;
}): Promise<ServiceResponse> {
  // Vérifier que la plateforme est valide
  const validPlatforms: PreferredPlatform[] = [
    'spotify',
    'appleMusic',
    'deezer',
    'youtubeMusic',
    'tidal',
    'amazonMusic',
    'soundcloud',
    'youtube',
  ];

  if (!validPlatforms.includes(preferredPlatform)) {
    return { status: 400, error: 'Plateforme invalide' };
  }

  // Upsert: créer ou mettre à jour
  const [preferences] = await db
    .insert(schema.userPreferences)
    .values({
      userId: user.id,
      preferredPlatform,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userPreferences.userId,
      set: {
        preferredPlatform,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!preferences) {
    return { status: 500, error: 'Failed to update preferences' };
  }

  return {
    message: 'Préférences mises à jour',
    preferences,
  };
}
