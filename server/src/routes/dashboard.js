import { Router } from 'express';
import { getDailyDashboard } from '../services/dashboardAggregator.js';

const router = Router();

// GET /api/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/dashboard', (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const start = req.query.start || today;
    const end = req.query.end || today;

    const data = getDailyDashboard(start, end);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
