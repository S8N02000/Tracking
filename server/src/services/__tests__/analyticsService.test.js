import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import {
  getCorrelationSeries,
  getMicronutrientsRadar,
  getMealDistribution,
  getClinicalDiagnostics
} from '../analyticsService.js';

describe('Analytics Service Unit Tests', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_analytics_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  });

  it('should generate correlation series and micronutrient radar data correctly', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const series = getCorrelationSeries('2026-08-01', '2026-08-05', db);
    expect(series.labels.length).toBe(5);
    expect(series.series.cumulative_balance_kcal.length).toBe(5);

    const radar = getMicronutrientsRadar('2026-08-01', '2026-08-05', db);
    expect(radar.period_days).toBe(5);
    expect(radar.percentage_rda).toBeDefined();

    const dist = getMealDistribution('2026-08-01', '2026-08-05', db);
    expect(dist.distribution).toBeDefined();
  });

  it('should calculate clinical diagnostics with deficiency flags and ratios correctly', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    const diag = getClinicalDiagnostics('2026-08-01', '2026-08-07', db);
    expect(diag.summary.total_days).toBe(7);
    expect(diag.ratios.length).toBeGreaterThanOrEqual(7);
    expect(diag.nutrients.length).toBeGreaterThanOrEqual(25);

    // Verify presence of essential clinical ratios
    const omegaRatio = diag.ratios.find((r) => r.id === 'ratio_omega6_omega3');
    expect(omegaRatio).toBeDefined();
    expect(omegaRatio.explanation).toBeDefined();

    const potSodRatio = diag.ratios.find((r) => r.id === 'ratio_potassium_sodium');
    expect(potSodRatio).toBeDefined();
  });
});

