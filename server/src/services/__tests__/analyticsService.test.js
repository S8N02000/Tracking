import { describe, it, expect, afterEach } from 'vitest';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import {
  getCorrelationSeries,
  getMicronutrientsRadar,
  getMealDistribution,
  getClinicalDiagnostics
} from '../analyticsService.js';
import { makeTempDbPath, removeTempDb } from '../../test-utils/tempDb.js';

describe('Analytics Service Unit Tests', () => {
  const tempDbPath = makeTempDbPath('temp_analytics_db.db');

  afterEach(() => {
    closeDatabase();
    removeTempDb(tempDbPath);
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
    expect(diag.ratios.length).toBe(11);
    expect(diag.nutrients.length).toBeGreaterThanOrEqual(25);

    // Verify presence of essential clinical ratios
    const omegaRatio = diag.ratios.find((r) => r.id === 'ratio_omega6_omega3');
    expect(omegaRatio).toBeDefined();
    expect(omegaRatio.explanation).toBeDefined();

    const potSodRatio = diag.ratios.find((r) => r.id === 'ratio_potassium_sodium');
    expect(potSodRatio).toBeDefined();

    const carbFiber = diag.ratios.find((r) => r.id === 'ratio_glucides_fibres');
    expect(carbFiber).toBeDefined();

    const caP = diag.ratios.find((r) => r.id === 'ratio_calcium_phosphore');
    expect(caP).toBeDefined();

    const protWeight = diag.ratios.find((r) => r.id === 'densite_proteique_ponderale');
    expect(protWeight).toBeDefined();

    const psIndex = diag.ratios.find((r) => r.id === 'index_lipidique_ps');
    expect(psIndex).toBeDefined();
  });

  it('should handle zero-intake and missing data without injecting fake ratio values', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    // Period with no logs at all
    const diag = getClinicalDiagnostics('2099-01-01', '2099-01-03', db);
    const omegaRatio = diag.ratios.find((r) => r.id === 'ratio_omega6_omega3');
    const potSodRatio = diag.ratios.find((r) => r.id === 'ratio_potassium_sodium');
    const caMgRatio = diag.ratios.find((r) => r.id === 'ratio_calcium_magnesium');
    const znCuRatio = diag.ratios.find((r) => r.id === 'ratio_zinc_cuivre');
    const fiberDensity = diag.ratios.find((r) => r.id === 'densite_fibres');
    const carbFiber = diag.ratios.find((r) => r.id === 'ratio_glucides_fibres');
    const caP = diag.ratios.find((r) => r.id === 'ratio_calcium_phosphore');
    const protWeight = diag.ratios.find((r) => r.id === 'densite_proteique_ponderale');
    const psIndex = diag.ratios.find((r) => r.id === 'index_lipidique_ps');

    // All ratios safely null and INDETERMINE
    expect(omegaRatio.value).toBeNull();
    expect(omegaRatio.status).toBe('INDETERMINE');

    expect(potSodRatio.value).toBeNull();
    expect(potSodRatio.status).toBe('INDETERMINE');

    expect(caMgRatio.value).toBeNull();
    expect(caMgRatio.status).toBe('INDETERMINE');

    expect(znCuRatio.value).toBeNull();
    expect(znCuRatio.status).toBe('INDETERMINE');

    expect(fiberDensity.value).toBeNull();
    expect(fiberDensity.status).toBe('INDETERMINE');

    expect(carbFiber.value).toBeNull();
    expect(carbFiber.status).toBe('INDETERMINE');

    expect(caP.value).toBeNull();
    expect(caP.status).toBe('INDETERMINE');

    expect(protWeight.value).toBeNull();
    expect(protWeight.status).toBe('INDETERMINE');

    expect(psIndex.value).toBeNull();
    expect(psIndex.status).toBe('INDETERMINE');

    // Macro split with 0 kcal
    expect(diag.summary.macro_split).toEqual({ protein_pct: 0, carbs_pct: 0, fat_pct: 0 });
    expect(diag.summary.global_score_pct).toBe(46);
  });

  it('should evaluate clinical ratios thresholds accurately with real food intake', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    // Insert Boditrax scan for weight
    db.prepare(`
      INSERT INTO body_scans (scan_datetime, scan_date, weight_kg)
      VALUES ('2026-09-01 08:00:00', '2026-09-01', 70.0)
    `).run();

    // Insert controlled food item
    const insertFood = db.prepare(`
      INSERT INTO foods (
        name, category, energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g, fat_g_100g, saturated_fat_g_100g,
        polyunsaturated_fat_g_100g, fiber_g_100g, omega3_g_100g, omega6_g_100g, sodium_mg_100g, potassium_mg_100g,
        calcium_mg_100g, magnesium_mg_100g, phosphorus_mg_100g, zinc_mg_100g, copper_mg_100g
      ) VALUES (
        'Test Clinical Food', 'autre', 1000, 105, 100, 30, 9,
        12, 15, 2.0, 6.0, 500, 1500,
        200, 100, 160, 10.0, 1.0
      )
    `);
    const foodId = insertFood.run().lastInsertRowid;

    // Log 100g on 2026-09-01
    db.prepare(`
      INSERT INTO meal_log (date_, period, food_id, quantity_g, logged_at)
      VALUES ('2026-09-01', 'dejeuner', ?, 100, '2026-09-01 12:30:00')
    `).run(foodId);

    const diag = getClinicalDiagnostics('2026-09-01', '2026-09-01', db);

    // Omega 6 / Omega 3: 6.0 / 2.0 = 3.0 (< 4.0 -> OPTIMAL)
    const omegaRatio = diag.ratios.find(r => r.id === 'ratio_omega6_omega3');
    expect(omegaRatio.value).toBe(3.0);
    expect(omegaRatio.status).toBe('OPTIMAL');

    // Potassium / Sodium: 1500 / 500 = 3.0 (>= 1.7 -> OPTIMAL)
    const potSodRatio = diag.ratios.find(r => r.id === 'ratio_potassium_sodium');
    expect(potSodRatio.value).toBe(3.0);
    expect(potSodRatio.status).toBe('OPTIMAL');

    // Carb / Fiber (Harvard): 100 / 15 = 6.7 (<= 10.0 -> OPTIMAL)
    const carbFiber = diag.ratios.find(r => r.id === 'ratio_glucides_fibres');
    expect(carbFiber.value).toBe(6.7);
    expect(carbFiber.status).toBe('OPTIMAL');

    // Calcium / Magnesium: 200 / 100 = 2.0 (between 1.5 and 2.2 -> OPTIMAL)
    const caMgRatio = diag.ratios.find(r => r.id === 'ratio_calcium_magnesium');
    expect(caMgRatio.value).toBe(2.0);
    expect(caMgRatio.status).toBe('OPTIMAL');

    // Calcium / Phosphorus: 200 / 160 = 1.25 (between 1.0 and 1.5 -> OPTIMAL)
    const caPRatio = diag.ratios.find(r => r.id === 'ratio_calcium_phosphore');
    expect(caPRatio.value).toBe(1.25);
    expect(caPRatio.status).toBe('OPTIMAL');

    // Zinc / Cuivre: 10.0 / 1.0 = 10.0 (between 8.0 and 15.0 -> OPTIMAL)
    const znCuRatio = diag.ratios.find(r => r.id === 'ratio_zinc_cuivre');
    expect(znCuRatio.value).toBe(10.0);
    expect(znCuRatio.status).toBe('OPTIMAL');

    // Fiber Density: 15g / 1000 kcal * 1000 = 15.0 (>= 14 -> OPTIMAL)
    const fiberDensity = diag.ratios.find(r => r.id === 'densite_fibres');
    expect(fiberDensity.value).toBe(15.0);
    expect(fiberDensity.status).toBe('OPTIMAL');

    // Saturated Fat Share: 9g / 30g = 30% (<= 33% -> OPTIMAL)
    const satFatShare = diag.ratios.find(r => r.id === 'part_gras_sature');
    expect(satFatShare.value).toBe(30);
    expect(satFatShare.status).toBe('OPTIMAL');

    // Lipid Index P/S: 12g / 9g = 1.33 (>= 1.0 -> OPTIMAL)
    const psIndex = diag.ratios.find(r => r.id === 'index_lipidique_ps');
    expect(psIndex.value).toBe(1.33);
    expect(psIndex.status).toBe('OPTIMAL');

    // Protein Weight Density: 105g / 70kg = 1.5 g/kg (between 1.2 and 2.2 -> OPTIMAL)
    const protWeight = diag.ratios.find(r => r.id === 'densite_proteique_ponderale');
    expect(protWeight.value).toBe(1.5);
    expect(protWeight.status).toBe('OPTIMAL');

    // Macro Split
    const ms = diag.summary.macro_split;
    expect(ms.protein_pct + ms.carbs_pct + ms.fat_pct).toBe(100);
  });
});

