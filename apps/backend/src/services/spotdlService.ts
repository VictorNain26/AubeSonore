import path from 'path';
import fs from 'fs/promises';

const {PLAYLIST_PATH} = Bun.env;

if (!PLAYLIST_PATH) {
  throw new Error('❌ La variable PLAYLIST_PATH est requise pour spotDL');
}

interface SendFunction {
  (data: { message: string }): void;
}

export async function cleanupSpotdlFiles(send: SendFunction): Promise<void> {
  if (!PLAYLIST_PATH) {
    throw new Error('PLAYLIST_PATH is not defined');
  }

  const allDirs = await fs.readdir(PLAYLIST_PATH);
  for (const dir of allDirs) {
    const fullPath = path.join(PLAYLIST_PATH, dir);
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) {
      continue;
    }

    const files = await fs.readdir(fullPath);
    for (const file of files) {
      if (file.endsWith('.temp') || file.endsWith('.spotdl')) {
        const filePath = path.join(fullPath, file);
        await fs.unlink(filePath);
        send({ message: `🗑️ Fichier supprimé : ${filePath}` });
      }
    }
  }

  send({ message: '✅ Nettoyage terminé.' });
}
