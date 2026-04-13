import { redis, redisAvailable } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const OTP_PREFIX = 'otp:';

// In-memory fallback when Redis is unavailable
const memoryStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOtp(length: number): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

async function storeOtp(phone: string, otp: string): Promise<void> {
  const key = `${OTP_PREFIX}${phone}`;
  if (redisAvailable && redis) {
    await redis.set(key, otp, 'EX', env.OTP_EXPIRY_SECONDS);
  } else {
    memoryStore.set(key, { otp, expiresAt: Date.now() + env.OTP_EXPIRY_SECONDS * 1000 });
  }
}

async function getOtp(phone: string): Promise<string | null> {
  const key = `${OTP_PREFIX}${phone}`;
  if (redisAvailable && redis) {
    return redis.get(key);
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.otp;
}

async function deleteOtp(phone: string): Promise<void> {
  const key = `${OTP_PREFIX}${phone}`;
  if (redisAvailable && redis) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
  }
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  const otp = generateOtp(env.OTP_LENGTH);

  // Store OTP
  await storeOtp(phone, otp);

  if (env.OTP_PROVIDER === 'console') {
    // Development mode — log OTP to console
    logger.info(`📱 OTP for ${phone}: ${otp}`);
    return { success: true, message: 'OTP sent (dev mode — check console)' };
  }

  // Production — send via Twilio
  try {
    const twilio = await import('twilio');
    const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    if (env.TWILIO_VERIFY_SERVICE_SID) {
      // Use Twilio Verify (recommended)
      await client.verify.v2
        .services(env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: 'sms' });
    } else {
      // Direct SMS
      await client.messages.create({
        body: `Your LoadNBehold verification code is: ${otp}. Expires in ${env.OTP_EXPIRY_SECONDS}s.`,
        from: env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    logger.error({ err: error }, 'Failed to send OTP via Twilio');
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  // Dev bypass — accept DEV_OTP_CODE for any phone when enabled
  if (env.DEV_OTP_BYPASS && code === env.DEV_OTP_CODE) {
    logger.info(`DEV OTP bypass used for ${phone}`);
    return true;
  }

  if (env.OTP_PROVIDER === 'console') {
    // Dev mode — verify from store
    const storedOtp = await getOtp(phone);

    if (storedOtp === code) {
      await deleteOtp(phone);
      return true;
    }
    return false;
  }

  // Production — verify via Twilio Verify
  try {
    if (env.TWILIO_VERIFY_SERVICE_SID) {
      const twilio = await import('twilio');
      const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

      const verification = await client.verify.v2
        .services(env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({ to: phone, code });

      return verification.status === 'approved';
    }

    // Fallback to stored OTP
    const storedOtp = await getOtp(phone);
    if (storedOtp === code) {
      await deleteOtp(phone);
      return true;
    }
    return false;
  } catch (error) {
    logger.error({ err: error }, 'OTP verification failed');
    return false;
  }
}
