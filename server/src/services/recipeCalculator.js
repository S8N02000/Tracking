export const NUTRIENT_KEYS = [
  'energy_kcal',
  'proteins_g',
  'carbohydrates_g',
  'sugars_g',
  'fiber_g',
  'starch_g',
  'fat_g',
  'saturated_fat_g',
  'trans_fat_g',
  'omega3_g',
  'omega6_g',
  'omega9_g',
  'salt_g',
  'sodium_mg',
  'cholesterol_mg',
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'potassium_mg',
  'zinc_mg',
  'phosphorus_mg',
  'manganese_mg',
  'copper_mg',
  'selenium_mg',
  'iodine_mg',
  'vit_a_mcg',
  'vit_b1_mg',
  'vit_b2_mg',
  'vit_b3_mg',
  'vit_b5_mg',
  'vit_b6_mg',
  'vit_b9_mcg',
  'vit_b12_mcg',
  'vit_c_mg',
  'vit_d_mcg',
  'vit_e_mg',
  'vit_k_mcg'
];

export function calculateRecipeNutrients(ingredients, portions) {
  if (!portions || portions <= 0) {
    throw new Error('Le nombre de portions doit être un entier strictement supérieur à 0.');
  }

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error('Une recette doit contenir au moins un ingrédient.');
  }

  let total_weight_g = 0;
  const nutrients_total = {};

  // COMPLÉTUDE — métadonnées, pas de changement de sémantique des totaux.
  //
  // Un total calculé sur des ingrédients dont certains n'ont pas de valeur
  // est une BORNE INFÉRIEURE, pas un total. Le publier sans le dire revient
  // à convertir silencieusement un NULL en zéro. On conserve donc le
  // calcul numérique (les agrégats historiques en dépendent) mais on
  // expose explicitement :
  //   - complete     : TOUS les ingrédients contributeurs portent une valeur
  //   - partial      : certains ingrédient ne portent pas de valeur
  //   - undocumented : AUCUN ingrédient ne porte de valeur (≠ « zéro »)
  //
  // Les consommateurs doivent traiter `partial` comme une borne inférieure
  // et `undocumented` comme une absence de donnée.
  const nutrients_partial = {};
  const nutrients_documented = {};

  for (const key of NUTRIENT_KEYS) {
    nutrients_total[key] = 0;
    nutrients_partial[key] = false;
    nutrients_documented[key] = false;
  }

  for (const item of ingredients) {
    const qtyG = parseFloat(item.quantity_g);
    if (isNaN(qtyG) || qtyG <= 0) continue;

    total_weight_g += qtyG;
    const food = item.food || {};

    for (const key of NUTRIENT_KEYS) {
      const foodCol = `${key}_100g`;
      const val100g = parseFloat(food[foodCol]);
      if (isNaN(val100g)) {
        // Valeur non documentée pour cet ingrédient : le total de ce
        // nutriment devient incomplet, il ne doit pas être publishié.
        nutrients_partial[key] = true;
        continue;
      }
      nutrients_documented[key] = true;
      nutrients_total[key] += (qtyG / 100.0) * val100g;
    }
  }

  const nutrients_per_portion = {};
  const nutrients_complete = {};

  for (const key of NUTRIENT_KEYS) {
    nutrients_total[key] = Math.round(nutrients_total[key] * 100) / 100;
    nutrients_per_portion[key] = Math.round((nutrients_total[key] / portions) * 100) / 100;
    nutrients_complete[key] = !nutrients_partial[key];
  }

  return {
    total_weight_g: Math.round(total_weight_g * 10) / 10,
    portions,
    nutrients_total,
    nutrients_per_portion,
    nutrients_complete,
    // Nutriments dont le total est une BORNE INFÉRIEURE (au moins un
    // ingrédient sans valeur documentée).
    partial_nutrients: NUTRIENT_KEYS.filter((key) => nutrients_partial[key]),
    // Nutriments qu'aucun ingrédient ne documente : la recette ne dit rien
    // de eux (≠ « zéro »).
    undocumented_nutrients: NUTRIENT_KEYS.filter((key) => !nutrients_documented[key])
  };
}

export function calculateConsumedNutrientsFromRecipe(recipeProfile, options = {}) {
  const { consumedWeightG, consumedPortions } = options;
  const { total_weight_g, portions, nutrients_total } = recipeProfile;

  let ratio = 0;
  if (consumedPortions != null && portions > 0) {
    ratio = consumedPortions / portions;
  } else if (consumedWeightG != null && total_weight_g > 0) {
    ratio = consumedWeightG / total_weight_g;
  }

  const result = {};
  for (const key of NUTRIENT_KEYS) {
    const totalVal = nutrients_total?.[key];
    // Un total absent reste absent : il ne doit pas être converti en zéro,
    // sous peine de faire disparaître une part de l'apport.
    if (totalVal === null || totalVal === undefined) {
      result[key] = null;
      continue;
    }
    result[key] = Math.round(totalVal * ratio * 100) / 100;
  }

  return result;
}
