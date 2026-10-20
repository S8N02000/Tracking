import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './db.js';
import { backupDatabase } from './backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(customDbPath = null) {
  // Perform backup first if existing file
  backupDatabase(customDbPath);

  const db = getDatabase(customDbPath);
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Colonnes ajoutees apres la creation initiale de schema.sql (ALTER TABLE
  // "bulletproof" : sans ca, toute base reconstruite explose sur une colonne
  // manquante au lieu de demarrer). Idempotent.
  const ADDED_COLUMNS = [
    // table, colonne, DDL
    ['recipes', 'rating',
     'rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10))'],
    ['meal_log', 'portions_count',
     'portions_count REAL'],
    ['foods', 'caffeine_mg_100g',
     'caffeine_mg_100g REAL'],
    ['recipes', 'caffeine_mg_per_portion',
     'caffeine_mg_per_portion REAL']
  ];

  // Execute non-destructive statements in transaction
  const executeMigration = db.transaction(() => {
    db.exec(sql);

    for (const [table, column, ddl] of ADDED_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.some((c) => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      }
    }
  });

  executeMigration();
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  console.log('Running SQLite non-destructive migrations...');
  runMigrations();
  console.log('Migrations completed successfully.');
}
