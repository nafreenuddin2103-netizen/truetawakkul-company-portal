import { db } from '../database/pg-client.js';
import { MediaEntity, MediaProps } from '../../domain/entities/media.entity.js';
import { MediaType, MediaStatus } from '../../domain/enums/media-type.enum.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

export class PgMediaRepository {
  public async findById(id: string): Promise<MediaEntity | null> {
    const res = await db.query('SELECT * FROM app.media WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapToEntity(res.rows[0]);
  }

  public async findByMasjidId(masjidId: string): Promise<MediaEntity[]> {
    const res = await db.query('SELECT * FROM app.media WHERE masjid_id = $1 ORDER BY created_at ASC', [masjidId]);
    return res.rows.map((row) => this.mapToEntity(row));
  }

  public async save(media: MediaEntity): Promise<MediaEntity> {
    const json = media.toJSON();
    const res = await db.query(
      `INSERT INTO app.media (
        id, masjid_id, media_type, storage_provider, storage_key, mime_type,
        size_bytes, sha256_checksum, width, height, blurhash, status, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *`,
      [
        json.id, json.masjidId, json.mediaType, json.storageProvider, json.storageKey,
        json.mimeType, json.sizeBytes, json.sha256Checksum, json.width ?? null,
        json.height ?? null, json.blurhash ?? null, json.status, json.uploadedBy
      ]
    );

    return this.mapToEntity(res.rows[0]);
  }

  public async delete(id: string): Promise<void> {
    const res = await db.query('DELETE FROM app.media WHERE id = $1 RETURNING id', [id]);
    if (res.rows.length === 0) {
      throw new NotFoundError(`Media record not found with ID: ${id}`);
    }
  }

  private mapToEntity(row: Record<string, unknown>): MediaEntity {
    const props: MediaProps = {
      id: String(row.id),
      masjidId: String(row.masjid_id),
      mediaType: row.media_type as MediaType,
      storageProvider: String(row.storage_provider),
      storageKey: String(row.storage_key),
      mimeType: String(row.mime_type),
      sizeBytes: Number(row.size_bytes),
      sha256Checksum: String(row.sha256_checksum),
      width: row.width ? Number(row.width) : null,
      height: row.height ? Number(row.height) : null,
      blurhash: row.blurhash ? String(row.blurhash) : null,
      status: row.status as MediaStatus,
      uploadedBy: String(row.uploaded_by),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at))
    };
    return new MediaEntity(props);
  }
}
