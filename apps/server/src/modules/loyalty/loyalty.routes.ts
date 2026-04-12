import { Router } from 'express';
import * as ctrl from './loyalty.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.get('/points', ctrl.getPoints);
router.post('/redeem', ctrl.redeemPoints);

export default router;
