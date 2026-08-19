import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { JwtTokenService } from '../../../src/shared/crypto/jwt-token.service.js';
import { UserRoleCode } from '../../../src/domain/enums/user-role-code.enum.js';

describe('HTTP Endpoint Integration Tests (Supertest)', () => {
  it('should return 401 Unauthorized when requesting /api/v1/onboarding without Bearer token', async () => {
    const res = await request(app).get('/api/v1/onboarding');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 Bad Request when POST /api/v1/onboarding is missing Idempotency-Key header', async () => {
    const validToken = JwtTokenService.sign({
      sub: 'usr-admin-1',
      mobilePhone: '+919999999999',
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
    });

    const res = await request(app)
      .post('/api/v1/onboarding')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ googleMapsUrl: 'https://maps.google.com/?q=12.97,77.59' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Missing mandatory Idempotency-Key header');
  });

  it('should return 400 Bad Request when PATCH /api/v1/onboarding/:id/draft is missing If-Match header', async () => {
    const validToken = JwtTokenService.sign({
      sub: 'usr-admin-1',
      mobilePhone: '+919999999999',
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
    });

    const res = await request(app)
      .patch('/api/v1/onboarding/app-100/draft')
      .set('Authorization', `Bearer ${validToken}`)
      .set('Idempotency-Key', 'key-draft-1')
      .send({ step2: 'draft data' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Missing mandatory If-Match header');
  });

  it('should return 403 Forbidden when requesting admin endpoint with non-admin role', async () => {
    const userToken = JwtTokenService.sign({
      sub: 'usr-regular-1',
      mobilePhone: '+918888888888',
      roles: [UserRoleCode.MOSQUE_ADMIN]
    });

    const res = await request(app)
      .get('/api/v1/metrics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
