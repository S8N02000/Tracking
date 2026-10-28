/**
 * PRAL — couche qualité des données.
 *
 * Module pur. Aucun accès base de données ici : la couche qualité reçoit
 * des LIGNES et des POLITIQUES, et retourne des valeurs résolues avec
 * leur PROVENANCE. La couche SQL (pralQueries.js) fournit les matières
 * premières ; cette couche décide de ce qu'on peut affirmer.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE PROBLÈME CONCRET
 *
 * Dans la base, environ 30 % des aliments n'ont pas de composition
 * minéralogique complète. Ces `NULL` ont deux causes TRÈS différentes :
 *
 *  1. Données non documentées (ligne de baguette, jambon) : le `NULL`
 *     masque une valeur réelle et non nulle.
 *  2. Absence PHYSIQUE de minéraux (eau, sel, huile, fécule) : le `NULL`
 *     est la valeur correcte, Ciqual ne documentant pas des minéraux
 *     qu'il n'y a pas.
 *
 * Traiter les deux identiquement est un bug : convertir un `NULL` en 0
 * sur l'eau est sans conséquence, mais convertir le `NULL` de la baguette
 * en 0 supprime des apports en phosphore, potassium, calcium et magnésium
 * — c'est-à-dire la charge ALCALINE qui compense la charge acide des
 * protéines.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ORDRE DE RÉSOLUTION (stratégie `imputed`, défaut)
 *
 *  1. `direct`        : la valeur est dans la base.
 *  2. `donor`         : une référence curatée (`food_nutrient_references`,
 *                       mode `donor`) déclare un aliment de référence
 *                       dont la composition minérale est transposée sur
 *                       l'aliment source, POUR 100 g. Provenance explicite :
 *                       identifiant, nom, source et note du donneur.
 *  3. `declared_zero` : l'aliment est déclaré dépourvu de minéraux
 *                       (eau, sel, huile, fécule). Provenance explicite.
 *  4. `unresolved`    : rien de fiable. La valeur reste ABSENTE.
 *
 * À AUCUN moment une valeur absente n'est remplacée par 0, et AUCUNE
 * imputation automatique n'est produite : il n'existe pas de « médiane de
 * catégorie » comme source de substitution (cf. contre-exemple Yanga
 * ci-dessous). Le fallback d'un nutriment non résolu est un INTERVALLE
 * documenté, pas une valeur ponctuelle.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI PAS DE MÉDIANE DE CATÉGORIE
 *
 * Contre-exemple mesuré : l'aliment « Yanga » (boisson, 13,5 kg consommés
 * depuis août 2026) ne dispose d'aucune valeur minérale documentée. Une
 * imputation par médiane de catégorie « boisson » produit environ
 * −138 mEq sur la fenêtre analysée : une valeur absurde, obtenue en
 * appliquant à une boisson des teneurs minérales d'une autre catégorie.
 * Le même mécanisme est faux pour la baguette : la médiane de sa
 * catégorie ne décrit pas sa minéralisation.
 *
 * La règle retenue : quand une valeur n'est pas documentée, on ne
 * FABRIQUE PAS de nombre. On signale l'incertitude par un intervalle
 * borné par les valeurs observées dans la catégorie (bornes basses et
 * hautes, jamais un point médian), et la ligne est marquée comme non
 * résolue. Le score publié est alors :
 *   - un point de calcul sur les seules valeurs RÉSOLUES ;
 *   - un intervalle [low, high] tenant compte des lignes non résolues ;
 *   - une couverture explicite de la masse documentée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * STRATÉGIES
 *
 *  - `imputed`       : défaut. Résolution direct → donneur → zéro déclaré.
 *                      Les nutriments non résolus restent absents et
 *                      alimentent l'intervalle d'incertitude.
 *  - `complete_case` : ÉTUDE DE SENSIBILITÉ UNIQUEMENT. Une ligne dont un
 *                      seul nutriment manque est retirée de l'agrégat.
 *                      Biais connu : sur la fenêtre réelle, cette stratégie
 *                      retirait 10,4 mEq/j de charge acide et sous-estimait
 *                      le PRAL.
 *  - `zero`          : COMPARAISON HISTORIQUE UNIQUEMENT. Reproduit le
 *                      comportement `NULL → 0` de l'ancienne application.
 */

import { PRAL_NUTRIENT_KEYS } from './constants.js';

/** Provenances possibles d'une valeur résolue. */
export const RESOLUTION = Object.freeze({
  /** Valeur observée dans la base. */
  DIRECT: 'direct',
  /** Valeur transposée d'un donneur curaté (mode `donor`). */
  DONOR: 'donor',
  /** Absence physique documentée (mode `zero` de la table de références). */
  DECLARED_ZERO: 'declared_zero',
  /** Zéro analytique : stratégie de comparaison historique uniquement. */
  ZERO_FILLED: 'zero_filled',
  /** Non résolu : la valeur reste absente. */
  UNRESOLVED: 'unresolved'
});

/** Stratégies de traitement des données absentes. */
export const STRATEGY = Object.freeze({
  /** Défaut : valeurs directes, donneurs curatés, zéros déclarés. */
  IMPUTED: 'imputed',
  /** Étude de sensibilité uniquement : lignes incomplètes retirées. */
  COMPLETE_CASE: 'complete_case',
  /** Comparaison historique uniquement : `NULL → 0`. */
  ZERO: 'zero'
});

/** Nutriments minéraux (les quatre contributeurs non protéiques). */
export const MINERAL_KEYS = Object.freeze([
  'phosphorus',
  'potassium',
  'magnesium',
  'calcium'
]);

/**
 * Origine d'une ligne de repas.
 *  - `food`             : aliment direct dans `meal_log`.
 *  - `recipe_ingredient`: ingrédient d'une recette décomposée.
 *  - `recipe_stored`    : recette sans table d'ingrédients, utilisée via
 *                         ses totaux stockés (provenance dégradée).
 */
export const LINE_ORIGIN = Object.freeze({
  FOOD: 'food',
  RECIPE_INGREDIENT: 'recipe_ingredient',
  RECIPE_STORED: 'recipe_stored'
});

/**
 * Taille minimale du pool de référence requis pour BORNER un nutriment
 * non résolu. En dessous, aucune borne n'est produite : le nutriment reste
 * franchement non résolu et pèse sur la couverture de la journée.
 */
export const DEFAULT_MIN_POOL_SIZE = 5;

/** Normalise une valeur : absent si non fini. */
function isPresent(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Cherche une valeur dans un objet de composition, par clé.
 * Accepte les conventions de nommage `per100g` et `absolute`.
 */
function pickValue(composition, key) {
  if (!composition) return null;
  if (isPresent(composition[key])) return composition[key];
  const per100g = composition.per100g?.[key];
  if (isPresent(per100g)) return per100g;
  const absolute = composition.absolute?.[key];
  if (isPresent(absolute)) return absolute;
  return null;
}

/**
 * Met à l'échelle une valeur par 100 g vers une masse absolue.
 * @param {number|null} per100g
 * @param {number} grams
 */
function scaleToMass(per100g, grams) {
  if (!isPresent(per100g) || !isPresent(grams)) return null;
  return (per100g / 100) * grams;
}

/**
 * Indique si une curation est applicable à une date donnée.
 *
 * Fenêtre de validité semi-ouverte : [valid_from, valid_to].
 * Une borne vide (NULL ou '') signifie « pas de borne ».
 *
 * @param {object} curation { validFrom, validTo }
 * @param {string} [date]   date de la ligne ('YYYY-MM-DD')
 * @returns {boolean}
 */
export function isCurationValidAt(curation, date) {
  if (!curation) return false;
  if (!date) return true; // pas de date exploitable : on ne bloque pas

  const from = curation.validFrom || null;
  const to = curation.validTo || null;

  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

/**
 * Résout la valeur d'un nutriment pour une ligne.
 *
 * @param {object} line        { foodId, category, grams, composition, date }
 * @param {string} key         clé du nutriment
 * @param {object} context     { donors, zeroDeclared, strategy }
 * @returns {object} { value, resolution, provenance }
 */
export function resolveNutrient(line, key, context = {}) {
  const {
    donors = new Map(),
    zeroDeclared = new Set(),
    strategy = STRATEGY.IMPUTED
  } = context;

  const direct = pickValue(line?.composition, key);

  if (isPresent(direct)) {
    return { value: direct, resolution: RESOLUTION.DIRECT, provenance: null };
  }

  if (strategy === STRATEGY.COMPLETE_CASE) {
    return { value: null, resolution: RESOLUTION.UNRESOLVED, provenance: null };
  }

  if (strategy === STRATEGY.ZERO) {
    return {
      value: 0,
      resolution: RESOLUTION.ZERO_FILLED,
      provenance: {
        note: 'Valeur absente remplacée par 0 (stratégie de comparaison historique, jamais un défaut).'
      }
    };
  }

  // -- Stratégie IMPUTED --------------------------------------------------

  // 2. Donneur curaté — applicable à la date de la ligne uniquement.
  const donorList = line?.foodId != null ? donors.get(line.foodId) : null;
  const candidates = Array.isArray(donorList) ? donorList : donorList ? [donorList] : [];
  const donor = candidates.find((candidate) => isCurationValidAt(candidate, line?.date)) ?? null;
  if (donor) {
    const donorValue = pickValue(donor.composition, key);
    if (isPresent(donorValue)) {
      return {
        value: donorValue,
        resolution: RESOLUTION.DONOR,
        provenance: {
          referenceId: donor.referenceId ?? null,
          referenceName: donor.name ?? null,
          referenceSource: donor.source ?? null,
          referenceCategory: donor.category ?? null,
          note: donor.note ?? null,
          validFrom: donor.validFrom ?? null,
          validTo: donor.validTo ?? null,
          transfer: 'Composition minérale du donneur, exprimée pour 100 g de l’aliment source.'
        }
      };
    }
  }

  // 3. Zéro déclaré (minéraux absents par nature)
  if (line?.foodId != null && zeroDeclared.has(line.foodId)) {
    return {
      value: 0,
      resolution: RESOLUTION.DECLARED_ZERO,
      provenance: {
        note: 'Aliment déclaré dépourvu de minéraux (référence curatée, mode `zero`).'
      }
    };
  }

  // 4. Non résolu — aucune imputation automatique
  return { value: null, resolution: RESOLUTION.UNRESOLVED, provenance: null };
}

/**
 * Calcule les BORNES d'un nutriment non résolu, à partir des valeurs
 * observées dans la catégorie (pool de sources fiables uniquement).
 *
 * Le résultat est un INTERVALLE [min, max], jamais un point médian : il
 * documente l'amplitude de l'incertitude sans fabriquer de valeur.
 *
 * @param {object} line
 * @param {string} key
 * @param {object} context  { bounds, minPoolSize }
 * @returns {object|null} { low, high, count, sources, category } ou null
 */
export function resolveBounds(line, key, context = {}) {
  const { bounds = new Map(), minPoolSize = DEFAULT_MIN_POOL_SIZE } = context;

  if (!line?.category) return null;
  const pool = bounds.get(line.category);
  if (!pool) return null;

  const stat = pool.perNutrient?.[key];
  if (!stat) return null;
  if (!Number.isFinite(stat.min) || !Number.isFinite(stat.max)) return null;
  if (stat.count < minPoolSize) return null;

  const grams = line?.grams;
  if (!isPresent(grams)) return null;

  return {
    low: (stat.min / 100) * grams,
    high: (stat.max / 100) * grams,
    per100g: { min: stat.min, max: stat.max },
    count: stat.count,
    sources: stat.sources ?? [],
    category: line.category,
    note:
      `Intervalle borné par les valeurs observées dans la catégorie « ${line.category} » ` +
      `(${stat.count} référence(s) de source fiable). Aucune valeur ponctuelle n’est substituée.`
  };
}

/**
 * Résout tous les nutriments PRAL d'une ligne.
 *
 * @param {object} line
 * @param {object} context  { donors, zeroDeclared, bounds, strategy, minPoolSize }
 * @returns {object} {
 *   lineId, origin, foodId, foodName, category, source, parentName, grams, kcal,
 *   nutrients: { key: { value, resolution, provenance } },
 *   bounds: { key: { low, high, ... } },
 *   missing: [key], bracketed: [key], complete, excluded, exclusionReason
 * }
 */
export function resolveLine(line, context = {}) {
  const strategy = context.strategy ?? STRATEGY.IMPUTED;

  const nutrients = {};
  const bounds = {};
  const missing = [];
  const bracketed = [];

  for (const key of PRAL_NUTRIENT_KEYS) {
    const outcome = resolveNutrient(line, key, context);
    nutrients[key] = outcome;

    if (!isPresent(outcome.value)) {
      missing.push(key);
      if (strategy === STRATEGY.IMPUTED) {
        const bracket = resolveBounds(line, key, context);
        if (bracket) {
          bounds[key] = bracket;
          bracketed.push(key);
        }
      }
    }
  }

  // Stratégie complete_case : une ligne incomplète est retirée en entier.
  const excluded =
    strategy === STRATEGY.COMPLETE_CASE && missing.length > 0;

  return {
    lineId: line?.lineId ?? null,
    date: line?.date ?? null,
    period: line?.period ?? null,
    origin: line?.origin ?? LINE_ORIGIN.FOOD,
    foodId: line?.foodId ?? null,
    foodName: line?.foodName ?? null,
    category: line?.category ?? null,
    source: line?.source ?? null,
    parentName: line?.parentName ?? null,
    grams: isPresent(line?.grams) ? line.grams : null,
    kcal: isPresent(line?.kcal) ? line.kcal : null,
    nutrients,
    bounds,
    missing,
    bracketed,
    complete: missing.length === 0,
    excluded,
    exclusionReason: excluded ? 'incomplete_line' : null
  };
}

/**
 * Construit la composition ABSOLUE d'une ligne résolue (pour la masse
 * réellement ingérée), à partir des valeurs par 100 g résolues.
 *
 * Les lignes `recipe_stored` portent déjà des valeurs absolues (totaux
 * par portion × portions consommées) : elles ne sont pas remises à
 * l'échelle.
 *
 * @param {object} resolvedLine  sortie de resolveLine
 * @returns {object} { key: masse absolue } (null si non résolu)
 */
export function toAbsoluteComposition(resolvedLine) {
  const out = {};
  const grams = resolvedLine?.grams;
  for (const key of PRAL_NUTRIENT_KEYS) {
    const outcome = resolvedLine?.nutrients?.[key];
    if (!outcome || !isPresent(outcome.value)) {
      out[key] = null;
      continue;
    }
    if (resolvedLine.origin === LINE_ORIGIN.RECIPE_STORED) {
      out[key] = outcome.value;
    } else {
      out[key] = scaleToMass(outcome.value, grams);
    }
  }
  return out;
}

/**
 * Bornes absolues d'un nutriment non résolu pour une ligne.
 *
 * @param {object} resolvedLine
 * @returns {object} { key: { low, high } | null }
 */
export function toAbsoluteBounds(resolvedLine) {
  const out = {};
  for (const key of PRAL_NUTRIENT_KEYS) {
    const bracket = resolvedLine?.bounds?.[key];
    out[key] = bracket ? { low: bracket.low, high: bracket.high } : null;
  }
  return out;
}

/**
 * Calcule la couverture d'un ensemble de lignes résolues.
 *
 * La couverture est pondérée par la MASSE consommée : une ligne de 200 g
 * compte davantage qu'une ligne de 3 g. Elle est calculée par nutriment
 * puis moyennée sur les 5 nutriments PRAL.
 *
 * Une valeur « résolue » inclut les donneurs curatés et les zéros
 * déclarés : ce sont des valeurs documentées. `directCoverage` isole la
 * part réellement OBSERVÉE dans la base.
 *
 * @param {Array<object>} resolvedLines
 * @param {object} [options]
 * @param {string} [options.strategy]
 * @returns {object} {
 *   coverage, directCoverage, perNutrient, unresolvedLines, resolvedLines,
 *   resolutionCounts, strategy
 * }
 */
export function computeCoverage(resolvedLines, options = {}) {
  const { strategy = STRATEGY.IMPUTED } = options;
  const lines = Array.isArray(resolvedLines) ? resolvedLines : [];

  const perNutrient = {};
  for (const key of PRAL_NUTRIENT_KEYS) {
    perNutrient[key] = {
      totalMass: 0,
      resolvedMass: 0,
      directMass: 0,
      bracketedMass: 0,
      unresolvedLines: 0
    };
  }

  const resolutionCounts = {
    [RESOLUTION.DIRECT]: 0,
    [RESOLUTION.DONOR]: 0,
    [RESOLUTION.DECLARED_ZERO]: 0,
    [RESOLUTION.ZERO_FILLED]: 0,
    [RESOLUTION.UNRESOLVED]: 0
  };

  let unresolvedLines = 0;
  let resolvedLineCount = 0;

  for (const line of lines) {
    const mass = isPresent(line?.grams) ? line.grams : 0;
    let lineMissing = false;

    for (const key of PRAL_NUTRIENT_KEYS) {
      const bucket = perNutrient[key];
      bucket.totalMass += mass;

      const outcome = line?.nutrients?.[key];
      const resolution = outcome?.resolution ?? RESOLUTION.UNRESOLVED;
      resolutionCounts[resolution] = (resolutionCounts[resolution] ?? 0) + 1;

      if (outcome && isPresent(outcome.value)) {
        bucket.resolvedMass += mass;
        if (resolution === RESOLUTION.DIRECT) bucket.directMass += mass;
      } else {
        bucket.unresolvedLines += 1;
        lineMissing = true;
        if (line?.bounds?.[key]) bucket.bracketedMass += mass;
      }
    }

    if (lineMissing) unresolvedLines += 1;
    else resolvedLineCount += 1;
  }

  const ratios = [];
  const directRatios = [];
  for (const key of PRAL_NUTRIENT_KEYS) {
    const bucket = perNutrient[key];
    ratios.push(bucket.totalMass > 0 ? bucket.resolvedMass / bucket.totalMass : 1);
    directRatios.push(bucket.totalMass > 0 ? bucket.directMass / bucket.totalMass : 1);
  }

  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 1);

  return {
    coverage: mean(ratios),
    directCoverage: mean(directRatios),
    perNutrient,
    unresolvedLines,
    resolvedLines: resolvedLineCount,
    resolutionCounts,
    strategy
  };
}

/**
 * Construit les bornes par catégorie à partir d'un pool de foods fiables.
 *
 * Pour chaque nutriment, on retient le MINIMUM et le MAXIMUM observés
 * (jamais une médiane) ainsi que le nombre de références et leurs
 * sources. Un nutriment observé dans moins de `minPoolSize` références
 * produit des bornes `null` : il reste franchement non résolu.
 *
 * @param {Array<object>} pool         foods fiables { id, category, source, composition }
 * @param {object} [options]
 * @param {number} [options.minPoolSize]
 * @returns {Map<string, object>}
 */
export function buildCategoryBounds(pool = [], options = {}) {
  const { minPoolSize = DEFAULT_MIN_POOL_SIZE } = options;
  const byCategory = new Map();

  for (const food of pool ?? []) {
    const category = food?.category;
    if (!category) continue;
    if (!byCategory.has(category)) {
      byCategory.set(category, { category, perNutrient: {}, count: 0, sources: new Set() });
    }
    const bucket = byCategory.get(category);
    bucket.count += 1;
    if (food?.source) bucket.sources.add(food.source);

    for (const key of PRAL_NUTRIENT_KEYS) {
      const value = pickValue(food?.composition, key);
      if (!isPresent(value)) continue;
      const stat = bucket.perNutrient[key] ?? { min: value, max: value, count: 0, sources: new Set() };
      stat.min = Math.min(stat.min, value);
      stat.max = Math.max(stat.max, value);
      stat.count += 1;
      if (food?.source) stat.sources.add(food.source);
      bucket.perNutrient[key] = stat;
    }
  }

  const result = new Map();
  for (const [category, bucket] of byCategory) {
    const perNutrient = {};
    for (const key of PRAL_NUTRIENT_KEYS) {
      const stat = bucket.perNutrient[key];
      if (!stat || stat.count < minPoolSize) continue;
      perNutrient[key] = {
        min: stat.min,
        max: stat.max,
        count: stat.count,
        sources: [...stat.sources]
      };
    }
    result.set(category, {
      category,
      count: bucket.count,
      sources: [...bucket.sources],
      perNutrient
    });
  }

  return result;
}

/**
 * Propage le contexte de résolution à partir de donneurs, zéros déclarés
 * et bornes par catégorie. Fonction pure : elle ne fait que normaliser
 * les structures reçues (utilisée par les tests et par le service).
 */
export function buildResolutionContext({
  donors = [],
  zeroDeclared = [],
  bounds = new Map(),
  strategy = STRATEGY.IMPUTED,
  minPoolSize = DEFAULT_MIN_POOL_SIZE
} = {}) {
  // Un aliment peut porter PLUSIEURS curations, à des périodes distinctes
  // (fenêtres de validité disjointes). On les range par aliment ; la
  // résolution retient celle qui s'applique à la date de la ligne.
  const donorMap = new Map();
  for (const donor of donors) {
    if (donor?.foodId == null) continue;
    const list = donorMap.get(donor.foodId) ?? [];
    list.push(donor);
    donorMap.set(donor.foodId, list);
  }
  // Tri déterministe : plus restrictive d'abord (valid_from décroissant),
  // puis par identifiant de référence. À valid_from égal, la fenêtre la
  // plus courte (valid_to le plus proche) gagne.
  for (const list of donorMap.values()) {
    list.sort((a, b) => {
      const af = a.validFrom || '';
      const bf = b.validFrom || '';
      if (af !== bf) return bf.localeCompare(af);
      const at = a.validTo || '￿';
      const bt = b.validTo || '￿';
      if (at !== bt) return at.localeCompare(bt);
      return (a.referenceId ?? 0) - (b.referenceId ?? 0);
    });
  }
  return {
    donors: donorMap,
    zeroDeclared: new Set(zeroDeclared),
    bounds,
    strategy,
    minPoolSize
  };
}
