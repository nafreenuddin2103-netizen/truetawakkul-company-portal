import { describe, it, expect, vi } from 'vitest';
import { InitOnboardingApplicationUseCase } from '../../../src/application/use-cases/onboarding/init-onboarding-application.usecase.js';
import { GeocodingService } from '../../../src/shared/services/geocoding.service.js';
import { ConflictError, BadRequestError } from '../../../src/shared/errors/app-error.js';

describe('InitOnboardingApplicationUseCase & GeocodingService', () => {
  it('should parse coordinates correctly from Google Maps URL link', () => {
    const url = 'https://maps.google.com/?q=12.9715987,77.5945627';
    const coords = GeocodingService.parseLocationInput({ googleMapsUrl: url });

    expect(coords.latitude).toBe(12.9715987);
    expect(coords.longitude).toBe(77.5945627);
  });

  it('should throw BadRequestError if neither valid coordinates nor Maps URL provided', () => {
    expect(() => GeocodingService.parseLocationInput({})).toThrow(BadRequestError);
  });

  it('should throw ConflictError (409) if duplicate masjid is detected within 50m radius', async () => {
    const mockMasjidRepo = {
      findNearbyDuplicates: vi.fn().mockResolvedValue([
        {
          id: 'msj-dup-1',
          nameEnglish: 'Existing Masjid Jamia',
          city: 'Bengaluru',
          distanceMeters: 14.8
        }
      ])
    };

    const useCase = new InitOnboardingApplicationUseCase(mockMasjidRepo as any);

    await expect(
      useCase.execute({
        latitude: 12.9715987,
        longitude: 77.5945627,
        creatorId: 'usr-admin-1'
      })
    ).rejects.toThrow(ConflictError);
  });
});
