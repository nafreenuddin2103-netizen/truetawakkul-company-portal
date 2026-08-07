import { db } from '../database/pg-client.js';

export interface NearbyMasjidResult {
  id: string;
  nameEnglish: string;
  city: string;
  distanceMeters: number;
}

export class PgMasjidRepository {
  public async findNearbyDuplicates(
    latitude: number,
    longitude: number,
    radiusMeters: number = 50
  ): Promise<NearbyMasjidResult[]> {
    const res = await db.query(
      `SELECT id, name_english, city,
              ST_Distance(
                location::geography,
                ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
              ) AS distance_meters
       FROM app.masjids
       WHERE deleted_at IS NULL
         AND ST_DWithin(
           location::geography,
           ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           $3
         )
       ORDER BY distance_meters ASC`,
      [latitude, longitude, radiusMeters]
    );

    return res.rows.map((row) => ({
      id: String(row.id),
      nameEnglish: String(row.name_english),
      city: String(row.city),
      distanceMeters: Math.round(Number(row.distance_meters) * 10) / 10
    }));
  }
}
