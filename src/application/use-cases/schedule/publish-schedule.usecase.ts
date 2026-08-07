import { db } from '../../../infrastructure/database/pg-client.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';

export interface PublishScheduleDTO {
  scheduleId: string;
  changeReason: string;
  publishedBy: string;
}

export class PublishScheduleUseCase {
  public async execute(dto: PublishScheduleDTO) {
    const scheduleRes = await db.query(
      'SELECT id, masjid_id, version FROM app.schedules WHERE id = $1',
      [dto.scheduleId]
    );

    if (scheduleRes.rows.length === 0) {
      throw new NotFoundError(`Schedule version not found: ${dto.scheduleId}`);
    }

    const schedule = scheduleRes.rows[0];

    return await db.withTransaction(async (client) => {
      await client.query(
        'UPDATE app.schedules SET is_current = false WHERE masjid_id = $1 AND id != $2',
        [schedule.masjid_id, dto.scheduleId]
      );

      const pubRes = await client.query(
        `UPDATE app.schedules SET
          status = 'PUBLISHED', is_current = true, change_reason = $2,
          published_by = $3, published_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING version, published_at`,
        [dto.scheduleId, dto.changeReason, dto.publishedBy]
      );

      return {
        scheduleId: dto.scheduleId,
        masjidId: String(schedule.masjid_id),
        status: 'PUBLISHED',
        isCurrent: true,
        publishedAt: pubRes.rows[0].published_at
      };
    });
  }
}
