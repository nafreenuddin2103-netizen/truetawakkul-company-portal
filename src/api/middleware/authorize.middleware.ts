import { Request, Response, NextFunction } from 'express';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js';

export function authorize(...allowedRoles: UserRoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication context missing'));
    }

    const hasPermission = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Forbidden. Access requires one of the following roles: [${allowedRoles.join(', ')}]`
        )
      );
    }

    return next();
  };
}
