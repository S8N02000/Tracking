import { describe, it, expect, afterEach } from 'vitest';
import { runMigrations } from '../migrate.js';
import { backupDatabase } from '../backup.js';
import { getDatabase, closeDatabase } from '../db.js';
import { makeTempDbPath, removeTempDb } from '../../test-utils/tempDb.js';
import fs from 'fs';

describe('Database Migrations (migrate.js)', () => {
  const tempDbPath = makeTempDbPath('temp_migrate_db.db');

  afterEach(() => {
    closeDatabase();
    removeTempDb(tempDbPath);
  });

  it('should create all required tables idempotently', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map(t => t.name);

    expect(tables).toContain('foods');
    expect(tables).toContain('recipes');
    expect(tables).toContain('recipe_ingredients');
    expect(tables).toContain('meal_log');
    expect(tables).toContain('sport_log');
    expect(tables).toContain('daily_targets');
    expect(tables).toContain('body_scans');

    // Run again to ensure idempotency
    expect(() => runMigrations(tempDbPath)).not.toThrow();
  });

  it('should enforce unique constraint on scan_datetime in body_scans', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const stmt = db.prepare(`
      INSERT INTO body_scans (scan_datetime, scan_date, weight_kg)
      VALUES (?, ?, ?)
    `);

    stmt.run('2026-08-15 06:54:37', '2026-08-15', 103.1);
    expect(() => {
      stmt.run('2026-08-15 06:54:37', '2026-08-15', 103.1);
    }).toThrow();
  });

  it('produit une sauvegarde complete meme en mode WAL', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);
    db.prepare('PRAGMA journal_mode = WAL').run();
    const category = db.prepare('SELECT category FROM ref_food_categories LIMIT 1').get().category;
    db.prepare('INSERT INTO foods (name, category, energy_kcal_100g) VALUES (?, ?, 100)').run('Test WAL', category);

    const backupDir = `${tempDbPath}_backups`;
    fs.mkdirSync(backupDir, { recursive: true });
    const previousBackupDir = process.env.BACKUP_DIR;
    process.env.BACKUP_DIR = backupDir;
    try {
      const backupPath = backupDatabase(tempDbPath);
      expect(backupPath).not.toBeNull();
      // La sauvegarde doit contenir la table ET la ligne ecrite en WAL.
      const backup = getDatabase(backupPath);
      const rows = backup.prepare("SELECT COUNT(*) AS n FROM foods WHERE name = 'Test WAL'").get();
      expect(rows.n).toBe(1);
      const tables = backup.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      expect(tables.length).toBeGreaterThan(5);
      backup.close();
    } finally {
      if (previousBackupDir === undefined) delete process.env.BACKUP_DIR;
      else process.env.BACKUP_DIR = previousBackupDir;
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  });
});
