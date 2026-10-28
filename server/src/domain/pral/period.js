/**
 * PRAL — politique de période et de journées valides.
 *
 * Module pur. Le PRAL est une moyenne JOURNALIÈRE : le dénominateur doit
 * être défini sans ambiguïté, sinon le score dépend autant du calendrier
 * que de l'alimentation.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE DÉFAUT HISTORIQUE
 *
 * L'application calculait la moyenne sur `dashboard.rows`, c'est-à-dire sur
 * TOUS les jours calendaires de l'intervalle, y compris les jours sans
 * aucun repas. Sur une fenêtre de 7 jours ne contenant que 5 jours
 * réellement consommés, le score était mécaniquement dilué de 5/7. Le
 * dénominateur était donc fonction du calendrier, pas de l'alimentation.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA RÈGLE
 *
 * Seules les journées RÉELLEMENT ALIMENTÉES et SUFFISAMMENT DOCUMENTÉES
 * entrent dans la moyenne. Toute exclusion est motivée, comptée et
 * exposée dans la réponse API (jamais silencieuse).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * L'INTERVALLE DE PÉRIODE
 *
 * Chaque journée peut porter un intervalle [low, high] : il rend compte
 * des lignes dont la minéralogie n'est pas documentée (bornes de
 * catégorie). La période propage ces bornes par moyenne, ce qui donne un
 * intervalle cohérent à l'échelle de la fenêtre analysée.
 */

/** Motifs d'exclusion d'une journée. */
export const DAY_EXCLUSION_REASONS = Object.freeze({
  /** Aucun repas enregistré ce jour-là. */
  NO_MEALS: 'no_meals',
  /** Énergie ingérée sous le seuil minimal : journée partielle. */
  BELOW_MIN_KCAL: 'below_min_kcal',
  /** Couverture minéralogique insuffisante : journée non fiable. */
  INSUFFICIENT_COVERAGE: 'insufficient_coverage'
});

/**
 * Politique par défaut d'inclusion d'une journée.
 *
 * - `minDayKcal: 800` : en dessous, la journée est manifestement partielle
 *   (le petit-déjeuner seul du 28/10 pesait 426 kcal) et son PRAL n'est
 *   pas représentatif d'une journée complète.
 * - `minDayCoverage: 0.9` : la proportion de nutriments PRAL effectivement
 *   documentés doit être élevée. Une journée dont la minéralogie est
 *   majoritairement devinée n'est pas une journée exploitable.
 */
export const DEFAULT_DAY_POLICY = Object.freeze({
  minDayKcal: 800,
  minDayCoverage: 0.9
});

/**
 * Normalise une politique de période et complète les valeurs par défaut.
 * @param {object} [policy]
 */
export function resolveDayPolicy(policy = {}) {
  return Object.freeze({
    minDayKcal: Number.isFinite(policy.minDayKcal)
      ? policy.minDayKcal
      : DEFAULT_DAY_POLICY.minDayKcal,
    minDayCoverage: Number.isFinite(policy.minDayCoverage)
      ? policy.minDayCoverage
      : DEFAULT_DAY_POLICY.minDayCoverage
  });
}

/**
 * Évalue l'inclusion d'une journée dans la période.
 *
 * @param {object} day  { date, kcal, coverage, hasMeals }
 * @param {object} [policy]
 * @returns {object} { included, reason, detail }
 */
export function evaluateDay(day, policy = {}) {
  const p = resolveDayPolicy(policy);
  const kcal = Number.isFinite(day?.kcal) ? day.kcal : 0;
  const coverage = Number.isFinite(day?.coverage) ? day.coverage : 0;
  const hasMeals = day?.hasMeals ?? kcal > 0;

  if (!hasMeals) {
    return {
      included: false,
      reason: DAY_EXCLUSION_REASONS.NO_MEALS,
      detail: 'Aucun repas enregistré ce jour.'
    };
  }

  if (kcal < p.minDayKcal) {
    return {
      included: false,
      reason: DAY_EXCLUSION_REASONS.BELOW_MIN_KCAL,
      detail: `Journée partielle : ${Math.round(kcal)} kcal ingérées < ${p.minDayKcal} kcal requises.`
    };
  }

  if (coverage < p.minDayCoverage) {
    return {
      included: false,
      reason: DAY_EXCLUSION_REASONS.INSUFFICIENT_COVERAGE,
      detail:
        `Couverture minéralogique insuffisante : ${(coverage * 100).toFixed(1)} % < ` +
        `${(p.minDayCoverage * 100).toFixed(0)} % requises.`
    };
  }

  return { included: true, reason: null, detail: null };
}

/**
 * Agrège les journées évaluées en une période.
 *
 * Le score de période est la moyenne des scores des journées VALIDES.
 * Les bornes [low, high] sont propagées de la même façon, en n'incluant
 * que les journées valides : l'intervalle publié décrit donc l'incertitude
 * des journées qui entrent effectivement dans la moyenne.
 *
 * @param {Array<object>} days     journées déjà évaluées { date, score, low, high, included, reason, ... }
 * @param {object} [options]
 * @param {number} [options.minDays]  nombre minimal de journées valides (défaut : 1)
 * @returns {object} {
 *   score, low, high, unit, validDays, excludedDays, days[], isReliable, reason
 * }
 */
export function buildPeriod(days = [], options = {}) {
  const { minDays = 1 } = options;
  const list = Array.isArray(days) ? days : [];

  const valid = list.filter((d) => d?.included && Number.isFinite(d?.score));
  const excluded = list.filter((d) => !d?.included);

  const score =
    valid.length > 0 ? valid.reduce((acc, d) => acc + d.score, 0) / valid.length : null;

  const withLow = valid.filter((d) => Number.isFinite(d?.low));
  const withHigh = valid.filter((d) => Number.isFinite(d?.high));
  const low =
    withLow.length > 0 ? withLow.reduce((acc, d) => acc + d.low, 0) / withLow.length : null;
  const high =
    withHigh.length > 0 ? withHigh.reduce((acc, d) => acc + d.high, 0) / withHigh.length : null;

  let reason = null;
  if (valid.length < minDays) {
    reason =
      valid.length === 0
        ? 'Aucune journée valide dans la période.'
        : `Seulement ${valid.length} journée(s) valide(s) sur la période (minimum ${minDays}).`;
  }

  return {
    score,
    low: low === null ? null : Math.min(low, high ?? low),
    high: high === null ? null : Math.max(high, low ?? high),
    unit: 'mEq/jour',
    validDays: valid.length,
    excludedDays: excluded.length,
    days: list,
    isReliable: reason === null,
    reason
  };
}

/**
 * Regroupe les exclusions par motif (pour l'affichage et les tests).
 * @param {Array<object>|object} period  résultat de buildPeriod
 */
export function summarizeExclusions(period) {
  const days = Array.isArray(period) ? period : period?.days ?? [];
  const counts = {};
  for (const day of days) {
    if (day?.included) continue;
    const reason = day?.reason ?? 'unknown';
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}
