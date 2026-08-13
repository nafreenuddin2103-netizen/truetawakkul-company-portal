import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { LocationResolutionService } from '../../application/services/location-resolution.service.js';
import { BadRequestError } from '../../shared/errors/app-error.js';

export const locationRouter = Router();
const service = new LocationResolutionService();

// Google Places API endpoints are costly; protect with a strict rate limit.
// 5 requests per IP per minute (FAANG standard for sensitive downstream dependencies)
const locationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many location resolution requests from this IP, please try again after a minute' }
});

const resolveSchema = z.object({
  method: z.enum(['GOOGLE_MAPS', 'GPS']),
  url: z.string().url().max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().min(0).max(10000).optional()
});

const nearbySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(1).max(50000).default(5000)
});

locationRouter.post('/resolve', locationRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resolveSchema.parse(req.body);
    const result = await service.resolveLocation(validatedData);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new BadRequestError('Validation failed: ' + err.errors.map(e => e.message).join(', ')));
    } else {
      next(err);
    }
  }
});

locationRouter.post('/nearby', locationRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = nearbySchema.parse(req.body);
    const result = await service.searchNearbyMosques(validatedData.latitude, validatedData.longitude, validatedData.radiusMeters);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      next(new BadRequestError('Validation failed: ' + err.errors.map(e => e.message).join(', ')));
    } else {
      next(err);
    }
  }
});
