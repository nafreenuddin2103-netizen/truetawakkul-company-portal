import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { UserRoleCode } from '../../domain/enums/user-role-code.enum.js';
import { SupabaseStorageService } from '../../infrastructure/services/supabase-storage.service.js';
import { GenerateUploadUrlUseCase } from '../../application/use-cases/media/generate-upload-url.usecase.js';
import { ConfirmUploadUseCase } from '../../application/use-cases/media/confirm-upload.usecase.js';
import { db } from '../../infrastructure/database/pg-client.js';
import { z } from 'zod';
import { BadRequestError } from '../../shared/errors/app-error.js';

export const mediaRouter = Router();

const storageService = new SupabaseStorageService();
const generateUploadUrlUseCase = new GenerateUploadUrlUseCase(storageService);
const confirmUploadUseCase = new ConfirmUploadUseCase(storageService, db);

const uploadUrlSchema = z.object({
  masjidId: z.string().uuid(),
  mediaType: z.enum(['logo', 'cover']),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp'])
});

const confirmSchema = z.object({
  masjidId: z.string().uuid(),
  mediaType: z.enum(['logo', 'cover']),
  objectPath: z.string()
});

mediaRouter.post('/:id/media/upload-url', authenticate, authorize(UserRoleCode.COMPANY_SUPER_ADMIN), async (req, res, next) => {
  try {
    const payload = uploadUrlSchema.parse({
      ...req.body,
      masjidId: req.params.id
    });

    const result = await generateUploadUrlUseCase.execute({
      masjidId: payload.masjidId,
      mediaType: payload.mediaType,
      mimeType: payload.mimeType
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

mediaRouter.post('/:id/media/confirm', authenticate, authorize(UserRoleCode.COMPANY_SUPER_ADMIN), async (req, res, next) => {
  try {
    const payload = confirmSchema.parse({
      ...req.body,
      masjidId: req.params.id
    });

    // In a real scenario, the userId comes from the authenticated session (req.user.id)
    const userId = (req as any).user?.id || '00000000-0000-0000-0000-000000000000';

    const result = await confirmUploadUseCase.execute({
      masjidId: payload.masjidId,
      mediaType: payload.mediaType,
      objectPath: payload.objectPath,
      userId
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

mediaRouter.get('/:id/media/download', authenticate, authorize(UserRoleCode.COMPANY_SUPER_ADMIN), async (req, res, next) => {
  try {
    const objectPath = req.query.objectPath as string;
    if (!objectPath) {
      throw new BadRequestError('Missing objectPath query parameter');
    }
    
    // Signed Download URL (Redirect)
    const signedUrl = await storageService.generateDownloadUrl('media', objectPath);
    res.redirect(302, signedUrl);
  } catch (err) {
    next(err);
  }
});
