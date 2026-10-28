import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { getClinicalDiagnostics } from '../analyticsService.js';
import { getPralRatio } from '../pralService.js';

describe('PRAL — non-régression API et contrat ratio', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_pral_api_db.db');
  let testDb = null;
  let app = null;

  afterEach(() => {
    if (testDb?.open) testDb.close();
    testDb = null;
    closeDatabase();
    for (const suffix of ['', '-wal', '-shm']) {
      if (fs.existsSync(`${tempDbPath}${suffix}`)) fs.unlinkSync(`${tempDbPath}${suffix}`);
    }
  });

  /**
   * Base minimale : un aliment Ciqual complet + un repas qui dépasse le
   * seuil d'apport minimal, afin que la journée soit VALIDÉE.
   */
  function seed() {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);
    testDb = db;

    db.prepare(
      `INSERT INTO foods (name, category, source, energy_kcal_100g, proteins_g_100g,
         phosphorus_mg_100g, potassium_mg_100g, magnesium_mg_100g, calcium_mg_100g)
       VALUES ('Test PRAL', 'autre', 'ciqual', 500, 10, 100, 200, 30, 40)`
    ).run();

    const foodId = db.prepare('SELECT id FROM foods LIMIT 1').get().id;
    db.prepare(
      `INSERT INTO meal_log (date_, period, food_id, quantity_g) VALUES ('2026-10-25', 'dejeuner', ?, 200)`
    ).run(foodId);

    return db;
  }

  it('le ratio conserve l’identifiant historique `indice_pral`', () => {
    const db = seed();

    const ratio = getPralRatio('2026-10-25', '2026-10-25', db);

    expect(ratio.id).toBe('indice_pral');
    expect(ratio.unit).toBe('mEq / jour');
    expect(typeof ratio.value).toBe('number');
    expect(Number.isFinite(ratio.value)).toBe(true);
  });

  it('le ratio reste présent dans les ratios du diagnostic clinique', () => {
    const db = seed();

    const diag = getClinicalDiagnostics('2026-10-25', '2026-10-25', db);
    const pral = diag.ratios.find((r) => r.id === 'indice_pral');

    expect(pral).toBeDefined();
    expect(pral.unit).toBe('mEq / jour');
    expect(pral.target_label).toBeTruthy();
    expect(pral.explanation).toContain('Remer & Manz');
  });

  it('applique la formule Remer & Manz avec les coefficients canoniques', () => {
    const db = seed();

    const ratio = getPralRatio('2026-10-25', '2026-10-25', db);

    // 200 g => protéines 20 g, P 200 mg, K 400 mg, Mg 60 mg, Ca 80 mg.
    const expected =
      0.4888 * 20 + 0.0366 * 200 - 0.0205 * 400 - 0.0263 * 60 - 0.0125 * 80;
    expect(ratio.value).toBeCloseTo(expected, 1);
  });

  it('le ratio expose l’intervalle, les journées valides et la bande clinique', () => {
    const db = seed();

    const ratio = getPralRatio('2026-10-25', '2026-10-25', db);

    expect(typeof ratio.low).toBe('number');
    expect(typeof ratio.high).toBe('number');
    expect(ratio.low).toBeLessThanOrEqual(ratio.high);
    expect(ratio.valid_days).toBe(1);
    expect(ratio.excluded_days).toBe(0);
    expect(ratio.band).toBeTruthy();
    expect(ratio.band_label).toBeTruthy();
    // Le libellé clinique est porté par la bande, jamais par un statut
    // alarmiste calculé ailleurs.
    expect(['OPTIMAL', 'ATTENTION', 'SOUS_OPTIMAL', 'CRITIQUE']).toContain(ratio.status);
  });

  it('l’endpoint GET /api/analytics/pral renvoie le rapport et le ratio', async () => {
    seed();

    if (!app) {
      const { default: expressApp } = await import('../../app.js');
      app = expressApp;
    }

    const res = await request(app)
      .get('/api/analytics/pral?start=2026-10-25&end=2026-10-25')
      .expect(200);

    expect(res.body.startDate).toBe('2026-10-25');
    expect(res.body.period).toBeDefined();
    expect(res.body.days).toBeDefined();
    expect(res.body.quality).toBeDefined();
    expect(res.body.ratio).toBeDefined();
    expect(res.body.ratio.id).toBe('indice_pral');
    expect(typeof res.body.ratio.value).toBe('number');
    expect(res.body.ratio.valid_days).toBe(1);
  });
});
