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

  // Execute non-destructive statements in transaction
  const executeMigration = db.transaction(() => {
    db.exec(sql);

    // Check if rating column exists in recipes table
    const tableInfo = db.prepare("PRAGMA table_info(recipes)").all();
    const hasRating = tableInfo.some((col) => col.name === 'rating');

    if (!hasRating) {
      db.exec("ALTER TABLE recipes ADD COLUMN rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10))");
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
