import { describe, it, expect, vi } from 'vitest';
import { authenticate } from './authenticate.middleware.js';
import { JwtTokenService } from '../../shared/crypto/jwt-token.service.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';

describe('Authenticate Middleware', () => {
  it('should attach user payload to req on valid Bearer token', () => {
    const token = JwtTokenService.sign({
      sub: 'usr-123',
      mobilePhone: '+919900112233',
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
    });

    const req: any = {
      headers: { authorization: `Bearer ${token}` }
    };
    const res: any = {};
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('usr-123');
    expect(req.user.roles).toContain(UserRoleCode.COMPANY_SUPER_ADMIN);
  });

  it('should call next with UnauthorizedError if Authorization header is missing', () => {
    const req: any = { headers: {} };
    const res: any = {};
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should call next with UnauthorizedError if token is invalid or corrupted', () => {
    const req: any = {
      headers: { authorization: 'Bearer invalid.jwt.token' }
    };
    const res: any = {};
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
