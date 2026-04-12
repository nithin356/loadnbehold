import { Router } from 'express';
import * as ctrl from './customer.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { updateProfileSchema, addressSchema } from '@loadnbehold/validators';

const router: Router = Router();

router.use(authenticate);
router.use(requireRole('customer', 'admin'));

router.get('/profile', ctrl.getProfile);
router.put('/profile', validate(updateProfileSchema), ctrl.updateProfile);
router.post('/addresses', validate(addressSchema), ctrl.addAddress);
router.get('/addresses', ctrl.getAddresses);
router.put('/addresses/:id', ctrl.updateAddress);
router.delete('/addresses/:id', ctrl.deleteAddress);
router.get('/nearby-outlets', ctrl.getNearbyOutlets);
router.get('/order-config', ctrl.getOrderConfig);
router.get('/services', ctrl.getServices);
router.get('/recommendations', ctrl.getRecommendations);
router.get('/banners', ctrl.getBanners);
router.put('/push-token', ctrl.registerPushToken);

export default router;
