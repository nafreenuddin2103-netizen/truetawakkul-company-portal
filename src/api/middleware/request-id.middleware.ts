import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if Cloudflare or another proxy already sent an X-Request-ID
  const requestIdHeader = req.headers['x-request-id'] || req.headers['cf-ray'] || crypto.randomUUID();
  const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
  
  // Attach it to locals for downstream access (e.g. Pino logger)
  res.locals.requestId = requestId;

  // Include it in the response header for client-side tracing
  res.setHeader('X-Request-ID', requestId);

  next();
};
