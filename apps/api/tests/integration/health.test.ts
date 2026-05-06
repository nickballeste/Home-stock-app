import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// AI service requires ANTHROPIC_API_KEY; provide one for module init only.
process.env.ANTHROPIC_API_KEY ??= 'sk-test';
process.env.AUTH_DISABLED = 'true';

const aiMock = {
  extractRoutineFromPrompt: vi.fn(),
  inferProductDuration: vi.fn(),
  extractProductFromImage: vi.fn(),
};

const emailMock = { send: vi.fn() };

const { createApp } = await import('../../src/app.js');

describe('app smoke', () => {
  const app = createApp({ ai: aiMock, email: emailMock });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404-shaped error for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
  });
});
