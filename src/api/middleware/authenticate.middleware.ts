import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../../shared/crypto/jwt-token.service.js';
import { UnauthorizedError } from '../../shared/errors/app-error.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = JwtTokenService.verify(token);
    req.user = payload;
    return next();
  } catch {
    return next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}
