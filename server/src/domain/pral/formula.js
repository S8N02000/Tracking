/**
 * PRAL — calcul de la charge acide-alcaline alimentaire.
 *
 * Module pur et déterministe : aucune dépendance I/O, aucune dépendance à
 * SQLite, au format HTTP ou au framework front. La seule entrée est un
 * objet de nutriments ; la seule sortie est un objet de résultat.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX FORMES DE CALCUL
 *
 *  - `computePral(nutrients)` : calcul ponctuel sur des VALEURS.
 *    Deux modes :
 *      · `strict` (défaut) : refuse de calculer si un nutriment PRAL est
 *        absent ou non fini. C'est le comportement sûr : mieux vaut une
 *        erreur explicite qu'un score calculé sur des zéros inventés.
 *      · `partial` : calcule avec les nutriments disponibles et expose dans
 *        `omitted` la liste de ce qui manque. Le score n'est alors PAS un
 *        score PRAL complet : c'est une borne partielle, et l'appelant doit
 *        le traiter comme tel.
 *
 *  - `computePralFromAggregates(aggregates)` : calcul sur des AGRÉGATS
 *    journaliers, où chaque nutriment porte trois masses :
 *      · `resolved`  : masse observée ou curatée (sûre).
 *      · `boundedLow` / `boundedHigh` : masse d'un nutriment encadré par
 *        une fourchette documentée (donneur de catégorie).
 *      · `unresolvedMass` : masse non documentée, EXCLUE du calcul.
 *    La formule étant linéaire, l'agrégation se fait d'abord par nutriment,
 *    ensuite seulement le score est calculé. C'est ce qui rend possible
 *    d'exposer un SCORE ET UN INTERVALLE en même temps, sans jamais
 *    transformer une absence en zéro.
 */

import {
  COEFFICIENT_SETS,
  DEFAULT_COEFFICIENT_SET,
  PRAL_NUTRIENTS,
  PRAL_NUTRIENT_KEYS,
  PRAL_UNIT,
  resolveCoefficientSet
} from './constants.js';

/** Mode de calcul : refuse les données absentes. */
export const CALC_MODE_STRICT = 'strict';
/** Mode de calcul : calcule sur les nutriments présents et liste les absents. */
export const CALC_MODE_PARTIAL = 'partial';

/**
 * Erreur levée en mode strict lorsqu'une donnée PRAL est absente.
 * Porte la liste des nutriments manquants pour permettre un diagnostic
 * actionnable (quels champs importer ?).
 */
export class PralDataError extends Error {
  constructor(missing, context = {}) {
    const list = Array.isArray(missing) ? missing : [missing];
    super(
      `Données PRAL incomplètes : ${list.join(', ')} absent(s)${
        context.source ? ` (source : ${context.source})` : ''
      }`
    );
    this.name = 'PralDataError';
    this.code = 'PRAL_INCOMPLETE_DATA';
    this.missing = list;
    this.context = context;
  }
}

/**
 * Normalise une valeur de nutriment : `null`/`undefined`/`NaN`/non fini
 * sont considérés comme ABSENTS (et non comme zéro). C'est la distinction
 * structurante de tout le module : une valeur absente ne doit jamais
 * produire un zéro silencieux.
 */
function isPresent(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalise un zéro négatif (`-0`) en `0`.
 *
 * `-0` apparaît naturellement avec `coefficient * 0` quand le coefficient est
 * négatif (potassium, magnésium, calcium). Il est numériquement égal à `0`
 * mais casse l'égalité stricte (`Object.is(-0, 0) === false`) et se fuite dans
 * les charges utiles JSON sous la forme `-0`.
 */
function normalizeZero(value) {
  return Object.is(value, -0) ? 0 : value;
}

/**
 * Calcule le score PRAL à partir d'un objet de nutriments.
 *
 * @param {object} nutrients  { proteins, phosphorus, potassium, magnesium, calcium }
 *                            Valeurs dans leurs unités canoniques (g, mg, mg, mg, mg).
 * @param {object} [options]
 * @param {string} [options.coefficients]  'exact' | 'rounded' | objet de coefficients
 * @param {string} [options.mode]          'strict' | 'partial'
 * @param {string} [options.source]        étiquette de provenance (pour l'erreur)
 * @returns {object} { score, unit, terms, omitted, complete, coefficients }
 */
export function computePral(nutrients, options = {}) {
  const {
    coefficients = DEFAULT_COEFFICIENT_SET,
    mode = CALC_MODE_STRICT,
    source
  } = options;

  const coeffs = resolveCoefficientSet(coefficients);
  const input = nutrients ?? {};

  const terms = {};
  const omitted = [];

  for (const nutrient of PRAL_NUTRIENTS) {
    const raw = input[nutrient.key];
    if (!isPresent(raw)) {
      omitted.push(nutrient.key);
      continue;
    }
    const coefficient = coeffs[nutrient.coefficientKey];
    if (!Number.isFinite(coefficient)) {
      throw new Error(
        `Coefficient PRAL non fini pour "${nutrient.key}" : ${coefficient}`
      );
    }
    terms[nutrient.key] = {
      value: raw,
      unit: nutrient.unit,
      coefficient,
      contribution: coefficient * raw
    };
  }

  const complete = omitted.length === 0;

  if (!complete && mode === CALC_MODE_STRICT) {
    throw new PralDataError(omitted, { source });
  }

  const score = Object.values(terms).reduce((acc, t) => acc + t.contribution, 0);

  return {
    score,
    unit: PRAL_UNIT,
    terms,
    omitted,
    complete,
    coefficients: coeffs
  };
}

/**
 * Variante tolérante : ne lève jamais, retourne toujours un résultat avec
 * `complete: false` si des nutriments manquent. `omitted` alimente la
 * couche qualité (imputation ou exclusion).
 */
export function computePralPartial(nutrients, options = {}) {
  return computePral(nutrients, { ...options, mode: CALC_MODE_PARTIAL });
}

/**
 * Calcule le PRAL d'une journée à partir d'agrégats PAR NUTRIMENT.
 *
 * Contrat d'entrée, pour chaque nutriment :
 *   {
 *     resolved:             number,  masse documentée (observée ou curatée)
 *     boundedLow:           number,  borne basse de la masse NON documentée
 *                                      mais encadrée (bornes de catégorie)
 *     boundedHigh:          number,  borne haute de cette masse
 *     unresolvedFoodMass:   number,  masse d'aliment (g) dont la teneur en
 *                                      ce nutriment est totalement inconnue
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX FAÇONS DE TRAITER LES MASSES ENCADRÉES
 *
 *  - `boundedMode: 'omit'` (DÉFAUT) : le score ponctuel n'utilise QUE les
 *    masses documentées. Les masses encadrées n'entrent pas dans le point :
 *    aucune valeur n'est substituée à une donnée absente. Elles servent
 *    uniquement à borner le score : `low` et `high`.
 *
 *    La fourchette publiée est une bande d'IGNORANCE : elle contient à la fois
 *    le point (hypothèse « la masse encadrée est absente ») et la vérité
 *    (hypothèse « la masse encadrée vaut son extrémité documentée »). Pour
 *    un minéral à coefficient négatif (K, Mg, Ca), la vérité est toujours
 *    EN DESSOUS du point : la borne basse est donc négative et la borne
 *    haute égale le point. Le point reste toujours dans l'intervalle.
 *
 *  - `boundedMode: 'midpoint'` : variante de SENSIBILITÉ. Le point utilise
 *    le milieu de chaque fourchette encadrée. Ce n'est jamais le défaut :
 *    sur une ligne à fort levier et de catégorie hétérogène, le milieu
 *    d'une fourchette produit une valeur arbitraire (cas mesuré : −138 mEq
 *    sur la fenêtre analysée avec la boisson « Yanga »). Dans ce mode, la
 *    fourchette publiée est la VRAIE plage de la contribution encadrée.
 *
 * La masse totalement inconnue (aucune borne disponible) est EXCLUE du
 * calcul dans les deux modes : elle ne devient jamais un zéro. Elle est
 * reportée dans `unresolvedFoodMass` et dans `unresolvedNutrients`, ce qui
 * permet à la couche période d'exclure ou de signaler la journée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONTRAT DE L'INTERVALLE [low, high]
 *
 * Invariant : `low <= score <= high`. Le score publié est toujours dans son
 * propre intervalle.
 *
 * L'écart de chaque nutrient est l'écart entre la masse ENCADRÉE réelle et la
 * masse retenue dans le point, pondéré par le coefficient :
 *
 *   - mode 'omit' : la masse retenue est 0, donc l'écart est
 *     `c·[bLow, bHigh]`. Pour un coefficient NÉGATIF (K, Mg, Ca), la vérité
 *     est TOUJOURS en dessous du point : la borne haute reste égale au point
 *     et c'est la borne basse qui s'écarte. Le point est donc une borne
 *     SUPÉRIEURE de la vérité, jamais une estimation centrale.
 *   - mode 'midpoint' : la masse retenue est le milieu de la fourchette, donc
 *     l'écart est `c·[bLow − milieu, bHigh − milieu]`, de part et d'autre du
 *     point : l'intervalle est alors la VRAIE plage de la contribution.
 *
 * Dans les deux cas, l'hypothèse « la masse encadrée vaut exactement ce que
 * le point retient » (écart nul) est incluse dans l'intervalle.
 *
 * @param {object} aggregates
 * @param {object} [options]
 * @param {string|object} [options.coefficients]
 * @param {string} [options.boundedMode] 'omit' (défaut) | 'midpoint'
 * @returns {object} {
 *   score, low, high, unit, terms, coefficients,
 *   unresolvedFoodMass, unresolvedNutrients, boundedNutrients, complete
 * }
 */
export function computePralFromAggregates(aggregates, options = {}) {
  const coeffs = resolveCoefficientSet(options.coefficients ?? DEFAULT_COEFFICIENT_SET);
  const boundedMode = options.boundedMode ?? 'omit';
  if (boundedMode !== 'omit' && boundedMode !== 'midpoint') {
    throw new Error(`Mode de bornage PRAL inconnu : "${boundedMode}".`);
  }
  const input = aggregates ?? {};

  const terms = {};
  const unresolvedNutrients = [];
  const boundedNutrients = [];

  let score = 0;
  let low = 0;
  let high = 0;
  let unresolvedFoodMass = 0;
  let complete = true;

  for (const nutrient of PRAL_NUTRIENTS) {
    const key = nutrient.key;
    const agg = input[key] ?? {};
    const coefficient = coeffs[nutrient.coefficientKey];

    if (!Number.isFinite(coefficient)) {
      throw new Error(`Coefficient PRAL non fini pour "${key}" : ${coefficient}`);
    }

    const resolved = isPresent(agg.resolved) ? agg.resolved : 0;
    const bLow = isPresent(agg.boundedLow) ? agg.boundedLow : 0;
    const bHigh = isPresent(agg.boundedHigh) ? agg.boundedHigh : 0;
    const unresolved = isPresent(agg.unresolvedFoodMass) ? agg.unresolvedFoodMass : 0;

    const hasBound = bHigh > 0 || bLow > 0;
    const centre = hasBound ? (bLow + bHigh) / 2 : 0;

    // Masse ENCADRÉE effectivement retenue dans le point :
    //   - 'omit'     : 0. Aucune valeur n'est substituée à une donnée absente.
    //   - 'midpoint' : le milieu de la fourchette (variante de sensibilité).
    const usedBounded = boundedMode === 'midpoint' ? centre : 0;

    // Point : masses documentées seules (mode 'omit') ou masses documentées
    // plus le milieu des masses encadrées (mode 'midpoint').
    const amount = resolved + usedBounded;
    const contribution = normalizeZero(coefficient * amount);

    // Bornes : la masse ENCADRÉE est inconnue, sa contribution au score est
    // donc un intervalle et non une valeur. Le coefficient peut être négatif
    // (K, Mg, Ca : minéraux alcalinisants) : l'écart peut être unilatéral.
    //
    // L'écart est calculé RELATIVEMENT à la masse réellement retenue dans le
    // point : [c·(bLow − usedBounded), c·(bHigh − usedBounded)]. On y joint
    // l'hypothèse du point lui-même (écart nul), afin que le score publié
    // soit TOUJOURS à l'intérieur de son propre intervalle : un intervalle
    // qui n'englobe pas le score publié est ininterpretable.
    const deviations = hasBound
      ? [coefficient * (bLow - usedBounded), coefficient * (bHigh - usedBounded)]
      : [];
    const termLow = normalizeZero(
      contribution + (deviations.length ? Math.min(0, ...deviations) : 0)
    );
    const termHigh = normalizeZero(
      contribution + (deviations.length ? Math.max(0, ...deviations) : 0)
    );

    terms[key] = {
      unit: nutrient.unit,
      coefficient,
      resolved,
      boundedLow: bLow,
      boundedHigh: bHigh,
      unresolvedFoodMass: unresolved,
      amount,
      contribution,
      contributionLow: termLow,
      contributionHigh: termHigh
    };

    score += contribution;
    low += termLow;
    high += termHigh;
    unresolvedFoodMass += unresolved;

    if (unresolved > 0) {
      unresolvedNutrients.push(key);
      complete = false;
    }
    if (hasBound) boundedNutrients.push(key);
  }

  return {
    score: normalizeZero(score),
    low: normalizeZero(Math.min(low, high)),
    high: normalizeZero(Math.max(low, high)),
    unit: PRAL_UNIT,
    terms,
    coefficients: coeffs,
    boundedMode,
    unresolvedFoodMass,
    unresolvedNutrients,
    boundedNutrients,
    complete
  };
}

/**
 * Agrège plusieurs résultats partiels en un résultat de période.
 *
 * @param {Array<object>} results  résultats de computePralPartial
 * @returns {object} { score, unit, complete, omitted, contributions }
 */
export function aggregatePral(results) {
  const list = Array.isArray(results) ? results : [];
  const contributions = [];
  let score = 0;
  let complete = true;
  const omitted = new Set();

  for (const result of list) {
    if (!result) continue;
    score += Number.isFinite(result.score) ? result.score : 0;
    if (!result.complete) {
      complete = false;
      for (const key of result.omitted ?? []) omitted.add(key);
    }
    contributions.push(result);
  }

  return {
    score,
    unit: PRAL_UNIT,
    complete,
    omitted: [...omitted],
    contributions
  };
}

/**
 * Ajoute les contributions de plusieurs résultats partiels en ne retenant,
 * pour chaque nutriment, que les lignes où il est présent.
 *
 * Cette vue est utilisée par la couche qualité pour isoler le PRAL
 * « mesuré » (uniquement des données réellement présentes) du PRAL
 * « imputé ». Elle ne doit pas être utilisée comme score final.
 */
export function sumByNutrient(results) {
  const out = Object.fromEntries(PRAL_NUTRIENT_KEYS.map((k) => [k, 0]));
  for (const result of results ?? []) {
    if (!result?.terms) continue;
    for (const [key, term] of Object.entries(result.terms)) {
      if (key in out) out[key] += term.contribution;
    }
  }
  return out;
}

/** Arrondi canonique du score PRAL (une décimale). */
export function roundPral(value, decimals = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export { COEFFICIENT_SETS, PRAL_NUTRIENT_KEYS, PRAL_UNIT };
