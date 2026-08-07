import { db } from '../../../infrastructure/database/pg-client.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';

export interface SaveMasjidDetailsDTO {
  applicationId: string;
  nameEnglish: string;
  nameArabic?: string;
  category?: string;
  capacity?: number;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  facilities?: string[];
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  timezone: string;
  ifMatchVersion: number;
  updatedBy: string;
}

export class SaveMasjidDetailsUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(dto: SaveMasjidDetailsDTO) {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    return await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE app.masjids SET
          name_english = $2, name_arabic = $3, category = $4, capacity = $5, description = $6,
          contact_phone = $7, contact_email = $8, website = $9, facilities = $10::jsonb,
          address_line1 = $11, city = $12, state = $13, country = $14, postal_code = $15,
          timezone = $16, updated_by = $17, updated_at = NOW()
         WHERE id = $1`,
        [
          app.masjidId, dto.nameEnglish, dto.nameArabic ?? null, dto.category ?? null,
          dto.capacity ?? null, dto.description ?? null, dto.contactPhone ?? null,
          dto.contactEmail ?? null, dto.website ?? null, JSON.stringify(dto.facilities ?? []),
          dto.addressLine1, dto.city, dto.state, dto.country, dto.postalCode ?? null,
          dto.timezone, dto.updatedBy
        ]
      );

      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          masjid_name_english = $2, city = $3, state = $4, country = $5,
          current_step = GREATEST(current_step, 2),
          version = version + 1, updated_at = NOW()
         WHERE id = $1 AND version = $6
         RETURNING *`,
        [app.id, dto.nameEnglish, dto.city, dto.state, dto.country, dto.ifMatchVersion]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during application step 2 save');
      }

      return {
        applicationId: app.id,
        masjidId: app.masjidId,
        currentStep: Math.max(app.currentStep, 2),
        version: Number(appRes.rows[0].version)
      };
    });
  }
}
