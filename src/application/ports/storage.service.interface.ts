export interface IStorageService {
  /**
   * Generates a short-lived pre-signed URL for the client to upload a file directly to the storage provider.
   * @param bucket The storage bucket name
   * @param objectPath The destination path/key in the bucket (e.g. masjids/{id}/logo/{uuid}.webp)
   * @param mimeType The expected MIME type of the file
   * @param maxSizeInBytes The maximum allowed size in bytes
   * @returns A promise that resolves to the pre-signed URL string
   */
  generateUploadUrl(bucket: string, objectPath: string, mimeType: string, maxSizeInBytes: number): Promise<string>;

  /**
   * Generates a short-lived pre-signed URL for downloading or viewing a private file.
   * @param bucket The storage bucket name
   * @param objectPath The path/key in the bucket
   * @param expiresInSeconds The number of seconds the URL is valid for
   * @returns A promise that resolves to the pre-signed URL string
   */
  generateDownloadUrl(bucket: string, objectPath: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Verifies if an object successfully exists in the bucket and retrieves its metadata.
   * Useful for validating an upload after the client signals completion.
   * @param bucket The storage bucket name
   * @param objectPath The path/key in the bucket
   * @returns A promise that resolves to the object metadata if it exists, or null if it doesn't
   */
  verifyObjectExists(bucket: string, objectPath: string): Promise<{ size: number; mimeType: string } | null>;
}
