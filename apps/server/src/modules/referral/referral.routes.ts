import { Router } from 'express';
import * as ctrl from './referral.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.get('/code', ctrl.getReferralCode);
router.get('/history', ctrl.getReferralHistory);
router.post('/apply', ctrl.applyReferralCode);

export default router;
