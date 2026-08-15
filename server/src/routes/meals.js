import { Router } from 'express';
import { getDatabase } from '../database/db.js';

const router = Router();

// GET /api/meals?date=YYYY-MM-DD or ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/meals', (req, res) => {
  const db = getDatabase();
  const { date, start, end } = req.query;

  let sql = `
    SELECT ml.*,
           f.name as food_name, f.category as food_category, f.energy_kcal_100g, f.proteins_g_100g, f.carbohydrates_g_100g, f.fat_g_100g, f.fiber_g_100g,
           r.name as recipe_name, r.energy_kcal_per_portion, r.proteins_g_per_portion, r.carbohydrates_g_per_portion, r.fat_g_per_portion, r.fiber_g_per_portion, r.total_weight_g as recipe_total_weight, r.portions as recipe_portions
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
