export interface MasjidFactoryInput {
  id?: string;
  nameEnglish?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  status?: 'INACTIVE' | 'ACTIVE' | 'ARCHIVED';
  governanceState?: 'COMPANY_MANAGED' | 'ADMIN_MANAGED';
}

export function buildTestMasjid(overrides: MasjidFactoryInput = {}) {
  return {
    id: overrides.id ?? '8a3b2c1d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    name_english: overrides.nameEnglish ?? 'Masjid An-Noor Test',
    city: overrides.city ?? 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    address_line1: '123 Test Street',
    timezone: 'Asia/Kolkata',
    latitude: overrides.latitude ?? 12.9715987,
    longitude: overrides.longitude ?? 77.5945627,
    status: overrides.status ?? 'INACTIVE',
    governance_state: overrides.governanceState ?? 'COMPANY_MANAGED',
    facilities: ['WUDHU_AREA', 'PARKING'],
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  };
}
