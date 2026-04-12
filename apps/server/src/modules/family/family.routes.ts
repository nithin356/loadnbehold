import { Router } from 'express';
import * as ctrl from './family.controller';
import { authenticate } from '../../middleware/auth';

const router: Router = Router();

router.use(authenticate);

router.post('/members', ctrl.addMember);
router.get('/members', ctrl.getMembers);
router.delete('/members/:id', ctrl.removeMember);

export default router;
