import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/truetawakkul_portal'),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().default(20),

  SUPABASE_URL: z.string().url().default('https://dummy-project.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).default('dummy-service-role-key-for-local-dev-only'),
  SUPABASE_STORAGE_BUCKET: z.string().default('media'),

  JWT_SECRET: z.string().min(16).default('super-secret-jwt-key-change-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
  DUPLICATE_MASJID_RADIUS_METERS: z.coerce.number().default(50),

  GOOGLE_MAPS_API_KEY: z.string().min(1).default('dummy_key')
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
