import { Router } from 'express';
import * as ctrl from './order.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { createOrderSchema, rateOrderSchema, cancelOrderSchema, paginationSchema } from '@loadnbehold/validators';

const router: Router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), ctrl.createOrder);
router.get('/', validate(paginationSchema, 'query'), ctrl.getOrders);
router.get('/:id', ctrl.getOrderById);
router.put('/:id/cancel', validate(cancelOrderSchema), ctrl.cancelOrder);
router.post('/:id/rate', validate(rateOrderSchema), ctrl.rateOrder);
router.get('/:id/track', ctrl.getTrackingData);
router.post('/:id/reorder', ctrl.reorder);
router.post('/:id/dispute', ctrl.raiseDispute);
router.get('/:id/invoice', ctrl.getInvoice);

export default router;
