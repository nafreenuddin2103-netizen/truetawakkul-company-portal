import { PgOnboardingApplicationRepository } from '../../../infrastructure/repositories/pg-onboarding-application.repository.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';
import { db } from '../../../infrastructure/database/pg-client.js';

export class GetOnboardingApplicationUseCase {
  constructor(private readonly appRepo: PgOnboardingApplicationRepository) {}

  public async execute(applicationId: string) {
    const app = await this.appRepo.findById(applicationId);
    if (!app) {
      throw new NotFoundError(`Onboarding application not found with ID: ${applicationId}`);
    }

    const masjidRes = await db.query('SELECT * FROM app.masjids WHERE id = $1', [app.masjidId]);
    const masjid = masjidRes.rows[0] ?? null;

    const scheduleRes = await db.query(
      `SELECT s.id, s.title, s.status, se.prayer_name, se.adhan_time, se.iqamah_time
       FROM app.schedules s
       LEFT JOIN app.schedule_entries se ON s.id = se.schedule_id
       WHERE s.masjid_id = $1 AND s.is_current = true`,
      [app.masjidId]
    );

    return {
      application: app.toJSON(),
      masjid: masjid
        ? {
            id: String(masjid.id),
            nameEnglish: String(masjid.name_english),
            nameArabic: masjid.name_arabic ? String(masjid.name_arabic) : null,
            category: masjid.category ? String(masjid.category) : null,
            capacity: masjid.capacity ? Number(masjid.capacity) : null,
            facilities: masjid.facilities ?? [],
            addressLine1: String(masjid.address_line1),
            city: String(masjid.city),
            state: String(masjid.state),
            country: String(masjid.country),
            timezone: String(masjid.timezone),
            latitude: Number(masjid.latitude),
            longitude: Number(masjid.longitude),
            status: String(masjid.status),
            governanceState: String(masjid.governance_state)
          }
        : null,
      schedule: scheduleRes.rows.length > 0
        ? {
            id: String(scheduleRes.rows[0].id),
            title: String(scheduleRes.rows[0].title),
            entries: scheduleRes.rows
              .filter((r) => r.prayer_name)
              .map((r) => ({
                prayerName: String(r.prayer_name),
                adhanTime: r.adhan_time ? String(r.adhan_time) : null,
                iqamahTime: r.iqamah_time ? String(r.iqamah_time) : null
              }))
          }
        : null
    };
  }
}
