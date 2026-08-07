import { describe, it, expect, vi } from 'vitest';
import { optimisticLocking } from '../../../src/api/middleware/optimistic-locking.middleware.js';
import { BadRequestError } from '../../../src/shared/errors/app-error.js';

describe('Optimistic Locking Middleware', () => {
  it('should parse valid If-Match version header and attach to req.ifMatchVersion', () => {
    const req: any = {
      method: 'PUT',
      headers: { 'if-match': '"4"' }
    };
    const res: any = {};
    const next = vi.fn();

    optimisticLocking(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.ifMatchVersion).toBe(4);
  });

  it('should throw BadRequestError if If-Match header is missing on PUT request', () => {
    const req: any = { method: 'PUT', headers: {} };
    const res: any = {};
    const next = vi.fn();

    optimisticLocking(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('should throw BadRequestError if If-Match header is not a valid integer', () => {
    const req: any = {
      method: 'PATCH',
      headers: { 'if-match': 'invalid-version' }
    };
    const res: any = {};
    const next = vi.fn();

    optimisticLocking(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('should ignore GET requests without enforcing If-Match header', () => {
    const req: any = { method: 'GET', headers: {} };
    const res: any = {};
    const next = vi.fn();

    optimisticLocking(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
