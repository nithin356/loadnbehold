import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customer/customer.routes';
import orderRoutes from './modules/order/order.routes';
import driverRoutes from './modules/driver/driver.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import adminRoutes from './modules/admin/admin.routes';
import supportRoutes from './modules/support/support.routes';
import paymentRoutes from './modules/payment/payment.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
import recurringOrderRoutes from './modules/recurring-order/recurring-order.routes';
import familyRoutes from './modules/family/family.routes';
import referralRoutes from './modules/referral/referral.routes';
import codRoutes from './modules/cod/cod.routes';

const app: ReturnType<typeof express> = express();

// ─── Global Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS.split(','), credentials: true }));

// Stripe webhooks need raw body for signature verification
app.use('/api/v1/payments/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short'));
app.use(generalLimiter);

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: env.APP_NAME, timestamp: new Date().toISOString() });
});

// ─── Static File Serving ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes ────────────────────────────────────────────
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/customer', customerRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/driver', driverRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);
apiRouter.use('/loyalty', loyaltyRoutes);
apiRouter.use('/recurring-orders', recurringOrderRoutes);
apiRouter.use('/family', familyRoutes);
apiRouter.use('/referral', referralRoutes);
apiRouter.use('/cod', codRoutes);

app.use('/api/v1', apiRouter);

// ─── 404 Handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ─── Global Error Handler ──────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    },
  });
});

export { app };
