import { GeocodingService } from '../../../shared/services/geocoding.service.js';
import { PgMasjidRepository } from '../../../infrastructure/repositories/pg-masjid.repository.js';
import { ConflictError } from '../../../shared/errors/app-error.js';
import { db } from '../../../infrastructure/repositories/../../infrastructure/database/pg-client.js';

export interface InitApplicationDTO {
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  masjidNameEnglish?: string;
  city?: string;
  state?: string;
  country?: string;
  googlePlaceId?: string;
  website?: string;
  phone?: string;
  googleMetadata?: any;
  googlePhotos?: any[];
  creatorId: string;
}

export interface InitApplicationResult {
  applicationId: string;
  applicationNumber: string;
  masjidId: string;
  status: string;
  currentStep: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

export class InitOnboardingApplicationUseCase {
  constructor(private readonly masjidRepo: PgMasjidRepository) {}

  public async execute(dto: InitApplicationDTO): Promise<InitApplicationResult> {
    const coords = GeocodingService.parseLocationInput({
      googleMapsUrl: dto.googleMapsUrl,
      latitude: dto.latitude,
      longitude: dto.longitude
    });

    const duplicates = await this.masjidRepo.findNearbyDuplicates(coords.latitude, coords.longitude, 50);
    if (duplicates.length > 0) {
      const nearest = duplicates[0];
      throw new ConflictError(
        `A masjid ("${nearest.nameEnglish}") already exists within 50 meters of this location. Duplicate registration blocked.`,
        {
          existing_masjid_id: nearest.id,
          existing_masjid_name: nearest.nameEnglish,
          distance_meters: nearest.distanceMeters
        }
      );
    }

    const appNumber = `APP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const name = dto.masjidNameEnglish ?? 'Draft Masjid';
    const city = dto.city ?? 'Pending Geocode';
    const state = dto.state ?? 'Pending Geocode';
    const country = dto.country ?? 'India';

    return await db.withTransaction(async (client) => {
      // 1. Insert or Update Masjid idempotently
      let masjidId: string;
      const masjidRes = await client.query(
        `INSERT INTO app.masjid (
          name_english, city, state, country, address_line1, timezone,
          latitude, longitude, location, created_by, status, governance_state,
          google_place_id, website, phone, google_metadata, source, google_last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($8, $7), 4326), $9, 'INACTIVE', 'COMPANY_MANAGED', $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (google_place_id) DO UPDATE SET
          name_english = EXCLUDED.name_english,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          address_line1 = EXCLUDED.address_line1,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          location = EXCLUDED.location,
          website = COALESCE(EXCLUDED.website, app.masjid.website),
          phone = COALESCE(EXCLUDED.phone, app.masjid.phone),
          google_metadata = EXCLUDED.google_metadata,
          google_last_synced_at = NOW()
        RETURNING id`,
        [
          name, city, state, country, 'Pending Address', 'Asia/Kolkata', 
          coords.latitude, coords.longitude, dto.creatorId,
          dto.googlePlaceId || null, dto.website || null, dto.phone || null,
          dto.googleMetadata ? JSON.stringify(dto.googleMetadata) : '{}',
          dto.googlePlaceId ? 'GOOGLE_PLACES' : 'MANUAL'
        ]
      );

      masjidId = masjidRes.rows[0].id;

      // 2. Insert Photos (Clear old photos first if it's an update, or just append)
      if (dto.googlePlaceId && dto.googlePhotos && dto.googlePhotos.length > 0) {
        await client.query(`DELETE FROM app.masjid_google_photos WHERE masjid_id = $1`, [masjidId]);
        
        for (let i = 0; i < dto.googlePhotos.length; i++) {
          const photo = dto.googlePhotos[i];
          // Google Places API returns 'name' as places/PLACE_ID/photos/PHOTO_REFERENCE
          const photoRef = photo.name || photo.photo_reference || 'unknown';
          await client.query(
            `INSERT INTO app.masjid_google_photos (masjid_id, google_place_id, photo_reference, width, height, display_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [masjidId, dto.googlePlaceId, photoRef, photo.widthPx || photo.width || 0, photo.heightPx || photo.height || 0, i]
          );
        }
      }

      // 3. Insert Import History
      await client.query(
        `INSERT INTO app.masjid_import_history (masjid_id, source, google_place_id, imported_by, status)
         VALUES ($1, $2, $3, $4, 'SUCCESS')`,
        [masjidId, dto.googlePlaceId ? 'GOOGLE_PLACES' : 'MANUAL', dto.googlePlaceId || null, dto.creatorId]
      );

      // 4. Create Draft Onboarding Application
      const appRes = await client.query(
        `INSERT INTO app.onboarding_applications (
          application_number, masjid_id, status, current_step,
          masjid_name_english, city, state, country, latitude, longitude, draft_payload
        ) VALUES ($1, $2, 'IN_PROGRESS', 1, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, application_number, status, current_step`,
        [
          appNumber,
          masjidId,
          name,
          city,
          state,
          country,
          coords.latitude,
          coords.longitude,
          JSON.stringify({ location: coords, step: 1 })
        ]
      );

      const appRow = appRes.rows[0];

      return {
        applicationId: String(appRow.id),
        applicationNumber: String(appRow.application_number),
        masjidId: String(masjidId),
        status: String(appRow.status),
        currentStep: Number(appRow.current_step),
        location: coords
      };
    });
  }
}
