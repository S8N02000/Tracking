import { Router } from 'express';
import { getDatabase } from '../database/db.js';

const router = Router();

// GET /api/targets?date=YYYY-MM-DD
router.get('/targets', (req, res) => {
  const db = getDatabase();
  const { date } = req.query;

  if (date) {
    const target = db.prepare('SELECT * FROM daily_targets WHERE date_ = ?').get(date);
    if (target) return res.json(target);
    // Return default target
    return res.json({
      date_: date,
      kcal: 2000,
      proteins_g: 150,
      carbs_g: 200,
      fat_g: 70,
      fiber_g: 30,
      is_default: true
    });
  }

  const allTargets = db.prepare('SELECT * FROM daily_targets ORDER BY date_ DESC').all();
  res.json(allTargets);
});

// POST /api/targets
router.post('/targets', (req, res, next) => {
  try {
    const db = getDatabase();
    const { date_, kcal, proteins_g, carbs_g, fat_g, fiber_g, notes } = req.body;

    if (!date_) {
      return res.status(400).json({ error: true, message: 'La date est obligatoire.' });
    }

    const stmt = db.prepare(`
      INSERT INTO daily_targets (date_, kcal, proteins_g, carbs_g, fat_g, fiber_g, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date_) DO UPDATE SET
        kcal = excluded.kcal,
        proteins_g = excluded.proteins_g,
        carbs_g = excluded.carbs_g,
        fat_g = excluded.fat_g,
        fiber_g = excluded.fiber_g,
        notes = excluded.notes
    `);

    stmt.run(
      date_,
      kcal || 2000,
      proteins_g || 150,
      carbs_g || 200,
      fat_g || 70,
      fiber_g || 30,
      notes || null
    );

    const saved = db.prepare('SELECT * FROM daily_targets WHERE date_ = ?').get(date_);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

export default router;
