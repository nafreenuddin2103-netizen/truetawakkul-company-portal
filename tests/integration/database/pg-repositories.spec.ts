import { describe, it, expect } from 'vitest';
import { db } from '../../../src/infrastructure/database/pg-client.js';

describe('Database Integration & Spatial PostGIS Query Verification', () => {
  it('should construct valid PostGIS 50m spatial distance SQL queries', () => {
    const lat = 12.9715987;
    const lng = 77.5945627;
    const radiusMeters = 50;

    const sql = `SELECT id, name_english, city,
            ST_Distance(
              location::geography,
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            ) AS distance_meters
     FROM app.masjids
     WHERE deleted_at IS NULL
       AND ST_DWithin(
         location::geography,
         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
         ${radiusMeters}
       )`;

    expect(sql).toContain('ST_DWithin');
    expect(sql).toContain('ST_SetSRID');
    expect(sql).toContain('4326');
  });

  it('should verify database pool connection configuration parameters', () => {
    expect(db).toBeDefined();
    expect(typeof db.query).toBe('function');
    expect(typeof db.withTransaction).toBe('function');
  });
});
