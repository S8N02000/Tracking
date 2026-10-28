import { describe, it, expect, afterEach } from 'vitest';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { createRecipe, getRecipeById, deleteRecipe, updateRecipe } from '../recipeService.js';
import { makeTempDbPath, removeTempDb } from '../../test-utils/tempDb.js';

describe('Recipe Service Integration Tests', () => {
  const tempDbPath = makeTempDbPath('temp_recipe_db.db');

  afterEach(() => {
    closeDatabase();
    removeTempDb(tempDbPath);
  });

  it('should create a recipe with ingredients and calculate nutrients', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);

    // Insert test foods first
    const foodStmt = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g, fat_g_100g)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const f1 = foodStmt.run('Poulet', 'viande', 165, 31, 0, 3.6).lastInsertRowid;
    const f2 = foodStmt.run('Riz complet', 'cereale', 130, 2.7, 28, 1).lastInsertRowid;

    const recipe = createRecipe(
      { name: 'Poulet Riz', description: 'Plat fitness', portions: 2 },
      [
        { food_id: f1, quantity_g: 300 },
        { food_id: f2, quantity_g: 200 }
      ],
      db
    );

    expect(recipe).not.toBeNull();
    expect(recipe.name).toBe('Poulet Riz');
    expect(recipe.portions).toBe(2);
    expect(recipe.ingredients.length).toBe(2);

    const fetched = getRecipeById(recipe.id, db);
    expect(fetched.calculated.total_weight_g).toBe(500);

    // Delete recipe
    const deleted = deleteRecipe(recipe.id, db);
    expect(deleted).toBe(true);
    expect(getRecipeById(recipe.id, db)).toBeNull();
  });

  it('persiste les micro-nutriments par portion et respecte la regle de nullite', () => {
    runMigrations(tempDbPath);
    const db = getDatabase(tempDbPath);
    const cat = db.prepare('SELECT category FROM ref_food_categories LIMIT 1').get().category;

    // Aliment complet en micro-nutriments.
    const full = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g,
        fat_g_100g, saturated_fat_g_100g, salt_g_100g, calcium_mg_100g, iron_mg_100g,
        selenium_mg_100g, iodine_mg_100g, vit_k_mcg_100g, omega3_g_100g, omega6_g_100g,
        omega9_g_100g, polyunsaturated_fat_g_100g, trans_fat_g_100g, sodium_mg_100g,
        cholesterol_mg_100g, manganese_mg_100g, copper_mg_100g, vit_a_mcg_100g, vit_c_mg_100g)
      VALUES (?, ?, 100, 10, 20, 5, 1, 0.5, 20, 1, 30, 40, 50, 0.1, 0.4, 5, 0.6, 0.05,
        50, 10, 0.5, 0.2, 100, 50)
    `).run('Complet', cat).lastInsertRowid;
    const full2 = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g, proteins_g_100g, carbohydrates_g_100g,
        fat_g_100g, saturated_fat_g_100g, salt_g_100g, calcium_mg_100g, iron_mg_100g,
        selenium_mg_100g, iodine_mg_100g, vit_k_mcg_100g, omega3_g_100g, omega6_g_100g,
        omega9_g_100g, polyunsaturated_fat_g_100g, trans_fat_g_100g, sodium_mg_100g,
        cholesterol_mg_100g, manganese_mg_100g, copper_mg_100g, vit_a_mcg_100g, vit_c_mg_100g)
      VALUES (?, ?, 100, 10, 20, 5, 1, 0.5, 20, 1, 30, 40, 50, 0.1, 0.4, 5, 0.6, 0.05,
        50, 10, 0.5, 0.2, 100, 50)
    `).run('Complet bis', cat).lastInsertRowid;

    // Aliment sans aucune micro-nutriture : le calcul devient une borne inferieure.
    const bare = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g, proteins_g_100g)
      VALUES (?, ?, 200, 20)
    `).run('Sans micro', cat).lastInsertRowid;

    const complete = createRecipe(
      { name: 'Recette complete', portions: 2 },
      [{ food_id: full, quantity_g: 100 }, { food_id: full2, quantity_g: 100 }],
      db
    );

    // Micro-nutriments documentes par tous les ingredients -> ecrits en base.
    expect(complete.calcium_mg_per_portion).toBe(20);
    expect(complete.selenium_mcg_per_portion).toBe(30);
    expect(complete.iodine_mcg_per_portion).toBe(40);
    expect(complete.vit_k_mcg_per_portion).toBe(50);
    expect(complete.monounsaturated_fat_g_per_portion).toBe(5);
    expect(complete.polyunsaturated_fat_g_per_portion).toBe(0.6);
    expect(complete.trans_fat_g_per_portion).toBe(0.05);
    expect(complete.sodium_mg_per_portion).toBe(50);
    expect(complete.cholesterol_mg_per_portion).toBe(10);
    expect(complete.manganese_mg_per_portion).toBe(0.5);
    expect(complete.copper_mg_per_portion).toBe(0.2);

    // Un ingredient sans valeur -> le total est une borne inferieure, pas un zero.
    const partial = createRecipe(
      { name: 'Recette partielle', portions: 2 },
      [{ food_id: full, quantity_g: 100 }, { food_id: bare, quantity_g: 100 }],
      db
    );
    expect(partial.calcium_mg_per_portion).toBeNull();
    expect(partial.selenium_mcg_per_portion).toBeNull();
    // Les macros historiques restent calculees.
    expect(partial.energy_kcal_per_portion).toBe(150);

    // Une mise a jour ne doit pas detruire un profil complet deja saisi.
    const updated = updateRecipe(
      complete.id,
      { name: 'Recette complete', portions: 2 },
      [{ food_id: full, quantity_g: 100 }, { food_id: bare, quantity_g: 100 }],
      db
    );
    expect(updated.calcium_mg_per_portion).toBe(20);
    expect(updated.selenium_mcg_per_portion).toBe(30);
  });
});
