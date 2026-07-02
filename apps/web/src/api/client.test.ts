import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from './client';

const fetchMock = vi.fn();
const localStorageMock = {
  store: new Map<string, string>(),
  getItem: (k: string) => localStorageMock.store.get(k) ?? null,
  setItem: (k: string, v: string) => void localStorageMock.store.set(k, v),
  removeItem: (k: string) => void localStorageMock.store.delete(k),
};
const locationMock = {
  origin: 'http://localhost',
  pathname: '/',
  assign: vi.fn(),
};

vi.stubGlobal('fetch', fetchMock);
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('window', { location: locationMock });

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  };
}

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    locationMock.assign.mockReset();
    locationMock.pathname = '/';
    localStorageMock.store.clear();
  });

  it('unwraps the { data } envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 'p1' } }));
    const result = await api<{ id: string }>('/products/p1');
    expect(result).toEqual({ id: 'p1' });
  });

  it('serializes query params and skips empty ones', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [] }));
    await api('/products', { query: { search: 'soap', status: undefined, categoryId: '' } });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toBe('/api/v1/products?search=soap');
  });

  it('attaches the Bearer token from localStorage', async () => {
    localStorageMock.setItem('homestock_token', 'tok-123');
    fetchMock.mockResolvedValue(jsonResponse(200, { data: null }));
    await api('/members');
    const init = fetchMock.mock.calls[0]![1] as { headers: Record<string, string> };
    expect(init.headers.authorization).toBe('Bearer tok-123');
  });

  it('throws a typed ApiError with the server error code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, { error: { code: 'PRODUCT_NOT_FOUND', message: 'nope' } }),
    );
    const err = await api('/products/x').catch((e) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    await expect(api('/products/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('clears the session and redirects to /login on 401', async () => {
    localStorageMock.setItem('homestock_token', 'expired');
    localStorageMock.setItem('homestock_user', '{"id":"u1"}');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
    );

    await expect(api('/products')).rejects.toBeInstanceOf(ApiError);
    expect(localStorageMock.getItem('homestock_token')).toBeNull();
    expect(localStorageMock.getItem('homestock_user')).toBeNull();
    expect(locationMock.assign).toHaveBeenCalledWith('/login');
  });

  it('does NOT clear the session on a failed login (401 from /auth)', async () => {
    localStorageMock.setItem('homestock_token', 'still-valid');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
    );

    await expect(
      api('/auth/login', { method: 'POST', body: { email: 'x@y.z', password: 'bad' } }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(localStorageMock.getItem('homestock_token')).toBe('still-valid');
    expect(locationMock.assign).not.toHaveBeenCalled();
  });
});
