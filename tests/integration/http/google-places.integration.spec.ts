import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/api/app.js';
import { JwtTokenService } from '../../../src/shared/crypto/jwt-token.service.js';
import { UserRoleCode } from '../../../src/domain/enums/user-role-code.enum.js';
import { googlePlacesCache } from '../../../src/application/services/google-places.cache.js';
import { LocationResolutionService } from '../../../src/application/services/location-resolution.service.js';
import { db } from '../../../src/infrastructure/database/pg-client.js';

describe('Google Places Integration & Idempotency', () => {
  let validToken: string;

  beforeEach(() => {
    validToken = JwtTokenService.sign({
      sub: 'usr-admin-1',
      mobilePhone: '+919999999999',
      roles: [UserRoleCode.COMPANY_SUPER_ADMIN]
    });
    googlePlacesCache.clear();
    vi.clearAllMocks();
  });

  describe('LocationResolutionService Caching', () => {
    it('should hit the external API once, cache the result, and return from cache on subsequent calls', async () => {
      // Mock global fetch
      const mockResponse = {
        ok: true,
        json: async () => ({
          id: 'ChIJ_TEST_PLACE',
          displayName: { text: 'Test Masjid' },
          formattedAddress: '123 Test St, Test City',
          location: { latitude: 12.34, longitude: 56.78 },
          rating: 4.8,
          userRatingCount: 150,
          businessStatus: 'OPERATIONAL',
          photos: [{ photo_reference: 'ref1', width: 400, height: 400 }]
        })
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse as any);

      const service = new LocationResolutionService();
      
      // First call (cache miss)
      const result1 = await service.fetchPlaceDetails('ChIJ_TEST_PLACE');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result1.placeName).toBe('Test Masjid');
      expect(result1.googleMetadata?.rating).toBe(4.8);
      expect(result1.googlePhotos?.length).toBe(1);

      // Second call (cache hit)
      const result2 = await service.fetchPlaceDetails('ChIJ_TEST_PLACE');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1!
      expect(result2).toEqual(result1);
    });
  });

  describe('Idempotent Database Persistence (InitOnboardingApplicationUseCase)', () => {
    it('should successfully handle concurrent inserts with ON CONFLICT DO UPDATE for google_place_id', async () => {
      // To test idempotency, we send the exact same payload twice with a unique Google Place ID.
      const testPlaceId = `ChIJ_TEST_PLACE_${Date.now()}`;
      
      const payload = {
        masjidNameEnglish: 'Idempotent Masjid',
        latitude: 10.0,
        longitude: 20.0,
        city: 'Idempotent City',
        googlePlaceId: testPlaceId,
        website: 'https://idempotent.com',
        phone: '+1234567890',
        googleMetadata: { provider: 'google_places', rating: 5.0 },
        googlePhotos: [{ photo_reference: 'img1', width: 100, height: 100 }]
      };

      // Call 1
      const res1 = await request(app)
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Idempotency-Key', `idempotency-key-${Date.now()}-1`)
        .send(payload);

      expect(res1.status).toBe(201);
      const appNumber1 = res1.body.applicationNumber;
      expect(appNumber1).toBeDefined();

      // Call 2 (Simulating another admin trying to onboard the exact same Google Place link)
      const res2 = await request(app)
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Idempotency-Key', `idempotency-key-${Date.now()}-2`) // Different key, meaning different HTTP request entirely!
        .send(payload);

      expect(res2.status).toBe(201);
      const appNumber2 = res2.body.applicationNumber;
      expect(appNumber2).toBeDefined();
      expect(appNumber2).not.toBe(appNumber1); // Two different application drafts were created successfully

      // But there should only be ONE masjid record in the DB!
      const dbRes = await db.query(`SELECT count(*) as count FROM app.masjid WHERE google_place_id = $1`, [testPlaceId]);
      expect(dbRes.rows[0].count).toBe('1');
    });
  });
});
