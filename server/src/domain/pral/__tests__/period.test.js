import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DAY_POLICY,
  DAY_EXCLUSION_REASONS,
  buildPeriod,
  evaluateDay,
  resolveDayPolicy,
  summarizeExclusions
} from '../period.js';
import {
  PRAL_BANDS,
  PRAL_STATUS,
  classifyPral,
  evaluatePral,
  validateBands
} from '../thresholds.js';

describe('PRAL — politique de période', () => {
  it('exclut les journées sans repas', () => {
    const result = evaluateDay({ date: '2026-10-24', kcal: 0, hasMeals: false });
    expect(result.included).toBe(false);
    expect(result.reason).toBe(DAY_EXCLUSION_REASONS.NO_MEALS);
  });

  it('exclut les journées partielles sous le seuil d’énergie', () => {
    const result = evaluateDay({ date: '2026-10-28', kcal: 426, coverage: 1 });
    expect(result.included).toBe(false);
    expect(result.reason).toBe(DAY_EXCLUSION_REASONS.BELOW_MIN_KCAL);
  });

  it('exclut les journées à couverture insuffisante', () => {
    const result = evaluateDay({ date: '2026-10-25', kcal: 2330, coverage: 0.7 });
    expect(result.included).toBe(false);
    expect(result.reason).toBe(DAY_EXCLUSION_REASONS.INSUFFICIENT_COVERAGE);
  });

  it('inclut une journée complète et bien documentée', () => {
    const result = evaluateDay({ date: '2026-10-25', kcal: 2330, coverage: 0.95 });
    expect(result.included).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('applique la politique par défaut (800 kcal, 90 % de couverture)', () => {
    const policy = resolveDayPolicy();
    expect(policy.minDayKcal).toBe(DEFAULT_DAY_POLICY.minDayKcal);
    expect(policy.minDayCoverage).toBe(DEFAULT_DAY_POLICY.minDayCoverage);
    expect(policy.minDayKcal).toBe(800);
    expect(policy.minDayCoverage).toBe(0.9);
  });

  it('calcule la moyenne sur les SEULES journées valides', () => {
    const days = [
      { date: '2026-10-22', score: 10, included: true },
      { date: '2026-10-23', score: 20, included: true },
      { date: '2026-10-24', score: 99, included: false, reason: 'no_meals' }
    ];
    const period = buildPeriod(days);

    expect(period.score).toBe(15);
    expect(period.validDays).toBe(2);
    expect(period.excludedDays).toBe(1);
  });

  it('ne dilue pas le score sur les jours calendaires vides', () => {
    const days = [
      { date: '2026-10-22', score: 25, included: true },
      { date: '2026-10-23', score: 25, included: true },
      { date: '2026-10-24', score: 0, included: false, reason: 'no_meals' },
      { date: '2026-10-25', score: 0, included: false, reason: 'no_meals' },
      { date: '2026-10-26', score: 0, included: false, reason: 'no_meals' },
      { date: '2026-10-27', score: 0, included: false, reason: 'no_meals' },
      { date: '2026-10-28', score: 0, included: false, reason: 'no_meals' }
    ];
    const period = buildPeriod(days);
    expect(period.score).toBe(25);
  });

  it('propage l’intervalle d’incertitude sur les journées valides', () => {
    const days = [
      { date: '2026-10-22', score: 20, low: 18, high: 22, included: true },
      { date: '2026-10-23', score: 30, low: 27, high: 33, included: true }
    ];
    const period = buildPeriod(days);
    expect(period.low).toBeCloseTo(22.5, 6);
    expect(period.high).toBeCloseTo(27.5, 6);
  });

  it('signale une période sans aucune journée valide', () => {
    const period = buildPeriod([{ date: '2026-10-24', score: 0, included: false, reason: 'no_meals' }]);
    expect(period.score).toBeNull();
    expect(period.isReliable).toBe(false);
    expect(period.reason).toContain('Aucune journée valide');
  });

  it('regroupe les exclusions par motif', () => {
    const days = [
      { included: false, reason: 'no_meals' },
      { included: false, reason: 'no_meals' },
      { included: false, reason: 'below_min_kcal' }
    ];
    expect(summarizeExclusions({ days })).toEqual({ no_meals: 2, below_min_kcal: 1 });
  });
});

describe('PRAL — politique clinique', () => {
  it('classe un régime omnivore usuel en OPTIMAL', () => {
    const band = classifyPral(25);
    expect(band.id).toBe('normal_omnivore');
    expect(band.status).toBe(PRAL_STATUS.OPTIMAL);
  });

  it('ne classe PLUS +15 mEq/jour comme critique', () => {
    // Ancien seuil : > 15 = CRITIQUE. Cliniquement infondé.
    expect(classifyPral(16).status).toBe(PRAL_STATUS.OPTIMAL);
    expect(classifyPral(16).id).toBe('normal_omnivore');
  });

  it('bande de vigilance entre +30 et +45', () => {
    const band = classifyPral(35);
    expect(band.id).toBe('elevated');
    expect(band.status).toBe(PRAL_STATUS.ATTENTION);
  });

  it('bande élevée entre +45 et +70', () => {
    const band = classifyPral(60);
    expect(band.id).toBe('high');
    expect(band.status).toBe(PRAL_STATUS.SOUS_OPTIMAL);
  });

  it('bande très élevée au-delà de +70', () => {
    const band = classifyPral(80);
    expect(band.id).toBe('very_high');
    expect(band.status).toBe(PRAL_STATUS.CRITIQUE);
  });

  it('classe un régime alcalinisant négatif comme normal', () => {
    expect(classifyPral(-20).id).toBe('normal_omnivore');
  });

  it('signale un problème seulement pour les bandes hautes', () => {
    expect(evaluatePral(25).isProblem).toBe(false);
    expect(evaluatePral(35).isProblem).toBe(false);
    expect(evaluatePral(60).isProblem).toBe(true);
    expect(evaluatePral(80).isProblem).toBe(true);
  });

  it('accepte des bandes personnalisées (politique remplaçable)', () => {
    const bands = [
      { id: 'a', min: -Infinity, max: 10, status: 'OPTIMAL', label: 'A', interpretation: 'A' },
      { id: 'b', min: 10, max: null, status: 'ATTENTION', label: 'B', interpretation: 'B' }
    ];
    const result = evaluatePral(15, { bands });
    expect(result.band).toBe('b');
    expect(result.status).toBe('ATTENTION');
  });

  it('valide la continuité des bandes par défaut', () => {
    expect(validateBands(PRAL_BANDS)).toBe(true);
  });

  it('refuse des bandes discontinues', () => {
    const bad = [
      { id: 'a', min: -Infinity, max: 10, status: 'OPTIMAL', label: 'A', interpretation: 'A' },
      { id: 'b', min: 20, max: null, status: 'ATTENTION', label: 'B', interpretation: 'B' }
    ];
    expect(() => validateBands(bad)).toThrow(/discontinuity/);
  });
});
