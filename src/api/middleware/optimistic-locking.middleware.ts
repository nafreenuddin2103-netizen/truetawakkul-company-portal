import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../../shared/errors/app-error.js';

export function optimisticLocking(req: Request, _res: Response, next: NextFunction): void {
  const mutatingMethods = ['PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  const ifMatch = req.headers['if-match'];
  if (!ifMatch || typeof ifMatch !== 'string' || ifMatch.trim() === '') {
    return next(new BadRequestError('Missing mandatory If-Match header for optimistic concurrency control'));
  }

  const cleanVersion = ifMatch.replace(/"/g, '').trim();
  const versionNum = parseInt(cleanVersion, 10);
  if (isNaN(versionNum) || versionNum < 1) {
    return next(new BadRequestError('Invalid If-Match header format. Must be an integer version string.'));
  }

  req.ifMatchVersion = versionNum;
  return next();
}
