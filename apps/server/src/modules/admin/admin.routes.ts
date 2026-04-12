import { Router } from 'express';
import * as ctrl from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, requireAdminRole } from '../../middleware/roleGuard';
import { validate } from '../../middleware/validator';
import { createOutletSchema, createOfferSchema, createBannerSchema, sendNotificationSchema } from '@loadnbehold/validators';

const router: Router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard', ctrl.getDashboardStats);

// Outlets
router.get('/outlets', ctrl.getOutlets);
router.get('/outlets/:id', ctrl.getOutletById);
router.post('/outlets', requireAdminRole('super_admin', 'outlet_manager'), validate(createOutletSchema), ctrl.createOutlet);
router.put('/outlets/:id', requireAdminRole('super_admin', 'outlet_manager'), ctrl.updateOutlet);
router.delete('/outlets/:id', requireAdminRole('super_admin'), ctrl.deleteOutlet);

// Orders
router.get('/orders', ctrl.getAllOrders);
router.get('/orders/:id', ctrl.getOrderById);
router.put('/orders/:id', requireAdminRole('super_admin', 'outlet_manager', 'support_staff'), ctrl.updateOrder);
router.put('/orders/:id/assign-driver', requireAdminRole('super_admin', 'outlet_manager'), ctrl.assignDriverToOrder);
router.put('/orders/:id/adjust-price', requireAdminRole('super_admin', 'outlet_manager'), ctrl.adjustOrderPrice);
router.post('/orders/:id/refund', requireAdminRole('super_admin', 'finance', 'support_staff'), ctrl.refundOrder);

// Drivers
router.get('/drivers', ctrl.getDrivers);
router.get('/drivers/:id', ctrl.getDriverById);
router.put('/drivers/:id/approve', requireAdminRole('super_admin', 'outlet_manager'), ctrl.approveDriver);
router.put('/drivers/:id/suspend', requireAdminRole('super_admin', 'outlet_manager'), ctrl.suspendDriver);

// Customers
router.get('/customers', ctrl.getCustomers);
router.get('/customers/:id', ctrl.getCustomerById);
router.put('/customers/:id/block', requireAdminRole('super_admin', 'support_staff'), ctrl.blockCustomer);
router.post('/customers/:id/credit', requireAdminRole('super_admin', 'finance'), ctrl.creditCustomer);

// Offers
router.get('/offers', ctrl.getOffers);
router.get('/offers/:id', ctrl.getOfferById);
router.post('/offers', requireAdminRole('super_admin', 'marketing'), validate(createOfferSchema), ctrl.createOffer);
router.put('/offers/:id', requireAdminRole('super_admin', 'marketing'), ctrl.updateOffer);
router.delete('/offers/:id', requireAdminRole('super_admin', 'marketing'), ctrl.deleteOffer);

// Banners
router.get('/banners', ctrl.getBanners);
router.post('/banners', requireAdminRole('super_admin', 'marketing'), validate(createBannerSchema), ctrl.createBanner);
router.put('/banners/:id', requireAdminRole('super_admin', 'marketing'), ctrl.updateBanner);
router.delete('/banners/:id', requireAdminRole('super_admin', 'marketing'), ctrl.deleteBanner);

// Notifications
router.post('/notifications/send', requireAdminRole('super_admin', 'marketing'), validate(sendNotificationSchema), ctrl.sendBulkNotification);
router.get('/notifications/history', requireAdminRole('super_admin', 'marketing'), ctrl.getNotificationHistory);

// Services
router.get('/services', ctrl.getServices);
router.post('/services', requireAdminRole('super_admin'), ctrl.createService);
router.put('/services/:id', requireAdminRole('super_admin'), ctrl.updateService);
router.delete('/services/:id', requireAdminRole('super_admin'), ctrl.deleteService);
router.post('/services/seed', requireAdminRole('super_admin'), ctrl.seedServices);

// Config
router.get('/config', ctrl.getConfig);
router.put('/config', requireAdminRole('super_admin'), ctrl.updateConfig);

// COD
router.get('/cod/dashboard', requireAdminRole('super_admin', 'finance'), ctrl.getCodDashboard);
router.get('/cod/drivers', requireAdminRole('super_admin', 'finance'), ctrl.getCodDriverLedger);
router.put('/cod/drivers/:id/reconcile', requireAdminRole('super_admin', 'finance'), ctrl.reconcileDriverCash);

// Wallet
router.get('/wallet/credits', requireAdminRole('super_admin', 'finance'), ctrl.getWalletCredits);
router.post('/wallet/:userId/credit', requireAdminRole('super_admin', 'support_staff'), ctrl.adminCreditWallet);
router.post('/wallet/:userId/debit', requireAdminRole('super_admin'), ctrl.adminDebitWallet);

// Support
router.get('/support/tickets', requireAdminRole('super_admin', 'support_staff'), ctrl.getAllSupportTickets);
router.get('/support/tickets/:id', requireAdminRole('super_admin', 'support_staff'), ctrl.getTicketById);
router.put('/support/tickets/:id/assign', requireAdminRole('super_admin', 'support_staff'), ctrl.assignTicket);
router.put('/support/tickets/:id/resolve', requireAdminRole('super_admin', 'support_staff'), ctrl.resolveTicket);
router.put('/support/tickets/:id/status', requireAdminRole('super_admin', 'support_staff'), ctrl.updateTicketStatus);
router.post('/support/tickets/:id/comment', requireAdminRole('super_admin', 'support_staff'), ctrl.addTicketComment);
router.put('/support/tickets/:id/priority', requireAdminRole('super_admin', 'support_staff'), ctrl.updateTicketPriority);

// Reports
router.get('/reports/:type', requireAdminRole('super_admin', 'finance'), ctrl.getReport);

// Audit Logs
router.get('/audit-logs', requireAdminRole('super_admin'), ctrl.getAuditLogs);

export default router;
