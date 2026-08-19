import { describe, it, expect, vi } from 'vitest';
import { idempotency } from './idempotency.middleware.js';
import { BadRequestError, ConflictError } from '../../shared/errors/app-error.js';

describe('Idempotency Middleware', () => {
  it('should pass through non-mutating GET requests without requiring Idempotency-Key header', async () => {
    const middleware = idempotency();
    const req: any = { method: 'GET', headers: {} };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should throw BadRequestError if Idempotency-Key header is missing on POST request', async () => {
    const middleware = idempotency();
    const req: any = { method: 'POST', headers: {} };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('should return cached response if request was previously completed', async () => {
    const mockRepo = {
      reserveOrGet: vi.fn().mockResolvedValue({
        isCached: true,
        record: {
          status: 'COMPLETED',
          responseCode: 201,
          responseBody: { application_id: 'app-999' }
        }
      }),
      complete: vi.fn()
    };

    const middleware = idempotency(mockRepo as any);
    const req: any = {
      method: 'POST',
      path: '/onboarding/applications',
      headers: { 'idempotency-key': 'idem-key-1' },
      user: { sub: 'usr-1' }
    };
    const res: any = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Lookup', 'HIT-IDEMPOTENT');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ application_id: 'app-999' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject concurrent processing requests with ConflictError (409)', async () => {
    const mockRepo = {
      reserveOrGet: vi.fn().mockRejectedValue(new ConflictError('Concurrent request in progress')),
      complete: vi.fn()
    };

    const middleware = idempotency(mockRepo as any);
    const req: any = {
      method: 'POST',
      path: '/onboarding/applications',
      headers: { 'idempotency-key': 'idem-key-1' },
      user: { sub: 'usr-1' }
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ConflictError));
  });
});
