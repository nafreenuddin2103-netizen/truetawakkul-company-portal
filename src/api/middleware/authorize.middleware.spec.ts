import { describe, it, expect, vi } from 'vitest';
import { authorize } from './authorize.middleware.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js';

describe('Authorize Middleware', () => {
  it('should allow access if user has COMPANY_SUPER_ADMIN role', () => {
    const middleware = authorize(UserRoleCode.COMPANY_SUPER_ADMIN);
    const req: any = {
      user: {
        sub: 'usr-1',
        roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
      }
    };
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should reject access with ForbiddenError (403) if user lacks required role', () => {
    const middleware = authorize(UserRoleCode.COMPANY_SUPER_ADMIN);
    const req: any = {
      user: {
        sub: 'usr-2',
        roles: [UserRoleCode.MOSQUE_ADMIN]
      }
    };
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should reject with UnauthorizedError (401) if req.user is undefined', () => {
    const middleware = authorize(UserRoleCode.COMPANY_SUPER_ADMIN);
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
