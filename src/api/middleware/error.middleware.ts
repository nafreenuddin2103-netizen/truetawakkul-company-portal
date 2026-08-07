import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../shared/logger/logger.js';

// Express requires exactly 4 arguments (err, req, res, next) for error-handling middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    logger.warn({ err, path: req.path, method: req.method }, `AppError caught: ${err.message}`);
    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details ?? null
      }
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled server error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.'
    }
  });
}
