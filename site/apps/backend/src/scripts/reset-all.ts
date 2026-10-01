import { execSync } from 'node:child_process';
import { db } from '../db/index';

async function resetDatabase(): Promise<void> {
  console.log('🧨 Suppression des tables PostgreSQL…');

  try {
    await db.execute(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    console.log('✅ Tables supprimées avec succès.');
  } catch (err: unknown) {
    console.error('❌ Erreur lors de la suppression des tables :', err);
    process.exit(1);
  }
}

function runCommand(name: string, command: string): void {
  try {
    console.log(`▶ ${name}`);
    execSync(command, { stdio: 'inherit' });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error(`❌ Erreur pendant "${name}" :`, errorMessage);
    process.exit(1);
  }
}

(async (): Promise<void> => {
  await resetDatabase();

  runCommand('📦 Migration des schémas (drizzle push)', 'bun run db:push');
  runCommand('👑 Création admin (seed)', 'bun run seed:admin');

  console.log('✅ Reset complet terminé.');
})();
