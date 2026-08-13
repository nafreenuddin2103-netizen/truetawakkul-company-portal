import { IStorageService } from '../../ports/storage.service.interface.js';
import { DatabaseClient } from '../../../infrastructure/database/pg-client.js';
import { BadRequestError } from '../../../shared/errors/app-error.js';

export interface ConfirmUploadRequest {
  masjidId: string;
  mediaType: 'logo' | 'cover';
  objectPath: string;
  userId: string;
}

export class ConfirmUploadUseCase {
  constructor(private storageService: IStorageService, private dbClient: DatabaseClient) {}

  async execute(req: ConfirmUploadRequest): Promise<{ id: string }> {
    const bucket = 'media';

    // 1. Verify object actually exists in the storage provider and retrieve its metadata
    const metadata = await this.storageService.verifyObjectExists(bucket, req.objectPath);
    
    if (!metadata) {
      throw new BadRequestError('File upload confirmation failed. Object not found in storage.');
    }

    if (metadata.size === 0) {
      throw new BadRequestError('File upload confirmation failed. Object is empty.');
    }

    // 2. Perform database transaction to record the media object
    return this.dbClient.withTransaction(async (client) => {
      // The user wants a virus scanning queue. We insert it as PENDING_MODERATION (or SCAN_PENDING in a future iteration)
      const insertQuery = `
        INSERT INTO app.media (
          masjid_id, 
          media_type, 
          storage_provider, 
          storage_key, 
          mime_type, 
          size_bytes, 
          sha256_checksum,
          status,
          uploaded_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) RETURNING id
      `;

      // We use a dummy checksum here since the client uploads directly to S3.
      // In a real scenario, the client could provide the checksum, or an edge function could compute it.
      const checksum = 'pending-checksum';

      const result = await client.query(insertQuery, [
        req.masjidId,
        req.mediaType.toUpperCase(),
        'SUPABASE',
        req.objectPath,
        metadata.mimeType,
        metadata.size,
        checksum,
        'PENDING_MODERATION',
        req.userId
      ]);

      return { id: result.rows[0].id };
    });
  }
}
