/**
 * Point d'entrée public du domaine PRAL.
 *
 * Le domaine est pur : aucune dépendance à SQLite, à Express ou au format
 * de réponse HTTP. Il est donc testable isolement et réutilisable.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 *
 *   constants.js  : coefficients, unités, clés, sources scientifiques.
 *   formula.js    : calcul (pointuel strict/partial + agrégats bornés).
 *   quality.js    : résolution par provenance, couverture, bornes.
 *   thresholds.js : politique clinique (bandes, statuts, vocabulaire).
 *   period.js     : journées valides, dénominateur, exclusions motivées.
 *
 *   pralQueries.js (services/) : frontière SQL, NULL-aware.
 *   pralService.js (services/) : orchestrateur.
 */

export {
  COEFFICIENTS_EXACT,
  COEFFICIENTS_ROUNDED,
  COEFFICIENT_SETS,
  DEFAULT_COEFFICIENT_SET,
  PRAL_MINERAL_KEYS,
  PRAL_NUTRIENTS,
  PRAL_NUTRIENT_KEYS,
  PRAL_NUTRIENT_UNITS,
  PRAL_RATIO_ID,
  PRAL_UNIT,
  MINERAL_EQUIVALENT_WEIGHTS,
  mineralMgToMeq,
  resolveCoefficientSet
} from './constants.js';

export {
  CALC_MODE_PARTIAL,
  CALC_MODE_STRICT,
  PralDataError,
  aggregatePral,
  computePral,
  computePralFromAggregates,
  computePralPartial,
  roundPral,
  sumByNutrient
} from './formula.js';

export {
  DEFAULT_DAY_POLICY,
  DAY_EXCLUSION_REASONS,
  buildPeriod,
  evaluateDay,
  resolveDayPolicy,
  summarizeExclusions
} from './period.js';

export {
  PRAL_BANDS,
  PRAL_EXPLANATION,
  PRAL_REFERENCE_MEDIAN,
  PRAL_REFERENCE_RANGE,
  PRAL_RENAL_EXCRETION_CAPACITY,
  PRAL_STATUS,
  PRAL_TARGET_LABEL,
  classifyPral,
  evaluatePral,
  validateBands
} from './thresholds.js';

export {
  DEFAULT_MIN_POOL_SIZE,
  LINE_ORIGIN,
  MINERAL_KEYS,
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
} from './quality.js';
