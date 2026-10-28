import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Chemin d'une base SQLite temporaire pour les tests.
 *
 * Indépendant de `process.cwd()` : les tests doivent pouvoir être lancés
 * depuis n'importe quel répertoire (CI, racine du monorepo, conteneur).
 * Les bases sont créées dans un répertoire dédié, supprimé après usage.
 */
const TEMP_ROOT = path.join(os.tmpdir(), 'nutrition-tracker-tests');

export function makeTempDbPath(name) {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  return path.join(TEMP_ROOT, `${name}.db`);
}

/** Supprime une base temporaire et ses fichiers WAL/SHM résiduels. */
export function removeTempDb(dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }
}
