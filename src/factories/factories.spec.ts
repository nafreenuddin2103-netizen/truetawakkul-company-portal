import { describe, it, expect } from 'vitest';
import { buildTestUser } from './user.factory.js';
import { buildTestMasjid } from './masjid.factory.js';

describe('Test Data Factories', () => {
  it('should generate valid test user data with defaults and overrides', () => {
    const user = buildTestUser({ role: 'MOSQUE_ADMIN', fullName: 'Imam Ali' });
    expect(user.role).toBe('MOSQUE_ADMIN');
    expect(user.full_name).toBe('Imam Ali');
    expect(user.mobile_phone).toMatch(/^\+91/);
  });

  it('should generate valid test masjid data with defaults and overrides', () => {
    const masjid = buildTestMasjid({ city: 'Mumbai', status: 'ACTIVE' });
    expect(masjid.city).toBe('Mumbai');
    expect(masjid.status).toBe('ACTIVE');
    expect(masjid.governance_state).toBe('COMPANY_MANAGED');
  });
});
