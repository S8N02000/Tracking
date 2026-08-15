import { Router } from 'express';
import { getDatabase } from '../database/db.js';

const router = Router();

// GET /api/foods
router.get('/foods', (req, res) => {
  const db = getDatabase();
  const { category, search, active_only } = req.query;

  let sql = 'SELECT * FROM foods WHERE 1=1';
  const params = [];

  if (active_only !== 'false') {
    sql += ' AND is_active = 1';
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR brand LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name ASC';

  const foods = db.prepare(sql).all(...params);
  res.json(foods);
});

// GET /api/foods/:id
router.get('/foods/:id', (req, res) => {
  const db = getDatabase();
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
  if (!food) {
    return res.status(404).json({ error: true, message: 'Aliment introuvable.' });
  }
  res.json(food);
});

// POST /api/foods
router.post('/foods', (req, res, next) => {
  try {
    const db = getDatabase();
    const data = req.body;

    if (!data.name || !data.category) {
      return res.status(400).json({ error: true, message: 'Le nom et la catégorie sont obligatoires.' });
    }

    const columns = [
      'name', 'brand', 'category', 'weight_per_unit_g', 'default_unit', 'density_g_ml',
      'energy_kcal_100g', 'proteins_g_100g', 'carbohydrates_g_100g', 'sugars_g_100g',
      'fiber_g_100g', 'starch_g_100g', 'fat_g_100g', 'saturated_fat_g_100g', 'trans_fat_g_100g',
      'omega3_g_100g', 'omega6_g_100g', 'omega9_g_100g', 'salt_g_100g', 'sodium_mg_100g',
      'cholesterol_mg_100g', 'calcium_mg_100g', 'iron_mg_100g', 'magnesium_mg_100g',
      'potassium_mg_100g', 'zinc_mg_100g', 'phosphorus_mg_100g', 'manganese_mg_100g',
      'copper_mg_100g', 'selenium_mg_100g', 'iodine_mg_100g', 'vit_a_mcg_100g',
      'vit_b1_mg_100g', 'vit_b2_mg_100g', 'vit_b3_mg_100g', 'vit_b5_mg_100g',
      'vit_b6_mg_100g', 'vit_b9_mcg_100g', 'vit_b12_mcg_100g', 'vit_c_mg_100g',
      'vit_d_mcg_100g', 'vit_e_mg_100g', 'vit_k_mcg_100g', 'source', 'notes'
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const defaults = {
      default_unit: 'g',
      density_g_ml: 1.0,
      source: 'user_input'
    };

    const values = columns.map((col) => {
      if (data[col] !== undefined && data[col] !== null) return data[col];
      if (defaults[col] !== undefined) return defaults[col];
      return null;
    });

    const stmt = db.prepare(`
      INSERT INTO foods (${columns.join(', ')})
      VALUES (${placeholders})
    `);

    const result = stmt.run(...values);
    const created = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: true, message: 'Un aliment avec ce nom existe déjà.' });
    }
    next(err);
  }
});

// PUT /api/foods/:id
router.put('/foods/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM foods WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Aliment introuvable.' });
    }

    const data = req.body;
    const columns = [
      'name', 'brand', 'category', 'weight_per_unit_g', 'default_unit', 'density_g_ml',
      'energy_kcal_100g', 'proteins_g_100g', 'carbohydrates_g_100g', 'sugars_g_100g',
      'fiber_g_100g', 'starch_g_100g', 'fat_g_100g', 'saturated_fat_g_100g', 'trans_fat_g_100g',
      'omega3_g_100g', 'omega6_g_100g', 'omega9_g_100g', 'salt_g_100g', 'sodium_mg_100g',
      'cholesterol_mg_100g', 'calcium_mg_100g', 'iron_mg_100g', 'magnesium_mg_100g',
      'potassium_mg_100g', 'zinc_mg_100g', 'phosphorus_mg_100g', 'manganese_mg_100g',
      'copper_mg_100g', 'selenium_mg_100g', 'iodine_mg_100g', 'vit_a_mcg_100g',
      'vit_b1_mg_100g', 'vit_b2_mg_100g', 'vit_b3_mg_100g', 'vit_b5_mg_100g',
      'vit_b6_mg_100g', 'vit_b9_mcg_100g', 'vit_b12_mcg_100g', 'vit_c_mg_100g',
      'vit_d_mcg_100g', 'vit_e_mg_100g', 'vit_k_mcg_100g', 'source', 'notes'
    ];

    const setClauses = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => (data[col] !== undefined ? data[col] : existing[col]));
    values.push(id);

    const stmt = db.prepare(`
      UPDATE foods SET ${setClauses}, updated_at = date('now')
      WHERE id = ?
    `);

    stmt.run(...values);
    const updated = db.prepare('SELECT * FROM foods WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/foods/:id
router.delete('/foods/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const id = req.params.id;

    // Check usage in recipes or meal_log
    const recipeCount = db
      .prepare('SELECT COUNT(*) as count FROM recipe_ingredients WHERE food_id = ?')
      .get(id);
    const mealCount = db
      .prepare('SELECT COUNT(*) as count FROM meal_log WHERE food_id = ?')
      .get(id);

    if (recipeCount.count > 0 || mealCount.count > 0) {
      // Soft delete by setting is_active = 0
      db.prepare('UPDATE foods SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ success: true, soft_deleted: true, message: 'Aliment désactivé (utilisé dans l\'historique).' });
    }

    db.prepare('DELETE FROM foods WHERE id = ?').run(id);
    res.json({ success: true, hard_deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
