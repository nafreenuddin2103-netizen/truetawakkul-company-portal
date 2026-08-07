import { describe, it, expect } from 'vitest';
import { env } from '../../../src/config/env.js';

describe('Environment Configuration Loader', () => {
  it('should load default environment variables cleanly', () => {
    expect(env.PORT).toBeTypeOf('number');
    expect(env.NODE_ENV).toBeDefined();
    expect(env.OTP_EXPIRY_MINUTES).toBe(10);
    expect(env.DUPLICATE_MASJID_RADIUS_METERS).toBe(50);
  });
});
