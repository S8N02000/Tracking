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

  // ── food_nutrient_references ────────────────────────────────────────────
  // La forme LEGACY (UNIQUE(food_id, mode), sans fenêtre de validité) doit
  // évoluer vers la forme CANONIQUE (UNIQUE(food_id, mode, valid_from)),
  // qui autorise plusieurs curations disjointes dans le temps pour un même
  // aliment. SQLite ne sait pas modifier une contrainte UNIQUE : il faut
  // RECONSTRUIRE la table. On le fait de façon idempotente et sans perte :
  //   1. on extrait le DDL canonique de schema.sql (source de vérité) ;
  //   2. si la table a la forme legacy, on la renomme à côté ;
  //   3. db.exec(sql) crée alors la table canonique ;
  //   4. on recopie les lignes, puis on supprime la table legacy.
  const REFERENCE_TABLE = 'food_nutrient_references';
  const LEGACY_TABLE = `${REFERENCE_TABLE}_legacy_migration`;

  const extractTableDdl = (source, tableName) => {
    const pattern = new RegExp(
      `CREATE TABLE IF NOT EXISTS\\s+${tableName}\\s*\\([\\s\\S]*?\\n\\);`,
      'i'
    );
    const match = source.match(pattern);
    return match ? match[0] : null;
  };

  const canonicalDdl = extractTableDdl(sql, REFERENCE_TABLE);

  const tableExists = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(REFERENCE_TABLE);

  const legacyShape = (() => {
    if (!tableExists || !canonicalDdl) return false;
    const cols = db.prepare(`PRAGMA table_info(${REFERENCE_TABLE})`).all();
    const hasValidity =
      cols.some((c) => c.name === 'valid_from') && cols.some((c) => c.name === 'valid_to');
    const hasNewUnique = /unique\s*\(\s*food_id\s*,\s*mode\s*,\s*valid_from\s*\)/i.test(
      tableExists.sql || ''
    );
    return !(hasValidity && hasNewUnique);
  })();

  // Execute non-destructive statements in transaction
  const executeMigration = db.transaction(() => {
    if (legacyShape) {
      db.exec(`ALTER TABLE ${REFERENCE_TABLE} RENAME TO ${LEGACY_TABLE}`);
    }

    db.exec(sql);

    for (const [table, column, ddl] of ADDED_COLUMNS) {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all();
      if (!cols.some((c) => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      }
    }

    if (legacyShape) {
      // Recopie : les colonnes de la forme legacy sont conservées, les
      // nouvelles (valid_from) sont initialisées à la borne ouverte.
      const legacyCols = db
        .prepare(`PRAGMA table_info(${LEGACY_TABLE})`)
        .all()
        .map((c) => c.name);
      const targetCols = db
        .prepare(`PRAGMA table_info(${REFERENCE_TABLE})`)
        .all()
        .map((c) => c.name);

      const shared = legacyCols.filter((c) => targetCols.includes(c));
      const extra = targetCols
        .filter((c) => !shared.includes(c))
        .map((c) => (c === 'valid_from' ? "''" : 'NULL'));

      const insertCols = [...shared, ...targetCols.filter((c) => !shared.includes(c))];
      const selectExpr = [
        ...shared,
        ...targetCols.filter((c) => !shared.includes(c)).map((c) => (c === 'valid_from' ? "''" : 'NULL'))
      ];

      db.exec(
        `INSERT OR REPLACE INTO ${REFERENCE_TABLE} (${insertCols.join(', ')}) ` +
          `SELECT ${selectExpr.join(', ')} FROM ${LEGACY_TABLE}`
      );
      db.exec(`DROP TABLE ${LEGACY_TABLE}`);
    }

    // Index de résolution par date : créé APRÈS les colonnes, sinon
    // SQLite échoue sur une base existante.
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_fnr_validity ` +
        `ON ${REFERENCE_TABLE}(food_id, valid_from, valid_to)`
    );
  });

  executeMigration();
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  console.log('Running SQLite non-destructive migrations...');
  runMigrations();
  console.log('Migrations completed successfully.');
}
