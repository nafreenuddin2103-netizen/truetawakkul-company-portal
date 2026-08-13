import { BadRequestError, GoogleApiError } from '../../shared/errors/app-error.js';
import { googlePlacesCache } from './google-places.cache.js';
import { logger } from '../../shared/logger/logger.js';

export interface ResolveLocationDTO {
  method: 'GOOGLE_MAPS' | 'GPS';
  url?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
}

export interface NearbyDuplicate {
  id: string;
  name: string;
  distanceMeters: number;
}

export interface NormalizedLocationDTO {
  source: 'GOOGLE_MAPS' | 'GPS' | 'MANUAL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  locationQuality: 'EXCELLENT' | 'GOOD' | 'POOR';
  googlePlaceId: string;
  placeName?: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timezone: string;
  address: {
    line1?: string;
    city: string;
    district?: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  website?: string;
  phone?: string;
  googleMetadata?: Record<string, any>;
  googlePhotos?: any[];
  nearbyDuplicates: NearbyDuplicate[];
  timeResolved: string;
}

class GoogleCircuitBreaker {
  private static failures = 0;
  private static maxFailures = 5;
  private static resetTimeout = 60000;
  private static nextAttempt = 0;

  static recordFailure() {
    this.failures++;
    if (this.failures >= this.maxFailures) {
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.error({ event: 'circuit_breaker_open' }, 'Google API Circuit Breaker OPEN');
    }
  }

  static recordSuccess() {
    if (this.failures > 0) {
      this.failures = 0;
      this.nextAttempt = 0;
      logger.info({ event: 'circuit_breaker_closed' }, 'Google API Circuit Breaker CLOSED');
    }
  }

  static check() {
    if (this.failures >= this.maxFailures) {
      if (Date.now() > this.nextAttempt) {
        // Half-open state
        return;
      }
      throw new GoogleApiError('Service Unavailable: Circuit breaker is open due to repeated upstream failures');
    }
  }
}

export class LocationResolutionService {
  public async resolveLocation(dto: ResolveLocationDTO): Promise<NormalizedLocationDTO> {
    if (dto.method === 'GOOGLE_MAPS') {
      if (!dto.url) {
        throw new BadRequestError('Google Maps URL is required for GOOGLE_MAPS resolution');
      }
      return await this.parseGoogleMapsUrl(dto.url);
    }

    if (dto.method === 'GPS') {
      if (dto.latitude === undefined || dto.longitude === undefined) {
        throw new BadRequestError('Latitude and longitude are required for GPS resolution');
      }
      return this.resolveGpsCoordinates(dto.latitude, dto.longitude, dto.accuracyMeters);
    }

    throw new BadRequestError(`Unsupported resolution method: ${dto.method}`);
  }

  private async fetchWithRetry(url: string, options: RequestInit, context: any, maxRetries = 3): Promise<Response> {
    GoogleCircuitBreaker.check();

    const delays = [250, 750, 1500]; // Exponential backoff with jitter

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const fetchOptions = { ...options, signal: controller.signal };

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const duration = Date.now() - start;

        logger.info({
          event: 'google_places_api_call',
          ...context,
          duration_ms: duration,
          status: response.status,
          attempt: attempt + 1,
          success: response.ok
        });

        // Hard fail on 4xx validation errors (don't retry) except 429
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          GoogleCircuitBreaker.recordSuccess(); // Not an upstream failure
          return response;
        }

        if (response.ok) {
          GoogleCircuitBreaker.recordSuccess();
          return response;
        }

        // Only retry on 429 or 5xx
        if (attempt === maxRetries) {
          GoogleCircuitBreaker.recordFailure();
          return response; // Return last response if exhausted
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          logger.error({ event: 'google_places_api_timeout', ...context }, 'Google API request timed out');
        }
        if (attempt === maxRetries) {
          GoogleCircuitBreaker.recordFailure();
          if (err.name === 'AbortError') {
            throw new GoogleApiError('Service Unavailable: Google API timed out (503)');
          }
          throw err;
        }
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 50);
        await new Promise(res => setTimeout(res, delays[attempt] + jitter));
      }
    }
    throw new GoogleApiError('Failed to fetch from Google API after retries');
  }

  private async parseGoogleMapsUrl(url: string): Promise<NormalizedLocationDTO> {
    let finalUrl = url;
    try {
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        const response = await fetch(url, { redirect: 'follow' });
        finalUrl = response.url;
      }
    } catch (err) {
      console.error('Failed to resolve shortlink', err);
    }

    let placeId: string | undefined;
    const placeIdMatch = finalUrl.match(/place_id:([^&?]+)/) || finalUrl.match(/ftid=([^&?]+)/);
    if (placeIdMatch) {
      placeId = placeIdMatch[1];
    } else {
      let lat: number | null = null;
      let lng: number | null = null;

      const qMatch = finalUrl.match(/[?&]q=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      } else {
        const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
          lat = parseFloat(atMatch[1]);
          lng = parseFloat(atMatch[2]);
        }
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        const nearby = await this.searchNearbyMosques(lat, lng, 100);
        if (nearby.length > 0) {
          placeId = nearby[0].googlePlaceId;
        } else {
          throw new BadRequestError('Could not find a valid Masjid at the provided Google Maps coordinates.');
        }
      } else {
        throw new BadRequestError('Invalid or unparseable Google Maps URL. Format must contain valid coordinates or Place ID.');
      }
    }

    if (!placeId) {
      throw new BadRequestError('Failed to extract Google Place ID from the URL.');
    }

    return this.fetchPlaceDetails(placeId);
  }

  public async searchNearbyMosques(lat: number, lng: number, radiusMeters: number = 5000): Promise<NormalizedLocationDTO[]> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const body = {
      includedTypes: ['mosque'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters
        }
      }
    };

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus'
      },
      body: JSON.stringify(body)
    }, { operation: 'nearby' });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ event: 'google_places_api_error', errorText, status: response.status }, 'Failed to query nearby places');
      throw new GoogleApiError('Failed to query nearby places from Google.');
    }

    const data = await response.json();
    if (!data.places) return [];

    return data.places.map((place: any) => ({
      source: 'GOOGLE_PLACES_NEARBY',
      confidence: 'MEDIUM',
      locationQuality: 'GOOD',
      googlePlaceId: place.id,
      placeName: place.displayName?.text,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      timezone: 'Asia/Kolkata',
      address: {
        line1: place.formattedAddress,
        city: '',
        state: '',
        country: ''
      },
      googleMetadata: { businessStatus: place.businessStatus },
      nearbyDuplicates: [],
      timeResolved: new Date().toISOString()
    }));
  }

  public async fetchPlaceDetails(placeId: string): Promise<NormalizedLocationDTO> {
    const cached = googlePlacesCache.get(placeId);
    if (cached) {
      logger.info({ event: 'google_places_cache_hit', google_place_id: placeId });
      return cached;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY is not configured');

    const fieldMask = 'id,displayName,formattedAddress,location,addressComponents,utcOffsetMinutes,websiteUri,internationalPhoneNumber,rating,userRatingCount,businessStatus,photos';
    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask
      }
    }, { operation: 'details', placeId });

    if (!response.ok) {
      logger.error({ event: 'google_places_api_error', status: response.status }, 'Failed to fetch details');
      throw new GoogleApiError('Failed to fetch details from Google Places API.');
    }

    const place = await response.json();

    let city = '';
    let state = '';
    let country = '';
    let postalCode = '';
    let district = '';

    if (place.addressComponents) {
      for (const comp of place.addressComponents) {
        if (comp.types.includes('locality')) city = comp.longText;
        if (comp.types.includes('administrative_area_level_1')) state = comp.longText;
        if (comp.types.includes('country')) country = comp.longText;
        if (comp.types.includes('postal_code')) postalCode = comp.longText;
        if (comp.types.includes('administrative_area_level_2')) district = comp.longText;
      }
    }

    const tzSign = place.utcOffsetMinutes >= 0 ? '+' : '-';
    const tzHours = Math.floor(Math.abs(place.utcOffsetMinutes) / 60).toString().padStart(2, '0');
    const tzMins = (Math.abs(place.utcOffsetMinutes) % 60).toString().padStart(2, '0');
    const timezone = `UTC${tzSign}${tzHours}:${tzMins}`;

    let website = place.websiteUri;
    if (website && website.endsWith('/')) {
      website = website.slice(0, -1);
    }

    let phone = place.internationalPhoneNumber;
    if (phone) {
      phone = phone.replace(/[\s-()]/g, '');
    }

    const result: NormalizedLocationDTO = {
      source: 'GOOGLE_MAPS',
      confidence: 'HIGH',
      locationQuality: 'EXCELLENT',
      googlePlaceId: place.id,
      placeName: place.displayName?.text,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      timezone: timezone,
      address: {
        line1: place.formattedAddress,
        city: city || district,
        district,
        state,
        country,
        postalCode
      },
      website,
      phone,
      googleMetadata: {
        provider: 'google_places',
        api_version: 'v1',
        last_fetched_at: new Date().toISOString(),
        rating: place.rating,
        userRatingsTotal: place.userRatingCount,
        businessStatus: place.businessStatus
      },
      googlePhotos: place.photos || [],
      nearbyDuplicates: [],
      timeResolved: new Date().toISOString()
    };

    googlePlacesCache.set(placeId, result);
    return result;
  }

  private resolveGpsCoordinates(_lat: number, _lng: number, _accuracyMeters?: number): NormalizedLocationDTO {
    throw new BadRequestError('GPS resolution must use the new /nearby endpoint.');
  }
}
