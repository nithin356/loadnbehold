import { Router, type IRouter } from 'express';
import {
  getCodDashboard,
  getCodLedger,
  reconcileDriverCash,
  markCodCollected,
} from './cod.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router: IRouter = Router();

// Admin routes for COD management
router.get('/dashboard', authenticate, requireRole('admin'), getCodDashboard);
router.get('/ledger', authenticate, requireRole('admin'), getCodLedger);
router.post('/reconcile/:driverId', authenticate, requireRole('admin'), reconcileDriverCash);

// Driver route to mark COD as collected
router.post('/collect/:orderId', authenticate, requireRole('driver'), markCodCollected);

export default router;
