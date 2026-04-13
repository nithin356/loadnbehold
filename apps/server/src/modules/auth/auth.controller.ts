import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../models/User';
import { sendOtp as sendOtpService, verifyOtp as verifyOtpService } from '../../services/otp.service';
import { env } from '../../config/env';
import { redis, redisAvailable } from '../../config/redis';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { sendWelcomeEmail } from '../../services/email.service';
import { logger } from '../../utils/logger';

function generateTokens(userId: string, role: string, adminRole?: string) {
  const payload = { userId, role, adminRole };

  const accessOpts: jwt.SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRY as unknown as jwt.SignOptions['expiresIn'] };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOpts);

  const refreshOpts: jwt.SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRY as unknown as jwt.SignOptions['expiresIn'] };
  const refreshToken = jwt.sign({ ...payload, jti: uuidv4() }, env.JWT_REFRESH_SECRET, refreshOpts);

  return { accessToken, refreshToken };
}

function generateReferralCode(name: string): string {
  const base = name.replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const suffix = Math.floor(Math.random() * 100);
  return `${base}${suffix}`;
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body;

  const result = await sendOtpService(phone);

  if (!result.success) {
    sendError(res, 'OTP_SEND_FAILED', result.message, 500);
    return;
  }

  sendSuccess(res, null, result.message);
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, code } = req.body;

  const isValid = await verifyOtpService(phone, code);

  if (!isValid) {
    sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 401);
    return;
  }

  // Find or create user
  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      phone,
      name: '',
      role: 'customer',
      referralCode: generateReferralCode(phone.slice(-4)),
    });
    logger.info(`New user created: ${user._id}`);
    // Send welcome email asynchronously (don't block login)
    if (user.email) {
      sendWelcomeEmail(user.email, user.name || 'there').catch((err) =>
        logger.warn({ err }, 'Failed to send welcome email')
      );
    }
  }

  if (user.isBlocked) {
    sendError(res, 'ACCOUNT_BLOCKED', 'Your account has been blocked. Contact support.', 403);
    return;
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = generateTokens(
    user._id.toString(),
    user.role,
    user.adminRole
  );

  sendSuccess(res, {
    ...tokens,
    user: {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
      isNewUser,
    },
  }, 'Login successful');
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = req.body;

  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      userId: string;
      role: string;
      adminRole?: string;
      jti: string;
    };

    // Check if token is blacklisted
    if (redisAvailable && redis) {
      const isBlacklisted = await redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        sendError(res, 'TOKEN_REVOKED', 'Refresh token has been revoked', 401);
        return;
      }
      // Blacklist old refresh token
      await redis.set(`blacklist:${payload.jti}`, '1', 'EX', 30 * 24 * 60 * 60);
    }

    const user = await User.findById(payload.userId);
    if (!user || user.isBlocked) {
      sendError(res, 'INVALID_USER', 'User not found or blocked', 401);
      return;
    }

    const tokens = generateTokens(user._id.toString(), user.role, user.adminRole);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch {
    sendError(res, 'INVALID_TOKEN', 'Invalid refresh token', 401);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Client should discard tokens; server can blacklist if needed
  sendSuccess(res, null, 'Logged out successfully');
}

// ─── Google Sign-In ───────────────────────────────────────
export async function googleSignIn(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body;

  // In production, verify idToken with Google's tokeninfo endpoint
  // For now, decode the payload (JWT) to extract email/name
  try {
    const segments = idToken.split('.');
    if (segments.length !== 3) {
      sendError(res, 'INVALID_TOKEN', 'Invalid Google ID token', 400);
      return;
    }

    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString());
    const { email, name, sub: googleId } = payload;

    if (!email) {
      sendError(res, 'INVALID_TOKEN', 'Google token missing email', 400);
      return;
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        email,
        name: name || '',
        phone: `google_${googleId}`,
        role: 'customer',
        referralCode: generateReferralCode(name || email.split('@')[0]),
      });
    }

    if (user.isBlocked) {
      sendError(res, 'ACCOUNT_BLOCKED', 'Your account has been blocked.', 403);
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = generateTokens(user._id.toString(), user.role, user.adminRole);
    sendSuccess(res, { ...tokens, user: { _id: user._id, email: user.email, name: user.name, role: user.role, isNewUser } }, 'Google sign-in successful');
  } catch {
    sendError(res, 'AUTH_FAILED', 'Google authentication failed', 401);
  }
}

// ─── Apple Sign-In ────────────────────────────────────────
export async function appleSignIn(req: Request, res: Response): Promise<void> {
  const { identityToken, authorizationCode } = req.body;

  try {
    const segments = identityToken.split('.');
    if (segments.length !== 3) {
      sendError(res, 'INVALID_TOKEN', 'Invalid Apple identity token', 400);
      return;
    }

    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString());
    const { email, sub: appleId } = payload;

    let user = email ? await User.findOne({ email }) : null;
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        email: email || undefined,
        name: '',
        phone: `apple_${appleId}`,
        role: 'customer',
        referralCode: generateReferralCode(appleId.slice(0, 6)),
      });
    }

    if (user.isBlocked) {
      sendError(res, 'ACCOUNT_BLOCKED', 'Your account has been blocked.', 403);
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = generateTokens(user._id.toString(), user.role, user.adminRole);
    sendSuccess(res, { ...tokens, user: { _id: user._id, email: user.email, name: user.name, role: user.role, isNewUser } }, 'Apple sign-in successful');
  } catch {
    sendError(res, 'AUTH_FAILED', 'Apple authentication failed', 401);
  }
}
