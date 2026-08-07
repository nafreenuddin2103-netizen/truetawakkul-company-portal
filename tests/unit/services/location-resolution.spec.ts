import { describe, it, expect } from 'vitest';
import { LocationResolutionService } from '../../../src/application/services/location-resolution.service.js';

describe('Location Resolution Service Unit Tests', () => {
  const service = new LocationResolutionService();

  it('should parse Google Maps URL with q=lat,lng parameter', async () => {
    const result = await service.resolveLocation({
      method: 'GOOGLE_MAPS',
      url: 'https://maps.google.com/?q=12.9716,77.5946'
    });

    expect(result.source).toBe('GOOGLE_MAPS');
    expect(result.latitude).toBe(12.9716);
    expect(result.longitude).toBe(77.5946);
    expect(result.confidence).toBe('HIGH');
    expect(result.address.city).toBeDefined();
  });

  it('should parse Google Maps URL with @lat,lng syntax', async () => {
    const result = await service.resolveLocation({
      method: 'GOOGLE_MAPS',
      url: 'https://www.google.com/maps/@13.0827,80.2707,15z'
    });

    expect(result.source).toBe('GOOGLE_MAPS');
    expect(result.latitude).toBe(13.0827);
    expect(result.longitude).toBe(80.2707);
    expect(result.confidence).toBe('HIGH');
  });

  it('should resolve GPS coordinates method with accuracy', async () => {
    const result = await service.resolveLocation({
      method: 'GPS',
      latitude: 17.385,
      longitude: 78.4867,
      accuracyMeters: 4.2
    });

    expect(result.source).toBe('GPS');
    expect(result.latitude).toBe(17.385);
    expect(result.longitude).toBe(78.4867);
    expect(result.accuracyMeters).toBe(4.2);
    expect(result.confidence).toBe('HIGH');
  });

  it('should throw BadRequestError on invalid Google Maps URL', async () => {
    await expect(
      service.resolveLocation({
        method: 'GOOGLE_MAPS',
        url: 'https://invalid-url.com'
      })
    ).rejects.toThrow();
  });
});
