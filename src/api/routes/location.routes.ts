import { Router, Request, Response, NextFunction } from 'express';
import { LocationResolutionService } from '../../application/services/location-resolution.service.js';

export const locationRouter = Router();
const service = new LocationResolutionService();

locationRouter.post('/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.resolveLocation(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
