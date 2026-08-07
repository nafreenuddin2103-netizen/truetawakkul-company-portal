import { db } from '../../../infrastructure/database/pg-client.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { OnboardingStatus } from '../../../domain/enums/onboarding-status.enum.js';
import { ConflictError, NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';

export interface VerifyApplicationDTO {
  applicationId: string;
  result: 'PASSED' | 'CHANGES_REQUESTED' | 'REJECTED';
  notes: string;
  proofImages?: string[];
  gpsLatitude?: number;
  gpsLongitude?: number;
  ifMatchVersion: number;
  verifierId: string;
}

export class VerifyOnboardingApplicationUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(dto: VerifyApplicationDTO) {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.status !== OnboardingStatus.WAITING_MANUAL_VERIFICATION) {
      throw new ConflictError(`Application cannot be verified. Current status is ${app.status}, expected WAITING_MANUAL_VERIFICATION`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    const nextStatus = dto.result === 'PASSED' ? OnboardingStatus.MANUAL_VERIFICATION_COMPLETED : OnboardingStatus.REJECTED;

    return await db.withTransaction(async (client) => {
      let gpsSql = 'NULL';
      if (dto.gpsLatitude !== undefined && dto.gpsLongitude !== undefined) {
        gpsSql = `ST_SetSRID(ST_MakePoint(${dto.gpsLongitude}, ${dto.gpsLatitude}), 4326)`;
      }

      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          status = $3,
          verification_result = $4,
          verified_by = $5,
          verification_date = NOW(),
          verification_notes = $6,
          verification_images = $7::jsonb,
          gps_confirmation = ${gpsSql},
          current_step = GREATEST(current_step, 6),
          version = version + 1,
          updated_at = NOW()
         WHERE id = $1 AND version = $2
         RETURNING *`,
        [
          app.id, dto.ifMatchVersion, nextStatus, dto.result,
          dto.verifierId, dto.notes, JSON.stringify(dto.proofImages ?? [])
        ]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during manual verification update');
      }

      await client.query(
        `INSERT INTO app.onboarding_application_history (
          application_id, from_status, to_status, changed_by, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [app.id, app.status, nextStatus, dto.verifierId, `Manual verification completed. Result: ${dto.result}. Notes: ${dto.notes}`]
      );

      return {
        applicationId: app.id,
        status: nextStatus,
        verificationResult: dto.result,
        version: Number(appRes.rows[0].version)
      };
    });
  }
}
