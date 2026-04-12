import { Router } from 'express';
import * as ctrl from './subscription.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.get('/plans', ctrl.getPlans);
router.use(authenticate);
router.post('/subscribe', ctrl.subscribe);
router.put('/cancel', ctrl.cancelSubscription);
router.get('/current', ctrl.getCurrentSubscription);

export default router;
