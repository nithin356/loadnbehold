import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  APP_NAME: z.string().default('LoadNBehold'),

  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // OTP
  OTP_EXPIRY_SECONDS: z.coerce.number().default(60),
  OTP_LENGTH: z.coerce.number().default(6),
  OTP_PROVIDER: z.enum(['twilio', 'console']).default('console'),
  DEV_OTP_BYPASS: z.coerce.boolean().default(false),
  DEV_OTP_CODE: z.string().default('123456'),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  // Payment
  PAYMENT_PRIMARY_GATEWAY: z.enum(['stripe', 'square', 'paypal']).default('stripe'),
  PAYMENT_FALLBACK_GATEWAY: z.enum(['stripe', 'square', 'paypal']).default('square'),
  PAYMENT_SECONDARY_FALLBACK_GATEWAY: z.enum(['stripe', 'square', 'paypal']).default('paypal'),
  PAYMENT_AUTO_FAILOVER: z.coerce.boolean().default(true),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Square
  SQUARE_APPLICATION_ID: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  SQUARE_LOCATION_ID: z.string().optional(),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),

  // Maps
  MAPBOX_ACCESS_TOKEN: z.string().optional(),

  // Stripe publishable key (for client-side)
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Firebase
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default('./src/config/firebase-service-account.json'),

  // SendGrid
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().default('noreply@loadnbehold.com'),

  // Storage
  STORAGE_PROVIDER: z.enum(['s3', 'local']).default('local'),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_REGION: z.string().default('us-east-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
