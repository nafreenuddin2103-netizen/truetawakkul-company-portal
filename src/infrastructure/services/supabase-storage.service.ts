import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { IStorageService } from '../../application/ports/storage.service.interface.js';
import { InternalServerError, AppError } from '../../shared/errors/app-error.js';

export class SupabaseStorageService implements IStorageService {
  private supabase: SupabaseClient;

  constructor() {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase Storage configuration');
    }
    
    // We use the service_role key to bypass RLS since the backend orchestrates access
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async generateUploadUrl(bucket: string, objectPath: string, _mimeType: string, _maxSizeInBytes: number): Promise<string> {
    try {
      // Supabase supports generateUploadUrl natively via createSignedUploadUrl
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUploadUrl(objectPath);
      
      if (error) {
        throw new InternalServerError(`Failed to generate upload URL: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        throw new InternalServerError('Signed URL generation returned empty data');
      }

      return data.signedUrl;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new InternalServerError(`Storage error: ${err.message}`);
    }
  }

  async generateDownloadUrl(bucket: string, objectPath: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, expiresInSeconds);

      if (error) {
        throw new InternalServerError(`Failed to generate download URL: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        throw new InternalServerError('Signed URL generation returned empty data');
      }

      return data.signedUrl;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new InternalServerError(`Storage error: ${err.message}`);
    }
  }

  async verifyObjectExists(bucket: string, objectPath: string): Promise<{ size: number; mimeType: string } | null> {
    try {
      // List the specific file to get its metadata. 
      // Supabase doesn't have a direct "stat" method, but list with search works.
      const pathParts = objectPath.split('/');
      const filename = pathParts.pop() || '';
      const folderPath = pathParts.join('/');

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folderPath, {
          search: filename,
          limit: 1
        });

      if (error) {
        throw new InternalServerError(`Failed to verify object: ${error.message}`);
      }

      const file = data?.find(f => f.name === filename);
      if (!file) {
        return null;
      }

      return {
        size: file.metadata?.size ?? 0,
        mimeType: file.metadata?.mimetype ?? 'application/octet-stream'
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new InternalServerError(`Storage error: ${err.message}`);
    }
  }
}
