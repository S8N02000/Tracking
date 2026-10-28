import { getDatabase } from '../database/db.js';
import { calculateRecipeNutrients } from './recipeCalculator.js';

export function getAllRecipes(filters = {}, customDb = null) {
  const db = customDb || getDatabase();
  let query = 'SELECT * FROM recipes WHERE is_active = 1';
  const params = [];

  if (filters.search) {
    query += ' AND name LIKE ?';
    params.push(`%${filters.search}%`);
  }

  if (filters.minRating !== undefined && filters.minRating !== null && filters.minRating !== '') {
    query += ' AND rating >= ?';
    params.push(Number(filters.minRating));
  }

  if (filters.maxRating !== undefined && filters.maxRating !== null && filters.maxRating !== '') {
    query += ' AND rating <= ?';
    params.push(Number(filters.maxRating));
  }

  if (filters.sortBy === 'rating_desc') {
    query += ' ORDER BY rating DESC NULLS LAST, name ASC';
  } else if (filters.sortBy === 'rating_asc') {
    query += ' ORDER BY rating ASC NULLS LAST, name ASC';
  } else if (filters.sortBy === 'kcal_asc') {
    query += ' ORDER BY energy_kcal_per_portion ASC, name ASC';
  } else if (filters.sortBy === 'kcal_desc') {
    query += ' ORDER BY energy_kcal_per_portion DESC, name ASC';
  } else {
    query += ' ORDER BY name ASC';
  }

  const recipes = db.prepare(query).all(...params);
  return recipes.map((recipe) => enrichRecipeWithIngredients(recipe, db));
}

export function getRecipeById(id, customDb = null) {
  const db = customDb || getDatabase();
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!recipe) return null;
  return enrichRecipeWithIngredients(recipe, db);
}

function enrichRecipeWithIngredients(recipe, db) {
  const ingredients = db
    .prepare(
      `
    SELECT ri.*, f.name as food_name, f.category, f.energy_kcal_100g, f.proteins_g_100g,
           f.carbohydrates_g_100g, f.fat_g_100g, f.fiber_g_100g, f.salt_g_100g
    FROM recipe_ingredients ri
    JOIN foods f ON f.id = ri.food_id
    WHERE ri.recipe_id = ?
  `
    )
    .all(recipe.id);

  // Fetch full food objects for dynamic calculation
  const fullIngredients = ingredients.map((ri) => {
    const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(ri.food_id);
    return {
      quantity_g: ri.quantity_g,
      original_unit: ri.original_unit,
      original_qty: ri.original_qty,
      food
    };
  });

  if (fullIngredients.length > 0) {
    const calculated = calculateRecipeNutrients(fullIngredients, recipe.portions);
    recipe.calculated = calculated;
  } else {
    recipe.calculated = null;
  }

  recipe.ingredients = ingredients;
  return recipe;
}

// Nutriments calcules a partir des ingredients -> colonnes `recipes`.
//
// Regle de nullite : un calcul issu d'un ingredient non documente est une
// BORNE INFERIEURE, pas une valeur. On ne l'ecrit donc en base que si le
// nutriment est complet pour TOUS les ingredients ; sinon NULL (absence de
// donnee), jamais 0. Les macros historiques sont conservees telles quelles
// (comportement d'origine).
const NUTRIENT_COLUMN_MAP = {
  energy_kcal: 'energy_kcal_per_portion',
  proteins_g: 'proteins_g_per_portion',
  carbohydrates_g: 'carbohydrates_g_per_portion',
  sugars_g: 'sugars_g_per_portion',
  fiber_g: 'fiber_g_per_portion',
  fat_g: 'fat_g_per_portion',
  saturated_fat_g: 'saturated_fat_g_per_portion',
  salt_g: 'salt_g_per_portion',
  sodium_mg: 'sodium_mg_per_portion',
  cholesterol_mg: 'cholesterol_mg_per_portion',
  calcium_mg: 'calcium_mg_per_portion',
  iron_mg: 'iron_mg_per_portion',
  magnesium_mg: 'magnesium_mg_per_portion',
  potassium_mg: 'potassium_mg_per_portion',
  zinc_mg: 'zinc_mg_per_portion',
  phosphorus_mg: 'phosphorus_mg_per_portion',
  manganese_mg: 'manganese_mg_per_portion',
  copper_mg: 'copper_mg_per_portion',
  // foods.selenium_mg_100g / iodine_mg_100g portent des microgrammes.
  selenium_mg: 'selenium_mcg_per_portion',
  iodine_mg: 'iodine_mcg_per_portion',
  vit_a_mcg: 'vit_a_mcg_per_portion',
  vit_b1_mg: 'vit_b1_mg_per_portion',
  vit_b2_mg: 'vit_b2_mg_per_portion',
  vit_b3_mg: 'vit_b3_mg_per_portion',
  vit_b5_mg: 'vit_b5_mg_per_portion',
  vit_b6_mg: 'vit_b6_mg_per_portion',
  vit_b9_mcg: 'vit_b9_mcg_per_portion',
  vit_b12_mcg: 'vit_b12_mcg_per_portion',
  vit_c_mg: 'vit_c_mg_per_portion',
  vit_d_mcg: 'vit_d_mcg_per_portion',
  vit_e_mg: 'vit_e_mg_per_portion',
  vit_k_mcg: 'vit_k_mcg_per_portion',
  omega3_g: 'omega3_g_per_portion',
  omega6_g: 'omega6_g_per_portion',
  omega9_g: 'monounsaturated_fat_g_per_portion',
  polyunsaturated_fat_g: 'polyunsaturated_fat_g_per_portion',
  trans_fat_g: 'trans_fat_g_per_portion'
};

// Colonnes ecrites par le calcul (hors macros historiques, ecrites telles
// quelles par le code existant).
const MICRO_COLUMNS = Object.entries(NUTRIENT_COLUMN_MAP)
  .filter(([key]) => !['energy_kcal','proteins_g','carbohydrates_g','sugars_g','fiber_g','fat_g','saturated_fat_g','salt_g'].includes(key))
  .map(([, column]) => column);

// Valeurs a persister : NULL si le nutriment n'est pas complet, sinon la
// valeur calculee.
//
// `existing` (ligne deja en base) sert de repli lors d'une MISE A JOUR : si
// le recalcul est partiel (borne inferieure) mais que la recette portait
// deja un profil complet etabli a la main (etiquette, analyse), on conserve
// la valeur existante plutot que de la detruire. Une valeur complete,
// elle, remplace toujours l'ancienne : le recalcul est plus frais que la
// saisie manuelle.
function nutrientValues(calculated, existing = null) {
  const per = calculated.nutrients_per_portion;
  const complete = calculated.nutrients_complete || {};
  const values = {};
  for (const [key, column] of Object.entries(NUTRIENT_COLUMN_MAP)) {
    if (!MICRO_COLUMNS.includes(column)) continue;
    if (complete[key] === false) {
      const previous = existing ? existing[column] : null;
      values[column] = previous !== undefined && previous !== null ? previous : null;
      continue;
    }
    values[column] = per[key];
  }
  return values;
}

export function createRecipe(recipeData, ingredientsList, customDb = null) {
  const db = customDb || getDatabase();

  const { name, description, rating, portions, source } = recipeData;

  const numericRating = rating !== undefined && rating !== null && rating !== '' ? Number(rating) : null;
  if (numericRating !== null && (numericRating < 0 || numericRating > 10)) {
    throw new Error('La note de la recette doit être comprise entre 0 et 10.');
  }

  const fullIngredients = ingredientsList.map((item) => {
    const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(item.food_id);
    if (!food) {
      throw new Error(`Aliment avec l'identifiant ${item.food_id} introuvable.`);
    }
    return {
      food_id: item.food_id,
      quantity_g: item.quantity_g,
      original_unit: item.original_unit || 'g',
      original_qty: item.original_qty || item.quantity_g,
      food
    };
  });

  const calculated = calculateRecipeNutrients(fullIngredients, portions);
  const p = calculated.nutrients_per_portion;

  let recipeId = null;

  const micro = nutrientValues(calculated);

  const runTx = db.transaction(() => {
    const microCols = MICRO_COLUMNS.join(', ');
    const microPlaceholders = MICRO_COLUMNS.map(() => '?').join(', ');
    const stmt = db.prepare(`
      INSERT INTO recipes (
        name, description, rating, portions, total_weight_g,
        energy_kcal_per_portion, proteins_g_per_portion, carbohydrates_g_per_portion,
        sugars_g_per_portion, fiber_g_per_portion, fat_g_per_portion,
        saturated_fat_g_per_portion, salt_g_per_portion, source,
        ${microCols}
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${microPlaceholders})
    `);

    const res = stmt.run(
      name,
      description || null,
      numericRating,
      portions,
      calculated.total_weight_g,
      p.energy_kcal,
      p.proteins_g,
      p.carbohydrates_g,
      p.sugars_g,
      p.fiber_g,
      p.fat_g,
      p.saturated_fat_g,
      p.salt_g,
      source || 'user_input',
      ...MICRO_COLUMNS.map((column) => micro[column])
    );

    recipeId = res.lastInsertRowid;

    const ingStmt = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g, original_unit, original_qty)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of fullIngredients) {
      ingStmt.run(recipeId, item.food_id, item.quantity_g, item.original_unit, item.original_qty);
    }
  });

  runTx();
  return getRecipeById(recipeId, db);
}

export function updateRecipe(id, recipeData, ingredientsList, customDb = null) {
  const db = customDb || getDatabase();

  const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
  if (!existing) return null;

  const { name, description, rating, portions, source } = recipeData;

  const numericRating = rating !== undefined && rating !== null && rating !== '' ? Number(rating) : null;
  if (numericRating !== null && (numericRating < 0 || numericRating > 10)) {
    throw new Error('La note de la recette doit être comprise entre 0 et 10.');
  }

  const fullIngredients = ingredientsList.map((item) => {
    const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(item.food_id);
    if (!food) {
      throw new Error(`Aliment avec l'identifiant ${item.food_id} introuvable.`);
    }
    return {
      food_id: item.food_id,
      quantity_g: item.quantity_g,
      original_unit: item.original_unit || 'g',
      original_qty: item.original_qty || item.quantity_g,
      food
    };
  });

  const calculated = calculateRecipeNutrients(fullIngredients, portions);
  const p = calculated.nutrients_per_portion;

  const micro = nutrientValues(calculated, existing);

  const runTx = db.transaction(() => {
    const microSets = MICRO_COLUMNS.map((column) => `${column} = ?`).join(', ');
    const stmt = db.prepare(`
      UPDATE recipes SET
        name = ?, description = ?, rating = ?, portions = ?, total_weight_g = ?,
        energy_kcal_per_portion = ?, proteins_g_per_portion = ?, carbohydrates_g_per_portion = ?,
        sugars_g_per_portion = ?, fiber_g_per_portion = ?, fat_g_per_portion = ?,
        saturated_fat_g_per_portion = ?, salt_g_per_portion = ?, source = ?,
        ${microSets},
        updated_at = date('now')
      WHERE id = ?
    `);

    stmt.run(
      name,
      description || null,
      numericRating,
      portions,
      calculated.total_weight_g,
      p.energy_kcal,
      p.proteins_g,
      p.carbohydrates_g,
      p.sugars_g,
      p.fiber_g,
      p.fat_g,
      p.saturated_fat_g,
      p.salt_g,
      source || 'user_input',
      ...MICRO_COLUMNS.map((column) => micro[column]),
      id
    );

    // Replace ingredients
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);

    const ingStmt = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, food_id, quantity_g, original_unit, original_qty)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of fullIngredients) {
      ingStmt.run(id, item.food_id, item.quantity_g, item.original_unit, item.original_qty);
    }
  });

  runTx();
  return getRecipeById(id, db);
}

export function deleteRecipe(id, customDb = null) {
  const db = customDb || getDatabase();

  const inUse = db.prepare('SELECT COUNT(*) as count FROM meal_log WHERE recipe_id = ?').get(id);
  if (inUse.count > 0) {
    throw new Error('Impossible de supprimer cette recette car elle a déjà été enregistrée dans un repas.');
  }

  const runTx = db.transaction(() => {
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  });

  runTx();
  return true;
}
