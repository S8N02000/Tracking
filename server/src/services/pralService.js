/**
 * PRAL — service orchestrateur.
 *
 * Rôle : chaîner la frontière SQL, le domaine pur et la politique clinique,
 * sans contenir aucune règle métier propre. Ce module ne contient QUE de
 * l'orchestration : il ne décide ni de la formule, ni des seuils, ni de la
 * qualité des données (tout cela vit dans `src/domain/pral`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * FLUX
 *
 *   1. SQL      : lignes de repas NULL-aware  + donneurs curatés
 *                 + pool de sources fiables + énergie journalière.
 *   2. DOMAINE  : résolution ligne par ligne (provenance), bornes de
 *                 catégorie, couverture pondérée par la masse.
 *   3. DOMAINE  : agrégation journalière des masses par nutriment.
 *   4. DOMAINE  : calcul PRAL du jour (point + intervalle).
 *   5. DOMAINE  : politique de journée (kcal, couverture) puis de période.
 *   6. DOMAINE  : politique clinique (bandes, statut, vocabulaire).
 *
 * Le même DTO alimente le ratio historique `indice_pral` (contrat
 * `ratios` de /api/analytics/diagnostics) et l'endpoint dédié
 * /api/analytics/pral : il n'y a donc qu'une seule implémentation.
 */

import {
  DEFAULT_COEFFICIENT_SET,
  PRAL_RATIO_ID,
  PRAL_UNIT,
  STRATEGY,
  buildCategoryBounds,
  buildResolutionContext,
  computeCoverage,
  computePralFromAggregates,
  evaluatePral,
  evaluateDay,
  buildPeriod,
  PRAL_BANDS,
  PRAL_EXPLANATION,
  PRAL_TARGET_LABEL,
  roundPral,
  summarizeExclusions,
  toAbsoluteBounds,
  toAbsoluteComposition,
  resolveLine
} from '../domain/pral/index.js';

import {
  getPralCategoryPool,
  getPralDailyKcal,
  getPralLines,
  getPralReferenceDonors
} from './pralQueries.js';

/** Modes de traitement des masses non documentées (cf. formula.js). */
export const BOUNDED_MODES = Object.freeze({
  /** Défaut : le point n'utilise que les masses documentées. */
  OMIT: 'omit',
  /** Sensibilité : le point utilise le milieu des fourchettes encadrées. */
  MIDPOINT: 'midpoint'
});

/**
 * Agrège les lignes résolues d'une journée en masses par nutriment.
 *
 * Pour chaque nutriment :
 *   - `resolved`           : somme des masses documentées (observées,
 *                            donateur curaté ou zéro déclaré) ;
 *   - `boundedLow/High`    : somme des bornes des lignes encadrées mais non
 *                            documentées ;
 *   - `unresolvedFoodMass` : masse d'aliment dont la teneur est totalement
 *                            inconnue (aucune borne disponible).
 *
 * @param {Array<object>} resolvedLines
 * @returns {object} agrégats par nutriment
 */
export function aggregateResolvedLines(resolvedLines) {
  const aggregates = {};
  for (const key of Object.keys(resolvedLines[0]?.nutrients ?? {})) {
    aggregates[key] = { resolved: 0, boundedLow: 0, boundedHigh: 0, unresolvedFoodMass: 0 };
  }

  for (const line of resolvedLines) {
    const absolute = toAbsoluteComposition(line);
    const bounds = toAbsoluteBounds(line);

    for (const key of Object.keys(aggregates)) {
      const value = absolute?.[key];
      if (value !== null && value !== undefined && Number.isFinite(value)) {
        aggregates[key].resolved += value;
        continue;
      }
      const bracket = bounds?.[key];
      if (bracket) {
        aggregates[key].boundedLow += bracket.low;
        aggregates[key].boundedHigh += bracket.high;
      } else {
        aggregates[key].unresolvedFoodMass += Number.isFinite(line.grams) ? line.grams : 0;
      }
    }
  }

  return aggregates;
}

/**
 * Construit le rapport PRAL complet sur une fenêtre.
 *
 * @param {string} startDateStr  YYYY-MM-DD
 * @param {string} endDateStr    YYYY-MM-DD
 * @param {object} [customDb]
 * @param {object} [options]
 * @param {string} [options.strategy]       stratégie qualité (défaut : imputed)
 * @param {string} [options.coefficients]    jeu de coefficients (défaut : exact)
 * @param {string} [options.boundedMode]     'omit' | 'midpoint'
 * @param {object} [options.dayPolicy]       politique de journée
 * @param {number} [options.minPoolSize]     taille mini du pool de bornes
 * @param {Array}  [options.bands]           bandes cliniques personnalisées
 * @returns {object} rapport complet
 */
export function getPralReport(startDateStr, endDateStr, customDb = null, options = {}) {
  const {
    strategy = STRATEGY.IMPUTED,
    coefficients = DEFAULT_COEFFICIENT_SET,
    boundedMode = BOUNDED_MODES.OMIT,
    dayPolicy = {},
    minPoolSize,
    bands = PRAL_BANDS
  } = options;

  // ── 1. SQL ─────────────────────────────────────────────────────────────
  const rawLines = getPralLines(startDateStr, endDateStr, customDb);
  const { donors, zeroDeclared } = getPralReferenceDonors(customDb);
  const pool = getPralCategoryPool(customDb);
  const dailyKcal = getPralDailyKcal(startDateStr, endDateStr, customDb);

  // ── 2. QUALITÉ (domaine) ──────────────────────────────────────────────
  const bounds = buildCategoryBounds(pool, { minPoolSize });
  const context = buildResolutionContext({
    // `donors` est indexé par food_id : un aliment peut porter plusieurs
    // curations (fenêtres de validité distinctes), d'où l'aplatissement
    // avant de construire le contexte.
    donors: [...donors.values()].flat(),
    zeroDeclared: [...zeroDeclared],
    bounds,
    strategy,
    minPoolSize
  });

  const resolvedLines = rawLines.map((line) => resolveLine(line, context));

  // ── 3. AGRÉGATION JOURNALIÈRE (domaine) ───────────────────────────────
  const linesByDate = new Map();
  for (const line of resolvedLines) {
    const date = line.date;
    if (!date) continue;
    if (!linesByDate.has(date)) linesByDate.set(date, []);
    linesByDate.get(date).push(line);
  }

  const days = [];
  for (const [date, dayLines] of [...linesByDate.entries()].sort()) {
    const coverage = computeCoverage(dayLines, { strategy });
    const aggregates = aggregateResolvedLines(dayLines);
    const pral = computePralFromAggregates(aggregates, { coefficients, boundedMode });

    const kcalInfo = dailyKcal.get(date);
    const kcal = kcalInfo?.kcal ?? 0;

    const evaluation = evaluateDay(
      { date, kcal, coverage: coverage.coverage, hasMeals: dayLines.length > 0 },
      dayPolicy
    );

    days.push({
      date,
      kcal: Math.round(kcal),
      coverage: coverage.coverage,
      directCoverage: coverage.directCoverage,
      unresolvedLines: coverage.unresolvedLines,
      resolvedLines: coverage.resolvedLines,
      resolutionCounts: coverage.resolutionCounts,
      score: pral.score,
      low: pral.low,
      high: pral.high,
      boundedNutrients: pral.boundedNutrients,
      unresolvedNutrients: pral.unresolvedNutrients,
      terms: pral.terms,
      included: evaluation.included,
      reason: evaluation.reason,
      detail: evaluation.detail,
      lineCount: dayLines.length
    });
  }

  // ── 4. PÉRIODE (domaine) ──────────────────────────────────────────────
  const period = buildPeriod(days);
  const exclusions = summarizeExclusions(period);

  // ── 5. POLITIQUE CLINIQUE (domaine) ───────────────────────────────────
  const clinical =
    period.score === null
      ? {
          status: 'ATTENTION',
          band: null,
          bandId: null,
          label: 'Données insuffisantes',
          interpretation:
            'Aucune journée validable sur la période : le PRAL ne peut pas être établi.',
          isProblem: false
        }
      : evaluatePral(period.score, { bands });

  const totalUnresolved = days.reduce((acc, d) => acc + (d.unresolvedLines ?? 0), 0);

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    strategy,
    coefficients,
    boundedMode,
    unit: PRAL_UNIT,
    period: {
      score: period.score,
      low: period.low,
      high: period.high,
      unit: period.unit,
      validDays: period.validDays,
      excludedDays: period.excludedDays,
      isReliable: period.isReliable,
      reason: period.reason
    },
    days,
    exclusions,
    clinical,
    quality: {
      strategy,
      minPoolSize: context.minPoolSize,
      donorCount: donors.size,
      zeroDeclaredCount: zeroDeclared.size,
      boundedCategories: bounds.size,
      totalUnresolvedLines: totalUnresolved,
      referencePoolSize: pool.length
    },
    donors: [...donors.values()]
      .flat()
      .map((d) => ({
        foodId: d.foodId,
        referenceId: d.referenceId,
        referenceName: d.name,
        referenceSource: d.source,
        note: d.note,
        validFrom: d.validFrom ?? null,
        validTo: d.validTo ?? null
      })),
    zeroDeclared: [...zeroDeclared]
  };
}

/**
 * Construit le ratio PRAL pour le contrat `ratios` de
 * /api/analytics/diagnostics. Le `id` reste `indice_pral` : compatibilité
 * API et frontend préservée.
 *
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @param {object} [customDb]
 * @param {object} [options]  mêmes options que getPralReport
 * @returns {object} ratio
 */
export function getPralRatio(startDateStr, endDateStr, customDb = null, options = {}) {
  const report = getPralReport(startDateStr, endDateStr, customDb, options);
  const { period, clinical } = report;

  const hasScore = period.score !== null && Number.isFinite(period.score);
  const value = hasScore ? roundPral(period.score, 1) : null;

  const reliabilityNote = hasScore
    ? ''
    : ' Données insuffisantes sur la période (aucune journée validable) : score non établi.';

  const intervalNote =
    hasScore && Number.isFinite(period.low) && Number.isFinite(period.high)
      ? ` Intervalle d'incertitude : ${roundPral(period.low, 1)} à ${roundPral(period.high, 1)} mEq/jour.`
      : '';

  const daysNote = ` Période retenue : ${period.validDays} journée(s) valide(s), ` +
    `${period.excludedDays} exclue(s) (couverture ou apport incomplet).`;

  return {
    id: PRAL_RATIO_ID,
    label: 'Indice PRAL (Charge Acide)',
    value,
    unit: 'mEq / jour',
    target_label: PRAL_TARGET_LABEL,
    status: hasScore ? clinical.status : 'ATTENTION',
    is_problem: hasScore ? clinical.isProblem : false,
    explanation: PRAL_EXPLANATION + intervalNote + daysNote + reliabilityNote,
    band: clinical.band,
    band_label: clinical.label,
    interpretation: clinical.interpretation,
    low: period.low === null ? null : roundPral(period.low, 1),
    high: period.high === null ? null : roundPral(period.high, 1),
    valid_days: period.validDays,
    excluded_days: period.excludedDays
  };
}
