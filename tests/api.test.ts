import request from 'supertest';
import app from '../src/index';

describe('PulseOps Core API Suite', () => {
  it('GET /health should return 200 UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('PulseOps Backend API');
  });

  it('GET /api/v1/auth/me without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/v1/auth/register with invalid email should return 400 Validation Error', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      email: 'not-an-email',
      password: '123'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('GET /api-docs.json should return OpenAPI specification JSON', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toContain('PulseOps API Specification');
  });
});
