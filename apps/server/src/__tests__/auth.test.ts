import { describe, it, expect, beforeAll, vi } from 'vitest';

// Set environment variables BEFORE any imports
process.env.NODE_ENV = 'development';
process.env.DEV_OTP_BYPASS = 'true';
process.env.DEV_OTP_CODE = '123456';
process.env.OTP_PROVIDER = 'console';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.APP_NAME = 'LoadNBehold Test';

// Mock Redis
vi.mock('../config/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockImplementation((key: string) => {
      // Return OTP for OTP keys
      if (key.startsWith('otp:')) {
        return Promise.resolve('123456');
      }
      // Return null for blacklist checks (not blacklisted)
      if (key.startsWith('blacklist:')) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    }),
    del: vi.fn().mockResolvedValue(1),
  },
  connectRedis: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification service
vi.mock('../services/notification.service', () => ({
  sendOrderStatusNotification: vi.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import { app } from '../app';
import { User } from '../models/User';

describe('Auth API', () => {
  describe('POST /api/v1/auth/send-otp', () => {
    it('should send OTP for a valid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+15551234567' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('OTP sent');
    });

    it('should return validation error for invalid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for missing phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should verify OTP and return tokens for new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+15551234567',
          code: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.phone).toBe('+15551234567');
      expect(response.body.data.user.isNewUser).toBe(true);
    });

    it('should verify OTP and return tokens for existing user', async () => {
      // Create a user first
      await User.create({
        phone: '+15559876543',
        name: 'Test User',
        role: 'customer',
        referralCode: 'TEST99',
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+15559876543',
          code: '123456',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.phone).toBe('+15559876543');
      expect(response.body.data.user.name).toBe('Test User');
      expect(response.body.data.user.isNewUser).toBe(false);
    });

    it('should return error for invalid OTP', async () => {
      // Temporarily override the mock to return wrong OTP
      const mod = await import('../config/redis');
      const r = mod.redis as NonNullable<typeof mod.redis>;
      const originalGet = r.get;
      vi.mocked(r.get).mockImplementation(((key: any) => {
        const keyStr = String(key);
        if (keyStr.startsWith('otp:')) {
          return Promise.resolve('999999'); // Different OTP
        }
        return Promise.resolve(null);
      }) as any);

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+15551234567',
          code: '111111',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_OTP');

      // Restore original mock
      vi.mocked(r.get).mockImplementation(originalGet as any);
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+15551234567' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should block access for blocked users', async () => {
      // Create a blocked user
      await User.create({
        phone: '+15551111111',
        name: 'Blocked User',
        role: 'customer',
        referralCode: 'BLOCK1',
        isBlocked: true,
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+15551111111',
          code: '123456',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_BLOCKED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // First login to get a refresh token
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phone: '+15552222222',
          code: '123456',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return validation error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
