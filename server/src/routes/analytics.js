import { Router } from 'express';
import {
  getCorrelationSeries,
  getMicronutrientsRadar,
  getMealDistribution,
  getClinicalDiagnostics
} from '../services/analyticsService.js';

const router = Router();

// GET /api/analytics/correlation?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/analytics/correlation', (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const start = req.query.start || today;
    const end = req.query.end || today;

    const data = getCorrelationSeries(start, end);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/radar?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/analytics/radar', (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const start = req.query.start || today;
    const end = req.query.end || today;

    const data = getMicronutrientsRadar(start, end);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/meal-distribution?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/analytics/meal-distribution', (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const start = req.query.start || today;
    const end = req.query.end || today;

    const data = getMealDistribution(start, end);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/diagnostics?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/analytics/diagnostics', (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const start = req.query.start || today;
    const end = req.query.end || today;

    const data = getClinicalDiagnostics(start, end);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;

