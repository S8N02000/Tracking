import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { getDailyDashboard } from '../dashboardAggregator.js';

describe('Dashboard Aggregator Unit & Integration Tests', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_dashboard_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  });

  it('should aggregate meal_log, sport_log, body_scans, daily_targets into continuous matrix', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    // Insert scan with BMR 2200
    db.prepare(`
      INSERT INTO body_scans (scan_datetime, scan_date, weight_kg, bmr_kcal)
      VALUES ('2026-08-01 07:00:00', '2026-08-01', 100.0, 2200)
    `).run();

    // Insert food
    const fId = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g, fat_g_100g)
      VALUES ('Avoine', 'cereale', 380, 13, 60, 7)
    `).run().lastInsertRowid;

    // Log meal: 100g avoine = 380 kcal
    db.prepare(`
      INSERT INTO meal_log (date_, period, food_id, quantity_g)
      VALUES ('2026-08-01', 'petit_dejeuner', ?, 100)
    `).run(fId);

    // Log sport: 300 kcal burned
    db.prepare(`
      INSERT INTO sport_log (date_, sport_type, duration_min, kcal_burned)
      VALUES ('2026-08-01', 'tapis_roulant', 30, 300)
    `).run();

    const dashboard = getDailyDashboard('2026-08-01', '2026-08-03', db);

    expect(dashboard.rows.length).toBe(3);
    const r1 = dashboard.rows[0];
    expect(r1.date).toBe('2026-08-01');
    expect(r1.kcal_in).toBe(380);
    expect(r1.bmr_kcal).toBe(2200);
    expect(r1.kcal_sport).toBe(300);
    expect(r1.total_kcal_expended).toBe(2500); // 2200 + 300
    expect(r1.net_balance).toBe(-2120); // 380 - 2500
    expect(dashboard.query_info.execution_time_ms).toBeLessThan(100);
  });
});
