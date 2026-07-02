/**
 * Lightweight typed API client. Wraps fetch and unwraps the {data} envelope.
 */

const BASE = '/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = localStorage.getItem('homestock_token');
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(url.pathname + url.search, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    // Expired/invalid session: clear it and send the user to login.
    // Auth endpoints are excluded — a failed login is not a session expiry.
    if (res.status === 401 && !path.startsWith('/auth')) {
      localStorage.removeItem('homestock_token');
      localStorage.removeItem('homestock_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    const err = json?.error ?? { code: 'UNKNOWN', message: res.statusText };
    throw new ApiError(res.status, err.code, err.message, err.field);
  }

  return (json?.data ?? json) as T;
}
