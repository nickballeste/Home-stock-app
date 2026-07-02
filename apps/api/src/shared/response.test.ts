import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { errorHandler } from './response.js';
import { AppError, NotFoundError, ValidationError } from './errors.js';

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe('errorHandler', () => {
  it('maps ZodError to 422 with the first issue message and field path', () => {
    const res = makeRes();
    let zodError: ZodError;
    try {
      z.object({ name: z.string().min(1, 'name required') }).parse({ name: '' });
      throw new Error('unreachable');
    } catch (e) {
      zodError = e as ZodError;
    }

    errorHandler(zodError, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        message: 'name required',
        field: 'name',
      }),
    });
  });

  it('maps AppError subclasses to their status and code', () => {
    const res = makeRes();
    errorHandler(new NotFoundError('PRODUCT_NOT_FOUND', 'nope'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PRODUCT_NOT_FOUND', message: 'nope' },
    });
  });

  it('includes the field for validation errors', () => {
    const res = makeRes();
    errorHandler(new ValidationError('bad date', 'estimatedEndDate'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'bad date', field: 'estimatedEndDate' },
    });
  });

  it('maps unknown errors to 500 without leaking details', () => {
    const res = makeRes();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(new Error('secret internal detail'), req, res, next);
    consoleSpy.mockRestore();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('respects custom AppError status codes', () => {
    const res = makeRes();
    errorHandler(new AppError('TEAPOT', 'short and stout', 418), req, res, next);
    expect(res.status).toHaveBeenCalledWith(418);
  });
});
