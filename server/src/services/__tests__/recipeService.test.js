import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runMigrations } from '../../database/migrate.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { createRecipe, getRecipeById, deleteRecipe } from '../recipeService.js';

describe('Recipe Service Integration Tests', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_recipe_db.db');

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
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
});
