import { Request, Response, NextFunction } from 'express';
import { BadRequestError, UnauthorizedError } from '../../shared/errors/app-error.js';
import { PgIdempotencyRepository } from '../../infrastructure/repositories/pg-idempotency.repository.js';

const idempotencyRepo = new PgIdempotencyRepository();

export function idempotency(repo: PgIdempotencyRepository = idempotencyRepo) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method.toUpperCase())) {
      return next();
    }

    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return next(new BadRequestError('Missing mandatory Idempotency-Key header on mutating endpoint'));
    }

    if (!req.user?.sub) {
      return next(new UnauthorizedError('Authentication context required for idempotency check'));
    }

    try {
      const fingerprint = `${req.method}:${req.path}:${JSON.stringify(req.body ?? {})}`;
      const { isCached, record } = await repo.reserveOrGet(
        req.user.sub,
        key.trim(),
        req.method,
        req.path,
        fingerprint
      );

      if (isCached && record.responseCode) {
        res.setHeader('X-Cache-Lookup', 'HIT-IDEMPOTENT');
        res.status(record.responseCode).json(record.responseBody);
        return;
      }

      req.idempotencyKey = key.trim();

      const originalJson = res.json.bind(res);
      res.json = (body: unknown): Response => {
        repo.complete(req.user!.sub, key.trim(), res.statusCode, body).catch(() => {});
        return originalJson(body);
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
