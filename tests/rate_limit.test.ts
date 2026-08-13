import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Express Rate Limiting Security Suite', () => {
  it('should allow requests within rate limit threshold', async () => {
    const app = express();
    const testLimiter = rateLimit({ windowMs: 60000, max: 10 });
    app.use(testLimiter);
    app.get('/test-limit-pass', (req, res) => res.status(200).json({ ok: true }));

    const res = await request(app).get('/test-limit-pass');
    expect(res.status).toBe(200);
  });

  it('should enforce rate limiting HTTP 429 when max threshold is exceeded', async () => {
    const app = express();
    app.use(express.json());

    const strictLimiter = rateLimit({
      windowMs: 60000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too Many Requests' }
    });

    app.post('/auth/test-limit-strict', strictLimiter, (req, res) => res.status(401).json({ error: 'Invalid' }));

    await request(app).post('/auth/test-limit-strict').send({ email: 'a@example.com' });
    await request(app).post('/auth/test-limit-strict').send({ email: 'a@example.com' });

    const thirdRes = await request(app).post('/auth/test-limit-strict').send({ email: 'a@example.com' });

    expect(thirdRes.status).toBe(429);
    expect(thirdRes.body.error).toBe('Too Many Requests');
  });
});
