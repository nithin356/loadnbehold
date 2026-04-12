import { Router } from 'express';
import * as ctrl from './wallet.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { walletTopupSchema } from '@loadnbehold/validators';

const router: Router = Router();

router.use(authenticate);

router.get('/balance', ctrl.getBalance);
router.post('/topup', validate(walletTopupSchema), ctrl.topUp);
router.post('/topup/confirm', validate(walletTopupSchema), ctrl.confirmTopUp);
router.post('/pay', ctrl.payWithWallet);
router.get('/transactions', ctrl.getTransactions);

export default router;
