import { db } from '../../../infrastructure/database/pg-client.js';

export class GetOperationalMetricsUseCase {
  public async execute() {
    const masjidCountRes = await db.query(
      `SELECT status, COUNT(*) AS count FROM app.masjids GROUP BY status`
    );

    const appCountRes = await db.query(
      `SELECT status, COUNT(*) AS count FROM app.onboarding_applications GROUP BY status`
    );

    const adminCountRes = await db.query(
      `SELECT COUNT(*) AS total FROM app.users WHERE status = 'ACTIVE'`
    );

    const masjidStats = masjidCountRes.rows.reduce(
      (acc, r) => ({ ...acc, [r.status]: Number(r.count) }),
      {} as Record<string, number>
    );

    const applicationStats = appCountRes.rows.reduce(
      (acc, r) => ({ ...acc, [r.status]: Number(r.count) }),
      {} as Record<string, number>
    );

    return {
      masjids: {
        total: Object.values(masjidStats).reduce((a, b) => a + b, 0),
        active: masjidStats['ACTIVE'] ?? 0,
        inactive: masjidStats['INACTIVE'] ?? 0
      },
      onboardingApplications: {
        total: Object.values(applicationStats).reduce((a, b) => a + b, 0),
        inProgress: applicationStats['IN_PROGRESS'] ?? 0,
        waitingVerification: applicationStats['WAITING_MANUAL_VERIFICATION'] ?? 0,
        goLive: applicationStats['GO_LIVE'] ?? 0,
        rejected: applicationStats['REJECTED'] ?? 0
      },
      users: {
        activeAdmins: Number(adminCountRes.rows[0].total)
      },
      timestamp: new Date()
    };
  }
}
