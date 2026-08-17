import { Router } from 'express';
import { getDatabase } from '../database/db.js';

const router = Router();

// GET /api/meals?date=YYYY-MM-DD or ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/meals', (req, res) => {
  const db = getDatabase();
  const { date, start, end } = req.query;

  let sql = `
    SELECT ml.*,
           f.name as food_name, f.category as food_category,
           f.energy_kcal_100g, f.proteins_g_100g, f.carbohydrates_g_100g, f.sugars_g_100g, f.fiber_g_100g, f.starch_g_100g,
           f.fat_g_100g, f.saturated_fat_g_100g, f.trans_fat_g_100g, f.omega3_g_100g, f.omega6_g_100g, f.omega9_g_100g,
           f.salt_g_100g, f.sodium_mg_100g, f.cholesterol_mg_100g,
           f.calcium_mg_100g, f.iron_mg_100g, f.magnesium_mg_100g, f.potassium_mg_100g, f.zinc_mg_100g, f.phosphorus_mg_100g, f.manganese_mg_100g, f.copper_mg_100g, f.selenium_mg_100g, f.iodine_mg_100g,
           f.vit_a_mcg_100g, f.vit_b1_mg_100g, f.vit_b2_mg_100g, f.vit_b3_mg_100g, f.vit_b5_mg_100g, f.vit_b6_mg_100g, f.vit_b9_mcg_100g, f.vit_b12_mcg_100g, f.vit_c_mg_100g, f.vit_d_mcg_100g, f.vit_e_mg_100g, f.vit_k_mcg_100g, f.caffeine_mg_100g,
           r.name as recipe_name,
           r.energy_kcal_per_portion, r.proteins_g_per_portion, r.carbohydrates_g_per_portion, r.sugars_g_per_portion, r.fiber_g_per_portion,
           r.fat_g_per_portion, r.saturated_fat_g_per_portion, r.salt_g_per_portion,
           r.calcium_mg_per_portion, r.iron_mg_per_portion, r.magnesium_mg_per_portion, r.potassium_mg_per_portion, r.zinc_mg_per_portion, r.phosphorus_mg_per_portion,
           r.vit_a_mcg_per_portion, r.vit_c_mg_per_portion, r.vit_d_mcg_per_portion, r.vit_b12_mcg_per_portion, r.vit_e_mg_per_portion,
           r.vit_b1_mg_per_portion, r.vit_b2_mg_per_portion, r.vit_b3_mg_per_portion, r.vit_b5_mg_per_portion, r.vit_b6_mg_per_portion, r.vit_b9_mcg_per_portion,
           r.caffeine_mg_per_portion,
           r.total_weight_g as recipe_total_weight, r.portions as recipe_portions
    FROM meal_log ml
    LEFT JOIN foods f ON f.id = ml.food_id
    LEFT JOIN recipes r ON r.id = ml.recipe_id
  `;
  const params = [];

  if (start && end) {
    sql += ' WHERE ml.date_ BETWEEN ? AND ?';
    params.push(start, end);
  } else if (date) {
    sql += ' WHERE ml.date_ = ?';
    params.push(date);
  }

  sql += ' ORDER BY ml.date_ DESC, ml.logged_at DESC';

  const meals = db.prepare(sql).all(...params);
  res.json(meals);
});

// POST /api/meals
router.post('/meals', (req, res, next) => {
  try {
    const db = getDatabase();
    const { date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, notes } = req.body;

    if (!date_ || !period || !quantity_g || (food_id == null && recipe_id == null)) {
      return res.status(400).json({
        error: true,
        message: 'La date, la période, la quantité et la référence d\'aliment/recette sont obligatoires.'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO meal_log (date_, period, food_id, recipe_id, quantity_g, original_unit, original_qty, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      date_,
      period,
      food_id || null,
      recipe_id || null,
      quantity_g,
      original_unit || 'g',
      original_qty || quantity_g,
      notes || null
    );

    const created = db.prepare('SELECT * FROM meal_log WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/meals/:id
router.delete('/meals/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM meal_log WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: true, message: 'Repas introuvable.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
