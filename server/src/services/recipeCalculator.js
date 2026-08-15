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

  for (const key of NUTRIENT_KEYS) {
    nutrients_total[key] = 0;
  }

  for (const item of ingredients) {
    const qtyG = parseFloat(item.quantity_g);
    if (isNaN(qtyG) || qtyG <= 0) continue;

    total_weight_g += qtyG;
    const food = item.food || {};

    for (const key of NUTRIENT_KEYS) {
      const foodCol = `${key}_100g`;
      const val100g = parseFloat(food[foodCol]);
      if (!isNaN(val100g)) {
        nutrients_total[key] += (qtyG / 100.0) * val100g;
      }
    }
  }

  const nutrients_per_portion = {};
  for (const key of NUTRIENT_KEYS) {
    nutrients_total[key] = Math.round(nutrients_total[key] * 100) / 100;
    nutrients_per_portion[key] = Math.round((nutrients_total[key] / portions) * 100) / 100;
  }

  return {
    total_weight_g: Math.round(total_weight_g * 10) / 10,
    portions,
    nutrients_total,
    nutrients_per_portion
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
    const totalVal = nutrients_total[key] || 0;
    result[key] = Math.round(totalVal * ratio * 100) / 100;
  }

  return result;
}
