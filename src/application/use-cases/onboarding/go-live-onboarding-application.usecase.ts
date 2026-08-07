import { db } from '../../../infrastructure/database/pg-client.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { QualityGateEngine } from '../../services/quality-gate.engine.js';
import { NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';

export interface GoLiveApplicationDTO {
  applicationId: string;
  ifMatchVersion: number;
  approvedBy: string;
}

export class GoLiveOnboardingApplicationUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) { }

  public async execute(dto: GoLiveApplicationDTO) {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    await QualityGateEngine.validateForGoLive(app);

    return await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE app.masjids SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
        [app.masjidId]
      );

      await client.query(
        `UPDATE app.schedules SET
          status = 'PUBLISHED', published_by = $2, published_at = NOW()
         WHERE masjid_id = $1 AND is_current = true`,
        [app.masjidId, dto.approvedBy]
      );

      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          status = 'GO_LIVE',
          current_step = 8,
          version = version + 1,
          updated_at = NOW()
         WHERE id = $1 AND version = $2
         RETURNING *`,
        [app.id, dto.ifMatchVersion]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during Go-Live activation');
      }

      await client.query(
        `INSERT INTO app.onboarding_application_history (
          application_id, from_status, to_status, changed_by, notes
        ) VALUES ($1, $2, 'GO_LIVE', $3, 'Quality Gate passed. Masjid activated and live on platform.')`,
        [app.id, app.status, dto.approvedBy]
      );

      return {
        applicationId: app.id,
        masjidId: app.masjidId,
        status: 'GO_LIVE',
        masjidStatus: 'ACTIVE',
        version: Number(appRes.rows[0].version)
      };
    });
  }
}
