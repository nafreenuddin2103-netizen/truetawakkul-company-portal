import { db } from '../../../infrastructure/database/pg-client.js';

export class SystemSettingsUseCase {
  public async getSettings() {
    const res = await db.query('SELECT setting_key, setting_value, description FROM app.system_settings');
    return res.rows.map((r) => ({
      key: String(r.setting_key),
      value: r.setting_value,
      description: r.description ? String(r.description) : null
    }));
  }

  public async updateSetting(key: string, value: unknown, updatedBy: string) {
    const res = await db.query(
      `INSERT INTO app.system_settings (setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value), updatedBy]
    );

    return {
      key: String(res.rows[0].setting_key),
      value: res.rows[0].setting_value,
      updatedAt: new Date(String(res.rows[0].updated_at))
    };
  }
}
