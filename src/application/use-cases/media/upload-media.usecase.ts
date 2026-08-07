import { PgMediaRepository } from '../../../infrastructure/repositories/pg-media.repository.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { MediaEntity } from '../../../domain/entities/media.entity.js';
import { MediaType, MediaStatus } from '../../../domain/enums/media-type.enum.js';
import { NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';
import { db } from '../../../infrastructure/database/pg-client.js';

export interface UploadMediaDTO {
  applicationId: string;
  mediaType: MediaType;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  width?: number;
  height?: number;
  blurhash?: string;
  ifMatchVersion: number;
  uploadedBy: string;
}

export class UploadMediaUseCase {
  constructor(
    private readonly appRepo: PgOnboardingApplicationRepository,
    private readonly mediaRepo: PgMediaRepository
  ) {}

  public async execute(dto: UploadMediaDTO): Promise<MediaEntity> {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    const mediaId = crypto.randomUUID();
    const media = new MediaEntity({
      id: mediaId,
      masjidId: app.masjidId,
      mediaType: dto.mediaType,
      storageProvider: 'SUPABASE',
      storageKey: dto.storageKey,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      sha256Checksum: dto.sha256Checksum,
      width: dto.width ?? null,
      height: dto.height ?? null,
      blurhash: dto.blurhash ?? null,
      status: MediaStatus.PENDING_MODERATION,
      uploadedBy: dto.uploadedBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return await db.withTransaction(async (client) => {
      const savedMedia = await this.mediaRepo.save(media);

      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          current_step = GREATEST(current_step, 4),
          version = version + 1,
          updated_at = NOW()
         WHERE id = $1 AND version = $2
         RETURNING *`,
        [app.id, dto.ifMatchVersion]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during application step 4 media upload');
      }

      return savedMedia;
    });
  }
}
