import { db } from '../../../infrastructure/database/pg-client.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { OnboardingStatus } from '../../../domain/enums/onboarding-status.enum.js';
import { ConflictError, NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';

export interface SubmitApplicationDTO {
  applicationId: string;
  ifMatchVersion: number;
  submittedBy: string;
}

export class SubmitOnboardingApplicationUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(dto: SubmitApplicationDTO) {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.isLocked || app.status !== OnboardingStatus.IN_PROGRESS) {
      throw new ConflictError(`Application cannot be submitted. Current status: ${app.status}, isLocked: ${app.isLocked}`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    return await db.withTransaction(async (client) => {
      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          status = 'WAITING_MANUAL_VERIFICATION',
          is_locked = true,
          current_step = GREATEST(current_step, 5),
          version = version + 1,
          updated_at = NOW()
         WHERE id = $1 AND version = $2 AND is_locked = false
         RETURNING *`,
        [app.id, dto.ifMatchVersion]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during application submission');
      }

      await client.query(
        `INSERT INTO app.onboarding_application_history (
          application_id, from_status, to_status, changed_by, notes
        ) VALUES ($1, $2, $3, $4, $5)`,
        [app.id, app.status, 'WAITING_MANUAL_VERIFICATION', dto.submittedBy, 'Application locked and submitted for manual verification']
      );

      return {
        applicationId: app.id,
        status: 'WAITING_MANUAL_VERIFICATION',
        isLocked: true,
        version: Number(appRes.rows[0].version)
      };
    });
  }
}
