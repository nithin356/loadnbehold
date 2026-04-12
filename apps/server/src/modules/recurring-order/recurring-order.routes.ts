import { Router } from 'express';
import * as ctrl from './recurring-order.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.post('/', ctrl.createRecurringOrder);
router.get('/', ctrl.getRecurringOrders);
router.put('/:id', ctrl.updateRecurringOrder);
router.delete('/:id', ctrl.deleteRecurringOrder);

export default router;
