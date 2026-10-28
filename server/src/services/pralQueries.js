/**
 * PRAL — frontière SQL.
 *
 * Ce module est le SEUL endroit qui parle SQL pour le PRAL. Il :
 *   - ne fait AUCUNE imputation ;
 *   - ne fait AUCUN COALESCE sur les 5 nutriments PRAL (un `NULL` reste
 *     un `NULL` jusqu'à la couche qualité) ;
 *   - décompose les recettes par ingrédient quand c'est possible ;
 *   - signale explicitement les recettes non décomposables.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONVENTIONS DE QUANTITÉS
 *   - `foods` stocke des compositions POUR 100 g ;
 *   - `meal_log.quantity_g` est la masse consommée en grammes ;
 *   - `recipes` stocke des nutriments PAR PORTION ;
 *   - `recipe_ingredients.quantity_g` est la masse de l'ingrédient pour la
 *     RECETTE ENTIÈRE (somme = masse totale de la recette).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LES TROIS ORIGINES DE LIGNE
 *   1. `food`             : aliment direct. Composition par 100 g.
 *   2. `recipe_ingredient`: recette décomposée. On expose l'INGRÉDIENT et sa
 *                            masse effective : les `NULL` d'un ingrédient
 *                            restent attachés à cet ingrédient et ne
 *                            contaminent pas les autres.
 *   3. `recipe_stored`    : recette sans table d'ingrédients. On ne peut pas
 *                            décomposer : on utilise ses totaux stockés, qui
 *                            sont des saisies directes (complètes) dans le
 *                            cas de la base vivante. Provenance dégradée,
 *                            explicitement étiquetée.
 */

import { getDatabase } from '../database/db.js';

/**
 * Nombre de portions consommées pour une ligne de recette.
 * Même convention que le reste de l'application (dashboardQueries.js), pour
 * que le PRAL reste cohérent avec les autres macronutriments affichés.
 */
const RECIPE_PORTIONS = `COALESCE(
  CAST(ml.portions_count AS REAL),
  CASE
    WHEN r.total_weight_g > 0 AND r.portions > 0
      THEN ml.quantity_g / (r.total_weight_g / r.portions)
  END
)`;

/**
 * Nutriments PRAL portés par `foods` (composition pour 100 g).
 */
const FOOD_NUTRIENT_COLUMNS = [
  { key: 'proteins', column: 'proteins_g_100g' },
  { key: 'phosphorus', column: 'phosphorus_mg_100g' },
  { key: 'potassium', column: 'potassium_mg_100g' },
  { key: 'magnesium', column: 'magnesium_mg_100g' },
  { key: 'calcium', column: 'calcium_mg_100g' }
];

/**
 * Bases d'unité des valeurs minérales.
 *
 * Une branche du UNION peut porter des valeurs exprimées dans une base
 * différente : la base est transportée par une colonne explicite
 * (`nutrient_basis`) pour que la couche JS n'ait jamais à la deviner.
 */
export const NUTRIENT_BASIS = Object.freeze({
  /** Valeur pour 100 g d'aliment (food, recipe_ingredient). */
  PER_100G: 'per_100g',
  /** Valeur par portion de recette (recipe_stored). */
  PER_PORTION: 'per_portion'
});

/**
 * Nutriments PRAL portés par `recipes` (totaux PAR PORTION).
 */
const RECIPE_NUTRIENT_COLUMNS = [
  { key: 'proteins', column: 'proteins_g_per_portion' },
  { key: 'phosphorus', column: 'phosphorus_mg_per_portion' },
  { key: 'potassium', column: 'potassium_mg_per_portion' },
  { key: 'magnesium', column: 'magnesium_mg_per_portion' },
  { key: 'calcium', column: 'calcium_mg_per_portion' }
];

/** Origines de ligne exposées par la couche SQL. */
export const LINE_ORIGIN = Object.freeze({
  FOOD: 'food',
  RECIPE_INGREDIENT: 'recipe_ingredient',
  RECIPE_STORED: 'recipe_stored'
});

/**
 * Récupère toutes les lignes de repas de la fenêtre avec leur composition
 * minéralogique, en conservant les `NULL`.
 *
 * @param {string} startDateStr  YYYY-MM-DD
 * @param {string} endDateStr    YYYY-MM-DD
 * @param {object} [customDb]
 * @returns {Array<object>} lignes normalisées
 */
export function getPralLines(startDateStr, endDateStr, customDb = null) {
  const db = customDb || getDatabase();

  // Les 5 nutriments portent le MÊME alias dans les trois branches
  // (`<key>_value`) : la base d'unité est portée par `nutrient_basis`.
  // C'est indispensable : SQLite prend les noms de colonnes de la PREMIÈRE
  // branche du UNION, donc un alias divergent se retrouve écrasé et la
  // valeur lue ne correspond plus à son nom.
  const foodSelect = FOOD_NUTRIENT_COLUMNS.map(
    ({ key, column }) => `f.${column} AS ${key}_value`
  ).join(',\n           ');

  const recipeSelect = RECIPE_NUTRIENT_COLUMNS.map(
    ({ key, column }) => `r.${column} AS ${key}_value`
  ).join(',\n           ');

  const rows = db
    .prepare(
      `
    SELECT
      ml.id                AS meal_id,
      ml.date_             AS date,
      ml.period            AS period,
      ml.food_id           AS food_id,
      ml.recipe_id         AS recipe_id,
      ml.quantity_g        AS quantity_g,
      ml.portions_count    AS portions_count,
      ml.quantity_g        AS grams,
      'food'               AS origin,
      f.id                 AS entity_id,
      f.name               AS entity_name,
      f.category           AS entity_category,
      f.source             AS entity_source,
      NULL                 AS parent_name,
      'per_100g'           AS nutrient_basis,
      ${foodSelect},
      f.energy_kcal_100g * ml.quantity_g / 100.0 AS energy_kcal,
      NULL                 AS portions_consumed
    FROM meal_log ml
    JOIN foods f ON f.id = ml.food_id
    WHERE ml.date_ BETWEEN ? AND ?
      AND ml.food_id IS NOT NULL

    UNION ALL

    SELECT
      ml.id                AS meal_id,
      ml.date_             AS date,
      ml.period            AS period,
      f.id                 AS food_id,
      ml.recipe_id         AS recipe_id,
      ml.quantity_g        AS quantity_g,
      ml.portions_count    AS portions_count,
      ri.quantity_g * (${RECIPE_PORTIONS} / NULLIF(r.portions, 0)) AS grams,
      'recipe_ingredient'  AS origin,
      f.id                 AS entity_id,
      f.name               AS entity_name,
      f.category           AS entity_category,
      f.source             AS entity_source,
      r.name               AS parent_name,
      'per_100g'           AS nutrient_basis,
      ${foodSelect},
      f.energy_kcal_100g
        * ri.quantity_g * (${RECIPE_PORTIONS} / NULLIF(r.portions, 0)) / 100.0 AS energy_kcal,
      ${RECIPE_PORTIONS}   AS portions_consumed
    FROM meal_log ml
    JOIN recipes r ON r.id = ml.recipe_id
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN foods f ON f.id = ri.food_id
    WHERE ml.date_ BETWEEN ? AND ?
      AND ml.recipe_id IS NOT NULL

    UNION ALL

    SELECT
      ml.id                AS meal_id,
      ml.date_             AS date,
      ml.period            AS period,
      NULL                 AS food_id,
      ml.recipe_id         AS recipe_id,
      ml.quantity_g        AS quantity_g,
      ml.portions_count    AS portions_count,
      ml.quantity_g        AS grams,
      'recipe_stored'      AS origin,
      r.id                 AS entity_id,
      r.name               AS entity_name,
      NULL                 AS entity_category,
      r.source             AS entity_source,
      r.name               AS parent_name,
      'per_portion'        AS nutrient_basis,
      ${recipeSelect},
      r.energy_kcal_per_portion * ${RECIPE_PORTIONS} AS energy_kcal,
      ${RECIPE_PORTIONS}   AS portions_consumed
    FROM meal_log ml
    JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.date_ BETWEEN ? AND ?
      AND ml.recipe_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
      )
    `
    )
    .all(startDateStr, endDateStr, startDateStr, endDateStr, startDateStr, endDateStr);

  return rows.map(normalizeRow);
}

/**
 * Normalise une ligne SQL vers la structure consommée par le domaine.
 *
 * Convention de composition retournée :
 *   - `food` / `recipe_ingredient` : valeurs POUR 100 g de l'aliment.
 *   - `recipe_stored`               : valeurs ABSOLUES pour la ligne
 *     consommée (totaux par portion × portions consommées), car ces
 *     totaux ne sont pas rapportables à une masse d'aliment.
 *
 * @param {object} row
 * @returns {object}
 */
function normalizeRow(row) {
  const isStored = row.origin === LINE_ORIGIN.RECIPE_STORED;
  const composition = {};

  // La base d'unité est DÉCLARÉE par le SQL (`nutrient_basis`) : c'est
  // l'autorité. L'origine sert de recoupement : une divergence entre les
  // deux signalerait une régression SQL silencieuse.
  const basis = row.nutrient_basis;
  if (isStored && basis !== NUTRIENT_BASIS.PER_PORTION) {
    throw new Error(
      `Base d'unité incohérente pour une recette sans ingrédients : ` +
      `"${basis}" (attendu "${NUTRIENT_BASIS.PER_PORTION}").`
    );
  }
  if (!isStored && basis !== NUTRIENT_BASIS.PER_100G) {
    throw new Error(
      `Base d'unité incohérente pour un aliment : "${basis}" ` +
      `(attendu "${NUTRIENT_BASIS.PER_100G}").`
    );
  }

  if (isStored) {
    // Valeurs PAR PORTION : la masse consommée est la portion × nombre de
    // portions. La composition retournée est donc ABSOLUE.
    const portions = row.portions_consumed;
    for (const { key } of RECIPE_NUTRIENT_COLUMNS) {
      const perPortion = row[`${key}_value`] ?? null;
      composition[key] =
        perPortion !== null && Number.isFinite(portions)
          ? perPortion * portions
          : perPortion;
    }
  } else {
    // Valeurs POUR 100 g : la mise à l'échelle est faite plus loin, par
    // la couche qualité, à partir de la masse consommée.
    for (const { key } of FOOD_NUTRIENT_COLUMNS) {
      composition[key] = row[`${key}_value`] ?? null;
    }
  }

  return {
    lineId: `${row.meal_id}:${row.origin}:${row.entity_id}`,
    mealId: row.meal_id,
    date: row.date,
    period: row.period,
    origin: row.origin,
    foodId: row.food_id ?? null,
    foodName: row.entity_name,
    category: row.entity_category ?? null,
    source: row.entity_source ?? null,
    parentName: row.parent_name ?? null,
    grams: row.grams ?? null,
    quantityG: row.quantity_g,
    portionsCount: row.portions_count,
    portionsConsumed: row.portions_consumed ?? null,
    recipeId: row.recipe_id ?? null,
    kcal: row.energy_kcal ?? null,
    composition
  };
}

/**
 * Récupère les donneurs curatés et les déclarations de zéro minéral.
 *
 * @param {object} [customDb]
 * @returns {object} { donors: Map<foodId, donor>, zeroDeclared: Set<foodId> }
 */
export function getPralReferenceDonors(customDb = null) {
  const db = customDb || getDatabase();

  const rows = db
    .prepare(
      `
    SELECT
      fnr.food_id,
      fnr.reference_id,
      fnr.mode,
      fnr.valid_from,
      fnr.valid_to,
      fnr.note,
      ref.name         AS reference_name,
      ref.source       AS reference_source,
      ref.category     AS reference_category,
      ref.proteins_g_100g       AS proteins_per100g,
      ref.phosphorus_mg_100g    AS phosphorus_per100g,
      ref.potassium_mg_100g     AS potassium_per100g,
      ref.magnesium_mg_100g     AS magnesium_per100g,
      ref.calcium_mg_100g       AS calcium_per100g
    FROM food_nutrient_references fnr
    LEFT JOIN foods ref ON ref.id = fnr.reference_id
    ORDER BY fnr.food_id
    `
    )
    .all();

  const donors = new Map();
  const zeroDeclared = new Set();

  for (const row of rows) {
    if (row.mode === 'zero') {
      zeroDeclared.add(row.food_id);
      continue;
    }
    if (!row.reference_id) continue;
    const curation = {
      foodId: row.food_id,
      referenceId: row.reference_id,
      name: row.reference_name,
      source: row.reference_source,
      category: row.reference_category,
      validFrom: row.valid_from || null,
      validTo: row.valid_to || null,
      note: row.note,
      composition: {
        proteins: row.proteins_per100g ?? null,
        phosphorus: row.phosphorus_per100g ?? null,
        potassium: row.potassium_per100g ?? null,
        magnesium: row.magnesium_per100g ?? null,
        calcium: row.calcium_per100g ?? null
      }
    };
    // Plusieurs curations peuvent concerner le même aliment, à des
    // périodes distinctes : on les accumule, la couche qualité choisira
    // celle qui s'applique à la date de la ligne.
    const existing = donors.get(row.food_id);
    if (existing) {
      existing.push(curation);
    } else {
      donors.set(row.food_id, [curation]);
    }
  }

  return { donors, zeroDeclared };
}

/**
 * Récupère le pool de donneurs de RÉFÉRENCE par catégorie : uniquement les
 * sources fiables (Ciqual / USDA).
 *
 * Les médianes sont calculées côté service (et non en SQL) pour rester
 * testables, explicables et remplaçables.
 *
 * @param {object} [customDb]
 * @returns {Array<object>}
 */
export function getPralCategoryPool(customDb = null) {
  const db = customDb || getDatabase();

  const rows = db
    .prepare(
      `
    SELECT
      id, name, category, source,
      proteins_g_100g    AS proteins,
      phosphorus_mg_100g AS phosphorus,
      potassium_mg_100g  AS potassium,
      magnesium_mg_100g  AS magnesium,
      calcium_mg_100g    AS calcium
    FROM foods
    WHERE is_active = 1
      AND (
        LOWER(source) LIKE '%ciqual%'
        OR LOWER(source) LIKE '%usda%'
      )
    ORDER BY category, id
    `
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    source: row.source,
    composition: {
      proteins: row.proteins ?? null,
      phosphorus: row.phosphorus ?? null,
      potassium: row.potassium ?? null,
      magnesium: row.magnesium ?? null,
      calcium: row.calcium ?? null
    }
  }));
}

/**
 * Recupere l'energie journaliere (kcal) par jour, independamment du PRAL.
 * Sert a la politique de periode (journee complete ou partielle).
 *
 * L'energie est le seul nutriment neutralise a zero ici : elle ne
 * participe PAS a la formule PRAL. Un `NULL` d'energie est signale par
 * `unknownLines` plutot que silencieusement transforme en 0 kcal.
 *
 * @param {string} startDateStr
 * @param {string} endDateStr
 * @param {object} [customDb]
 * @returns {Map<string, {kcal: number, unknownLines: number}>}
 */
export function getPralDailyKcal(startDateStr, endDateStr, customDb = null) {
  const db = customDb || getDatabase();

  const rows = db
    .prepare(
      `
    SELECT
      ml.date_ AS date,
      SUM(
        CASE
          WHEN ml.food_id IS NOT NULL THEN f.energy_kcal_100g * ml.quantity_g / 100.0
          ELSE r.energy_kcal_per_portion * ${RECIPE_PORTIONS}
        END
      ) AS kcal,
      SUM(
        CASE
          WHEN ml.food_id IS NOT NULL AND f.energy_kcal_100g IS NULL THEN 1
          WHEN ml.recipe_id IS NOT NULL AND r.energy_kcal_per_portion IS NULL THEN 1
          ELSE 0
        END
      ) AS unknown_lines
    FROM meal_log ml
    LEFT JOIN foods f ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.date_ BETWEEN ? AND ?
    GROUP BY ml.date_
    `
    )
    .all(startDateStr, endDateStr);

  return new Map(
    rows.map((row) => [
      row.date,
      { kcal: row.kcal ?? 0, unknownLines: row.unknown_lines ?? 0 }
    ])
  );
}
