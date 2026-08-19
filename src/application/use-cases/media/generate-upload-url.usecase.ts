import { IStorageService } from '../../ports/storage.service.interface.js';
import { env } from '../../../config/env.js';
import crypto from 'crypto';
import { BadRequestError } from '../../../shared/errors/app-error.js';

export interface GenerateUploadUrlRequest {
  masjidId: string;
  mediaType: 'logo' | 'cover';
  mimeType: string;
}

export class GenerateUploadUrlUseCase {
  constructor(private storageService: IStorageService) {}

  async execute(req: GenerateUploadUrlRequest): Promise<{ signedUrl: string; objectPath: string }> {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(req.mimeType)) {
      throw new BadRequestError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    // Generate a unique UUID for the object
    const uuid = crypto.randomUUID();
    const extension = req.mimeType.split('/')[1]; // e.g., jpeg, png
    
    // Object Naming Convention: masjids/{masjidId}/{mediaType}/{uuid}.{ext}
    const objectPath = `masjids/${req.masjidId}/${req.mediaType}/${uuid}.${extension}`;
    
    // Max 5MB
    const maxSize = 5 * 1024 * 1024;
    
    const signedUrl = await this.storageService.generateUploadUrl(
      env.SUPABASE_STORAGE_BUCKET,
      objectPath,
      req.mimeType,
      maxSize
    );

    return { signedUrl, objectPath };
  }
}
