import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { runMigrations } from './database/migrate.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import foodsRoutes from './routes/foods.js';
import recipesRoutes from './routes/recipes.js';
import mealsRoutes from './routes/meals.js';
import sportsRoutes from './routes/sports.js';
import targetsRoutes from './routes/targets.js';
import dashboardRoutes from './routes/dashboard.js';
import analyticsRoutes from './routes/analytics.js';
import boditraxRoutes from './routes/boditrax.js';
import openfoodfactsRoutes from './routes/openfoodfacts.js';

dotenv.config();

// Ensure migrations run on server startup
try {
  runMigrations();
} catch (err) {
  console.error('Failed to run initial migrations:', err);
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for Vite PWA SPA assets
}));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Global Authentication Middleware
app.use(authMiddleware);

// API Routes Mount
app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', foodsRoutes);
app.use('/api', recipesRoutes);
app.use('/api', mealsRoutes);
app.use('/api', sportsRoutes);
app.use('/api', targetsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', boditraxRoutes);
app.use('/api', openfoodfactsRoutes);

// Serve static client build
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
app.use(express.static(clientDistPath));

// SPA Fallback: serve index.html for all non-API GET routes (e.g. /logs?date=2026-08-09)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Global Error Handler
app.use(errorHandler);

export default app;
