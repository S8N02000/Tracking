import { describe, it, expect } from 'vitest';
import { calcNutr } from '../config/nutrients.js';

describe('calcNutr Unit Tests', () => {
  it('should return 0 when meal or nutrient column is invalid', () => {
    expect(calcNutr(null, 'kcal')).toBe(0);
    expect(calcNutr({}, 'non_existent_key')).toBe(0);
  });

  it('should compute nutrients for food items on a 100g scale', () => {
    const mealFood = {
      food_id: 42,
      quantity_g: 150,
      energy_kcal_100g: 200,
      proteins_g_100g: 20.4,
      salt_g_100g: 1.25
    };

    // 150g at 200 kcal / 100g = 300 kcal
    expect(calcNutr(mealFood, 'kcal')).toBe(300);

    // 150g at 20.4g / 100g = 30.6g
    expect(calcNutr(mealFood, 'P')).toBe(30.6);

    // 150g at 1.25g / 100g = 1.88g (salt decimals = 2)
    expect(calcNutr(mealFood, 'sel')).toBe(1.88);
  });

  it('should compute nutrients for recipe items prioritizing portions_count', () => {
    const mealRecipeWithPortions = {
      recipe_id: 10,
      quantity_g: 250,
      portions_count: 2,
      recipe_total_weight: 500,
      recipe_portions: 4,
      energy_kcal_per_portion: 350,
      proteins_g_per_portion: 25.5
    };

    // Uses portions_count = 2 directly: 2 * 350 = 700 kcal
    expect(calcNutr(mealRecipeWithPortions, 'kcal')).toBe(700);
    expect(calcNutr(mealRecipeWithPortions, 'P')).toBe(51.0);
  });

  it('should compute nutrients for recipe items fallback via weight when portions_count is null', () => {
    const mealRecipeLegacy = {
      recipe_id: 11,
      quantity_g: 250,
      portions_count: null,
      recipe_total_weight: 500,
      recipe_portions: 2, // 1 portion = 250g
      energy_kcal_per_portion: 400,
      proteins_g_per_portion: 30.0
    };

    // 250g / (500g / 2) = 1 portion
    expect(calcNutr(mealRecipeLegacy, 'kcal')).toBe(400);
    expect(calcNutr(mealRecipeLegacy, 'P')).toBe(30.0);
  });
});
