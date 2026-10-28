import { describe, it, expect } from 'vitest';
import { calculateRecipeNutrients, calculateConsumedNutrientsFromRecipe } from '../recipeCalculator.js';

describe('Recipe Calculator Unit Tests', () => {
  it('should accurately calculate total weight and 35 nutrients per portion for a recipe', () => {
    const ingredients = [
      {
        quantity_g: 200,
        food: {
          energy_kcal_100g: 100,
          proteins_g_100g: 10,
          carbohydrates_g_100g: 20,
          fat_g_100g: 2
        }
      },
      {
        quantity_g: 100,
        food: {
          energy_kcal_100g: 200,
          proteins_g_100g: 5,
          carbohydrates_g_100g: 10,
          fat_g_100g: 10
        }
      }
    ];

    const res = calculateRecipeNutrients(ingredients, 2);
    // Total weight: 200 + 100 = 300g
    expect(res.total_weight_g).toBe(300);
    // Total kcal: (200/100 * 100) + (100/100 * 200) = 200 + 200 = 400 kcal
    expect(res.nutrients_total.energy_kcal).toBe(400);
    // Per portion (2 portions): 400 / 2 = 200 kcal
    expect(res.nutrients_per_portion.energy_kcal).toBe(200);

    // Protein total: 20 + 5 = 25g -> 12.5g per portion
    expect(res.nutrients_per_portion.proteins_g).toBe(12.5);
  });

  it('should calculate nutrients for consumed portion or custom weight', () => {
    const profile = {
      total_weight_g: 600,
      portions: 4,
      nutrients_total: {
        energy_kcal: 1200,
        proteins_g: 80
      }
    };

    // Consume 1 portion out of 4 (25%)
    const byPortion = calculateConsumedNutrientsFromRecipe(profile, { consumedPortions: 1 });
    expect(byPortion.energy_kcal).toBe(300);
    expect(byPortion.proteins_g).toBe(20);

    // Consume 150g out of 600g (25%)
    const byWeight = calculateConsumedNutrientsFromRecipe(profile, { consumedWeightG: 150 });
    expect(byWeight.energy_kcal).toBe(300);
    expect(byWeight.proteins_g).toBe(20);
  });

  it('should reject invalid portion count <= 0', () => {
    expect(() => calculateRecipeNutrients([{ quantity_g: 100, food: {} }], 0)).toThrow();
  });

  // ---------------------------------------------------------------------
  // Complétude des totaux : un NULL ingrédient ne doit pas devenir un zéro
  // silencieux. Les totaux numériques sont conservés (compatibilité des
  // agrégats historiques) mais la complétude est exposée explicitement.
  // ---------------------------------------------------------------------
  describe('complétude des totaux', () => {
    it('marque comme partiel un nutriment dont un ingrédient est non documenté', () => {
      const ingredients = [
        {
          quantity_g: 100,
          food: {
            energy_kcal_100g: 100,
            proteins_g_100g: 10,
            calcium_mg_100g: 20
          }
        },
        {
          quantity_g: 100,
          food: {
            energy_kcal_100g: 200,
            proteins_g_100g: 5
            // calcium_mg_100g absent => non documenté
          }
        }
      ];

      const res = calculateRecipeNutrients(ingredients, 2);

      // Le calcium n'est documenté que par le premier ingrédient.
      expect(res.partial_nutrients).toContain('calcium_mg');
      expect(res.nutrients_complete.calcium_mg).toBe(false);

      // Le total numérique reste celui des valeurs connues (borne inférieure),
      // et n'est PAS la somme de deux zéros.
      expect(res.nutrients_total.calcium_mg).toBe(20);
    });

    it('distingue "aucun ingrédient ne documente" de "zéro"', () => {
      const ingredients = [
        {
          quantity_g: 100,
          food: {
            energy_kcal_100g: 100,
            proteins_g_100g: 10
            // aucun minéral documenté
          }
        }
      ];

      const res = calculateRecipeNutrients(ingredients, 1);

      expect(res.undocumented_nutrients).toContain('calcium_mg');
      expect(res.undocumented_nutrients).toContain('magnesium_mg');
      expect(res.partial_nutrients).toContain('calcium_mg');
      // Complétude «false» et documenté «false» : on ne sait pas, ce n'est pas 0.
      expect(res.nutrients_complete.calcium_mg).toBe(false);
      expect(res.nutrients_total.calcium_mg).toBe(0);
    });

    it('déclare complet un nutriment documenté par tous les ingrédients', () => {
      const ingredients = [
        {
          quantity_g: 100,
          food: { energy_kcal_100g: 100, proteins_g_100g: 10, calcium_mg_100g: 20 }
        },
        {
          quantity_g: 100,
          food: { energy_kcal_100g: 200, proteins_g_100g: 5, calcium_mg_100g: 30 }
        }
      ];

      const res = calculateRecipeNutrients(ingredients, 2);

      expect(res.nutrients_complete.calcium_mg).toBe(true);
      expect(res.partial_nutrients).not.toContain('calcium_mg');
      expect(res.undocumented_nutrients).not.toContain('calcium_mg');
      expect(res.nutrients_total.calcium_mg).toBe(50);
    });
  });
});
