import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';
import { loadEnv, SERVER_ROOT } from '../config/env.js';

loadEnv();

/**
 * Sauvegarde la base SQLite avant migration.
 *
 * La sauvegarde est une PRÉCAUTION, pas une précondition : si elle échoue
 * (répertoire non inscriptible, disque plein, base absente), la migration
 * doit tout de même s'exécuter. Avant, l'échec de la sauvegarde
 * interrompait la migration complète — en production, le répertoire de
 * sauvegarde n'est pas monté en écriture et la migration n'était donc
 * jamais appliquée au démarrage.
 *
 * @returns {string|null} chemin de la sauvegarde, ou null si aucune copie
 *   n'a pu être produite.
 */
export function backupDatabase(customDbPath = null) {
  try {
    const dbPath = customDbPath || process.env.DB_PATH || '../sqlite/nutrition.db';
    const resolvedPath = path.isAbsolute(dbPath)
      ? dbPath
      : path.resolve(SERVER_ROOT, dbPath);

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const backupDir = process.env.BACKUP_DIR
      ? path.resolve(process.env.BACKUP_DIR)
      : path.resolve(SERVER_ROOT, '..', 'backup_reports');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `nutrition_backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);

    // La base est en mode WAL : les dernieres transactions vivent dans le
    // fichier `-wal`, pas dans le `.db`. Une simple copie du `.db` produit
    // donc une sauvegarde INCOMPLETE (tables absentes ou colonnes recentes
    // manquantes) — c'est-a-dire un filet de securite inexistant au moment
    // precis ou il sert. `VACUUM INTO` ecrit une copie consolidee et
    // coherente (WAL checkpointe) ; c'est synchrone et ne touche pas la
    // base source. Repli sur la copie brute seulement en dernier recours.
    try {
      const source = new Database(resolvedPath, { readonly: true, fileMustExist: true });
      try {
        if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        source.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
      } finally {
        source.close();
      }
      return backupPath;
    } catch (backupError) {
      console.warn(
        `[backup] VACUUM INTO indisponible (${backupError.message}), repli sur la copie brute.`
      );
    }

    fs.copyFileSync(resolvedPath, backupPath);
    return backupPath;
  } catch (err) {
    console.warn(
      `[backup] Sauvegarde impossible, migration pursue sans copie : ${err.message}`
    );
    return null;
  }
}
