import { describe, it, expect } from 'vitest';
import {
  RESOLUTION,
  STRATEGY,
  buildCategoryBounds,
  buildResolutionContext,
  computeCoverage,
  isCurationValidAt,
  resolveBounds,
  resolveLine,
  resolveNutrient,
  toAbsoluteBounds,
  toAbsoluteComposition
} from '../quality.js';

/** Ligne de test : aliment de 200 g, catégorie fruits, composition partielle. */
function makeLine(overrides = {}) {
  return {
    lineId: '1:food:10',
    date: '2026-10-25',
    origin: 'food',
    foodId: 10,
    foodName: 'Baguette',
    category: 'cereale',
    source: 'ciqual',
    grams: 200,
    composition: {
      proteins: 8.5,
      phosphorus: null,
      potassium: null,
      magnesium: null,
      calcium: null
    },
    ...overrides
  };
}

describe('PRAL — couche qualité', () => {
  describe('resolveNutrient', () => {
    it('privilégie la valeur directe', () => {
      const outcome = resolveNutrient(makeLine(), 'proteins');
      expect(outcome.value).toBe(8.5);
      expect(outcome.resolution).toBe(RESOLUTION.DIRECT);
      expect(outcome.provenance).toBeNull();
    });

    it('utilise un donneur curaté quand la valeur est absente', () => {
      const context = buildResolutionContext({
        donors: [
          {
            foodId: 10,
            referenceId: 123,
            name: 'Baguette Complète',
            source: 'ciqual',
            note: 'Même produit, ligne complète',
            // Le donneur DOIT porter la composition qu'il transpose : sans
            // valeur à donner, aucune résolution n'est possible.
            composition: { proteins: 8.5, phosphorus: 120, potassium: 150, magnesium: 40, calcium: 30 }
          }
        ]
      });

      const outcome = resolveNutrient(makeLine(), 'calcium', context);
      expect(outcome.resolution).toBe(RESOLUTION.DONOR);
      expect(outcome.provenance.referenceId).toBe(123);
      expect(outcome.provenance.referenceName).toBe('Baguette Complète');
      expect(outcome.provenance.note).toBe('Même produit, ligne complète');
    });

    it('utilise un zéro déclaré pour les minéraux physiquement absents', () => {
      const context = buildResolutionContext({ zeroDeclared: [10] });
      const outcome = resolveNutrient(makeLine(), 'calcium', context);
      expect(outcome.value).toBe(0);
      expect(outcome.resolution).toBe(RESOLUTION.DECLARED_ZERO);
    });

    it('NE fait AUCUNE imputation automatique : reste non résolu', () => {
      const outcome = resolveNutrient(makeLine(), 'calcium');
      expect(outcome.value).toBeNull();
      expect(outcome.resolution).toBe(RESOLUTION.UNRESOLVED);
    });

    it('n existe aucune résolution « category_median »', () => {
      expect(RESOLUTION.CATEGORY_MEDIAN).toBeUndefined();
      expect(Object.values(RESOLUTION)).not.toContain('category_median');
    });

    it('stratégie zero : reproduit le comportement historique (à titre de comparaison)', () => {
      const context = buildResolutionContext({ strategy: STRATEGY.ZERO });
      const outcome = resolveNutrient(makeLine(), 'calcium', context);
      expect(outcome.value).toBe(0);
      expect(outcome.resolution).toBe(RESOLUTION.ZERO_FILLED);
    });

    it('stratégie complete_case : laisse le nutriment non résolu', () => {
      const context = buildResolutionContext({ strategy: STRATEGY.COMPLETE_CASE });
      const outcome = resolveNutrient(makeLine(), 'calcium', context);
      expect(outcome.value).toBeNull();
      expect(outcome.resolution).toBe(RESOLUTION.UNRESOLVED);
    });
  });

  describe('fenêtres de validité des curations', () => {
    const DONOR = {
      foodId: 10,
      referenceId: 123,
      name: 'Baguette Complète',
      source: 'ciqual',
      composition: { proteins: 8.5, phosphorus: 120, potassium: 150, magnesium: 40, calcium: 30 }
    };

    it('une curation sans borne s’applique à toutes les dates', () => {
      expect(isCurationValidAt(DONOR, '2020-01-01')).toBe(true);
      expect(isCurationValidAt(DONOR, '2099-12-31')).toBe(true);
    });

    it('une curation bornée ne s’applique pas hors de sa fenêtre', () => {
      const curation = { ...DONOR, validFrom: '2026-08-01', validTo: '2026-10-31' };
      expect(isCurationValidAt(curation, '2026-08-01')).toBe(true);
      expect(isCurationValidAt(curation, '2026-10-31')).toBe(true);
      expect(isCurationValidAt(curation, '2026-07-31')).toBe(false);
      expect(isCurationValidAt(curation, '2026-11-01')).toBe(false);
    });

    it('n’applique pas une curation hors fenêtre à la ligne', () => {
      const context = buildResolutionContext({
        donors: [{ ...DONOR, validFrom: '2026-08-01', validTo: '2026-10-31' }]
      });
      const before = resolveNutrient(makeLine({ date: '2026-07-01' }), 'calcium', context);
      expect(before.resolution).toBe(RESOLUTION.UNRESOLVED);
      expect(before.value).toBeNull();

      const inside = resolveNutrient(makeLine({ date: '2026-09-15' }), 'calcium', context);
      expect(inside.resolution).toBe(RESOLUTION.DONOR);
      expect(inside.value).toBe(30);
    });

    it('la provenance du donneur expose sa fenêtre de validité', () => {
      const context = buildResolutionContext({
        donors: [{ ...DONOR, validFrom: '2026-08-01', validTo: '2026-10-31', note: 'Curation auditée' }]
      });
      const outcome = resolveNutrient(makeLine({ date: '2026-09-15' }), 'calcium', context);
      expect(outcome.provenance.validFrom).toBe('2026-08-01');
      expect(outcome.provenance.validTo).toBe('2026-10-31');
      expect(outcome.provenance.note).toBe('Curation auditée');
    });

    it('plusieurs curations d’un même aliment : celle de la date gagne', () => {
      const context = buildResolutionContext({
        donors: [
          { ...DONOR, referenceId: 1, validFrom: '2026-01-01', validTo: '2026-06-30' },
          { ...DONOR, referenceId: 2, validFrom: '2026-07-01', validTo: null }
        ]
      });
      const old = resolveNutrient(makeLine({ date: '2026-03-01' }), 'calcium', context);
      expect(old.provenance.referenceId).toBe(1);

      const recent = resolveNutrient(makeLine({ date: '2026-09-01' }), 'calcium', context);
      expect(recent.provenance.referenceId).toBe(2);
    });
  });

  describe('resolveBounds', () => {
    const bounds = new Map([
      [
        'cereale',
        {
          category: 'cereale',
          count: 6,
          sources: ['ciqual'],
          perNutrient: {
            calcium: { min: 10, max: 90, count: 6, sources: ['ciqual'] },
            phosphorus: { min: 80, max: 400, count: 6, sources: ['ciqual'] },
            potassium: { min: 100, max: 500, count: 6, sources: ['ciqual'] },
            magnesium: { min: 20, max: 120, count: 6, sources: ['ciqual'] }
          }
        }
      ]
    ]);

    it('produit un intervalle, jamais un point', () => {
      const bracket = resolveBounds(makeLine(), 'calcium', { bounds });
      expect(bracket.low).toBeCloseTo((10 / 100) * 200, 6);
      expect(bracket.high).toBeCloseTo((90 / 100) * 200, 6);
      expect(bracket.count).toBe(6);
      expect(bracket.category).toBe('cereale');
      expect(bracket.note).toContain('Aucune valeur ponctuelle');
    });

    it('refuse de borner si le pool est trop petit', () => {
      const small = new Map([
        [
          'cereale',
          {
            category: 'cereale',
            perNutrient: { calcium: { min: 10, max: 90, count: 2, sources: ['ciqual'] } }
          }
        ]
      ]);
      const bracket = resolveBounds(makeLine(), 'calcium', { bounds: small, minPoolSize: 5 });
      expect(bracket).toBeNull();
    });

    it('refuse de borner si la catégorie est inconnue', () => {
      expect(resolveBounds(makeLine({ category: 'inconnue' }), 'calcium', { bounds })).toBeNull();
    });
  });

  describe('resolveLine', () => {
    it('résout les 5 nutriments et signale les absents', () => {
      const line = resolveLine(makeLine());
      expect(line.missing).toEqual(['phosphorus', 'potassium', 'magnesium', 'calcium']);
      expect(line.complete).toBe(false);
      expect(line.nutrients.proteins.value).toBe(8.5);
      expect(line.nutrients.calcium.value).toBeNull();
    });

    it('ajoute des bornes pour les nutriments non résolus bornables', () => {
      const bounds = new Map([
        [
          'cereale',
          {
            category: 'cereale',
            perNutrient: {
              phosphorus: { min: 80, max: 400, count: 6, sources: ['ciqual'] },
              potassium: { min: 100, max: 500, count: 6, sources: ['ciqual'] },
              magnesium: { min: 20, max: 120, count: 6, sources: ['ciqual'] },
              calcium: { min: 10, max: 90, count: 6, sources: ['ciqual'] }
            }
          }
        ]
      ]);

      const line = resolveLine(makeLine(), { bounds });
      expect(line.bracketed.length).toBe(4);
      expect(line.bounds.calcium.low).toBeCloseTo(20, 6);
    });

    it('stratégie complete_case : exclut la ligne entière si un nutriment manque', () => {
      const line = resolveLine(makeLine(), { strategy: STRATEGY.COMPLETE_CASE });
      expect(line.excluded).toBe(true);
      expect(line.exclusionReason).toBe('incomplete_line');
    });

    it('conserve la provenance de la recette parente', () => {
      const line = resolveLine(
        makeLine({ origin: 'recipe_ingredient', parentName: 'Gratin saumon' })
      );
      expect(line.parentName).toBe('Gratin saumon');
    });
  });

  describe('toAbsoluteComposition / toAbsoluteBounds', () => {
    it('met à l’échelle la composition par 100 g vers la masse consommée', () => {
      const line = resolveLine(makeLine());
      const absolute = toAbsoluteComposition(line);
      expect(absolute.proteins).toBeCloseTo((8.5 / 100) * 200, 6);
      expect(absolute.calcium).toBeNull();
    });

    it('ne remet pas à l’échelle les totaux stockés de recette', () => {
      const line = resolveLine(
        makeLine({
          origin: 'recipe_stored',
          grams: 300,
          composition: { proteins: 20, phosphorus: 300, potassium: 400, magnesium: 50, calcium: 200 }
        })
      );
      const absolute = toAbsoluteComposition(line);
      expect(absolute.proteins).toBe(20);
      expect(absolute.calcium).toBe(200);
    });

    it('expose les bornes absolues des nutriments non résolus', () => {
      const bounds = new Map([
        [
          'cereale',
          {
            category: 'cereale',
            perNutrient: { calcium: { min: 10, max: 90, count: 6, sources: ['ciqual'] } }
          }
        ]
      ]);
      const line = resolveLine(makeLine(), { bounds });
      const absoluteBounds = toAbsoluteBounds(line);
      expect(absoluteBounds.calcium.low).toBeCloseTo(20, 6);
      expect(absoluteBounds.calcium.high).toBeCloseTo(180, 6);
      expect(absoluteBounds.proteins).toBeNull();
    });
  });

  describe('computeCoverage', () => {
    it('pondère la couverture par la masse consommée', () => {
      const lines = [
        resolveLine(makeLine({ grams: 100, composition: { proteins: 10, phosphorus: 100, potassium: 200, magnesium: 30, calcium: 40 } })),
        resolveLine(
          makeLine({
            grams: 900,
            composition: { proteins: null, phosphorus: null, potassium: null, magnesium: null, calcium: null }
          })
        )
      ];
      const coverage = computeCoverage(lines);

      // 100 g documentés sur 1000 g, sur les 5 nutriments : 0,1 pour chacun.
      expect(coverage.coverage).toBeCloseTo(0.1, 6);
      expect(coverage.directCoverage).toBeCloseTo(0.1, 6);
      expect(coverage.unresolvedLines).toBe(1);
      expect(coverage.resolvedLines).toBe(1);
    });

    it('compte les donneurs curatés comme de la donnée documentée', () => {
      const context = buildResolutionContext({
        donors: [
          {
            foodId: 10,
            referenceId: 123,
            name: 'Baguette Complète',
            source: 'ciqual',
            composition: { proteins: 8.5, phosphorus: 120, potassium: 150, magnesium: 40, calcium: 30 }
          }
        ]
      });
      const line = resolveLine(makeLine(), context);
      const coverage = computeCoverage([line]);

      expect(coverage.coverage).toBe(1);
      expect(coverage.directCoverage).toBeCloseTo(0.2, 6); // protéines seulement en direct
      expect(coverage.resolutionCounts[RESOLUTION.DONOR]).toBe(4);
    });

    it('compte les zéros déclarés comme de la donnée documentée', () => {
      const context = buildResolutionContext({ zeroDeclared: [10] });
      const line = resolveLine(makeLine(), context);
      const coverage = computeCoverage([line]);
      expect(coverage.coverage).toBe(1);
      expect(coverage.resolutionCounts[RESOLUTION.DECLARED_ZERO]).toBe(4);
    });
  });

  describe('buildCategoryBounds', () => {
    it('calcule min/max par catégorie (jamais de médiane)', () => {
      const pool = [
        { id: 1, category: 'fruit', source: 'ciqual', composition: { calcium: 10, potassium: 100 } },
        { id: 2, category: 'fruit', source: 'ciqual', composition: { calcium: 30, potassium: 300 } },
        { id: 3, category: 'fruit', source: 'usda', composition: { calcium: 20, potassium: 200 } }
      ];
      const bounds = buildCategoryBounds(pool, { minPoolSize: 2 });
      const fruit = bounds.get('fruit');

      expect(fruit.perNutrient.calcium.min).toBe(10);
      expect(fruit.perNutrient.calcium.max).toBe(30);
      expect(fruit.perNutrient.calcium.count).toBe(3);
      expect(fruit.sources).toContain('ciqual');
      expect(fruit.sources).toContain('usda');
    });

    it('exclut les nutriments observés dans trop peu de références', () => {
      const pool = [
        { id: 1, category: 'fruit', source: 'ciqual', composition: { calcium: 10 } },
        { id: 2, category: 'fruit', source: 'ciqual', composition: { calcium: 30 } }
      ];
      const bounds = buildCategoryBounds(pool, { minPoolSize: 5 });
      expect(bounds.get('fruit').perNutrient.calcium).toBeUndefined();
    });
  });
});
