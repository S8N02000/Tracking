import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Health and Auth Endpoints', () => {
  it('GET /api/health should be publicly accessible without token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('POST /api/auth/verify without token should return 401', async () => {
    const res = await request(app).post('/api/auth/verify');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(true);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/auth/verify with invalid token should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', 'Bearer wrong_token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(true);
  });

  it('POST /api/auth/verify with valid token should return 200 { valid: true }', async () => {
    const adminSecret = process.env.ADMIN_SECRET || 'secret_admin_token_123456';
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${adminSecret}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });
});
