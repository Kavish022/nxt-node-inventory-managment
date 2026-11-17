import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Auth Security Endpoints', () => {
  it('rejects /api/v1/auth/login when required fields are missing', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({}); // Empty payload

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('blocks unauthorized access to protected /api/v1/auth/me without cookie or token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
