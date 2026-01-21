import fs from 'fs/promises';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
    await fs.chmod(dirPath, 0o777);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`✅ Dossier créé : ${dirPath}`);
  }
}

export async function runCommand(
  args: string[],
  options: Parameters<typeof Bun.spawn>[1] = {}
): Promise<string> {
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    ...options,
  });

  const [stdoutText, stderrText, exitCode] = await Promise.all([
    proc.stdout && typeof proc.stdout !== 'number' ? new Response(proc.stdout).text() : '',
    proc.stderr && typeof proc.stderr !== 'number' ? new Response(proc.stderr).text() : '',
    proc.exited,
  ]);

  if (exitCode !== 0) {
    console.error('[runCommand Error]', stderrText.trim());
    throw new Error(stderrText.trim() || `Commande échouée avec code ${exitCode}`);
  }

  if (stderrText.trim()) {
    console.warn('[runCommand Warning]', stderrText.trim());
  }

  return stdoutText.trim();
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
