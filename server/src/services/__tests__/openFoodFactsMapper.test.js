import { describe, it, expect } from 'vitest';
import { mapOffProductToFood } from '../openFoodFactsMapper.js';

describe('Open Food Facts Mapper Unit Tests', () => {
  it('should map Open Food Facts product JSON to internal 35-nutrient food structure', () => {
    const rawOff = {
      code: '3017620422003',
      product_name_fr: 'Nutella',
      brands: 'Ferrero',
      nutriments: {
        'energy-kcal_100g': 539,
        proteins_100g: 6.3,
        carbohydrates_100g: 57.5,
        sugars_100g: 56.3,
        fat_100g: 30.9,
        'saturated-fat_100g': 10.6,
        salt_100g: 0.107,
        sodium_100g: 0.0428
      }
    };

    const food = mapOffProductToFood(rawOff);
    expect(food.name).toBe('Nutella');
    expect(food.brand).toBe('Ferrero');
    expect(food.energy_kcal_100g).toBe(539);
    expect(food.proteins_g_100g).toBe(6.3);
    expect(food.carbohydrates_g_100g).toBe(57.5);
    expect(food.sugars_g_100g).toBe(56.3);
    expect(food.fat_g_100g).toBe(30.9);
    expect(food.saturated_fat_g_100g).toBe(10.6);
    expect(food.salt_g_100g).toBe(0.107);
    expect(food.source).toBe('openfoodfacts');
  });

  it('should handle null/missing products cleanly', () => {
    expect(mapOffProductToFood(null)).toBeNull();
  });
});
