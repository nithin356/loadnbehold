import { Router } from 'express';
import * as ctrl from './payment.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { createPaymentIntentSchema } from '@loadnbehold/validators';

const router: Router = Router();

// ─── Customer-facing ───────────────────────────────────────
router.post('/create-intent', authenticate, validate(createPaymentIntentSchema), ctrl.createIntent);
router.post('/confirm', authenticate, ctrl.confirmPayment);
router.post('/cod/place', authenticate, ctrl.codPlace);
router.post('/cod/collect', authenticate, ctrl.codCollect);
router.post('/cod/deposit', authenticate, ctrl.codDeposit);
router.get('/cod/ledger', authenticate, ctrl.codLedger);
router.post('/refund', authenticate, ctrl.refund);
router.post('/paypal/capture', authenticate, ctrl.capturePayPal);
router.post('/square/complete', authenticate, ctrl.completeSquare);

// ─── Saved Payment Methods ────────────────────────────────
router.get('/saved-methods', authenticate, ctrl.getSavedMethods);
router.delete('/saved-methods/:id', authenticate, ctrl.deleteSavedMethod);
router.put('/saved-methods/:id/default', authenticate, ctrl.setDefaultMethod);

// ─── Webhooks (no auth — verified by signature) ───────────
router.post('/webhook/stripe', ctrl.stripeWebhook);
router.post('/webhook/square', ctrl.squareWebhook);
router.post('/webhook/paypal', ctrl.paypalWebhook);

// ─── Admin: gateway health ─────────────────────────────────
router.get('/health', authenticate, ctrl.getGatewayHealth);

export default router;
