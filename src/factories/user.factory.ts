export interface UserFactoryInput {
  id?: string;
  fullName?: string;
  mobilePhone?: string;
  email?: string;
  role?: 'COMPANY_SUPER_ADMIN' | 'MOSQUE_ADMIN';
  status?: string;
}

export function buildTestUser(overrides: UserFactoryInput = {}) {
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return {
    id: overrides.id ?? '7f6e5d4c-3b2a-1f0e-9d8c-7b6a5f4e3d2c',
    full_name: overrides.fullName ?? 'Test Admin User',
    mobile_phone: overrides.mobilePhone ?? `+9198${randomSuffix}10`,
    email: overrides.email ?? `admin_${randomSuffix}@truetawakkul.org`,
    role: overrides.role ?? 'COMPANY_SUPER_ADMIN',
    status: overrides.status ?? 'ACTIVE',
    version: 1,
    created_at: new Date(),
    updated_at: new Date()
  };
}
