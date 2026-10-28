import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { loadEnv, SERVER_ROOT } from '../config/env.js';

loadEnv();

let instance = null;
let instancePath = null;

export function getDatabase(customPath = null) {
  // Le chemin par défaut est relatif à la RACINE DU SERVEUR, pas au
  // répertoire courant : `../sqlite/nutrition.db` désigne toujours la base
  // de production, que le serveur soit lancé depuis `server/`, depuis la
  // racine du monorepo ou depuis un conteneur dont le WORKDIR est `/app`.
  const requestedPath = customPath || process.env.DB_PATH || process.env.DATABASE_PATH || '../sqlite/nutrition.db';
  const resolvedPath = path.isAbsolute(requestedPath)
    ? requestedPath
    : path.resolve(SERVER_ROOT, requestedPath);

  // Le singleton ne doit pas survivre à un changement de `DB_PATH` :
  // sinon une connexion ouverte avant le changement continue d'être
  // renvoyée et l'appelant lit la mauvaise base.
  if (instance && !customPath && instancePath !== resolvedPath) {
    instance.close();
    instance = null;
    instancePath = null;
  }

  if (instance && !customPath) {
    return instance;
  }

  // Ensure directory exists
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);

  // Configure Pragmas
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  if (!customPath) {
    instance = db;
    instancePath = resolvedPath;
  }

  return db;
}

export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
    instancePath = null;
  }
}

/**
 * Export paresseux `db`.
 *
 * Historiquement `export const db = getDatabase()` ouvrait la base au
 * chargement du module. Effet de bord problématique :
 *   - toute importation de `db.js` (donc de `app.js`) créait/ouvrait un
 *     fichier SQLite, y compris depuis les tests ;
 *   - `getDatabase()` renvoyant ensuite le singleton mis en cache, un
 *     `process.env.DB_PATH` défini APRÈS l'import était ignoré, et les
 *     tests s'exécutaient contre la base de production.
 *
 * Le Proxy ne résout la connexion qu'au premier usage réel. `DB_PATH` est
 * donc lu au moment où la connexion est demandée, et importer le module
 * n'ouvre plus aucun fichier.
 */
export const db = new Proxy(
  {},
  {
    get(_target, property) {
      const connection = getDatabase();
      const value = connection[property];
      return typeof value === 'function' ? value.bind(connection) : value;
    }
  }
);
