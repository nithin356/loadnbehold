import { Router } from 'express';
import * as ctrl from './driver.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { uploadSingle } from '../../middleware/upload';
import { driverRegisterSchema, updateDriverLocationSchema, updateOrderStatusSchema } from '@loadnbehold/validators';

const router: Router = Router();

// Public: driver registration
router.post('/register', authenticate, validate(driverRegisterSchema), ctrl.registerDriver);

// Protected driver routes
router.use(authenticate);
router.use(requireRole('driver'));

router.get('/profile', ctrl.getDriverProfile);
router.put('/status', ctrl.toggleOnlineStatus);
router.put('/location', validate(updateDriverLocationSchema), ctrl.updateLocation);
router.get('/orders', ctrl.getAssignedOrders);
router.get('/orders/completed', ctrl.getCompletedOrders);
router.put('/orders/:id/accept', ctrl.acceptOrder);
router.put('/orders/:id/reject', ctrl.rejectOrder);
router.put('/orders/:id/status', validate(updateOrderStatusSchema), ctrl.updateOrderStatus);
router.post('/orders/:id/proof', uploadSingle('proof'), ctrl.uploadProof);
router.post('/orders/:id/verify-otp', ctrl.verifyDeliveryOtp);
router.get('/earnings', ctrl.getEarnings);
router.get('/earnings/tax-summary', ctrl.getTaxSummary);
router.post('/cod/collect', ctrl.collectCod);
router.post('/cod/deposit', ctrl.depositCash);

export default router;
