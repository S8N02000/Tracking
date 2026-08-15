import { describe, it, expect, afterEach } from 'vitest';
import { runMigrations } from '../migrate.js';
import { getDatabase, closeDatabase } from '../db.js';
import path from 'path';
import fs from 'fs';

describe('Database Migrations (migrate.js)', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_migrate_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
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
});
