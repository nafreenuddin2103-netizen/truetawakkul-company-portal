import { db } from '../../../infrastructure/database/pg-client.js';
import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { NotFoundError, PreconditionFailedError } from '../../../shared/errors/app-error.js';

export interface PrayerEntryInput {
  prayerName: 'FAJR' | 'SUNRISE' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA' | 'JUMUAH';
  adhanTime?: string;
  iqamahTime?: string;
}

export interface SaveTimetableDraftDTO {
  applicationId: string;
  entries: PrayerEntryInput[];
  ifMatchVersion: number;
  updatedBy: string;
}

export class SaveTimetableDraftUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(dto: SaveTimetableDraftDTO) {
    const app = await this.appRepo.findById(dto.applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found: ${dto.applicationId}`);
    }

    if (app.version !== dto.ifMatchVersion) {
      throw new PreconditionFailedError(`Optimistic lock conflict. Expected version ${dto.ifMatchVersion}, current is ${app.version}`);
    }

    return await db.withTransaction(async (client) => {
      const scheduleRes = await client.query(
        `INSERT INTO app.schedules (
          masjid_id, title, status, is_current, change_reason, created_by
        ) VALUES ($1, 'Onboarding Draft Schedule', 'DRAFT', true, 'INITIAL_ONBOARDING', $2)
        RETURNING id`,
        [app.masjidId, dto.updatedBy]
      );

      const scheduleId = scheduleRes.rows[0].id;

      for (const entry of dto.entries) {
        await client.query(
          `INSERT INTO app.schedule_entries (schedule_id, prayer_name, adhan_time, iqamah_time)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (schedule_id, prayer_name) DO UPDATE SET
             adhan_time = EXCLUDED.adhan_time,
             iqamah_time = EXCLUDED.iqamah_time,
             updated_at = NOW()`,
          [scheduleId, entry.prayerName, entry.adhanTime ?? null, entry.iqamahTime ?? null]
        );
      }

      const appRes = await client.query(
        `UPDATE app.onboarding_applications SET
          current_step = GREATEST(current_step, 3),
          version = version + 1,
          updated_at = NOW()
         WHERE id = $1 AND version = $2
         RETURNING *`,
        [app.id, dto.ifMatchVersion]
      );

      if (appRes.rows.length === 0) {
        throw new PreconditionFailedError('Optimistic lock conflict during application step 3 timetable draft save');
      }

      return {
        applicationId: app.id,
        scheduleId: String(scheduleId),
        currentStep: Math.max(app.currentStep, 3),
        version: Number(appRes.rows[0].version)
      };
    });
  }
}
