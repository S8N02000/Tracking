import { describe, it, expect } from 'vitest';
import {
  computePral,
  computePralPartial,
  computePralFromAggregates,
  PralDataError,
  roundPral,
  sumByNutrient,
  aggregatePral
} from '../formula.js';
import { COEFFICIENTS_EXACT, COEFFICIENTS_ROUNDED } from '../constants.js';

describe('PRAL — formule', () => {
  describe('computePral (mode strict)', () => {
    it('calcule le score canonique de Remer & Manz', () => {
      // 113,8 g protéines, 1704 mg P, 3534 mg K, 329 mg Mg, 918 mg Ca
      const result = computePral({
        proteins: 113.8,
        phosphorus: 1704,
        potassium: 3534,
        magnesium: 329,
        calcium: 918
      });

      // 0,4888×113,8 + 0,0366×1704 − 0,0205×3534 − 0,0263×329 − 0,0125×918
      const expected =
        0.4888 * 113.8 +
        0.0366 * 1704 -
        0.0205 * 3534 -
        0.0263 * 329 -
        0.0125 * 918;

      expect(result.score).toBeCloseTo(expected, 6);
      expect(result.complete).toBe(true);
      expect(result.omitted).toEqual([]);
      expect(result.unit).toBe('mEq/jour');
    });

    it('affecte le coefficient -0,0263 au MAGNÉSIUM et -0,0125 au CALCIUM', () => {
      const result = computePral({
        proteins: 0,
        phosphorus: 0,
        potassium: 0,
        magnesium: 100,
        calcium: 100
      });

      expect(result.terms.magnesium.coefficient).toBe(-0.0263);
      expect(result.terms.calcium.coefficient).toBe(-0.0125);
      // -2,63 (Mg) + -1,25 (Ca) = -3,88
      expect(result.score).toBeCloseTo(-3.88, 6);
    });

    it('ne confond PAS calcium et magnésium (cas de l inversion historique)', () => {
      const nutrients = {
        proteins: 100,
        phosphorus: 1000,
        potassium: 3000,
        magnesium: 300,
        calcium: 900
      };
      const correct = computePral(nutrients, { coefficients: 'exact' });

      // Affectation inversée (bug historique) : -0,0263 sur Ca, -0,0125 sur Mg
      const inverted = computePral(nutrients, {
        coefficients: {
          proteins: 0.4888,
          phosphorus: 0.0366,
          potassium: -0.0205,
          magnesium: -0.0125,
          calcium: -0.0263
        }
      });

      // L'inversion sous-estime le PRAL de 0,0138×(Ca−Mg) ≈ 8,3 mEq ici.
      expect(correct.score).toBeGreaterThan(inverted.score);
      expect(correct.score - inverted.score).toBeCloseTo(0.0138 * (900 - 300), 6);
    });

    it('lève une erreur explicite si un nutriment manque (aucun zéro silencieux)', () => {
      expect(() =>
        computePral({ proteins: 100, phosphorus: 1000, potassium: 3000, magnesium: 300 })
      ).toThrow(PralDataError);

      try {
        computePral({ proteins: 100 });
      } catch (err) {
        expect(err.code).toBe('PRAL_INCOMPLETE_DATA');
        expect(err.missing).toEqual(['phosphorus', 'potassium', 'magnesium', 'calcium']);
      }
    });

    it('traite une valeur nulle comme absente, jamais comme zéro', () => {
      expect(() =>
        computePral({
          proteins: 100,
          phosphorus: null,
          potassium: 3000,
          magnesium: 300,
          calcium: 900
        })
      ).toThrow(PralDataError);
    });

    it('expose les coefficients utilisés dans le résultat', () => {
      const result = computePral({
        proteins: 100,
        phosphorus: 1000,
        potassium: 3000,
        magnesium: 300,
        calcium: 900
      });
      expect(result.coefficients).toEqual(COEFFICIENTS_EXACT);
    });
  });

  describe('computePralPartial', () => {
    it('calcule malgré tout et liste les nutriments absents', () => {
      const result = computePralPartial({
        proteins: 100,
        phosphorus: 1000,
        potassium: 3000,
        magnesium: 300
      });

      expect(result.complete).toBe(false);
      expect(result.omitted).toEqual(['calcium']);
      expect(result.terms.calcium).toBeUndefined();
      expect(Number.isFinite(result.score)).toBe(true);
    });
  });

  describe('computePralFromAggregates', () => {
    const aggregates = {
      proteins: { resolved: 100, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 },
      phosphorus: { resolved: 1000, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 },
      potassium: { resolved: 3000, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 },
      magnesium: { resolved: 300, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 },
      calcium: { resolved: 900, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 }
    };

    it('reproduit le calcul ponctuel quand tout est documenté', () => {
      const result = computePralFromAggregates(aggregates);
      const expected = computePral({
        proteins: 100,
        phosphorus: 1000,
        potassium: 3000,
        magnesium: 300,
        calcium: 900
      });
      expect(result.score).toBeCloseTo(expected.score, 10);
      expect(result.low).toBeCloseTo(result.score, 10);
      expect(result.high).toBeCloseTo(result.score, 10);
      expect(result.complete).toBe(true);
    });

    it('mode omit : les masses encadrées n’entrent PAS dans le point', () => {
      const withBounds = {
        ...aggregates,
        calcium: {
          resolved: 0,
          boundedLow: 100,
          boundedHigh: 300,
          unresolvedFoodMass: 0
        }
      };

      const result = computePralFromAggregates(withBounds, { boundedMode: 'omit' });
      const base = computePralFromAggregates(aggregates);

      // Le calcium n'est plus compté : le point monte de 0,0125×900.
      expect(result.score).toBeCloseTo(base.score + 0.0125 * 900, 6);
      // Mais l'intervalle intègre les bornes.
      expect(result.low).toBeLessThan(result.score);
      expect(result.high).toBeCloseTo(result.score, 6);
      expect(result.boundedNutrients).toContain('calcium');
    });

    it('mode midpoint : variante de sensibilité documentée', () => {
      const withBounds = {
        ...aggregates,
        calcium: { resolved: 0, boundedLow: 100, boundedHigh: 300, unresolvedFoodMass: 0 }
      };
      const result = computePralFromAggregates(withBounds, { boundedMode: 'midpoint' });
      // point = base + 0,0125×900 − 0,0125×200 (milieu de [100,300])
      const base = computePralFromAggregates(aggregates);
      expect(result.score).toBeCloseTo(base.score + 0.0125 * 900 - 0.0125 * 200, 6);
      expect(result.boundedMode).toBe('midpoint');
    });

    it('refuse un mode de bornage inconnu', () => {
      expect(() => computePralFromAggregates(aggregates, { boundedMode: 'nope' })).toThrow(
        /Mode de bornage PRAL inconnu/
      );
    });

    it('signale les nutriments totalement inconnus sans les convertir en zéro', () => {
      const withUnknown = {
        ...aggregates,
        potassium: {
          resolved: 0,
          boundedLow: 0,
          boundedHigh: 0,
          unresolvedFoodMass: 250
        }
      };
      const result = computePralFromAggregates(withUnknown);

      expect(result.complete).toBe(false);
      expect(result.unresolvedNutrients).toContain('potassium');
      expect(result.unresolvedFoodMass).toBe(250);
      // Le potassium n'est pas compté comme zéro : son terme est absent.
      expect(result.terms.potassium.resolved).toBe(0);
      expect(result.terms.potassium.contribution).toBe(0);
    });

    it('ordonne correctement les bornes quand le coefficient est négatif', () => {
      const withBounds = {
        ...aggregates,
        magnesium: { resolved: 0, boundedLow: 100, boundedHigh: 300, unresolvedFoodMass: 0 }
      };
      const result = computePralFromAggregates(withBounds, { boundedMode: 'omit' });

      // Coefficient négatif : plus de magnésium = PRAL plus bas.
      expect(result.low).toBeLessThan(result.high);
    });
  });

  describe('utilitaires', () => {
    it('roundPral arrondit à une décimale', () => {
      expect(roundPral(16.449)).toBe(16.4);
      expect(roundPral(16.451)).toBe(16.5);
      expect(roundPral(null)).toBeNull();
    });

    it('sumByNutrient somme les contributions par nutriment', () => {
      const results = [
        computePralPartial({ proteins: 100, phosphorus: 1000 }),
        computePralPartial({ proteins: 50, phosphorus: 500 })
      ];
      const sums = sumByNutrient(results);
      expect(sums.proteins).toBeCloseTo(0.4888 * 150, 6);
      expect(sums.phosphorus).toBeCloseTo(0.0366 * 1500, 6);
    });

    it('aggregatePral fusionne des résultats partiels', () => {
      const results = [
        computePralPartial({ proteins: 100, phosphorus: 1000 }),
        computePralPartial({ proteins: 50 })
      ];
      const agg = aggregatePral(results);
      expect(agg.complete).toBe(false);
      expect(agg.omitted).toContain('phosphorus');
      expect(agg.contributions.length).toBe(2);
    });

    it('les deux jeux de coefficients existent et diffèrent', () => {
      expect(COEFFICIENTS_EXACT.proteins).toBe(0.4888);
      expect(COEFFICIENTS_ROUNDED.proteins).toBe(0.49);
    });
  });
});
