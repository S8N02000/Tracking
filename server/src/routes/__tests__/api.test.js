import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { getDatabase, closeDatabase } from '../../database/db.js';
import { runMigrations } from '../../database/migrate.js';
import path from 'path';
import fs from 'fs';

describe('Complete REST API Integration Tests', () => {
  const tempDbPath = path.resolve(process.cwd(), 'temp_api_test.db');
  const adminSecret = process.env.ADMIN_SECRET || 'secret_admin_token_123456';

  beforeEach(() => {
    process.env.DB_PATH = tempDbPath;
    runMigrations(tempDbPath);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  });

  it('CRUD Foods via REST API', async () => {
    // 1. GET foods (public)
    const resGet = await request(app).get('/api/foods');
    expect(resGet.status).toBe(200);

    // 2. POST food without token -> 401
    const resPostUnauth = await request(app)
      .post('/api/foods')
      .send({ name: 'Pomme', category: 'fruit' });
    expect(resPostUnauth.status).toBe(401);

    // 3. POST food with admin token -> 201
    const resPost = await request(app)
      .post('/api/foods')
      .set('Authorization', `Bearer ${adminSecret}`)
      .send({
        name: 'Pomme Gala',
        category: 'fruit',
        energy_kcal_100g: 52,
        carbohydrates_g_100g: 14,
        sugars_g_100g: 10,
        fiber_g_100g: 2.4
      });

    expect(resPost.status).toBe(201);
    expect(resPost.body.id).toBeDefined();
    const foodId = resPost.body.id;

    // 4. PUT food with admin token -> 200
    const resPut = await request(app)
      .put(`/api/foods/${foodId}`)
      .set('Authorization', `Bearer ${adminSecret}`)
      .send({ name: 'Pomme Gala Bio' });
    expect(resPut.status).toBe(200);
    expect(resPut.body.name).toBe('Pomme Gala Bio');

    // 5. DELETE food -> 200
    const resDel = await request(app)
      .delete(`/api/foods/${foodId}`)
      .set('Authorization', `Bearer ${adminSecret}`);
    expect(resDel.status).toBe(200);
  });

  it('Meal Log and Sport Log API', async () => {
    // Insert food first
    const db = getDatabase(tempDbPath);
    const fId = db.prepare(`
      INSERT INTO foods (name, category, energy_kcal_100g) VALUES ('Riz', 'cereale', 130)
    `).run().lastInsertRowid;

    // POST Meal
    const resMeal = await request(app)
      .post('/api/meals')
      .set('Authorization', `Bearer ${adminSecret}`)
      .send({
        date_: '2026-08-15',
        period: 'dejeuner',
        food_id: fId,
        quantity_g: 200
      });
    expect(resMeal.status).toBe(201);

    // GET Meals
    const resGetMeals = await request(app).get('/api/meals?date=2026-08-15');
    expect(resGetMeals.status).toBe(200);
    expect(resGetMeals.body.length).toBe(1);

    // POST Sport
    const resSport = await request(app)
      .post('/api/sports')
      .set('Authorization', `Bearer ${adminSecret}`)
      .send({
        date_: '2026-08-15',
        sport_type: 'velo',
        duration_min: 45,
        kcal_burned: 400
      });
    expect(resSport.status).toBe(201);

    // GET Dashboard
    const resDash = await request(app).get('/api/dashboard?start=2026-08-15&end=2026-08-15');
    expect(resDash.status).toBe(200);
    expect(resDash.body.rows[0].kcal_in).toBe(260); // 200g * 130/100 = 260
    expect(resDash.body.rows[0].kcal_sport).toBe(400);
  });

  it('Boditrax Upload API', async () => {
    const csvContent = `User Details\nEmail,FirstName\nlombard@test.com,Nicolas\nUser Scan Details\nBodyMetricTypeId,Value,CreatedDate\nBodyWeight,104,2,15/08/2026 08:00:00\nUser Login Details\n`;
    const buffer = Buffer.from(csvContent, 'utf8');

    const res = await request(app)
      .post('/api/boditrax/upload')
      .set('Authorization', `Bearer ${adminSecret}`)
      .attach('file', buffer, 'boditrax.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.inserted).toBe(1);
  });
});
