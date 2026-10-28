import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { getPralReport, getPralRatio, aggregateResolvedLines } from '../pralService.js';
import { STRATEGY, resolveLine, buildResolutionContext } from '../../domain/pral/index.js';

describe('PRAL — service (intégration)', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_pral_db.db');
  let testDb = null;

  afterEach(() => {
    if (testDb?.open) testDb.close();
    testDb = null;
    closeDatabase();
    for (const suffix of ['', '-wal', '-shm']) {
      if (fs.existsSync(`${tempDbPath}${suffix}`)) fs.unlinkSync(`${tempDbPath}${suffix}`);
    }
  });

  /** Crée une base minimale avec un aliment documenté et un repas. */
  function seed({ minerals = {}, date = '2026-10-25', grams = 200, kcal = 500 }) {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);
    testDb = db;

    // `category` doit exister dans ref_food_categories (clé étrangère active).
    db.prepare(
      `INSERT INTO foods (name, category, source, energy_kcal_100g, proteins_g_100g,
        phosphorus_mg_100g, potassium_mg_100g, magnesium_mg_100g, calcium_mg_100g)
       VALUES ('Test', 'autre', 'ciqual', ?, ?, ?, ?, ?, ?)`
    ).run(
      kcal,
      minerals.proteins ?? 10,
      minerals.phosphorus ?? null,
      minerals.potassium ?? null,
      minerals.magnesium ?? null,
      minerals.calcium ?? null
    );

    const foodId = db.prepare('SELECT id FROM foods LIMIT 1').get().id;
    db.prepare(
      `INSERT INTO meal_log (date_, period, food_id, quantity_g) VALUES (?, 'dejeuner', ?, ?)`
    ).run(date, foodId, grams);

    return { db, foodId };
  }

  it('produit un rapport complet sur une fenêtre', () => {
    const { db } = seed({
      minerals: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 }
    });

    const report = getPralReport('2026-10-25', '2026-10-25', db);

    expect(report.startDate).toBe('2026-10-25');
    expect(report.period.validDays).toBe(1);
    expect(report.period.excludedDays).toBe(0);
    expect(report.period.score).toBeCloseTo(
      0.4888 * 20 + 0.0366 * 200 - 0.0205 * 400 - 0.0263 * 60 - 0.0125 * 80,
      6
    );
    expect(report.days[0].coverage).toBe(1);
    expect(report.days[0].included).toBe(true);
  });

  it('conserve l’identifiant historique du ratio et expose l’intervalle', () => {
    const { db } = seed({
      minerals: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 }
    });

    const ratio = getPralRatio('2026-10-25', '2026-10-25', db);

    expect(ratio.id).toBe('indice_pral');
    expect(ratio.unit).toBe('mEq / jour');
    expect(typeof ratio.value).toBe('number');
    expect(ratio.valid_days).toBe(1);
    expect(ratio.explanation).toContain('Remer & Manz');
  });

  it('exclut une journée partielle et le dit', () => {
    const { db } = seed({
      minerals: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 },
      grams: 50,
      kcal: 100
    });

    const report = getPralReport('2026-10-25', '2026-10-25', db);

    expect(report.period.validDays).toBe(0);
    expect(report.period.excludedDays).toBe(1);
    expect(report.days[0].reason).toBe('below_min_kcal');
    expect(report.period.score).toBeNull();
  });

  it('ne convertit pas un NULL minéral en zéro (couverture < 1)', () => {
    const { db } = seed({
      minerals: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 }
    });

    // On retire le calcium de la ligne : la couverture doit baisser.
    const food = db.prepare('SELECT id FROM foods LIMIT 1').get();
    db.prepare('UPDATE foods SET calcium_mg_100g = NULL WHERE id = ?').run(food.id);

    const report = getPralReport('2026-10-25', '2026-10-25', db);

    expect(report.days[0].coverage).toBeLessThan(1);
    expect(report.days[0].unresolvedNutrients).toContain('calcium');
    // Le calcium n'est pas compté comme 0 : sa contribution est absente.
    expect(report.days[0].terms.calcium.resolved).toBe(0);
  });

  it('stratégie zero : reproduit le comportement historique', () => {
    const { db } = seed({
      minerals: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 }
    });
    const food = db.prepare('SELECT id FROM foods LIMIT 1').get();
    db.prepare('UPDATE foods SET calcium_mg_100g = NULL WHERE id = ?').run(food.id);

    const imputed = getPralReport('2026-10-25', '2026-10-25', db, { strategy: STRATEGY.IMPUTED });
    const zeroed = getPralReport('2026-10-25', '2026-10-25', db, { strategy: STRATEGY.ZERO });

    // En mode zero, le calcium non documenté pèse 0 mg : contribution nulle
    // et absente des deux côtés. La différence vient de la couverture.
    expect(imputed.days[0].coverage).toBeLessThan(zeroed.days[0].coverage);
  });

  it('agrège les masses par nutriment correctement', () => {
    const context = buildResolutionContext({});
    const lines = [
      resolveLine(
        {
          lineId: '1',
          date: '2026-10-25',
          origin: 'food',
          foodId: 1,
          grams: 100,
          composition: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 }
        },
        context
      ),
      resolveLine(
        {
          lineId: '2',
          date: '2026-10-25',
          origin: 'food',
          foodId: 2,
          grams: 100,
          composition: { proteins: 20, phosphorus: 200, potassium: 400, magnesium: 60, calcium: 80 }
        },
        context
      )
    ];

    const aggregates = aggregateResolvedLines(lines);
    expect(aggregates.proteins.resolved).toBeCloseTo(30, 6);
    expect(aggregates.calcium.resolved).toBeCloseTo(120, 6);
  });
});
