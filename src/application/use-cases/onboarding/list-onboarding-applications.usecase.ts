import { db } from '../../../infrastructure/database/pg-client.js';

export interface ListApplicationsFilter {
  page?: number;
  limit?: number;
  status?: string;
  city?: string;
}

export class ListOnboardingApplicationsUseCase {
  public async execute(filter: ListApplicationsFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filter.status) {
      params.push(filter.status);
      whereClauses.push(`status = $${params.length}`);
    }

    if (filter.city) {
      params.push(`%${filter.city}%`);
      whereClauses.push(`city ILIKE $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) AS total FROM app.onboarding_applications ${whereSql}`, params);
    const total = Number(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await db.query(
      `SELECT * FROM app.onboarding_applications 
       ${whereSql}
       ORDER BY created_at DESC 
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      data: dataRes.rows.map((row) => ({
        id: String(row.id),
        applicationNumber: String(row.application_number),
        masjidId: String(row.masjid_id),
        status: String(row.status),
        currentStep: Number(row.current_step),
        masjidNameEnglish: String(row.masjid_name_english),
        city: String(row.city),
        state: String(row.state),
        country: String(row.country),
        isLocked: Boolean(row.is_locked),
        version: Number(row.version),
        createdAt: new Date(String(row.created_at))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
