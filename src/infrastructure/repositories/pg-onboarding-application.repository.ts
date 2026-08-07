import { db } from '../database/pg-client.js';
import { OnboardingApplicationEntity, OnboardingApplicationProps } from '../../domain/entities/onboarding-application.entity.js';
import { OnboardingStatus } from '../../domain/enums/onboarding-status.enum.js';
import { ConflictError, NotFoundError, PreconditionFailedError } from '../../shared/errors/app-error.js';

export class PgOnboardingApplicationRepository {
  public async findById(id: string): Promise<OnboardingApplicationEntity | null> {
    const res = await db.query('SELECT * FROM app.onboarding_applications WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  public async patchDraftPayload(
    id: string,
    patchData: Record<string, unknown>,
    expectedVersion: number
  ): Promise<OnboardingApplicationEntity> {
    const app = await this.findById(id);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found with ID: ${id}`);
    }

    if (app.isLocked) {
      throw new ConflictError('Cannot modify draft. Application has been submitted and locked for review.');
    }

    if (app.version !== expectedVersion) {
      throw new PreconditionFailedError(
        `Optimistic lock conflict. Expected version ${expectedVersion}, but current version is ${app.version}.`
      );
    }

    const res = await db.query(
      `UPDATE app.onboarding_applications
       SET draft_payload = draft_payload || $2::jsonb,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $1 AND version = $3 AND is_locked = false
       RETURNING *`,
      [id, JSON.stringify(patchData), expectedVersion]
    );

    if (res.rows.length === 0) {
      throw new PreconditionFailedError('Failed to update draft payload due to concurrency conflict or lock.');
    }

    return this.mapToEntity(res.rows[0]);
  }

  private mapToEntity(row: Record<string, unknown>): OnboardingApplicationEntity {
    const props: OnboardingApplicationProps = {
      id: String(row.id),
      applicationNumber: String(row.application_number),
      masjidId: String(row.masjid_id),
      status: row.status as OnboardingStatus,
      currentStep: Number(row.current_step),
      masjidNameEnglish: String(row.masjid_name_english),
      city: String(row.city),
      state: String(row.state),
      country: String(row.country),
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      draftPayload: (row.draft_payload as Record<string, unknown>) ?? {},
      isLocked: Boolean(row.is_locked),
      version: Number(row.version),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at))
    };
    return new OnboardingApplicationEntity(props);
  }
}
