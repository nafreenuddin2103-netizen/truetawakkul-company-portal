import { describe, it, expect } from 'vitest';
import {
  BadRequestError,
  ConflictError,
  PreconditionFailedError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
} from '../../../src/shared/errors/app-error.js';

describe('AppError Hierarchy', () => {
  it('should format ConflictError correctly to JSON response contract', () => {
    const error = new ConflictError('Masjid already exists', { distance_meters: 14.2 });
    
    expect(error.statusCode).toBe(409);
    expect(error.errorCode).toBe('CONFLICT');
    
    const json = error.toJSON();
    expect(json.error.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
    expect(json.error.message).toBe('Masjid already exists');
    expect(json.error.details).toEqual({ distance_meters: 14.2 });
    expect(json.error.timestamp).toBeDefined();
  });

  it('should format PreconditionFailedError correctly for OCC version conflicts', () => {
    const error = new PreconditionFailedError('Version mismatch. Entity has been modified.');
    expect(error.statusCode).toBe(412);
    expect(error.errorCode).toBe('VERSION_MISMATCH');
  });

  it('should format UnauthorizedError and ForbiddenError correctly', () => {
    const unauth = new UnauthorizedError('Token missing or invalid');
    expect(unauth.statusCode).toBe(401);

    const forbidden = new ForbiddenError('Requires COMPANY_SUPER_ADMIN role');
    expect(forbidden.statusCode).toBe(403);
  });
});
