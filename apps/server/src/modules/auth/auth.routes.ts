import { Router } from 'express';
import * as ctrl from './auth.controller';
import { validate } from '../../middleware/validator';
import { otpLimiter, authLimiter } from '../../middleware/rateLimiter';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } from '@loadnbehold/validators';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), ctrl.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
router.post('/refresh', validate(refreshTokenSchema), ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.post('/google', authLimiter, ctrl.googleSignIn);
router.post('/apple', authLimiter, ctrl.appleSignIn);

export default router;
