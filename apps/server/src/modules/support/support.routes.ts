import { Router } from 'express';
import * as ctrl from './support.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { createTicketSchema, ticketReplySchema } from '@loadnbehold/validators';
import { uploadSingle } from '../../middleware/upload';

const router: Router = Router();

router.use(authenticate);

router.post('/tickets', validate(createTicketSchema), ctrl.createTicket);
router.get('/tickets', ctrl.getTickets);
router.post('/tickets/upload', uploadSingle('file'), ctrl.uploadAttachment);
router.get('/tickets/:id', ctrl.getTicketById);
router.post('/tickets/:id/reply', validate(ticketReplySchema), ctrl.replyToTicket);
router.get('/faq', ctrl.getFaq);

export default router;
