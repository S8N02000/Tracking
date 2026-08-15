import { Router } from 'express';
import { getDatabase } from '../database/db.js';

const router = Router();

// GET /api/sports
router.get('/sports', (req, res) => {
  const db = getDatabase();
  const { date } = req.query;

  let sql = 'SELECT * FROM sport_log';
  const params = [];

  if (date) {
    sql += ' WHERE date_ = ?';
    params.push(date);
  }

  sql += ' ORDER BY date_ DESC, logged_at DESC';

  const sports = db.prepare(sql).all(...params);
  res.json(sports);
});

// POST /api/sports
router.post('/sports', (req, res, next) => {
  try {
    const db = getDatabase();
    const {
      date_, sport_type, duration_min, kcal_burned, distance_km,
      pace_kmh, avg_hr_bpm, elevation_m, pas, km_iphone, weight_kg, met, notes
    } = req.body;

    if (!date_ || !sport_type || !duration_min) {
      return res.status(400).json({
        error: true,
        message: 'La date, le type de sport et la durée sont obligatoires.'
      });
    }

    const stmt = db.prepare(`
      INSERT INTO sport_log (
        date_, sport_type, duration_min, kcal_burned, distance_km,
        pace_kmh, avg_hr_bpm, elevation_m, pas, km_iphone, weight_kg, met, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      date_, sport_type, duration_min, kcal_burned || null, distance_km || null,
      pace_kmh || null, avg_hr_bpm || null, elevation_m || null, pas || null,
      km_iphone || null, weight_kg || null, met || null, notes || null
    );

    const created = db.prepare('SELECT * FROM sport_log WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sports/:id
router.delete('/sports/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM sport_log WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: true, message: 'Entrée sportive introuvable.' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
